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
        return json({ error: "Method not allowed" }, 405);
    }

    // Verify caller is authenticated admin
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) {
        console.error("[AdminMaintenance] Missing Authorization header");
        return json({ error: "Not authenticated: Missing header" }, 401);
    }

    const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
    );

    // Get caller
    const { data: { user: caller }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !caller) {
        console.error("[AdminMaintenance] User verification failed:", userError);
        return json({ error: "Not authenticated: Verification failed" }, 401);
    }

    console.log(`[AdminMaintenance] Verifying roles for user: ${caller.id} (${caller.email})`);

    // Check caller is admin
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc("has_role", {
        _user_id: caller.id,
        _role: "admin",
    });

    if (roleError) {
        console.error("[AdminMaintenance] Role RPC error:", roleError);
        return json({ error: "Role check failed: " + roleError.message }, 500);
    }

    if (!isAdmin) {
        console.warn(`[AdminMaintenance] Access denied for user: ${caller.id}`);
        return json({ error: "Super Admin privileges required for this sector." }, 403);
    }

    let body: any;
    try {
        body = await req.json();
    } catch {
        return json({ error: "Invalid request" }, 400);
    }

    const { action } = body;
    console.log(`[AdminMaintenance] Action: ${action}, User: ${caller.id}`);

    try {
        if (action === "test") {
            return json({ success: true, message: "Connection successful!", admin_id: caller.id });
        }
        if (action === "clear_logs") {
            const { error } = await supabaseAdmin
                .from("payment_verification_logs")
                .delete()
                .neq("id", "00000000-0000-0000-0000-000000000000");

            if (error) throw error;
            return json({ success: true, message: "All verification logs have been purged." });
        }

        if (action === "clear_used_transactions") {
            const { error } = await supabaseAdmin
                .from("used_transactions")
                .delete()
                .neq("id", "00000000-0000-0000-0000-000000000000");

            if (error) throw error;
            return json({ success: true, message: "All used transaction records have been cleared." });
        }

        if (action === "release_transaction") {
            const { transaction_id, user_id } = body;
            if (!transaction_id || !user_id) return json({ error: "Transaction ID and User ID are required" }, 400);

            const [logRes, txRes] = await Promise.all([
                supabaseAdmin.from("payment_verification_logs").delete().eq("transaction_id", transaction_id).eq("user_id", user_id),
                supabaseAdmin.from("used_transactions").delete().eq("transaction_id", transaction_id).eq("user_id", user_id)
            ]);

            if (logRes.error || txRes.error) throw logRes.error || txRes.error;

            return json({ success: true, message: `Transaction ${transaction_id} released successfully.` });
        }

        if (action === "delete_single") {
            const { table, id } = body;
            if (!table || !id) return json({ error: "Table and ID are required" }, 400);

            const { error } = await supabaseAdmin
                .from(table)
                .delete()
                .eq("id", id);

            if (error) throw error;
            return json({ success: true, message: `Record deleted from ${table}.` });
        }

        return json({ error: "Unknown action. Use 'clear_logs', 'clear_used_transactions', 'release_transaction', or 'delete_single'" }, 400);
    } catch (e) {
        console.error("Maintenance Error:", e);
        return json({ error: e.message || "An unexpected error occurred in the edge function." }, 500);
    }
});
