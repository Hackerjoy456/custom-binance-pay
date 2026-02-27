import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import {
  Activity, Key, CreditCard, Link as LinkIcon, Copy, TrendingUp,
  ChevronRight, Terminal, Globe, ShieldCheck, Zap, Package, Eye
} from "lucide-react";
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

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const supabaseEndpoint = `https://${projectId}.supabase.co/functions/v1/verify-payment`;

  const origin = typeof window !== "undefined" ? window.location.origin : null;
  const isCustomDomain = origin ? !origin.includes(`${projectId}.supabase.co`) : false;
  const defaultEndpoint = isCustomDomain && origin
    ? `${origin}/api/verify-payment`
    : supabaseEndpoint;

  const endpointUrl = customEndpoint || defaultEndpoint;
  const successRate = logCount > 0 ? Math.round((successCount / logCount) * 100) : 0;

  const copyEndpoint = () => {
    navigator.clipboard.writeText(endpointUrl);
    toast.success("Endpoint copied!");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500">Account Verified</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Overview</h1>
          <p className="text-muted-foreground font-medium">Quick stats and endpoint configuration for your project.</p>
        </div>
        <div className="h-12 flex items-center gap-4 px-6 rounded-2xl bg-muted/30 border border-border/40">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest leading-none">Status: Nominal</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Subscription Stat */}
        <Card className="rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden group hover:-translate-y-1 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <Package className="h-6 w-6 text-indigo-500" />
              </div>
              {subscription && <Badge className="gradient-primary text-[10px] font-black uppercase py-0.5 px-2">Active</Badge>}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Current Plan</p>
              <h3 className="text-2xl font-black capitalize tracking-tight">{subscription?.plan_type || "No Plan"}</h3>
              {subscription ? (
                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">
                  Ends {format(new Date(subscription.expires_at), "MMM d, yyyy")}
                </p>
              ) : (
                <p className="text-[10px] font-bold text-destructive uppercase mt-1">Access Restrained</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* API Status Stat */}
        <Card className="rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden group hover:-translate-y-1 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <Key className="h-6 w-6 text-primary" />
              </div>
              {apiKey && <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Credential Status</p>
              <h3 className={`text-2xl font-black tracking-tight ${apiKey ? "text-foreground" : "text-muted-foreground"}`}>
                {apiKey ? "Live & Secure" : "Missing Key"}
              </h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">
                {apiKey ? "Standard Auth Protocol" : "Requires Configuration"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Usage Stat */}
        <Card className="rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden group hover:-translate-y-1 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <Activity className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Real-time</div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Verification Load</p>
              <h3 className="text-2xl font-black tracking-tight">{logCount} <span className="text-xs font-bold text-muted-foreground opacity-50">Total</span></h3>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="h-1 w-full bg-muted/50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${successRate}%` }} />
                </div>
                <span className="text-[10px] font-black text-emerald-500 whitespace-nowrap">{successRate}% Hit</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Global Hitrate Stat */}
        <Card className="rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden group hover:-translate-y-1 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6 text-amber-500" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Successful Hits</p>
              <h3 className="text-2xl font-black tracking-tight">{successCount}</h3>
              <p className="text-[10px] font-bold text-amber-500 uppercase mt-1 flex items-center gap-1">
                Confirmed settlements
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Endpoint Card */}
      <Card className="rounded-[2.5rem] border-primary/20 bg-background/50 backdrop-blur-md overflow-hidden relative shadow-2xl group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <Globe className="h-40 w-40 text-primary rotate-12" />
        </div>
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="h-3.5 w-3.5 text-primary" />
            </div>
            <CardTitle className="text-xl font-black tracking-tight">Deployment Endpoint</CardTitle>
          </div>
          <CardDescription className="text-base font-medium">Integration URL for your custom website payment verification.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4 relative">
          <div className="flex flex-col md:flex-row items-stretch gap-4">
            <div className="flex-1 relative group/code">
              <div className="absolute -inset-1 bg-primary/20 rounded-2xl blur opacity-0 group-hover/code:opacity-100 transition duration-500" />
              <code className="relative block h-full min-h-[56px] rounded-2xl bg-background border border-primary/20 p-4 pt-4 text-sm break-all font-mono font-bold text-primary shadow-inner">
                {endpointUrl}
              </code>
            </div>
            <Button size="lg" onClick={copyEndpoint} className="h-14 px-8 rounded-2xl font-black text-white gradient-primary shadow-xl shadow-primary/20 active:scale-95 transition-all">
              <Copy className="h-5 w-5 mr-3" /> Copy URL
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-8 items-center border-t border-border/40 pt-8">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Security Layer</p>
                <p className="text-xs font-bold font-mono">Cloud-Shield Active</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
                <Zap className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Network Speed</p>
                <p className="text-xs font-bold font-mono">&lt; 150ms Latency</p>
              </div>
            </div>
            <div className="ml-auto">
              <Button variant="ghost" className="text-xs font-black uppercase tracking-widest h-9 rounded-xl" asChild>
                <a href="/dashboard/integration">View Guide <ChevronRight className="ml-2 h-3.5 w-3.5" /></a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
