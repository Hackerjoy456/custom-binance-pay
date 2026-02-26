import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { safeError } from "@/lib/safe-error";
import { format } from "date-fns";
import { Copy, Trash2, Eye, EyeOff, ShieldAlert, RefreshCw, Key } from "lucide-react";
import { Link } from "react-router-dom";

export default function ApiKeys() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<any[]>([]);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [regenerating, setRegenerating] = useState(false);

  const load = async () => {
    if (!user) return;
    const [keyRes, subRes] = await Promise.all([
      supabase.from("api_keys").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("id").eq("user_id", user.id).eq("status", "active").gte("expires_at", new Date().toISOString()).limit(1),
    ]);
    setKeys(keyRes.data || []);
    setHasSubscription((subRes.data?.length || 0) > 0);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const generateOrRegenerateKey = async () => {
    if (!user || !hasSubscription) return;
    setRegenerating(true);
    await supabase.from("api_keys").update({ is_active: false }).eq("user_id", user.id).eq("is_active", true);
    const { error } = await supabase.from("api_keys").insert({ user_id: user.id });
    if (error) toast.error(safeError(error, "Failed to generate API key"));
    else { toast.success("New API key generated!"); load(); }
    setRegenerating(false);
  };

  const revokeKey = async (id: string) => {
    await supabase.from("api_keys").update({ is_active: false }).eq("id", id);
    toast.success("API key revoked");
    load();
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Copied to clipboard");
  };

  const toggleVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  if (!hasSubscription && keys.filter(k => k.is_active).length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">Manage your API keys for payment verification</p>
        </div>
        <Card className="card-glow border-border/50">
          <CardContent className="py-12 text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center glow-primary">
              <Key className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground">You need an active subscription to get an API key.</p>
            <p className="text-sm text-muted-foreground">An API key will be automatically generated when you purchase a subscription.</p>
            <Button className="glow-primary" asChild>
              <Link to="/dashboard/subscription">Purchase Subscription</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">Manage your API keys for payment verification</p>
        </div>
        {hasSubscription && (
          <Button variant="outline" onClick={generateOrRegenerateKey} disabled={regenerating} className="border-primary/30 hover:glow-primary">
            <RefreshCw className="mr-2 h-4 w-4" /> {regenerating ? "Generating..." : keys.some(k => k.is_active) ? "Regenerate Key" : "Generate API Key"}
          </Button>
        )}
      </div>

      {!hasSubscription && (
        <Card className="border-destructive/30 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-destructive/5 to-transparent pointer-events-none" />
          <CardContent className="relative py-4 text-sm text-destructive flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            Your subscription has expired. Your API key won't work for verification until you renew.
            <Button variant="link" className="text-primary p-0 h-auto" asChild>
              <Link to="/dashboard/subscription">Renew now</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {keys.length === 0 ? (
          <Card className="card-glow">
            <CardContent className="py-12 text-center text-muted-foreground">
              No API keys yet. Purchase a subscription to get started.
            </CardContent>
          </Card>
        ) : (
          keys.map((k) => (
            <Card key={k.id} className={`card-glow overflow-hidden relative ${k.is_active ? "border-primary/20" : "border-border/50 opacity-60"}`}>
              {k.is_active && <div className="absolute left-0 top-0 bottom-0 w-1 gradient-primary" />}
              <CardContent className="relative flex items-center justify-between py-4">
                <div className="space-y-1 pl-2">
                  <div className="flex items-center gap-3">
                    <code className="text-sm font-mono">
                      {visibleKeys.has(k.id) ? k.api_key : `${k.api_key.slice(0, 8)}${"•".repeat(24)}${k.api_key.slice(-8)}`}
                    </code>
                    <Badge variant={k.is_active ? "default" : "secondary"} className={k.is_active ? "bg-success text-success-foreground glow-success" : ""}>
                      {k.is_active ? "Active" : "Revoked"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Created {format(new Date(k.created_at), "MMM d, yyyy")}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => toggleVisibility(k.id)} className="hover:text-primary">
                    {visibleKeys.has(k.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => copyKey(k.api_key)} className="hover:text-primary">
                    <Copy className="h-4 w-4" />
                  </Button>
                  {k.is_active && (
                    <Button variant="ghost" size="icon" onClick={() => revokeKey(k.id)} className="hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
