import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { safeError } from "@/lib/safe-error";
import { Save, Shield, CreditCard, Cog, Globe, Wallet, Zap, Key, Server, Info, Terminal, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminSettings() {
  const [plans, setPlans] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [planRes, settRes] = await Promise.all([
      supabase.from("pricing_plans").select("*").order("price"),
      supabase.from("system_settings").select("*"),
    ]);
    setPlans(planRes.data || []);
    setSettings(settRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updatePlanPrice = (id: string, price: string) => {
    setPlans((prev) => prev.map((p) => p.id === id ? { ...p, price: parseFloat(price) || 0 } : p));
  };

  const updateSetting = (id: string, value: string) => {
    setSettings((prev) => prev.map((s) => s.id === id ? { ...s, value } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const plan of plans) {
        const { error } = await supabase.from("pricing_plans").update({ price: plan.price }).eq("id", plan.id);
        if (error) throw error;
      }
      for (const setting of settings) {
        const { error } = await supabase.from("system_settings").update({ value: setting.value }).eq("id", setting.id);
        if (error) throw error;
      }
      toast.success("All settings successfully synchronized! 🚀");
    } catch (e) {
      toast.error(safeError(e, "Failed to synchronize settings"));
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">System Configuration</h1>
          <p className="text-muted-foreground font-medium italic">Master controls for pricing, security, and global endpoints.</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl h-12 px-8 font-black gradient-primary shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform"
        >
          {saving ? <><Terminal className="mr-2 h-4 w-4 animate-pulse" /> Syncing...</> : <><Save className="mr-2 h-5 w-5" /> Save Configuration</>}
        </Button>
      </div>

      <div className="grid gap-8">
        {/* Pricing Module */}
        <Card className="rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden border-l-4 border-l-primary">
          <CardHeader className="bg-primary/5 p-8 border-b border-border/40">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-xl font-black">Membership Pricing</CardTitle>
                <CardDescription className="text-sm font-bold opacity-70">Define global price points for all platform plans.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid gap-6 sm:grid-cols-3">
              {plans.map((plan) => (
                <div key={plan.id} className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-indigo-500 rounded-2xl blur opacity-0 group-hover:opacity-10 transition duration-500" />
                  <div className="relative p-6 rounded-2xl bg-background border border-border/40 space-y-4">
                    <Badge variant="outline" className="capitalize text-[10px] font-black tracking-widest bg-primary/5 border-primary/20 text-primary">
                      {plan.plan_type}
                    </Badge>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-black opacity-50">$</span>
                      <Input
                        type="number"
                        value={plan.price}
                        onChange={(e) => updatePlanPrice(plan.id, e.target.value)}
                        className="pl-8 h-12 rounded-xl border-border/40 bg-muted/5 font-black text-xl text-primary focus:ring-primary/20"
                        step="0.01"
                      />
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Base monthly rate</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Settings Module */}
        <Card className="rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden border-l-4 border-l-indigo-500">
          <CardHeader className="bg-indigo-500/5 p-8 border-b border-border/40">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shadow-inner">
                <Cog className="h-6 w-6 text-indigo-500" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-xl font-black text-indigo-500">Infrastructure Params</CardTitle>
                <CardDescription className="text-sm font-bold opacity-70">Core gateway endpoints and destination wallets.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {settings.map((s, i) => {
              const isWallet = s.key.includes('address') || s.key.includes('id');
              return (
                <div key={s.id} className="flex flex-col md:flex-row gap-6 p-6 rounded-2xl bg-muted/20 border border-border/30 hover:border-indigo-500/30 transition-colors">
                  <div className="md:w-1/3 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-indigo-500" />
                      <Label className="font-black text-xs uppercase tracking-widest">{s.key.replace(/_/g, " ")}</Label>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed pl-4">{s.description}</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="relative group">
                      {isWallet ? <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400 opacity-50" /> : <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400 opacity-50" />}
                      <Input
                        value={s.value}
                        onChange={(e) => updateSetting(s.id, e.target.value)}
                        className="pl-11 h-12 rounded-xl border-border/40 bg-background font-mono text-sm focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
          <CardFooter className="bg-amber-500/5 p-6 border-t border-border/40 rounded-b-[2rem] flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-xs font-bold text-amber-600/80 uppercase tracking-tight">Warning: Changes here impact live payment routing. Verify all addresses before syncing.</p>
          </CardFooter>
        </Card>

        {/* Advanced Section Placeholder */}
        <div className="p-10 rounded-[2.5rem] border border-dashed border-border flex flex-col items-center justify-center text-center space-y-4 opacity-40 hover:opacity-100 transition-opacity duration-500 group">
          <div className="h-16 w-16 rounded-full border-2 border-dashed border-border flex items-center justify-center group-hover:scale-110 transition-transform">
            <Zap className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-black uppercase tracking-[0.2em] text-xs">Experimental Features</p>
            <p className="text-sm font-medium text-muted-foreground mt-1">Additional configuration modules will appear here in future updates.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
