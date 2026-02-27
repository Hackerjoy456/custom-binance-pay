import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { safeError } from "@/lib/safe-error";
import { format } from "date-fns";
import {
  Copy, Trash2, Eye, EyeOff, ShieldAlert, RefreshCw, Key,
  Terminal, ShieldCheck, ChevronRight, Zap, Info, ShieldX
} from "lucide-react";
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
    if (error) toast.error(safeError(error, "Failed to generate security token"));
    else { toast.success("New API identity generated!"); load(); }
    setRegenerating(false);
  };

  const revokeKey = async (id: string) => {
    await supabase.from("api_keys").update({ is_active: false }).eq("id", id);
    toast.success("Security token revoked.");
    load();
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Token copied to clipboard.");
  };

  const toggleVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  if (!hasSubscription && keys.filter(k => k.is_active).length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">Access Tokens</h1>
          <p className="text-muted-foreground font-medium">Generate and manage secrets for your API integration.</p>
        </div>
        <Card className="rounded-[3rem] border-primary/20 bg-background/50 backdrop-blur-xl overflow-hidden shadow-2xl">
          <CardContent className="p-20 text-center space-y-8">
            <div className="mx-auto h-24 w-24 rounded-[2rem] bg-primary/10 flex items-center justify-center shadow-[inset_0_0_20px_rgba(var(--primary),0.1)] relative">
              <Key className="h-12 w-12 text-primary" />
              <div className="absolute -inset-1 bg-primary/20 rounded-[2.1rem] blur-xl opacity-30 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black tracking-tight">Activation Required</h3>
              <p className="text-muted-foreground font-medium max-w-sm mx-auto">
                An active subscription is required to generate system-wide API access tokens.
              </p>
            </div>
            <Button className="h-14 px-10 rounded-2xl font-black text-lg gradient-primary shadow-xl shadow-primary/20 hover:scale-105 transition-transform" asChild>
              <Link to="/dashboard/subscription">Purchase Membership</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col sm:flex-row items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-3 w-3 text-primary" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Security Layer Alpha</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Access Tokens</h1>
          <p className="text-muted-foreground font-medium">Manage your production secrets. Keep them confidential.</p>
        </div>
        {hasSubscription && (
          <Button onClick={generateOrRegenerateKey} disabled={regenerating} className="h-12 px-6 rounded-xl font-black gradient-primary shadow-xl shadow-primary/20 active:scale-95 transition-all">
            <RefreshCw className={`mr-2 h-5 w-5 ${regenerating ? 'animate-spin' : ''}`} />
            {keys.some(k => k.is_active) ? "Rotate Token" : "Generate Token"}
          </Button>
        )}
      </div>

      {!hasSubscription && (
        <Card className="rounded-[2rem] border-red-500/20 bg-red-500/5 backdrop-blur-md overflow-hidden animate-pulse">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <ShieldX className="h-5 w-5 text-red-500" />
              </div>
              <div className="space-y-0.5">
                <p className="font-black text-sm text-red-500 uppercase tracking-widest leading-none">Subscription Expired</p>
                <p className="text-xs font-semibold text-red-600/70">Your existing tokens have been automatically restrained.</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-xl border-red-500/20 text-red-500 hover:bg-red-500/10 font-black h-10" asChild>
              <Link to="/dashboard/subscription">Renew Access</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {keys.length === 0 ? (
          <Card className="rounded-[2rem] border-dashed border-border p-20 text-center opacity-40">
            <p className="font-bold text-muted-foreground uppercase tracking-widest text-xs">No key entities found in the registry.</p>
          </Card>
        ) : (
          keys.map((k) => (
            <Card key={k.id} className={`rounded-3xl transition-all duration-300 overflow-hidden relative group ${k.is_active ? "border-primary/20 bg-card/40" : "border-border/40 opacity-50 bg-muted/20"}`}>
              {k.is_active && <div className="absolute left-0 top-0 bottom-0 w-1 gradient-primary" />}
              <CardContent className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${k.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Key className={`h-4 w-4 ${k.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <Badge variant={k.is_active ? "default" : "secondary"} className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${k.is_active ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 px-4" : "border-none"}`}>
                      {k.is_active ? "Authorized" : "Revoked"}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Token Identifier</p>
                    <div className="relative group/code">
                      <code className="block rounded-xl bg-background/80 border border-border/40 p-4 font-mono text-sm font-bold shadow-inner min-w-[300px] break-all">
                        {visibleKeys.has(k.id) ? k.api_key : `${k.api_key.slice(0, 12)}${"•".repeat(24)}${k.api_key.slice(-12)}`}
                      </code>
                      <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover/code:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Terminal className="h-3 w-3" /> Created: {format(new Date(k.created_at), "MMM d, yyyy")}</span>
                    <span className="h-1 w-1 rounded-full bg-border" />
                    <span className="flex items-center gap-1.5"><Zap className="h-3 w-3" /> Performance: Optimized</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 md:pt-0 pt-4 border-t md:border-t-0 border-border/30">
                  <div className="flex items-center p-1 rounded-2xl border border-border/40 bg-background/50">
                    <Button variant="ghost" size="icon" onClick={() => toggleVisibility(k.id)} className="h-12 w-12 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                      {visibleKeys.has(k.id) ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => copyKey(k.api_key)} className="h-12 w-12 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                      <Copy className="h-5 w-5" />
                    </Button>
                    {k.is_active && (
                      <div className="flex items-center ml-1 pl-1 border-l border-border/40">
                        <Button variant="ghost" size="icon" onClick={() => revokeKey(k.id)} className="h-12 w-12 rounded-xl text-destructive hover:bg-destructive/10 transition-all">
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="p-8 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-4">
        <Info className="h-6 w-6 text-indigo-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-black text-indigo-500 uppercase tracking-widest">Master Security Tip</p>
          <p className="text-sm font-medium text-muted-foreground leading-relaxed">
            Always rotate your tokens if you suspect a breach. Revoking a token will immediately terminate all active verification sessions associated with it.
          </p>
        </div>
      </div>
    </div>
  );
}
