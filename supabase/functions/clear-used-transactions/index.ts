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

  const { error, count } = await supabaseAdmin
    .from("used_transactions")
    .delete()
    .eq("user_id", keyRow.user_id);

  if (error) {
    return json({ error: "Failed to clear transactions" }, 500);
  }

  return json({
    success: true,
    message: `Cleared used transactions`,
  });
});
