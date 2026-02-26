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
import { CheckCircle, Loader2, Copy, Wallet, CreditCard, Sparkles, Crown, Zap, Shield, Clock, BarChart3, ArrowRight, Star } from "lucide-react";

/* ── Loading Skeleton ─────────────────────────────── */
function SubscriptionSkeleton() {
  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Header skeleton */}
      <div className="text-center space-y-3">
        <div className="h-9 w-64 mx-auto rounded-lg skeleton-glow animate-shimmer" />
        <div className="h-5 w-80 mx-auto rounded-md skeleton-glow animate-shimmer" style={{ animationDelay: "0.1s" }} />
      </div>
      {/* Card skeletons */}
      <div className="grid gap-6 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border/30 p-6 space-y-5" style={{ animationDelay: `${i * 0.15}s` }}>
            <div className="flex justify-center">
              <div className="h-14 w-14 rounded-2xl skeleton-glow animate-shimmer animate-skeleton-pulse" />
            </div>
            <div className="h-6 w-24 mx-auto rounded skeleton-glow animate-shimmer" />
            <div className="h-12 w-32 mx-auto rounded skeleton-glow animate-shimmer" />
            <div className="space-y-3 pt-4">
              {[0, 1, 2].map((j) => (
                <div key={j} className="h-4 w-full rounded skeleton-glow animate-shimmer" style={{ animationDelay: `${j * 0.08}s` }} />
              ))}
            </div>
            <div className="h-11 w-full rounded-lg skeleton-glow animate-shimmer mt-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Decorative Orb ───────────────────────────────── */
function GlowOrb({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`absolute rounded-full pointer-events-none blur-3xl ${className}`} style={style} />
  );
}

export default function Subscription() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [platformSettings, setPlatformSettings] = useState<Record<string, string>>({});

  // Payment dialog state
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
        if (errMsg === "Verification failed") errMsg = error.message || errMsg;
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

  const planIcons: Record<string, any> = { weekly: Zap, monthly: Crown, yearly: Sparkles };
  const planColors: Record<string, string> = {
    weekly: "from-primary/20 to-primary/5",
    monthly: "from-primary/30 to-primary/10",
    yearly: "from-primary/25 to-amber-500/10",
  };
  const planFeatures: Record<string, string[]> = {
    weekly: ["Payment verification API", "BEP20 + Binance Pay", "Basic analytics"],
    monthly: ["Payment verification API", "BEP20 + Binance Pay", "Advanced analytics", "Priority support"],
    yearly: ["Payment verification API", "BEP20 + Binance Pay", "Full analytics suite", "Priority support", "Custom endpoint"],
  };

  const daysLeft = subscription
    ? Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const periodLabel = (t: string) => t === "weekly" ? "week" : t === "monthly" ? "month" : "year";

  return (
    <div className="relative space-y-10 max-w-5xl mx-auto overflow-hidden">
      {/* Background orbs */}
      <GlowOrb className="w-96 h-96 -top-48 -left-48 bg-primary/8 animate-pulse-glow" />
      <GlowOrb className="w-72 h-72 top-1/3 -right-36 bg-primary/6 animate-pulse-glow" style={{ animationDelay: "1s" }} />
      <GlowOrb className="w-64 h-64 bottom-20 left-1/4 bg-primary/4 animate-pulse-glow" style={{ animationDelay: "2s" }} />

      {/* Header */}
      <div className="relative text-center space-y-3 opacity-0 animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold uppercase tracking-widest mb-2 animate-glow-ring">
          <Star className="h-3 w-3" />
          Premium Plans
          <Star className="h-3 w-3" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Choose Your <span className="text-primary text-glow-strong">Plan</span>
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Unlock the full power of payment verification. Pay with crypto, activate instantly.
        </p>
      </div>

      {/* Active subscription banner */}
      {subscription && (
        <Card className="border-primary/40 glow-primary-intense overflow-hidden relative opacity-0 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/12 via-primary/5 to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-0.5 gradient-primary gradient-shimmer animate-shimmer" />
          <CardContent className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-5 px-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center shrink-0 animate-float shadow-lg shadow-primary/20">
                <CheckCircle className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">Active Plan</span>
                  <Badge className="capitalize gradient-primary text-primary-foreground font-bold px-3 py-0.5 shadow-md shadow-primary/20">
                    {subscription.plan_type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Expires {format(new Date(subscription.expires_at), "MMMM d, yyyy")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-3xl font-extrabold text-primary text-glow-strong animate-count-up">{daysLeft}</span>
                <span className="text-xs text-muted-foreground block mt-0.5 uppercase tracking-wider font-semibold">days left</span>
              </div>
              <div className="h-12 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center animate-pulse-glow">
                <Clock className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan, index) => {
          const isCurrent = subscription?.plan_type === plan.plan_type;
          const isPopular = plan.plan_type === "monthly";
          const PlanIcon = planIcons[plan.plan_type] || Zap;
          const features = planFeatures[plan.plan_type] || planFeatures.weekly;
          const gradientBg = planColors[plan.plan_type] || planColors.weekly;
          const delayClass = index === 0 ? "animate-fade-up-delay-1" : index === 1 ? "animate-fade-up-delay-2" : "animate-fade-up-delay-3";

          return (
            <Card
              key={plan.id}
              className={`group relative overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl opacity-0 ${delayClass} ${
                isCurrent
                  ? "border-primary/60 glow-primary-intense"
                  : isPopular
                  ? "border-primary/30 glow-primary"
                  : "border-border/50 card-glow"
              }`}
            >
              {/* Top accent line */}
              {isPopular && (
                <div className="absolute -top-px left-0 right-0 h-1 gradient-primary animate-border-flow" style={{ backgroundSize: "200% 200%" }} />
              )}

              {/* Popular badge */}
              {isPopular && (
                <div className="absolute top-4 right-4 z-10">
                  <Badge className="gradient-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 shadow-lg shadow-primary/25 animate-pulse-glow">
                    <Star className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}

              {/* Current badge */}
              {isCurrent && !isPopular && (
                <div className="absolute top-4 right-4 z-10">
                  <Badge variant="outline" className="border-primary/40 text-primary text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 animate-glow-ring">
                    Current
                  </Badge>
                </div>
              )}

              {/* Background gradient on hover */}
              <div className={`absolute inset-0 bg-gradient-to-b ${gradientBg} pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />

              {/* Shimmer line on hover */}
              <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute top-0 left-0 right-0 h-px gradient-shimmer animate-shimmer" />
              </div>

              <CardHeader className="text-center relative pb-2 pt-8">
                <div className={`mx-auto mb-4 h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl ${
                  isPopular
                    ? "gradient-primary shadow-lg shadow-primary/25 group-hover:shadow-primary/40"
                    : "bg-primary/10 group-hover:bg-primary/20"
                }`}>
                  <PlanIcon className={`h-8 w-8 transition-transform duration-300 group-hover:rotate-12 ${isPopular ? "text-primary-foreground" : "text-primary"}`} />
                </div>
                <CardTitle className="capitalize text-xl font-bold tracking-wide">{plan.plan_type}</CardTitle>
                <div className="mt-5 mb-1">
                  <span className={`text-5xl font-black tracking-tighter transition-all duration-300 ${isPopular ? "text-primary text-glow-strong group-hover:text-glow-strong" : "group-hover:text-primary"}`}>
                    ${plan.price}
                  </span>
                  <span className="text-muted-foreground text-sm ml-1 font-medium">
                    /{periodLabel(plan.plan_type)}
                  </span>
                </div>
                {plan.description && (
                  <CardDescription className="mt-2 text-xs leading-relaxed">{plan.description}</CardDescription>
                )}
              </CardHeader>

              <CardContent className="pt-4 px-6">
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-5" />
                <ul className="space-y-3 text-sm">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2.5 group/item transition-transform duration-200 hover:translate-x-1">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 transition-colors duration-200 group-hover/item:bg-primary/20">
                        <CheckCircle className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-muted-foreground transition-colors duration-200 group-hover/item:text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-4 pb-7 px-6">
                <Button
                  className={`w-full h-12 font-bold text-sm tracking-wide transition-all duration-300 ${
                    !isCurrent && isPopular
                      ? "gradient-primary text-primary-foreground glow-primary hover:glow-primary-intense hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02]"
                      : !isCurrent
                      ? "hover:glow-primary hover:scale-[1.02]"
                      : "hover:border-primary/60"
                  }`}
                  variant={isCurrent ? "outline" : "default"}
                  onClick={() => openPayment(plan)}
                  disabled={!hasPaymentMethods}
                >
                  {isCurrent ? "Renew Plan" : "Get Started"}
                  {!isCurrent && <ArrowRight className="h-4 w-4 ml-1 transition-transform duration-300 group-hover:translate-x-1" />}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Trust indicators */}
      <div className="flex flex-wrap items-center justify-center gap-10 text-sm text-muted-foreground py-6 opacity-0 animate-fade-up" style={{ animationDelay: "0.4s" }}>
        {[
          { icon: Shield, label: "Secure crypto payments" },
          { icon: Zap, label: "Instant activation" },
          { icon: BarChart3, label: "Real-time analytics" },
        ].map(({ icon: Icon, label }, i) => (
          <div key={i} className="flex items-center gap-2.5 group cursor-default transition-colors duration-300 hover:text-foreground">
            <div className="h-8 w-8 rounded-lg bg-primary/8 flex items-center justify-center transition-all duration-300 group-hover:bg-primary/15 group-hover:glow-primary group-hover:scale-110">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <span className="font-medium">{label}</span>
          </div>
        ))}
      </div>

      {!hasPaymentMethods && (
        <p className="text-sm text-destructive text-center animate-fade-up">
          Payment methods are not configured yet. Please contact the admin.
        </p>
      )}

      {/* Payment Dialog */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="sm:max-w-lg border-primary/20 glow-primary-strong">
          <div className="absolute top-0 left-0 right-0 h-0.5 gradient-primary" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <CreditCard className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <span>Pay for </span>
                <span className="capitalize text-primary">{selectedPlan?.plan_type}</span>
                <span> plan</span>
                <span className="block text-2xl font-black text-primary text-glow mt-0.5">${selectedPlan?.price}</span>
              </div>
            </DialogTitle>
            <DialogDescription>
              Send the exact amount below, then paste your transaction ID to verify.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Payment Method</Label>
              <Select value={paymentType} onValueChange={(v) => setPaymentType(v as any)}>
                <SelectTrigger className="border-primary/20 focus:border-primary h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {bep20Address && <SelectItem value="bep20"><span className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> BEP20 (BSC)</span></SelectItem>}
                  {binancePayId && <SelectItem value="binance_pay"><span className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Binance Pay</span></SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {paymentType === "bep20" && bep20Address && (
              <div className="space-y-2 rounded-xl border border-primary/15 bg-primary/5 p-5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Send exactly <span className="text-primary font-bold">${selectedPlan?.price} USDT</span> (BEP20/BSC) to:
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-background border border-primary/20 p-3.5 text-xs break-all font-mono text-primary glow-primary">{bep20Address}</code>
                  <Button variant="outline" size="icon" onClick={() => copyAddress(bep20Address)} className="border-primary/20 hover:glow-primary shrink-0 h-11 w-11">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Network: BNB Smart Chain (BEP20). Send USDT only.</p>
              </div>
            )}

            {paymentType === "binance_pay" && binancePayId && (
              <div className="space-y-2 rounded-xl border border-primary/15 bg-primary/5 p-5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Send exactly <span className="text-primary font-bold">${selectedPlan?.price}</span> via Binance Pay to:
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-background border border-primary/20 p-3.5 text-sm break-all font-mono text-primary font-bold glow-primary">{binancePayId}</code>
                  <Button variant="outline" size="icon" onClick={() => copyAddress(binancePayId)} className="border-primary/20 hover:glow-primary shrink-0 h-11 w-11">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-primary font-bold">
                {paymentType === "bep20" ? "Transaction Hash (TX Hash)" : "Order ID"}
              </Label>
              <Input
                className="border-primary/30 focus:border-primary focus:glow-primary transition-all duration-300 h-11"
                placeholder={paymentType === "bep20" ? "0x..." : "Enter your Binance Pay order ID"}
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {paymentType === "bep20"
                  ? "Paste the BSCScan transaction hash after sending."
                  : "Paste the Binance Pay order ID from your payment confirmation."}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setPayDialog(false)} className="h-11">Cancel</Button>
            <Button
              onClick={handleVerify}
              disabled={verifying || !txId.trim()}
              className="glow-primary min-w-[160px] h-11 font-bold hover:glow-primary-intense transition-all duration-300"
            >
              {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {verifying ? "Verifying..." : "Verify Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
