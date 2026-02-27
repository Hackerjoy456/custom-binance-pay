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
    try {
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
            return json({ error: "Access Denied: Please log in again." }, 401);
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

        if (!supabaseUrl || !serviceKey || !anonKey) {
            console.error("[AdminMaintenance] Configuration missing in Supabase Environment");
            return json({ error: "Internal Configuration Error" }, 500);
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceKey);
        const supabaseUser = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        const { data: { user: caller }, error: userError } = await supabaseUser.auth.getUser();
        if (userError || !caller) {
            console.error("[AdminMaintenance] Auth failure:", userError);
            return json({ error: "Your session has expired. Please refresh the page." }, 401);
        }

        // Check admin role
        const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc("has_role", {
            _user_id: caller.id,
            _role: "admin",
        });

        if (roleError) {
            return json({ error: "Security Gateway Error: " + roleError.message }, 500);
        }

        if (!isAdmin) {
            return json({ error: "Access Denied: Super Admin account required." }, 403);
        }

        let body: any;
        try {
            body = await req.json();
        } catch {
            return json({ error: "Malformed request payload" }, 400);
        }

        const { action } = body;
        console.log(`[AdminMaintenance] User ${caller.id} executed action: ${action}`);

        if (action === "test") {
            return json({ success: true, message: "Security Link Active", admin_id: caller.id });
        }

        if (action === "clear_logs") {
            const { error } = await supabaseAdmin
                .from("payment_verification_logs")
                .delete()
                .neq("id", "00000000-0000-0000-0000-000000000000");
            if (error) throw error;
            return json({ success: true, message: "All telemetry logs have been purged." });
        }

        if (action === "clear_used_transactions") {
            const { error } = await supabaseAdmin
                .from("used_transactions")
                .delete()
                .neq("id", "00000000-0000-0000-0000-000000000000");
            if (error) throw error;
            return json({ success: true, message: "Used transaction registry has been reset." });
        }

        if (action === "release_transaction") {
            const { transaction_id, user_id } = body;
            if (!transaction_id || !user_id) return json({ error: "Transaction/User identification missing" }, 400);

            const [logRes, txRes] = await Promise.all([
                supabaseAdmin.from("payment_verification_logs").delete().eq("transaction_id", transaction_id).eq("user_id", user_id),
                supabaseAdmin.from("used_transactions").delete().eq("transaction_id", transaction_id).eq("user_id", user_id)
            ]);

            if (logRes.error || txRes.error) throw logRes.error || txRes.error;
            return json({ success: true, message: `Transaction ${transaction_id} released.` });
        }

        if (action === "delete_single") {
            const { table, id } = body;
            if (!table || !id) return json({ error: "Target definition missing" }, 400);
            const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
            if (error) throw error;
            return json({ success: true, message: "Record deleted." });
        }

        return json({ error: "Unknown protocol action requested." }, 400);

    } catch (e: any) {
        console.error("[AdminMaintenance] Global Error handler triggered:", e);
        return json({ error: e.message || "A critical error occurred in the security gateway." }, 500);
    }
});
