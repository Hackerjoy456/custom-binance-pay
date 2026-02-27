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
    return json({ error: "Not authenticated" }, 401);
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
  const { data: { user: caller } } = await supabaseUser.auth.getUser();
  if (!caller) {
    return json({ error: "Not authenticated" }, 401);
  }

  // Check caller is admin
  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
    _user_id: caller.id,
    _role: "admin",
  });
  if (!isAdmin) {
    return json({ error: "Unauthorized" }, 403);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const { action, target_user_id } = body;

  if (!target_user_id || !action) {
    return json({ error: "Missing action or target_user_id" }, 400);
  }

  // Prevent self-actions
  if (target_user_id === caller.id) {
    return json({ error: "Cannot perform this action on yourself" }, 400);
  }

  try {
    if (action === "ban") {
      // Ban: revoke all keys, cancel subscriptions, disable auth user
      await Promise.all([
        supabaseAdmin.from("api_keys").update({ is_active: false }).eq("user_id", target_user_id),
        supabaseAdmin.from("subscriptions").update({ status: "cancelled" as any }).eq("user_id", target_user_id).eq("status", "active"),
        supabaseAdmin.from("user_roles").delete().eq("user_id", target_user_id).eq("role", "admin"),
        supabaseAdmin.from("profiles").update({ is_banned: true }).eq("user_id", target_user_id),
      ]);

      // Ban in auth (set ban_duration)
      const { error } = await supabaseAdmin.auth.admin.updateUserById(target_user_id, {
        ban_duration: "876000h", // ~100 years
      });

      // Force sign out
      await supabaseAdmin.auth.admin.signOut(target_user_id);

      if (error) {
        return json({ error: "Failed to ban user: " + error.message }, 500);
      }

      return json({ success: true, message: "User banned successfully" });
    }

    if (action === "unban") {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(target_user_id, {
        ban_duration: "none",
      });
      await supabaseAdmin.from("profiles").update({ is_banned: false }).eq("user_id", target_user_id);
      if (error) {
        return json({ error: "Failed to unban user: " + error.message }, 500);
      }
      return json({ success: true, message: "User unbanned successfully" });
    }

    if (action === "delete") {
      // Delete all user data first
      await Promise.all([
        supabaseAdmin.from("api_keys").delete().eq("user_id", target_user_id),
        supabaseAdmin.from("api_configurations").delete().eq("user_id", target_user_id),
        supabaseAdmin.from("subscriptions").delete().eq("user_id", target_user_id),
        supabaseAdmin.from("payment_verification_logs").delete().eq("user_id", target_user_id),
        supabaseAdmin.from("used_transactions").delete().eq("user_id", target_user_id),
        supabaseAdmin.from("user_roles").delete().eq("user_id", target_user_id),
        supabaseAdmin.from("profiles").delete().eq("user_id", target_user_id),
      ]);

      // Delete auth user
      const { error } = await supabaseAdmin.auth.admin.deleteUser(target_user_id);
      if (error) {
        return json({ error: "Failed to delete user: " + error.message }, 500);
      }

      return json({ success: true, message: "User deleted successfully" });
    }

    if (action === "create") {
      const { email, password, full_name, role } = body;
      if (!email || !password) {
        return json({ error: "Email and password are required for creation" }, 400);
      }

      const { data: { user: newUser }, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || "" }
      });

      if (createError) {
        return json({ error: "Failed to create user: " + createError.message }, 500);
      }

      if (newUser && role === "admin") {
        await supabaseAdmin.from("user_roles").insert({
          user_id: newUser.id,
          role: "admin"
        });
      }

      return json({ success: true, message: "User created successfully", user_id: newUser?.id });
    }

    return json({ error: "Unknown action. Use 'ban', 'unban', 'delete', or 'create'" }, 400);
  } catch (e) {
    return json({ error: "An unexpected error occurred" }, 500);
  }
});
