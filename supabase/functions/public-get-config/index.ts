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

// Resolve user ID from either x-api-key header, api_key param, or merchant_id in body/param
async function resolveUserId(
  req: Request,
  supabaseAdmin: any,
): Promise<{ userId: string | null; error?: string; status?: number }> {
  const url = new URL(req.url);
  const apiKey = req.headers.get("x-api-key") || url.searchParams.get("api_key");

  // Try API key first
  if (apiKey) {
    const { data: keyRow } = await supabaseAdmin
      .from("api_keys").select("user_id, is_active").eq("api_key", apiKey).single();
    if (!keyRow) return { userId: null, error: "Invalid API key", status: 401 };
    if (!keyRow.is_active) return { userId: null, error: "API key is deactivated", status: 403 };
    return { userId: keyRow.user_id };
  }

  // Try merchant_id from query param or body
  const merchantId = url.searchParams.get("merchant_id");
  if (merchantId) {
    // Verify user exists with active API key
    const { data: keyRow } = await supabaseAdmin
      .from("api_keys").select("user_id, is_active").eq("user_id", merchantId).eq("is_active", true).limit(1).single();
    if (!keyRow) return { userId: null, error: "Merchant not found or inactive", status: 404 };
    return { userId: keyRow.user_id };
  }

  // Try body for POST
  return { userId: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let userId: string | null = null;

  // Resolve from headers/params first
  const resolved = await resolveUserId(req, supabaseAdmin);
  if (resolved.error) return json({ error: resolved.error }, resolved.status || 400);
  userId = resolved.userId;

  // If still no userId, try body (POST)
  if (!userId && (req.method === "POST")) {
    try {
      const body = await req.json();
      const merchantId = body.merchant_id;
      if (merchantId) {
        const { data: keyRow } = await supabaseAdmin
          .from("api_keys").select("user_id, is_active").eq("user_id", merchantId).eq("is_active", true).limit(1).single();
        if (!keyRow) return json({ error: "Merchant not found or inactive" }, 404);
        userId = keyRow.user_id;
      }
    } catch { /* ignore parse errors */ }
  }

  if (!userId) return json({ error: "Missing API key or merchant_id" }, 401);

  // Check active subscription
  const { data: sub } = await supabaseAdmin
    .from("subscriptions").select("id, status, expires_at")
    .eq("user_id", userId).eq("status", "active")
    .order("expires_at", { ascending: false }).limit(1).single();

  if (!sub || new Date(sub.expires_at) < new Date()) {
    if (sub) {
      await Promise.all([
        supabaseAdmin.from("subscriptions").update({ status: "expired" }).eq("id", sub.id),
        supabaseAdmin.from("api_keys").update({ is_active: false }).eq("user_id", userId).eq("is_active", true),
      ]);
    }
    return json({ error: "Merchant subscription inactive" }, 403);
  }

  const { data: config } = await supabaseAdmin
    .from("api_configurations")
    .select("binance_pay_id, bep20_address, image_url, bep20_image_url")
    .eq("user_id", userId).single();

  if (!config) return json({ error: "Payment not configured" }, 400);

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
