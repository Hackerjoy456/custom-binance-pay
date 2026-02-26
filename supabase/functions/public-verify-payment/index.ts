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

// proxy helper
async function proxyCall(action: string, payload: Record<string, unknown>): Promise<any> {
    const proxyUrl = Deno.env.get("BINANCE_PROXY_URL");
    if (!proxyUrl) throw new Error("BINANCE_PROXY_URL not configured");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const proxySecret = Deno.env.get("PROXY_SECRET");
    if (proxySecret) headers["x-proxy-secret"] = proxySecret;
    const res = await fetch(proxyUrl, { method: "POST", headers, body: JSON.stringify({ action, payload }) });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { error: text }; }
}

async function verifyBinancePay(apiKey: string, apiSecret: string, transactionId: string, expectedAmount: number, timeWindowSeconds: number) {
    try {
        const data = await proxyCall("binance_pay_transactions", { apiKey, apiSecret, limit: 50 });
        if (data.msg && typeof data.msg === 'string' && data.msg.includes('restricted location')) return { verified: false, error: `Binance API blocked` };
        const code = String(data.code ?? "");
        if (code && code !== "0" && code !== "000000") return { verified: false, error: data.msg || data.message || "Binance API error" };

        const transactions = Array.isArray(data) ? data : (data.data || []);
        if (!Array.isArray(transactions)) return { verified: false, error: "Failed to fetch Pay transactions" };

        const cutoffMs = Date.now() - timeWindowSeconds * 1000;
        for (const tx of transactions) {
            const txOrderId = tx.orderId || tx.orderNo || tx.id || tx.prepayId || tx.transactionId || "";
            if (String(txOrderId) !== String(transactionId)) continue;

            const timeField = tx.transactionTime || tx.createTime || tx.time || "";
            const txTimeMs = String(timeField).length > 10 ? Number(timeField) : Number(timeField) * 1000;
            const txAmount = parseFloat(tx.amount || "0");
            const currency = (tx.currency || "").toUpperCase();

            if (txTimeMs < cutoffMs) return { verified: false, amount: txAmount, error: `Transaction too old` };
            if (currency === "USDT" && Math.abs(txAmount - expectedAmount) < 0.01) return { verified: true, amount: txAmount };
            return { verified: false, amount: txAmount, error: `Amount mismatch: expected ${expectedAmount}, got ${txAmount} ${currency}` };
        }
        return { verified: false, error: "Order ID not found" };
    } catch (e) {
        return { verified: false, error: `Binance Pay error` };
    }
}

async function verifyBep20(apiKey: string, apiSecret: string, walletAddress: string, transactionId: string, expectedAmount: number, timeWindow: number) {
    try {
        const bscData = await proxyCall("bscscan_tx", { txHash: transactionId });
        if (bscData.result && bscData.result.to) {
            if (bscData.result.to.toLowerCase() === walletAddress.toLowerCase()) {
                const value = parseInt(bscData.result.value, 16) / 1e18;
                if (Math.abs(value - expectedAmount) <= 0.01) return { verified: true, amount: value };
                return { verified: false, amount: value, error: "Amount mismatch" };
            }
            return { verified: false, error: "Recipient mismatch" };
        }
    } catch (_) { }

    if (!apiKey || !apiSecret) return { verified: false, error: "Transaction not found on BSCScan" };

    try {
        const deposits = await proxyCall("binance_deposits", { apiKey, apiSecret, startTime: Date.now() - timeWindow * 1000 });
        if (!Array.isArray(deposits)) return { verified: false, error: "Failed to fetch deposits" };
        const match = deposits.find((d: any) => d.txId?.toLowerCase() === transactionId.toLowerCase());
        if (!match) return { verified: false, error: "Transaction not found" };
        const depositAmount = parseFloat(match.amount);
        if (Math.abs(depositAmount - expectedAmount) > 0.01) return { verified: false, amount: depositAmount, error: "Amount mismatch" };
        return { verified: true, amount: depositAmount };
    } catch (e) {
        return { verified: false, error: "BEP20 error" };
    }
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let body: any;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

    const { merchant_id, transaction_id, payment_type, expected_amount, order_id } = body;

    if (!merchant_id || !transaction_id || !payment_type || expected_amount === undefined) {
        return json({ error: "Missing required fields" }, 400);
    }

    const userId = merchant_id;

    const { data: sub } = await supabaseAdmin.from("subscriptions").select("*").eq("user_id", userId).eq("status", "active").order("expires_at", { ascending: false }).limit(1).single();
    if (sub && new Date(sub.expires_at) < new Date()) {
        await supabaseAdmin.from("subscriptions").update({ status: "expired" }).eq("id", sub.id);
        return json({ error: "Merchant subscription expired" }, 403);
    }
    if (!sub) return json({ error: "No active subscription" }, 403);

    const { data: config } = await supabaseAdmin.from("api_configurations").select("*").eq("user_id", userId).single();
    if (!config) return json({ error: "Merchant not configured" }, 400);

    const { data: existingTx } = await supabaseAdmin.from("used_transactions").select("id").eq("user_id", userId).eq("transaction_id", transaction_id).limit(1);
    if (existingTx && existingTx.length > 0) return json({ error: "Transaction already used", verified: false }, 409);

    const { data: twSetting } = await supabaseAdmin.from("system_settings").select("value").eq("key", "verification_time_window").single();
    const timeWindow = twSetting ? parseInt(twSetting.value) : 30;

    let result: { verified: boolean; amount?: number; error?: string };
    if (payment_type === "binance_pay") {
        result = await verifyBinancePay(config.binance_api_key || "", config.binance_api_secret || "", transaction_id, parseFloat(expected_amount), timeWindow);
    } else {
        result = await verifyBep20(config.binance_api_key || "", config.binance_api_secret || "", config.bep20_address || "", transaction_id, parseFloat(expected_amount), timeWindow);
    }

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";

    await supabaseAdmin.from("payment_verification_logs").insert({
        user_id: userId, transaction_id, payment_type, expected_amount: parseFloat(expected_amount),
        actual_amount: result.amount || null, status: result.verified ? "success" : "failed", error_message: result.error || null, request_ip: clientIp,
    });

    if (result.verified) {
        await supabaseAdmin.from("used_transactions").insert({ user_id: userId, transaction_id, payment_type, amount: result.amount });

        if (config.custom_endpoint_url) {
            try {
                await fetch(config.custom_endpoint_url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        event: "payment.verified",
                        order_id: order_id || null,
                        transaction_id: transaction_id,
                        amount: result.amount,
                        currency: "USDT",
                        payment_type: payment_type
                    })
                });
            } catch (e) {
                console.error("Webhook call failed", e);
            }
        }
    }

    return json({ verified: result.verified, amount: result.amount, error: result.error || null });
});
