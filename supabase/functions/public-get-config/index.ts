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

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return json({ error: "Method not allowed. Use POST." }, 405);
    }

    let body;
    try {
        body = await req.json();
    } catch {
        return json({ error: "Invalid JSON body" }, 400);
    }

    const merchantId = body.merchant_id;
    if (!merchantId) {
        return json({ error: "missing merchant_id" }, 400);
    }

    const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Use merchantId (which is the user_id)
    const userId = merchantId;

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
        return json({ error: "This merchant's subscription is inactive or expired." }, 403);
    }

    // Get user's API config
    const { data: config } = await supabaseAdmin
        .from("api_configurations")
        .select("binance_pay_id, bep20_address, image_url, bep20_image_url")
        .eq("user_id", userId)
        .single();

    if (!config) {
        return json({ error: "Merchant payment methods are not configured." }, 400);
    }

    // Return only the public-facing config
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
