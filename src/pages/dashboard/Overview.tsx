import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { Activity, Key, CreditCard, Link as LinkIcon, Copy, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Overview() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [apiKey, setApiKey] = useState<any>(null);
  const [logCount, setLogCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [customEndpoint, setCustomEndpoint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [subRes, keyRes, logRes, successRes, configRes] = await Promise.all([
        supabase.from("subscriptions").select("*").eq("user_id", user.id).eq("status", "active").order("expires_at", { ascending: false }).limit(1),
        supabase.from("api_keys").select("*").eq("user_id", user.id).eq("is_active", true).limit(1),
        supabase.from("payment_verification_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("payment_verification_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "success"),
        supabase.from("api_configurations").select("custom_endpoint_url").eq("user_id", user.id).limit(1),
      ]);
      setSubscription(subRes.data?.[0] || null);
      setApiKey(keyRes.data?.[0] || null);
      setLogCount(logRes.count || 0);
      setSuccessCount(successRes.count || 0);
      setCustomEndpoint((configRes.data?.[0] as any)?.custom_endpoint_url || null);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const defaultEndpoint = `https://${projectId}.supabase.co/functions/v1/verify-payment`;
  const endpointUrl = customEndpoint || defaultEndpoint;
  const successRate = logCount > 0 ? Math.round((successCount / logCount) * 100) : 0;

  const copyEndpoint = () => {
    navigator.clipboard.writeText(endpointUrl);
    toast.success("Endpoint copied!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your account overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-glow border-border/50 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Subscription</CardTitle>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {subscription ? (
              <>
                <div className="text-2xl font-bold capitalize text-primary">{subscription.plan_type}</div>
                <p className="text-xs text-muted-foreground">
                  Expires {format(new Date(subscription.expires_at), "MMM d, yyyy")}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">None</div>
                <p className="text-xs text-muted-foreground">No active subscription</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="card-glow border-border/50 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent pointer-events-none" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${subscription ? "bg-success/10" : "bg-destructive/10"}`}>
              <Activity className={`h-4 w-4 ${subscription ? "text-success" : "text-destructive"}`} />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <Badge variant={subscription ? "default" : "destructive"} className={subscription ? "bg-success glow-success text-success-foreground" : ""}>
              {subscription ? "Active" : "Inactive"}
            </Badge>
          </CardContent>
        </Card>

        <Card className="card-glow border-border/50 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">API Key</CardTitle>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Key className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className={`text-2xl font-bold ${apiKey ? "text-success" : "text-muted-foreground"}`}>{apiKey ? "Active" : "Not Set"}</div>
            <p className="text-xs text-muted-foreground">
              {apiKey ? "Key is configured" : "Generate an API key"}
            </p>
          </CardContent>
        </Card>

        <Card className="card-glow border-border/50 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Verifications</CardTitle>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-primary">{logCount}</div>
            <p className="text-xs text-muted-foreground">
              {successRate}% success rate
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="card-glow border-primary/20 glow-primary overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2"><LinkIcon className="h-5 w-5 text-primary" /> Your API Endpoint</CardTitle>
          <CardDescription>Use this URL to verify payments from your website</CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex items-center gap-3">
            <code className="flex-1 block rounded-lg bg-muted/50 border border-border/50 p-4 text-sm break-all font-mono text-primary">{endpointUrl}</code>
            <Button variant="outline" size="icon" onClick={copyEndpoint} className="shrink-0 border-glow hover:glow-primary">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
