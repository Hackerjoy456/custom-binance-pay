import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendTelegram(token: string, chatId: string, message: string) {
    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
        });
        if (!res.ok) console.error("Telegram API error:", await res.text());
    } catch (e) {
        console.error("Telegram network error:", e);
    }
}

async function sendDiscord(url: string, embed: any) {
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ embeds: [embed] }),
        });
        if (!res.ok) console.error("Discord API error:", await res.text());
    } catch (e) {
        console.error("Discord network error:", e);
    }
}

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

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

async function verifyBinancePay(
    apiKey: string, apiSecret: string, transactionId: string,
    expectedAmount: number, timeWindowSeconds: number,
): Promise<{ verified: boolean; amount?: number; error?: string }> {
    try {
        const data = await proxyCall("binance_pay_transactions", { apiKey, apiSecret, limit: 50 });
        if (data.msg?.includes?.("restricted location")) return { verified: false, error: data.msg };
        const code = String(data.code ?? "");
        if (code && code !== "0" && code !== "000000") return { verified: false, error: data.msg || "Binance Pay API error" };
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
            if (txTimeMs < cutoffMs) return { verified: false, amount: txAmount, error: "Transaction too old" };
            if (currency === "USDT" && Math.abs(txAmount - expectedAmount) < 0.01) return { verified: true, amount: txAmount };
            return { verified: false, amount: txAmount, error: `Amount mismatch: expected ${expectedAmount} USDT, got ${txAmount} ${currency}` };
        }
        return { verified: false, error: "Order ID not found in recent transactions" };
    } catch (e) {
        return { verified: false, error: `Binance Pay error: ${e.message}` };
    }
}

async function verifyBep20(
    apiKey: string, apiSecret: string, walletAddress: string,
    transactionId: string, expectedAmount: number, timeWindow: number,
): Promise<{ verified: boolean; amount?: number; error?: string }> {
    try {
        const bscData = await proxyCall("bscscan_tx", { txHash: transactionId });
        if (bscData.result?.to) {
            if (bscData.result.to.toLowerCase() === walletAddress.toLowerCase()) {
                const value = parseInt(bscData.result.value, 16) / 1e18;
                if (Math.abs(value - expectedAmount) <= 0.01) return { verified: true, amount: value };
                return { verified: false, amount: value, error: "Amount mismatch" };
            }
            return { verified: false, error: "Recipient doesn't match wallet" };
        }
    } catch (_) { }
    if (!apiKey || !apiSecret) return { verified: false, error: "Transaction not found on BSCScan" };
    const startTime = Date.now() - timeWindow * 1000;
    try {
        const deposits = await proxyCall("binance_deposits", { apiKey, apiSecret, startTime });
        if (!Array.isArray(deposits)) return { verified: false, error: "Failed to check deposits" };
        const match = deposits.find((d: any) => d.txId?.toLowerCase() === transactionId.toLowerCase());
        if (!match) return { verified: false, error: "Transaction not found" };
        const amt = parseFloat(match.amount);
        if (Math.abs(amt - expectedAmount) > 0.01) return { verified: false, amount: amt, error: "Amount mismatch" };
        return { verified: true, amount: amt };
    } catch {
        return { verified: false, error: "Verification failed" };
    }
}

function sanitizeError(error: string): string {
    if (error.includes("Invalid API-key")) return "Payment verification temporarily unavailable.";
    if (error.includes("IP, or permissions")) return "Payment verification temporarily unavailable.";
    if (error.includes("BINANCE_PROXY_URL")) return "Service not configured. Contact merchant.";
    if (error.includes("Amount") || error.includes("mismatch") || error.includes("not found") || error.includes("too old")) return error;
    return "Verification failed. Please check your transaction details.";
}

// Resolve userId from API key or merchant_id
async function resolveUserId(body: any, req: Request, supabaseAdmin: any): Promise<{ userId: string | null; error?: string; status?: number }> {
    const apiKey = req.headers.get("x-api-key");
    if (apiKey) {
        const { data: keyRow } = await supabaseAdmin
            .from("api_keys").select("user_id, is_active").eq("api_key", apiKey).single();
        if (!keyRow) return { userId: null, error: "Invalid API key", status: 401 };
        if (!keyRow.is_active) return { userId: null, error: "API key is deactivated", status: 403 };
        return { userId: keyRow.user_id };
    }

    const merchantId = body?.merchant_id;
    if (merchantId) {
        const { data: keyRow } = await supabaseAdmin
            .from("api_keys").select("user_id, is_active").eq("user_id", merchantId).eq("is_active", true).limit(1).single();
        if (!keyRow) return { userId: null, error: "Merchant not found or inactive", status: 404 };
        return { userId: keyRow.user_id };
    }

    return { userId: null, error: "Missing API key or merchant_id", status: 401 };
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let body: any;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

    const resolved = await resolveUserId(body, req, supabaseAdmin);
    if (resolved.error) return json({ error: resolved.error }, resolved.status || 400);
    const userId = resolved.userId!;

    // Check & auto-expire subscription
    const { data: sub } = await supabaseAdmin
        .from("subscriptions").select("*").eq("user_id", userId).eq("status", "active")
        .order("expires_at", { ascending: false }).limit(1).single();
    if (sub && new Date(sub.expires_at) < new Date()) {
        await Promise.all([
            supabaseAdmin.from("subscriptions").update({ status: "expired" }).eq("id", sub.id),
            supabaseAdmin.from("api_keys").update({ is_active: false }).eq("user_id", userId).eq("is_active", true),
        ]);
        return json({ error: "Merchant subscription inactive." }, 403);
    }
    if (!sub) return json({ error: "Merchant subscription inactive." }, 403);

    const { data: config } = await supabaseAdmin
        .from("api_configurations").select("*").eq("user_id", userId).single();
    if (!config) return json({ error: "Merchant payment not configured." }, 400);

    const { transaction_id, payment_type, expected_amount, session_ts } = body;
    if (!transaction_id || !payment_type || expected_amount === undefined)
        return json({ error: "Missing: transaction_id, payment_type, expected_amount" }, 400);
    if (!["bep20", "binance_pay"].includes(payment_type))
        return json({ error: "payment_type must be 'bep20' or 'binance_pay'" }, 400);

    // IP Rate Limiting (Fraud Shield)
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    if (clientIp !== "unknown") {
        const { count } = await supabaseAdmin
            .from("payment_verification_logs")
            .select("*", { count: "exact", head: true })
            .eq("request_ip", clientIp)
            .eq("status", "failed")
            .gt("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString()); // Last 30 mins

        if (count && count > 10) {
            return json({ error: "Security Alert: Too many failed attempts. Your IP is temporarily throttled.", verified: false }, 429);
        }
    }

    // Server-side session expiry check (10 minutes)
    if (session_ts) {
        const sessionAge = Date.now() - Number(session_ts);
        const SESSION_LIMIT_MS = 10 * 60 * 1000; // 10 minutes
        if (sessionAge > SESSION_LIMIT_MS) {
            return json({ error: "Payment session expired. Please request a new payment link.", verified: false }, 403);
        }
    }

    const { data: existingTx } = await supabaseAdmin
        .from("used_transactions").select("id").eq("user_id", userId).eq("transaction_id", transaction_id).limit(1);
    if (existingTx && existingTx.length > 0) return json({ error: "Transaction already verified", verified: false }, 409);

    const { data: twSetting } = await supabaseAdmin
        .from("system_settings").select("value").eq("key", "verification_time_window").single();
    const timeWindow = twSetting ? parseInt(twSetting.value) : 86400;

    let result: { verified: boolean; amount?: number; error?: string };
    if (payment_type === "binance_pay") {
        result = await verifyBinancePay(config.binance_api_key || "", config.binance_api_secret || "", transaction_id, parseFloat(expected_amount), timeWindow);
    } else {
        result = await verifyBep20(config.binance_api_key || "", config.binance_api_secret || "", config.bep20_address || "", transaction_id, parseFloat(expected_amount), timeWindow);
    }

    // Success Logging is already handled below, keep the IP for reuse
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

    // Optional Notifications
    if (result.verified) {
        const { telegram_token, telegram_chat_id, discord_webhook_url } = config as any;

        const notificationPromises = [];

        if (telegram_token && telegram_chat_id) {
            const msg = `✅ <b>Payment Verification Success</b>\n\n` +
                `A new transaction has been successfully verified on the network.\n\n` +
                `💰 <b>Amount:</b> <code>${result.amount} USDT</code>\n` +
                `🔗 <b>Method:</b> <code>${payment_type === 'binance_pay' ? 'Binance Pay' : 'BEP20'}</code>\n` +
                `🆔 <b>Transaction ID:</b>\n<code>${transaction_id}</code>\n\n` +
                `🌐 <b>Request IP:</b>\n<code>${clientIp}</code>\n\n` +
                `⚡ <i>Binance Verify • Infrastructure Bot</i>`;
            notificationPromises.push(sendTelegram(telegram_token, telegram_chat_id, msg));
        }

        if (discord_webhook_url) {
            const embed = {
                title: "✅ Payment Verification Success",
                description: "A new transaction has been successfully verified on the network.",
                color: 0x10B981, // Emerald 500
                fields: [
                    { name: "💰 Amount", value: `**${result.amount} USDT**`, inline: true },
                    { name: "🔗 Method", value: payment_type === 'binance_pay' ? 'Binance Pay' : 'BEP20', inline: true },
                    { name: "🆔 Transaction ID", value: `\`${transaction_id}\`` },
                    { name: "🌐 Request IP", value: clientIp },
                ],
                timestamp: new Date().toISOString(),
                footer: { text: "Binance Verify • Infrastructure Bot" }
            };
            notificationPromises.push(sendDiscord(discord_webhook_url, embed));
        }

        if (notificationPromises.length > 0) {
            // Fire and forget, but keep the worker alive for a moment
            await Promise.all(notificationPromises).catch(e => console.error("Notification group error:", e));
        }
    }

    const sanitizedError = result.error ? sanitizeError(result.error) : null;
    return json({
        verified: result.verified, amount: result.amount, error: sanitizedError,
    });
});
