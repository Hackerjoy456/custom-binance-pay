import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}


// ── Proxy helper ────────────────────────────────────────────────
async function proxyCall(action: string, payload: Record<string, unknown>): Promise<any> {
  const proxyUrl = Deno.env.get("BINANCE_PROXY_URL");
  if (!proxyUrl) throw new Error("BINANCE_PROXY_URL not configured");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const proxySecret = Deno.env.get("PROXY_SECRET");
  if (proxySecret) headers["x-proxy-secret"] = proxySecret;

  const res = await fetch(proxyUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ action, payload }),
  });
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const supabaseUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: claimsData, error: claimsError } = await supabaseUser.auth.getUser();
  if (claimsError || !claimsData?.user) return json({ error: "Unauthorized" }, 401);
  const userId = claimsData.user.id;

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const { transaction_id, payment_type, plan_type } = body;
  if (!transaction_id || !payment_type || !plan_type) return json({ error: "Missing: transaction_id, payment_type, plan_type" }, 400);
  if (!["bep20", "binance_pay"].includes(payment_type)) return json({ error: "payment_type must be 'bep20' or 'binance_pay'" }, 400);
  if (!["weekly", "monthly", "yearly"].includes(plan_type)) return json({ error: "Invalid plan_type" }, 400);

  const { data: plan } = await supabaseAdmin.from("pricing_plans").select("price").eq("plan_type", plan_type).eq("is_active", true).single();
  if (!plan) return json({ error: "Plan not found" }, 404);
  const expectedAmount = plan.price;

  const requestIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null;
  const logVerification = async (status: "success" | "failed", errorMessage: string | null, actualAmount?: number) => {
    try {
      await supabaseAdmin.from("payment_verification_logs").insert({
        user_id: userId,
        transaction_id,
        payment_type,
        expected_amount: expectedAmount,
        actual_amount: actualAmount ?? null,
        status,
        error_message: errorMessage,
        request_ip: requestIp,
      });
    } catch (_) {
      // non-blocking logging
    }
  };

  const { data: existingTx } = await supabaseAdmin.from("used_transactions").select("id").eq("transaction_id", transaction_id).limit(1);
  if (existingTx && existingTx.length > 0) {
    await logVerification("failed", "Transaction already used");
    return json({ error: "Transaction already used", verified: false }, 200);
  }

  // Get platform settings
  const { data: settingsRows } = await supabaseAdmin.from("system_settings").select("key, value").in("key", [
    "platform_bep20_address", "platform_binance_pay_id",
    "platform_binance_api_key", "platform_binance_api_secret",
    "verification_time_window",
  ]);
  const settings: Record<string, string> = {};
  for (const row of settingsRows || []) settings[row.key] = row.value;

  const timeWindow = parseInt(settings.verification_time_window || "86400");
  let result: { verified: boolean; amount?: number; error?: string };

  if (payment_type === "binance_pay") {
    const apiKey = settings.platform_binance_api_key;
    const apiSecret = settings.platform_binance_api_secret;
    if (!apiKey || !apiSecret) return json({ error: "Platform Binance Pay not configured. Contact admin." }, 500);
    result = await verifyBinancePayViaHistory(apiKey, apiSecret, transaction_id, expectedAmount, timeWindow);
  } else {
    const walletAddress = settings.platform_bep20_address;
    if (!walletAddress) return json({ error: "Platform BEP20 wallet not configured. Contact admin." }, 500);
    result = await verifyBep20(walletAddress, transaction_id, expectedAmount, settings.platform_binance_api_key || "", settings.platform_binance_api_secret || "", timeWindow);
  }

  if (result.verified) {
    await supabaseAdmin.from("subscriptions").update({ status: "expired" }).eq("user_id", userId).eq("status", "active");

    const now = new Date();
    let expiresAt: Date;
    if (plan_type === "weekly") expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    else if (plan_type === "monthly") expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    else expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

    await supabaseAdmin.from("subscriptions").insert({ user_id: userId, plan_type, expires_at: expiresAt.toISOString(), status: "active" });

    const { data: existingKeys } = await supabaseAdmin.from("api_keys").select("id").eq("user_id", userId).eq("is_active", true).limit(1);
    if (!existingKeys || existingKeys.length === 0) {
      await supabaseAdmin.from("api_keys").insert({ user_id: userId });
    }

    await supabaseAdmin.from("used_transactions").insert({ user_id: userId, transaction_id, payment_type, amount: result.amount });
  }

  await logVerification(
    result.verified ? "success" : "failed",
    result.verified ? null : (result.error || "Verification failed"),
    result.amount,
  );

  return json({ verified: result.verified, amount: result.amount, error: result.verified ? null : (result.error || "Verification failed") });
});

// ── Binance Pay via transaction history (matches Python approach) ──
async function verifyBinancePayViaHistory(
  apiKey: string, apiSecret: string, orderId: string,
  expectedAmount: number, timeWindowSeconds: number,
): Promise<{ verified: boolean; amount?: number; error?: string }> {
  try {
    const data = await proxyCall("binance_pay_transactions", { apiKey, apiSecret, limit: 50 });

    if (data.msg && typeof data.msg === "string" && data.msg.includes("restricted location")) {
      return { verified: false, error: data.msg };
    }

    const code = String(data.code ?? "");
    if (code && code !== "0" && code !== "000000") {
      return { verified: false, error: data.msg || data.message || "Binance Pay API error" };
    }

    const transactions = Array.isArray(data) ? data : (data.data || []);
    if (!Array.isArray(transactions)) return { verified: false, error: "Failed to fetch Pay transactions" };

    const cutoffMs = Date.now() - timeWindowSeconds * 1000;

    for (const tx of transactions) {
      const txOrderId = tx.orderId || tx.orderNo || tx.id || tx.prepayId || tx.transactionId || "";
      if (String(txOrderId) !== String(orderId)) continue;

      const timeField = tx.transactionTime || tx.createTime || tx.time || "";
      const txTimeMs = String(timeField).length > 10 ? Number(timeField) : Number(timeField) * 1000;
      const txAmount = parseFloat(tx.amount || "0");
      const currency = (tx.currency || "").toUpperCase();

      if (txTimeMs < cutoffMs) {
        const hoursAgo = ((Date.now() - txTimeMs) / 3600000).toFixed(1);
        return { verified: false, amount: txAmount, error: `Transaction too old (${hoursAgo}h ago). Window: ${(timeWindowSeconds / 3600).toFixed(1)}h.` };
      }

      if (currency === "USDT" && Math.abs(txAmount - expectedAmount) < 0.01) return { verified: true, amount: txAmount };
      return { verified: false, amount: txAmount, error: `Mismatch: expected ${expectedAmount} USDT, got ${txAmount} ${currency}` };
    }

    return { verified: false, error: "Order ID not found in recent Binance Pay transactions" };
  } catch (e) {
    return { verified: false, error: `Binance Pay error: ${e.message}` };
  }
}

// ── BEP20 verification ─────────────────────────────────────────
async function verifyBep20(
  walletAddress: string, txId: string, expectedAmount: number,
  apiKey: string, apiSecret: string, timeWindow: number,
): Promise<{ verified: boolean; amount?: number; error?: string }> {
  // BSCScan check via proxy
  try {
    const bscData = await proxyCall("bscscan_tx", { txHash: txId });
    if (bscData.result?.to) {
      if (bscData.result.to.toLowerCase() === walletAddress.toLowerCase()) {
        const value = parseInt(bscData.result.value, 16) / 1e18;
        if (Math.abs(value - expectedAmount) <= 0.01) return { verified: true, amount: value };
        return { verified: false, amount: value, error: `Amount mismatch: expected $${expectedAmount}, got $${value}` };
      }
      return { verified: false, error: "Recipient doesn't match platform wallet" };
    }
  } catch (_) { /* fallback */ }

  if (!apiKey || !apiSecret) return { verified: false, error: "Transaction not found on BSCScan" };

  // Fallback: Binance deposit history via proxy
  const startTime = Date.now() - timeWindow * 1000;
  try {
    const deposits = await proxyCall("binance_deposits", { apiKey, apiSecret, startTime });
    if (!Array.isArray(deposits)) return { verified: false, error: "Failed to check deposits" };
    const match = deposits.find((d: any) => d.txId?.toLowerCase() === txId.toLowerCase());
    if (!match) return { verified: false, error: "Transaction not found" };
    const amt = parseFloat(match.amount);
    if (Math.abs(amt - expectedAmount) > 0.01) return { verified: false, amount: amt, error: `Amount mismatch: expected $${expectedAmount}, got $${amt}` };
    return { verified: true, amount: amt };
  } catch (e) {
    return { verified: false, error: "Verification failed" };
  }
}
