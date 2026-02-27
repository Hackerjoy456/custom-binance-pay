import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { safeError } from "@/lib/safe-error";
import { format } from "date-fns";
import {
  CheckCircle, Loader2, Copy, Wallet, CreditCard, Sparkles, Crown, Zap, Shield,
  Clock, BarChart3, ArrowRight, Star, HelpCircle, AlertCircle, Info, Layout,
  Trophy, Gem, Rocket, Check
} from "lucide-react";

/* ── Loading Skeleton ─────────────────────────────── */
function SubscriptionSkeleton() {
  return (
    <div className="space-y-12 max-w-5xl mx-auto py-10 px-4">
      <div className="text-center space-y-4">
        <div className="h-4 w-32 mx-auto rounded-full bg-muted/40 animate-pulse" />
        <div className="h-10 w-64 mx-auto rounded-xl bg-muted/40 animate-pulse" />
        <div className="h-5 w-80 mx-auto rounded-lg bg-muted/40 animate-pulse" />
      </div>
      <div className="grid gap-8 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-3xl border border-border/40 p-8 space-y-6 bg-muted/20">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-[2rem] bg-muted/40 animate-pulse" />
            </div>
            <div className="h-6 w-24 mx-auto rounded bg-muted/40 animate-pulse" />
            <div className="h-12 w-32 mx-auto rounded bg-muted/40 animate-pulse" />
            <div className="space-y-4 pt-4">
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="h-4 w-full rounded bg-muted/40 animate-pulse" />
              ))}
            </div>
            <div className="h-14 w-full rounded-2xl bg-muted/40 animate-pulse mt-6" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Decorative Components ────────────────────────── */
function GlowOrb({ className }: { className?: string }) {
  return (
    <div className={`absolute rounded-full pointer-events-none blur-[120px] opacity-40 mix-blend-screen ${className}`} />
  );
}

const PlanIcon = ({ type, active }: { type: string; active?: boolean }) => {
  const common = active ? "h-10 w-10 text-white" : "h-10 w-10 text-primary";
  switch (type) {
    case "weekly": return <Zap className={common} />;
    case "monthly": return <Gem className={common} />;
    case "yearly": return <Trophy className={common} />;
    default: return <Sparkles className={common} />;
  }
};

/* ── Main Component ───────────────────────────────── */
export default function Subscription() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [platformSettings, setPlatformSettings] = useState<Record<string, string>>({});

  const [payDialog, setPayDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentType, setPaymentType] = useState<"bep20" | "binance_pay">("bep20");
  const [txId, setTxId] = useState("");
  const [verifying, setVerifying] = useState(false);

  const load = async () => {
    if (!user) return;
    const [planRes, subRes, settRes] = await Promise.all([
      supabase.from("pricing_plans").select("*").eq("is_active", true).order("price", { ascending: true }),
      supabase.from("subscriptions").select("*").eq("user_id", user.id).eq("status", "active").order("expires_at", { ascending: false }).limit(1),
      supabase.from("system_settings").select("key, value").in("key", ["platform_bep20_address", "platform_binance_pay_id"]),
    ]);
    setPlans(planRes.data || []);
    setSubscription(subRes.data?.[0] || null);
    const s: Record<string, string> = {};
    for (const row of settRes.data || []) s[row.key] = row.value;
    setPlatformSettings(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const openPayment = (plan: any) => {
    setSelectedPlan(plan);
    setTxId("");
    setPaymentType("bep20");
    setPayDialog(true);
  };

  const copyAddress = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleVerify = async () => {
    if (!txId.trim()) { toast.error("Please enter a transaction ID"); return; }
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-subscription-payment", {
        body: {
          transaction_id: txId.trim(),
          payment_type: paymentType,
          plan_type: selectedPlan.plan_type,
        },
      });
      if (error) {
        let errMsg = "Verification failed";
        try {
          const errBody = await (error as any).context?.json?.();
          if (errBody?.error) errMsg = errBody.error;
        } catch { /* fallback */ }
        toast.error(errMsg);
      } else if (data?.verified) {
        toast.success(`${selectedPlan.plan_type} subscription activated! 🎉`);
        setPayDialog(false);
        load();
      } else {
        toast.error(data?.error || "Payment verification failed. Please check your transaction ID.");
      }
    } catch (e) {
      toast.error(safeError(e, "Verification failed"));
    }
    setVerifying(false);
  };

  if (loading) return <SubscriptionSkeleton />;

  const bep20Address = platformSettings.platform_bep20_address;
  const binancePayId = platformSettings.platform_binance_pay_id;
  const hasPaymentMethods = !!bep20Address || !!binancePayId;

  const planFeatures: Record<string, string[]> = {
    weekly: ["7 Days Access", "Binance Pay & BEP20", "Standard Analytics", "Discord Support"],
    monthly: ["30 Days Access", "Priority API Access", "Advanced Dashboard", "Dedicated Support", "Full Analytics"],
    yearly: ["365 Days Access", "Best Value (Save 40%)", "Custom Branding", "First Access to Features", "Global API Relay"],
  };

  const daysLeft = subscription
    ? Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="relative space-y-12 max-w-6xl mx-auto px-4 pb-20">
      <GlowOrb className="w-96 h-96 -top-20 -left-20 bg-primary/20" />
      <GlowOrb className="w-[500px] h-[500px] top-1/4 -right-40 bg-indigo-500/10" />

      {/* Header Section */}
      <div className="relative text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-1000">
        <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/5">
          <Star className="h-3 w-3 fill-current" />
          Gateway Membership
          <Star className="h-3 w-3 fill-current" />
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
          Select Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">Power Level</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Scale your custom payment ecosystem with our premium verification suites.
          Instant setup, global reach, and unmatched speed.
        </p>
      </div>

      {/* Active Subscription State */}
      {subscription && (
        <div className="relative group animate-in zoom-in-95 duration-700">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-indigo-500/50 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
          <Card className="rounded-[2rem] border-primary/20 bg-background/80 backdrop-blur-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-indigo-500 to-primary animate-border-flow" style={{ backgroundSize: '200% 200%' }} />
            <CardContent className="p-8 sm:p-10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className="h-20 w-20 rounded-[2.5rem] bg-primary flex items-center justify-center shadow-2xl shadow-primary/40 group-hover:scale-110 transition-transform duration-500">
                    <Crown className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black flex items-center gap-3">
                      Your Current Plan: <span className="capitalize text-primary">{subscription.plan_type}</span>
                    </h3>
                    <div className="flex items-center gap-2 mt-2 text-muted-foreground font-medium">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>Valid until {format(new Date(subscription.expires_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-8 pr-4">
                  <div className="text-center">
                    <span className="text-5xl font-black text-foreground drop-shadow-sm">{daysLeft}</span>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Days Remaining</span>
                  </div>
                  <div className="h-16 w-px bg-border/50" />
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Rocket className="h-7 w-7 text-primary animate-float" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pricing Grid */}
      <div className="grid gap-8 md:grid-cols-3">
        {plans.map((plan, i) => {
          const isPro = plan.plan_type === "monthly";
          const isCurrent = subscription?.plan_type === plan.plan_type;
          const features = planFeatures[plan.plan_type] || planFeatures.weekly;

          return (
            <div key={plan.id} className={`flex flex-col h-full animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-${(i + 1) * 200}`}>
              <Card className={`flex flex-col h-full rounded-[2.5rem] overflow-hidden transition-all duration-500 border-border/40 bg-card/50 backdrop-blur-sm group hover:-translate-y-3 hover:shadow-[0_20px_50px_rgba(0,0,0,0.2)] ${isPro ? 'border-primary/40 ring-1 ring-primary/20 bg-primary/5' : ''}`}>
                {isPro && (
                  <div className="h-1.5 w-full bg-gradient-to-r from-primary via-indigo-500 to-primary" />
                )}

                <CardHeader className="p-8 pt-10 text-center relative">
                  {isPro && (
                    <Badge className="absolute top-4 right-6 gradient-primary text-primary-foreground font-black text-[10px] uppercase py-1 px-3 rounded-full animate-pulse">
                      Recommended
                    </Badge>
                  )}
                  <div className={`mx-auto mb-6 h-20 w-20 rounded-[2rem] flex items-center justify-center transition-all duration-500 group-hover:rotate-6 ${isPro ? 'bg-primary shadow-2xl shadow-primary/40' : 'bg-muted/40'}`}>
                    <PlanIcon type={plan.plan_type} active={isPro} />
                  </div>
                  <CardTitle className="text-2xl font-black capitalize tracking-tight">{plan.plan_type}</CardTitle>
                  <CardDescription className="mt-2 font-medium">Essential for small platforms</CardDescription>
                  <div className="mt-8 flex items-baseline justify-center gap-1">
                    <span className={`text-6xl font-black ${isPro ? 'text-primary' : ''}`}>${plan.price}</span>
                    <span className="text-muted-foreground font-bold">/mo</span>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 p-8 pt-0">
                  <div className="space-y-4">
                    {features.map((f, j) => (
                      <div key={j} className="flex items-center gap-3">
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${isPro ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                          <Check className="h-3 w-3" />
                        </div>
                        <span className="text-sm font-semibold text-foreground/80">{f}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>

                <CardFooter className="p-8 pt-0">
                  <Button
                    className={`w-full h-14 rounded-2xl text-base font-black transition-all duration-300 ${isCurrent ? 'bg-muted text-muted-foreground' : isPro ? 'gradient-primary text-primary-foreground shadow-2xl shadow-primary/40 hover:scale-[1.02]' : 'bg-foreground text-background hover:scale-[1.02]'}`}
                    variant={isCurrent ? "secondary" : "default"}
                    onClick={() => openPayment(plan)}
                    disabled={!hasPaymentMethods || isCurrent}
                  >
                    {isCurrent ? "Current Plan" : "Upgrade Now"}
                    {!isCurrent && <ArrowRight className="ml-2 h-5 w-5" />}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Info Boxes Section */}
      <div className="grid gap-6 md:grid-cols-2 pt-8">
        <div className="p-8 rounded-[2rem] border border-border/40 bg-card/30 backdrop-blur-md hover:bg-card/50 transition-all group overflow-hidden relative">
          <div className="absolute -bottom-6 -right-6 h-24 w-24 bg-primary/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
          <div className="flex gap-6 items-start relative z-10">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h4 className="font-black text-lg mb-2">Important Note</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Verification can take up to 2-5 minutes depending on the network speed.
                Keep your transaction hash safe during the process.
              </p>
            </div>
          </div>
        </div>
        <div className="p-8 rounded-[2rem] border border-border/40 bg-card/30 backdrop-blur-md hover:bg-card/50 transition-all group overflow-hidden relative">
          <div className="absolute -bottom-6 -right-6 h-24 w-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
          <div className="flex gap-6 items-start relative z-10">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <HelpCircle className="h-6 w-6 text-indigo-500" />
            </div>
            <div>
              <h4 className="font-black text-lg mb-2">Need a custom plan?</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If you need more than 50k monthly verifications, reach out to our team
                on Discord for an enterprise solution tailored for you.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Dialog - Redesigned */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-primary/20 bg-background/95 backdrop-blur-2xl p-0 overflow-hidden shadow-2xl">
          <div className="p-8 space-y-8">
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-[1.5rem] bg-primary flex items-center justify-center shadow-xl shadow-primary/30">
                <Wallet className="h-8 w-8 text-white" />
              </div>
              <DialogTitle className="text-3xl font-black">Finalize Payment</DialogTitle>
              <DialogDescription className="text-base font-medium">
                Complete the transaction below to activate your <span className="text-primary font-bold">{selectedPlan?.plan_type}</span> plan.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="p-6 rounded-3xl border border-divider bg-muted/30">
                <div className="flex items-center justify-between mb-6">
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Amount to pay</p>
                    <p className="text-4xl font-black">${selectedPlan?.price} <span className="text-lg text-primary">USDT</span></p>
                  </div>
                  <PlanIcon type={selectedPlan?.plan_type || 'weekly'} />
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Select Network</Label>
                  <Select value={paymentType} onValueChange={(v) => setPaymentType(v as any)}>
                    <SelectTrigger className="h-14 rounded-2xl border-primary/20 bg-background font-bold text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {bep20Address && <SelectItem value="bep20" className="py-3"><span className="flex items-center gap-3"><Gem className="h-4 w-4" /> BEP20 (Binance Smart Chain)</span></SelectItem>}
                      {binancePayId && <SelectItem value="binance_pay" className="py-3"><span className="flex items-center gap-3"><Zap className="h-4 w-4" /> Binance Pay ID</span></SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-6 rounded-3xl border border-primary/10 bg-primary/5 space-y-4 animate-in fade-in transition-all">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-widest text-primary">Your Destination Address</p>
                    <Badge variant="outline" className="text-[10px] tracking-wider border-primary/20">Official Account</Badge>
                  </div>
                  <div className="flex gap-3">
                    <code className="flex-1 p-4 rounded-2xl bg-background border border-border text-sm font-mono break-all font-bold text-primary">
                      {paymentType === 'bep20' ? bep20Address : binancePayId}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-14 w-14 rounded-2xl shrink-0 group hover:bg-primary hover:text-white transition-colors"
                      onClick={() => copyAddress((paymentType === 'bep20' ? bep20Address : binancePayId)!)}
                    >
                      <Copy className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium text-center">Please verify the address twice before sending. Only send USDT.</p>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground pl-2">Confirm Transaction</Label>
                <div className="flex gap-3">
                  <Input
                    placeholder={paymentType === 'bep20' ? "Paste TX Hash (0x...)" : "Enter Order ID / Reference"}
                    className="h-14 rounded-2xl border-border bg-background font-mono text-sm px-5 focus:ring-2 focus:ring-primary/20"
                    value={txId}
                    onChange={(e) => setTxId(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-bold" onClick={() => setPayDialog(false)}>Cancel</Button>
              <Button
                className="flex-[2] h-14 rounded-2xl font-black text-lg gradient-primary shadow-2xl shadow-primary/30"
                onClick={handleVerify}
                disabled={verifying || !txId.trim()}
              >
                {verifying ? (
                  <><Loader2 className="mr-3 h-5 w-5 animate-spin" /> Verifying</>
                ) : "Activate Now"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
