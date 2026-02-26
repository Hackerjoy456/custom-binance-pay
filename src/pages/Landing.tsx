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
  { type: "Weekly", price: "$5", period: "/week", features: ["1,000 API calls", "Payment verification", "Basic support"] },
  { type: "Monthly", price: "$15", period: "/month", features: ["5,000 API calls", "Payment verification", "Priority support", "Usage analytics"], popular: true },
  { type: "Yearly", price: "$99", period: "/year", features: ["50,000 API calls", "Payment verification", "Priority support", "Usage analytics", "Custom branding"] },
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
      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          © 2026 BinanceVerify. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
