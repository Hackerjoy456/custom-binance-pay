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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Method not allowed. Use GET or POST." }, 405);
  }

  // Get API key from header
  const apiKeyHeader = req.headers.get("x-api-key");
  if (!apiKeyHeader) {
    return json({ error: "Missing x-api-key header" }, 401);
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Look up the API key
  const { data: keyRow, error: keyErr } = await supabaseAdmin
    .from("api_keys")
    .select("user_id, is_active")
    .eq("api_key", apiKeyHeader)
    .single();

  if (keyErr || !keyRow) {
    return json({ error: "Invalid API key" }, 401);
  }
  if (!keyRow.is_active) {
    return json({ error: "API key is deactivated" }, 403);
  }

  const userId = keyRow.user_id;

  // Check active subscription
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .gte("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .single();

  if (!sub) {
    return json({ error: "No active subscription. Please renew." }, 403);
  }

  // Get user's API config
  const { data: config } = await supabaseAdmin
    .from("api_configurations")
    .select("binance_pay_id, bep20_address, image_url, bep20_image_url")
    .eq("user_id", userId)
    .single();

  if (!config) {
    return json({ error: "API not configured. Please set up your credentials in the dashboard." }, 400);
  }

  // Return only the public-facing config (no secrets)
  return json({
    binance_pay: {
      pay_id: config.binance_pay_id || null,
      image_url: config.image_url || null,
    },
    bep20: {
      wallet_address: config.bep20_address || null,
      image_url: config.bep20_image_url || null,
    },
  });
});
