import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { safeError } from "@/lib/safe-error";
import { Save } from "lucide-react";

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
      toast.success("Settings saved!");
    } catch (e) {
      toast.error(safeError(e, "Failed to save settings"));
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Pricing Plans</CardTitle>
          <CardDescription>Update subscription prices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {plans.map((plan) => (
            <div key={plan.id} className="flex items-center gap-4">
              <Label className="w-24 capitalize">{plan.plan_type}</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input type="number" value={plan.price} onChange={(e) => updatePlanPrice(plan.id, e.target.value)} className="w-32" step="0.01" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Configuration</CardTitle>
          <CardDescription>Global settings for the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.map((s) => (
            <div key={s.id} className="flex items-center gap-4">
              <div className="w-48">
                <Label className="text-sm">{s.key.replace(/_/g, " ")}</Label>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
              <Input value={s.value} onChange={(e) => updateSetting(s.id, e.target.value)} className="w-40" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save All Settings"}
      </Button>
    </div>
  );
}
