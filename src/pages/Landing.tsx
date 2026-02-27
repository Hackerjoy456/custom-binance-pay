import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Shield, Zap, Globe, ArrowRight, Code, Sparkles } from "lucide-react";

const features = [
  { icon: Zap, title: "Instant Verification", desc: "Verify Binance Pay & BEP20 payments in seconds" },
  { icon: Shield, title: "Secure API", desc: "Your credentials are encrypted and never exposed" },
  { icon: Globe, title: "Easy Integration", desc: "Get a simple API endpoint to add to any website" },
  { icon: Code, title: "Developer Friendly", desc: "Clean REST API with comprehensive documentation" },
];

const plans = [
  {
    type: "Starter Protocol",
    price: "$5",
    period: "/week",
    features: [
      "1,000 Verified Transactions",
      "Binance Pay Integration",
      "BEP20 Network Access",
      "Standard Webhook Relay",
      "Email Support (24h)"
    ]
  },
  {
    type: "Business Core",
    price: "$15",
    period: "/month",
    features: [
      "10,000 Verified Transactions",
      "Full API Customization",
      "Live Telemetry Dashboard",
      "Priority Webhook Queue",
      "Exclusive Discord Support",
      "Custom Gateway Branding"
    ],
    popular: true
  },
  {
    type: "Enterprise Alpha",
    price: "$99",
    period: "/year",
    features: [
      "Unlimited Verifications",
      "Ultra-Low Latency Nodes",
      "Advanced Usage Analytics",
      "Dedicated Instance Setup",
      "Direct Developer JSON API",
      "White-Label Implementation",
      "SLA 99.9% Guarantee"
    ]
  },
];

const faqs = [
  { q: "How does payment verification work?", a: "You provide your Binance API credentials. When a customer pays, your website sends the transaction ID to our API, and we verify it directly with Binance." },
  { q: "Is my API key secure?", a: "Absolutely. Your credentials are encrypted at rest and only accessed during verification requests. They are never exposed to end users." },
  { q: "Can I verify both Binance Pay and BEP20?", a: "Yes! Our API supports both Binance Pay merchant payments and BEP20 token transfers on the BSC network." },
  { q: "What happens when my subscription expires?", a: "Your API endpoint will return an error. Simply renew your subscription to restore access instantly." },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-4">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-primary text-glow">Binance</span>Verify
          </span>
          <div className="flex gap-3">
            <Button variant="ghost" asChild><Link to="/login">Log in</Link></Button>
            <Button className="glow-primary" asChild><Link to="/signup">Get Started</Link></Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-4 py-28 text-center overflow-hidden">
        {/* Background glow orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 mb-6 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary glow-primary">
            <Sparkles className="h-3.5 w-3.5" /> Payment Verification API
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Verify Binance Pay & BEP20<br />
            <span className="text-primary text-glow">payments instantly</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-10">
            Add crypto payment verification to your website in minutes. Get a secure API endpoint, configure your Binance credentials, and start accepting verified payments.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" className="glow-primary-strong" asChild>
              <Link to="/signup">Start Free Trial <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="border-glow" asChild>
              <Link to="#pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-3">Everything you need</h2>
        <p className="text-center text-muted-foreground mb-12">Powerful tools built for developers</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <Card key={f.title} className="bg-card/50 border-border/50 card-glow group">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:glow-primary transition-shadow duration-300">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative mx-auto max-w-6xl px-4 py-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full bg-primary/3 blur-[100px] pointer-events-none" />
        <h2 className="text-3xl font-bold text-center mb-4">Simple pricing</h2>
        <p className="text-center text-muted-foreground mb-12">Choose the plan that fits your needs</p>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <Card key={p.type} className={`relative card-glow ${p.popular ? "border-primary/60 glow-primary" : "border-border/50"}`}>
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-primary px-4 py-1 text-xs font-bold text-primary-foreground shadow-lg">
                  Most Popular
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-xl">{p.type}</CardTitle>
                <div className="mt-4">
                  <span className={`text-4xl font-bold ${p.popular ? "text-primary text-glow" : ""}`}>{p.price}</span>
                  <span className="text-muted-foreground">{p.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className={`w-full ${p.popular ? "glow-primary" : ""}`} variant={p.popular ? "default" : "outline"} asChild>
                  <Link to="/signup">Get Started</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Frequently asked questions</h2>
        <div className="space-y-6">
          {faqs.map((f) => (
            <div key={f.q} className="border-b border-border/50 pb-6">
              <h3 className="font-semibold mb-2">{f.q}</h3>
              <p className="text-sm text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="mx-auto max-w-6xl px-4 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-xl font-bold tracking-tight">
              <span className="text-primary text-glow">Binance</span>Verify
            </span>
            <p className="text-sm text-muted-foreground">© 2026 All rights reserved.</p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <p className="text-sm font-bold uppercase tracking-widest text-[#26A1DE]">Need Support?</p>
            <Button variant="outline" className="rounded-2xl border-[#26A1DE]/30 bg-[#26A1DE]/5 hover:bg-[#26A1DE]/10 gap-3 h-12 px-6 group transition-all hover:scale-105" asChild>
              <a href="https://t.me/hibigibi123" target="_blank" rel="noreferrer">
                <svg viewBox="0 0 24 24" className="h-6 w-6">
                  <path fill="#26A1DE" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.53-1.39.52-.46-.01-1.33-.26-1.98-.48-.8-.27-1.43-.42-1.37-.89.03-.25.38-.51 1.03-.78 4.04-1.76 6.74-2.92 8.09-3.48 3.85-1.6 4.64-1.88 5.17-1.89.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.13-.02.19z" />
                </svg>
                <span className="font-bold text-[#26A1DE]">Contact @hibigibi123</span>
              </a>
            </Button>
          </div>
        </div>
      </footer>

      {/* Floating Support Button */}
      <div className="fixed bottom-8 right-8 z-[100] animate-in fade-in slide-in-from-bottom-6 duration-1000">
        <a href="https://t.me/hibigibi123" target="_blank" rel="noreferrer" className="block group">
          <div className="relative h-16 w-16 flex items-center justify-center rounded-full bg-[#26A1DE] shadow-[0_8px_30px_rgb(38,161,222,0.4)] transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1">
            <svg viewBox="0 0 24 24" className="h-10 w-10">
              <path fill="white" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.53-1.39.52-.46-.01-1.33-.26-1.98-.48-.8-.27-1.43-.42-1.37-.89.03-.25.38-.51 1.03-.78 4.04-1.76 6.74-2.92 8.09-3.48 3.85-1.6 4.64-1.88 5.17-1.89.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.13-.02.19z" />
            </svg>
            <div className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 rounded-full border-2 border-white animate-bounce" />
          </div>
        </a>
      </div>
    </div>
  );
}
