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

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const apiKeyHeader = req.headers.get("x-api-key");
  if (!apiKeyHeader) {
    return json({ error: "Missing x-api-key header" }, 401);
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: keyRow } = await supabaseAdmin
    .from("api_keys")
    .select("user_id, is_active")
    .eq("api_key", apiKeyHeader)
    .single();

  if (!keyRow || !keyRow.is_active) {
    return json({ error: "Invalid or inactive API key" }, 401);
  }

  const { data: config } = await supabaseAdmin
    .from("api_configurations")
    .select("*")
    .eq("user_id", keyRow.user_id)
    .single();

  if (!config || !config.binance_api_key || !config.binance_api_secret) {
    return json({ error: "Binance credentials not configured" }, 400);
  }

  // Test Binance API connectivity
  const timestamp = Date.now().toString();
  const queryString = `timestamp=${timestamp}`;
  const signature = await hmacSha256Hex(config.binance_api_secret, queryString);

  try {
    const res = await fetch(
      `https://api.binance.com/sapi/v1/system/status`,
      { headers: { "X-MBX-APIKEY": config.binance_api_key } }
    );
    const data = await res.json();

    // Also test account connectivity
    const accRes = await fetch(
      `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`,
      { headers: { "X-MBX-APIKEY": config.binance_api_key } }
    );
    const accData = await accRes.json();

    return json({
      binance_system: data.status === 0 ? "normal" : "maintenance",
      account_connected: !accData.code,
      account_error: accData.msg || null,
      binance_pay_configured: !!config.binance_pay_id,
      bep20_configured: !!config.bep20_address,
    });
  } catch (e) {
    return json({ error: `Connection test failed: ${e.message}` }, 500);
  }
});
