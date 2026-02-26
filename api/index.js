import crypto from "crypto";

// ── CORS ────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-proxy-secret",
};

function sendJson(res, body, status = 200) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  res.status(status).json(body);
}

// ── Main handler ────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }

  const isHealthPath = req.url && req.url.includes("/health");

  // Allow simple GET /api/health without a POST body
  if (req.method === "GET" && isHealthPath) {
    return sendJson(res, {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "BinanceVerify Proxy",
      version: "2.1.0",
      method: "GET",
    });
  }

  if (req.method !== "POST") {
    return sendJson(res, { error: "POST only" }, 405);
  }

  const proxySecret = process.env.PROXY_SECRET;
  if (proxySecret && req.headers["x-proxy-secret"] !== proxySecret) {
    return sendJson(res, { error: "Unauthorized" }, 401);
  }

  const { action, payload } = req.body || {};

  try {
    if (action === "binance_pay_query") {
      // Merchant order query (for merchant accounts)
      const { apiKey, apiSecret, payId, transactionId } = payload;
      const timestamp = Date.now().toString();
      const nonce = crypto.randomUUID().replace(/-/g, "").substring(0, 32);
      const body = JSON.stringify({ merchantId: payId, prepayId: transactionId });
      const signature = crypto.createHmac("sha256", apiSecret).update(`${timestamp}\n${nonce}\n${body}\n`).digest("hex");

      const binanceRes = await fetch("https://bpay.binanceapi.com/binancepay/openapi/v2/order/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "BinancePay-Timestamp": timestamp,
          "BinancePay-Nonce": nonce,
          "BinancePay-Certificate-SN": apiKey,
          "BinancePay-Signature": signature.toUpperCase(),
        },
        body,
      });
      const data = await binanceRes.json();
      return sendJson(res, data);

    } else if (action === "binance_pay_transactions") {
      // Pay transaction history (for regular Binance accounts) - matches Python approach
      const { apiKey, apiSecret, limit } = payload;
      const timestamp = Date.now().toString();
      const qs = `timestamp=${timestamp}&limit=${limit || 50}`;
      const signature = crypto.createHmac("sha256", apiSecret).update(qs).digest("hex");

      const binanceRes = await fetch(`https://api.binance.com/sapi/v1/pay/transactions?${qs}&signature=${signature}`, {
        headers: { "X-MBX-APIKEY": apiKey },
      });
      const data = await binanceRes.json();
      return sendJson(res, data);

    } else if (action === "bscscan_tx") {
      const { txHash } = payload;
      const bscRes = await fetch(`https://api.bscscan.com/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}`);
      const data = await bscRes.json();
      return sendJson(res, data);

    } else if (action === "binance_deposits") {
      const { apiKey, apiSecret, startTime } = payload;
      const timestamp = Date.now().toString();
      const qs = `timestamp=${timestamp}&startTime=${startTime}&coin=USDT&network=BSC`;
      const signature = crypto.createHmac("sha256", apiSecret).update(qs).digest("hex");

      const binanceRes = await fetch(`https://api.binance.com/sapi/v1/capital/deposit/hisrec?${qs}&signature=${signature}`, {
        headers: { "X-MBX-APIKEY": apiKey },
      });
      const data = await binanceRes.json();
      return sendJson(res, data);

    } else if (action === "health") {
      return sendJson(res, { status: "healthy", timestamp: new Date().toISOString(), service: "BinanceVerify Proxy", version: "2.1.0" });

    } else {
      return sendJson(res, { error: "Unknown action. Use: binance_pay_query, binance_pay_transactions, bscscan_tx, binance_deposits, health" }, 400);
    }
  } catch (e) {
    return sendJson(res, { error: `Proxy error: ${e.message}` }, 500);
  }
}
