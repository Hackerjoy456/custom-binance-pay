import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

// ── Binance Pay verification (transaction history approach) ─────
async function verifyBinancePay(
  apiKey: string, apiSecret: string,
  transactionId: string, expectedAmount: number, timeWindowSeconds: number,
): Promise<{ verified: boolean; amount?: number; error?: string }> {
  try {
    const data = await proxyCall("binance_pay_transactions", { apiKey, apiSecret, limit: 50 });

    // Handle geo-restriction errors
    if (data.msg && typeof data.msg === 'string' && data.msg.includes('restricted location')) {
      return { verified: false, error: `Binance API blocked: ${data.msg}` };
    }
    // Handle API errors (Binance returns code "000000" for success)
    const code = String(data.code ?? "");
    if (code && code !== "0" && code !== "000000") {
      return { verified: false, error: data.msg || data.message || "Binance Pay API error" };
    }

    const transactions = Array.isArray(data) ? data : (data.data || []);
    if (!Array.isArray(transactions)) {
      return { verified: false, error: "Failed to fetch Pay transactions" };
    }

    const cutoffMs = Date.now() - timeWindowSeconds * 1000;

    for (const tx of transactions) {
      const txOrderId = tx.orderId || tx.orderNo || tx.id || tx.prepayId || tx.transactionId || "";
      if (String(txOrderId) !== String(transactionId)) continue;

      // Check time window
      const timeField = tx.transactionTime || tx.createTime || tx.time || "";
      const txTimeMs = String(timeField).length > 10 ? Number(timeField) : Number(timeField) * 1000;

      const txAmount = parseFloat(tx.amount || "0");
      const currency = (tx.currency || "").toUpperCase();

      if (txTimeMs < cutoffMs) {
        const hoursAgo = ((Date.now() - txTimeMs) / 3600000).toFixed(1);
        return { verified: false, amount: txAmount, error: `Transaction found but too old (${hoursAgo}h ago). Time window is ${(timeWindowSeconds / 3600).toFixed(1)} hours.` };
      }

      if (currency === "USDT" && Math.abs(txAmount - expectedAmount) < 0.01) {
        return { verified: true, amount: txAmount };
      }
      return { verified: false, amount: txAmount, error: `Amount/currency mismatch: expected ${expectedAmount} USDT, got ${txAmount} ${currency}` };
    }

    return { verified: false, error: "Order ID not found in recent Binance Pay transactions" };
  } catch (e) {
    return { verified: false, error: `Binance Pay error: ${e.message}` };
  }
}

// ── BEP20 verification (via proxy) ──────────────────────────────
async function verifyBep20(
  apiKey: string, apiSecret: string,
  walletAddress: string, transactionId: string,
  expectedAmount: number, timeWindow: number,
): Promise<{ verified: boolean; amount?: number; error?: string }> {
  // Check BSCScan first
  try {
    const bscData = await proxyCall("bscscan_tx", { txHash: transactionId });
    if (bscData.result && bscData.result.to) {
      const toAddress = bscData.result.to.toLowerCase();
      if (toAddress === walletAddress.toLowerCase()) {
        const value = parseInt(bscData.result.value, 16) / 1e18;
        if (Math.abs(value - expectedAmount) <= 0.01) return { verified: true, amount: value };
        return { verified: false, amount: value, error: `Amount mismatch: expected ${expectedAmount}, got ${value}` };
      }
      return { verified: false, error: "Transaction recipient doesn't match wallet" };
    }
  } catch (_) { /* fallback */ }

  if (!apiKey || !apiSecret) return { verified: false, error: "Transaction not found on BSCScan" };

  // Fallback: Binance deposit history
  const startTime = Date.now() - timeWindow * 1000;
  try {
    const deposits = await proxyCall("binance_deposits", { apiKey, apiSecret, startTime });
    if (!Array.isArray(deposits)) return { verified: false, error: "Failed to fetch deposits" };
    const match = deposits.find((d: any) => d.txId?.toLowerCase() === transactionId.toLowerCase());
    if (!match) return { verified: false, error: "Transaction not found in deposits" };
    const depositAmount = parseFloat(match.amount);
    if (Math.abs(depositAmount - expectedAmount) > 0.01) {
      return { verified: false, amount: depositAmount, error: `Amount mismatch: expected ${expectedAmount}, got ${depositAmount}` };
    }
    return { verified: true, amount: depositAmount };
  } catch (e) {
    return { verified: false, error: `BEP20 verification error: ${e.message}` };
  }
}

// ── Error sanitizer ─────────────────────────────────────────────
function sanitizeError(error: string): string {
  const patterns = [
    { match: "Invalid API-key", replace: "Binance credentials are invalid. Please check your API key and secret in API Config." },
    { match: "IP, or permissions", replace: "Binance credentials are invalid or IP not whitelisted. Check your API Config." },
    { match: "Failed to fetch", replace: "Could not verify transaction. Please check your Binance API credentials." },
    { match: "BINANCE_PROXY_URL not configured", replace: "Payment verification service is not configured. Please contact support." },
  ];
  for (const p of patterns) {
    if (error.includes(p.match)) return p.replace;
  }
  if (error.includes("Amount") || error.includes("Order status") || error.includes("mismatch") || error.includes("too old") || error.includes("not found")) return error;
  return "Verification failed. Please check your transaction details and try again.";
}

// ── Main handler ─────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKeyHeader = req.headers.get("x-api-key");
  if (!apiKeyHeader) return json({ error: "Missing x-api-key header" }, 401);

  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: keyRow, error: keyErr } = await supabaseAdmin
    .from("api_keys").select("user_id, is_active").eq("api_key", apiKeyHeader).single();
  if (keyErr || !keyRow) return json({ error: "Invalid API key" }, 401);
  if (!keyRow.is_active) return json({ error: "API key is deactivated" }, 403);

  const userId = keyRow.user_id;

  // Check subscription — auto-expire and deactivate key if past expiry
  const { data: sub } = await supabaseAdmin
    .from("subscriptions").select("*").eq("user_id", userId).eq("status", "active")
    .order("expires_at", { ascending: false }).limit(1).single();

  if (sub && new Date(sub.expires_at) < new Date()) {
    // Auto-expire subscription and deactivate API key
    await Promise.all([
      supabaseAdmin.from("subscriptions").update({ status: "expired" }).eq("id", sub.id),
      supabaseAdmin.from("api_keys").update({ is_active: false }).eq("user_id", userId).eq("is_active", true),
    ]);
    return json({ error: "Subscription expired. Your API key has been deactivated. Please renew." }, 403);
  }
  if (!sub) return json({ error: "No active subscription. Please renew." }, 403);

  const { data: config } = await supabaseAdmin
    .from("api_configurations").select("*").eq("user_id", userId).single();
  if (!config) return json({ error: "API not configured. Please set up your Binance credentials." }, 400);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  const { transaction_id, payment_type, expected_amount } = body;
  if (!transaction_id || !payment_type || expected_amount === undefined) {
    return json({ error: "Missing required fields: transaction_id, payment_type, expected_amount" }, 400);
  }
  if (!["bep20", "binance_pay"].includes(payment_type)) {
    return json({ error: "payment_type must be 'bep20' or 'binance_pay'" }, 400);
  }

  const { data: existingTx } = await supabaseAdmin
    .from("used_transactions").select("id").eq("user_id", userId).eq("transaction_id", transaction_id).limit(1);
  if (existingTx && existingTx.length > 0) {
    return json({ error: "Transaction already verified", verified: false }, 409);
  }

  const { data: twSetting } = await supabaseAdmin
    .from("system_settings").select("value").eq("key", "verification_time_window").single();
  const timeWindow = twSetting ? parseInt(twSetting.value) : 30;

  let result: { verified: boolean; amount?: number; error?: string };
  if (payment_type === "binance_pay") {
    result = await verifyBinancePay(
      config.binance_api_key || "", config.binance_api_secret || "",
      transaction_id, parseFloat(expected_amount), timeWindow
    );
  } else {
    result = await verifyBep20(
      config.binance_api_key || "", config.binance_api_secret || "",
      config.bep20_address || "", transaction_id, parseFloat(expected_amount), timeWindow
    );
  }

  const sanitizedError = result.error ? sanitizeError(result.error) : null;
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";

  await supabaseAdmin.from("payment_verification_logs").insert({
    user_id: userId, transaction_id, payment_type,
    expected_amount: parseFloat(expected_amount),
    actual_amount: result.amount || null,
    status: result.verified ? "success" : "failed",
    error_message: result.error || null,
    request_ip: clientIp,
  });

  if (result.verified) {
    await supabaseAdmin.from("used_transactions").insert({
      user_id: userId, transaction_id, payment_type, amount: result.amount,
    });
  }

  return json({
    verified: result.verified, amount: result.amount, error: sanitizedError,
    image_url: payment_type === "bep20" ? (config.bep20_image_url || config.image_url || null) : (config.image_url || null),
    bep20_image_url: config.bep20_image_url || null,
    binance_pay_image_url: config.image_url || null,
  });
});
