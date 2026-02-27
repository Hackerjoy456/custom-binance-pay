import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Copy, CheckCircle, ExternalLink, Code2, Terminal,
  Zap, Key, Settings, Rocket, BookOpen, Shield, AlertTriangle,
  ArrowRight, Globe, FileCode, Package, Cloud, Link2,
  CheckCheck, Info, Lightbulb, MonitorSmartphone, Link as LinkIcon,
  Cpu, Wrench, Layout, Clock, Lock
} from "lucide-react";

/* ─── Reusable Components ─── */

function CodeBlock({ code, language, title }: { code: string; language: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group rounded-xl overflow-hidden border border-border/50 bg-black/5 shadow-sm">
      {title && (
        <div className="flex items-center justify-between bg-muted/40 px-4 py-2 border-b border-border/50">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{title}</span>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase font-bold border-primary/20 text-primary bg-primary/5">{language}</Badge>
        </div>
      )}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 bg-background/80 backdrop-blur-md rounded-lg shadow-sm"
          onClick={handleCopy}
        >
          {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
        <pre className="bg-muted/10 p-5 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed text-foreground/90">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

function StepCard({ step, total, icon: Icon, title, description, children }: {
  step: number;
  total: number;
  icon: React.ElementType;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative flex gap-4 group">
      <div className="flex flex-col items-center">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs ring-4 ring-primary/5 transition-all group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
          {step}
        </div>
        {step < total && <div className="w-px flex-1 bg-gradient-to-b from-primary/20 to-transparent mt-2" />}
      </div>
      <div className="pb-8 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-base tracking-tight">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{description}</p>
        <div className="animate-in fade-in slide-in-from-top-1 duration-500">
          {children}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ icon: Icon, title, children, variant = "info" }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  variant?: "info" | "warning" | "success";
}) {
  const styles = {
    info: "border-primary/20 bg-primary/5 shadow-[0_0_15px_-5px_rgba(var(--primary),0.1)]",
    warning: "border-amber-500/30 bg-amber-500/5 shadow-[0_0_15px_-5px_rgba(var(--warning),0.1)]",
    success: "border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_15px_-5px_rgba(var(--success),0.1)]",
  };
  const iconStyles = {
    info: "text-primary",
    warning: "text-amber-500",
    success: "text-emerald-500",
  };
  return (
    <div className={`rounded-xl border p-5 ${styles[variant]} transition-all hover:bg-opacity-80`}>
      <p className={`flex items-center gap-2 font-bold text-sm mb-2 uppercase tracking-tight ${iconStyles[variant]}`}>
        <Icon className="h-4 w-4" /> {title}
      </p>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

/* ─── Main Component ─── */

export default function IntegrationGuide() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [customEndpoint, setCustomEndpoint] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("api_keys").select("api_key").eq("user_id", user.id).eq("is_active", true).limit(1),
      supabase.from("api_configurations").select("custom_endpoint_url").eq("user_id", user.id).limit(1),
    ]).then(([keyRes, configRes]) => {
      setApiKey(keyRes.data?.[0]?.api_key || null);
      setCustomEndpoint((configRes.data?.[0] as any)?.custom_endpoint_url || null);
    });
  }, [user]);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const supabaseVerifyEndpoint = `https://${projectId}.supabase.co/functions/v1/verify-payment`;
  const supabaseConfigEndpoint = `https://${projectId}.supabase.co/functions/v1/get-config`;
  const supabaseSdkUrl = `https://${projectId}.supabase.co/functions/v1/binance-verify-sdk`;

  const origin = typeof window !== "undefined" ? window.location.origin : null;
  const isCustomDomain = origin ? !origin.includes(`${projectId}.supabase.co`) : false;

  const defaultVerifyEndpoint = isCustomDomain && origin
    ? `${origin}/api/verify-payment`
    : supabaseVerifyEndpoint;

  const defaultConfigEndpoint = isCustomDomain && origin
    ? `${origin}/api/get-config`
    : supabaseConfigEndpoint;

  const defaultSdkUrl = isCustomDomain && origin
    ? `${origin}/api/binance-verify-sdk`
    : supabaseSdkUrl;

  const endpoint = customEndpoint || defaultVerifyEndpoint;
  const configEndpoint = customEndpoint
    ? customEndpoint.replace(/verify-payment$/, "get-config")
    : defaultConfigEndpoint;
  const sdkUrl = defaultSdkUrl;
  const displayKey = apiKey || "YOUR_API_KEY";
  const publishedDomain = typeof window !== 'undefined' ? window.location.origin : "https://payment.offlinee.online";
  const checkoutUrl = user ? `${publishedDomain}/pay/${user.id}?amount=25.00&orderId=ORDER_12345&ts=${Date.now()}` : `${publishedDomain}/pay/YOUR_MERCHANT_ID?amount=25.00&ts=TIMESTAMP_MS`;

  /* ─── Code Snippets ─── */

  const curlSnippet = `curl -X POST '${endpoint}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: ${displayKey}' \\
  -d '{
    "transaction_id": "TRANSACTION_ID_HERE",
    "payment_type": "binance_pay",
    "expected_amount": 25.00
  }'`;

  const jsSnippet = `// Simple verify function
async function verifyPayment(transactionId, paymentType, expectedAmount) {
  const response = await fetch('${endpoint}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': '${displayKey}'
    },
    body: JSON.stringify({
      transaction_id: transactionId,
      payment_type: paymentType,
      expected_amount: expectedAmount
    })
  });

  const data = await response.json();
  if (data.verified) {
    console.log('✅ Success! Amount:', data.amount);
  } else {
    console.log('❌ Failed:', data.error);
  }
  return data;
}

// Call Example:
verifyPayment('prepay_id_123', 'binance_pay', 25.00);`;

  const sdkSnippet = `<!-- Add to <head> -->
<script src="${sdkUrl}"></script>

<!-- Initialize and Verify -->
<script>
  BinanceVerify.init({ apiKey: '${displayKey}' });

  async function check() {
    const result = await BinanceVerify.verify({
      transactionId: 'prepay_id_123',
      paymentType: 'binance_pay',
      expectedAmount: 25.00
    });
    
    if(result.verified) alert('Success!');
  }
</script>`;

  const cfWorkerCode = `const TARGET_URL = "${supabaseVerifyEndpoint}";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });

    const response = await fetch(TARGET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": request.headers.get("x-api-key") || "",
      },
      body: request.body,
    });

    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }
};`;

  return (
    <div className="space-y-12 max-w-5xl mx-auto px-2 pb-20">

      {/* ─── Hero section ─── */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary/10 via-background to-background border border-primary/10 p-8 sm:p-12">
        <div className="absolute top-0 right-0 -uphill translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
          <div className="bg-primary/15 p-5 rounded-3xl shadow-2xl shadow-primary/20 ring-1 ring-primary/20">
            <Rocket className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <div className="text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-2">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Gateway Integration</h1>
              <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border-emerald-500/30 gap-1.5 py-1 px-3">
                <Shield className="h-3.5 w-3.5" /> Fraud Shield Active
              </Badge>
            </div>
            <p className="text-muted-foreground text-lg max-w-xl">
              Integrate Binance payments into your app in minutes. Choose your level of complexity below.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Essentials Row ─── */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="rounded-3xl border-primary/10 bg-muted/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Your Keys
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-background/50 border border-border/50 p-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">API KEY</span>
              <code className="text-xs font-mono break-all text-primary font-bold">
                {apiKey ? `${apiKey.slice(0, 16)}...${apiKey.slice(-10)}` : "GENERATE A KEY IN THE API KEYS MENU"}
              </code>
            </div>
            <div className="rounded-2xl bg-background/50 border border-border/50 p-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">ENDPOINT</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[9px] font-black uppercase">POST</Badge>
                <code className="text-xs font-mono break-all">{endpoint}</code>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-primary/10 bg-muted/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MonitorSmartphone className="h-5 w-5 text-primary" /> Quick Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {[Zap, Layout, Link2, CheckCheck].map((Icon, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="h-1 w-full bg-primary/10 rounded-full" />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">Setup → Choose Method → Display QR → Verify Callback</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── The Integration Hub ─── */}
      <div className="space-y-6">
        <div className="flex items-baseline gap-3 px-4">
          <h2 className="text-2xl font-black tracking-tight">Choose Your Method</h2>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Collapse to focus</span>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4 border-none">

          {/* New Section: One-Click Snippets & Widget */}
          <AccordionItem value="method-snippets" className="border border-primary/20 rounded-3xl overflow-hidden bg-primary/5 transition-all data-[state=open]:ring-2 data-[state=open]:ring-primary/20">
            <AccordionTrigger className="hover:no-underline px-6 py-6 group">
              <div className="flex items-center gap-4 text-left">
                <div className="h-12 w-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 group-data-[state=open]:bg-primary group-data-[state=open]:text-white transition-colors">
                  <Package className="h-6 w-6 text-primary group-data-[state=open]:text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">One-Click Snippets</h3>
                    <Badge className="bg-primary text-[10px] py-0">FASTEST</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Copy-paste widgets and buttons for your website.</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-8 pt-2">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <Layout className="h-4 w-4 text-primary" /> 1. Floating Gateway Widget
                  </h4>
                  <p className="text-xs text-muted-foreground">Add this script to the bottom of your body tag to show a floating "Pay Now" bubble.</p>
                  <CodeBlock
                    code={`<!-- Binance Verify Floating Widget -->
<script>
  (function() {
    var btn = document.createElement('div');
    btn.innerHTML = '💳 Pay with Crypto';
    btn.style = 'position:fixed;bottom:20px;right:20px;background:#f0b90b;color:#000;padding:12px 24px;border-radius:50px;cursor:pointer;font-weight:bold;box-shadow:0 10px 30px rgba(0,0,0,0.3);z-index:9999;font-family:sans-serif;';
    btn.onclick = function() {
      window.open('${publishedDomain}/pay/${user?.id || "YOUR_ID"}?amount=10.00&successUrl=' + encodeURIComponent(window.location.href), '_blank');
    };
    document.body.appendChild(btn);
  })();
</script>`}
                    language="html"
                    title="Widget Snippet"
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-primary" /> 2. Simple HTML Pay Button
                  </h4>
                  <p className="text-xs text-muted-foreground">A premium styled button you can drop anywhere.</p>
                  <CodeBlock
                    code={`<a href="${publishedDomain}/pay/${user?.id || "YOUR_ID"}?amount=10.00" 
   target="_blank" 
   style="display:inline-flex;align-items:center;background:#f0b90b;color:#000;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold;font-family:sans-serif;gap:8px;">
   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
   Pay with Binance
</a>`}
                    language="html"
                    title="HTML Button"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>



          {/* Method 1: No Code */}
          <AccordionItem value="method-1" className="border border-primary/10 rounded-3xl overflow-hidden bg-card transition-all data-[state=open]:ring-2 data-[state=open]:ring-primary/20">
            <AccordionTrigger className="hover:no-underline px-6 py-6 group">
              <div className="flex items-center gap-4 text-left">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-data-[state=open]:bg-emerald-500 group-data-[state=open]:text-white transition-colors">
                  <LinkIcon className="h-6 w-6 text-emerald-500 group-data-[state=open]:text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">Hosted Checkout Page</h3>
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[10px] py-0">NO-CODE</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Redirect users to our secure payment page. No code required.</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-8 pt-2">
              <div className="space-y-6">
                <InfoBox icon={Lightbulb} title="Perfect For" variant="success">
                  Static websites, simple buttons, landing pages, or no-code platforms like WordPress or Wix. We handle everything from payment selection to verification.
                </InfoBox>
                <div className="space-y-4">
                  <p className="text-sm font-bold opacity-80 pl-1">Your Direct Link:</p>
                  <CodeBlock code={checkoutUrl} language="url" title="Click to open" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border bg-muted/30 p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-primary" />
                      <span className="font-bold text-xs uppercase tracking-wider">Parameters</span>
                    </div>
                    <ul className="space-y-2">
                      <li className="text-xs flex justify-between"><code className="font-bold">amount</code> <span className="text-muted-foreground">USDT amount</span></li>
                      <li className="text-xs flex justify-between"><code className="font-bold">orderId</code> <span className="text-muted-foreground">Reference #</span></li>
                      <li className="text-xs flex justify-between"><code className="font-bold">successUrl</code> <span className="text-muted-foreground">Redirect after pay</span></li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border bg-muted/30 p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-emerald-500" />
                      <span className="font-bold text-xs uppercase tracking-wider">Features</span>
                    </div>
                    <ul className="space-y-2">
                      <li className="text-xs flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Automatic verification</li>
                      <li className="text-xs flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Success/Fail redirect</li>
                      <li className="text-xs flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Custom branding (Pro)</li>
                    </ul>
                  </div>
                </div>

                <div className="rounded-2xl border bg-muted/10 p-5 mt-4">
                  <h4 className="font-bold text-sm mb-3 text-primary flex items-center gap-2">
                    <Code2 className="h-4 w-4" /> How to generate the URL dynamically:
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">Instead of hardcoding, you should generate this URL in your backend when a user clicks "Checkout" on your site.</p>

                  <Tabs defaultValue="javascript" className="w-full">
                    <TabsList className="bg-muted/50 p-1 rounded-xl h-10 w-fit flex gap-1 mb-3">
                      <TabsTrigger value="javascript" className="text-[10px] rounded-lg">Node.js</TabsTrigger>
                      <TabsTrigger value="php" className="text-[10px] rounded-lg">PHP</TabsTrigger>
                      <TabsTrigger value="python" className="text-[10px] rounded-lg">Python</TabsTrigger>
                    </TabsList>
                    <TabsContent value="javascript">
                      <CodeBlock
                        code={`// When user clicks checkout for $50
const amount = "50.00";
const orderId = "ORD-" + Date.now();
const successUrl = encodeURIComponent("https://yoursite.com/thank-you");
const gatewayUrl = "https://payment.offlinee.online"; // Or your custom domain

// Give this link to the user
const paymentLink = \`\${gatewayUrl}/pay/${user?.id || "YOUR_MERCHANT_ID"}?amount=\${amount}&orderId=\${orderId}&successUrl=\${successUrl}\`;
window.location.href = paymentLink;`}
                        language="javascript"
                      />
                    </TabsContent>
                    <TabsContent value="php">
                      <CodeBlock
                        code={`<?php
$amount = "50.00";
$order_id = "ORD-" . time();
$success_url = urlencode("https://yoursite.com/thank-you");
$merchant_id = "${user?.id || "YOUR_MERCHANT_ID"}";
$gateway_url = "https://payment.offlinee.online";

$payment_link = "{$gateway_url}/pay/{$merchant_id}?amount={$amount}&orderId={$order_id}&successUrl={$success_url}";

// Redirect the user
header("Location: " . $payment_link);
exit;
?>`}
                        language="php"
                      />
                    </TabsContent>
                    <TabsContent value="python">
                      <CodeBlock
                        code={`from urllib.parse import quote
import time

amount = "50.00"
order_id = f"ORD-{int(time.time() * 1000)}"
success_url = quote("https://yoursite.com/thank-you", safe="")
merchant_id = "${user?.id || "YOUR_MERCHANT_ID"}"
gateway_url = "https://payment.offlinee.online"

payment_link = f"{gateway_url}/pay/{merchant_id}?amount={amount}&orderId={order_id}&successUrl={success_url}"

# Redirect the user (e.g., using Flask or Django)
# return redirect(payment_link)`}
                        language="python"
                      />
                    </TabsContent>
                  </Tabs>
                </div>
                <Button className="w-full sm:w-auto rounded-xl gap-2 h-11" asChild>
                  <a href={checkoutUrl} target="_blank" rel="noreferrer">Open Preview <ExternalLink className="h-4 w-4" /></a>
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Method 2: JS SDK */}
          <AccordionItem value="method-2" className="border border-primary/10 rounded-3xl overflow-hidden bg-card transition-all data-[state=open]:ring-2 data-[state=open]:ring-primary/20">
            <AccordionTrigger className="hover:no-underline px-6 py-6 group">
              <div className="flex items-center gap-4 text-left">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 group-data-[state=open]:bg-amber-500 group-data-[state=open]:text-white transition-colors">
                  <Package className="h-6 w-6 text-amber-500 group-data-[state=open]:text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">JavaScript SDK</h3>
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-[10px] py-0">EASY</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Easiest way to verify payments in your existing web UI.</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-8 pt-2">
              <div className="space-y-6">
                <InfoBox icon={Code2} title="Implementation Quickstart">
                  Just drop a script tag and call our helper. Perfect for custom-built websites or landing pages where you want a custom "Verify" button.
                </InfoBox>
                <div className="space-y-4">
                  <p className="text-sm font-bold opacity-80 pl-1">1. Add to Head:</p>
                  <CodeBlock code={sdkSnippet} language="html" title="HTML Snippet" />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: "CORS Ready", icon: Globe },
                    { label: "Typescript", icon: FileCode },
                    { label: "0 Dependency", icon: Cpu }
                  ].map((f, i) => (
                    <div key={i} className="p-4 border rounded-2xl bg-muted/20 text-center flex flex-col items-center gap-2">
                      <f.icon className="h-5 w-5 text-amber-500" />
                      <span className="text-xs font-bold">{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Method 3: Backend API */}
          <AccordionItem value="method-3" className="border border-primary/10 rounded-3xl overflow-hidden bg-card transition-all data-[state=open]:ring-2 data-[state=open]:ring-primary/20">
            <AccordionTrigger className="hover:no-underline px-6 py-6 group">
              <div className="flex items-center gap-4 text-left">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-data-[state=open]:bg-primary group-data-[state=open]:text-white transition-colors">
                  <Terminal className="h-6 w-6 text-primary group-data-[state=open]:text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">REST API (Server Side)</h3>
                    <Badge variant="outline" className="border-primary/30 text-primary text-[10px] py-0 font-black">FULL CONTROL</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Direct server-to-server verification via standard POST requests.</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-8 pt-2">
              <div className="space-y-6">
                <Tabs defaultValue="javascript" className="w-full">
                  <TabsList className="bg-muted/50 p-1 rounded-xl h-11 w-full sm:w-fit grid grid-cols-4 sm:flex gap-1">
                    <TabsTrigger value="javascript" className="rounded-lg data-[state=active]:bg-background transition-all">Node.js</TabsTrigger>
                    <TabsTrigger value="python" className="rounded-lg data-[state=active]:bg-background transition-all">Python</TabsTrigger>
                    <TabsTrigger value="php" className="rounded-lg data-[state=active]:bg-background transition-all">PHP</TabsTrigger>
                    <TabsTrigger value="curl" className="rounded-lg data-[state=active]:bg-background transition-all">cURL</TabsTrigger>
                  </TabsList>
                  <div className="mt-4 animate-in zoom-in-95 duration-300">
                    <TabsContent value="javascript"><CodeBlock code={jsSnippet} language="javascript" title="Node server example" /></TabsContent>
                    <TabsContent value="python"><CodeBlock code={`# using requests\nimport requests\nres = requests.post("${endpoint}", headers={"x-api-key": "${displayKey}"}, json={"transaction_id": "...", "payment_type": "...", "expected_amount": 10})`} language="python" title="Python snippet" /></TabsContent>
                    <TabsContent value="php"><CodeBlock code={`// using cURL\n$ch = curl_init("${endpoint}");\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ["x-api-key: ${displayKey}"]);`} language="php" title="PHP code" /></TabsContent>
                    <TabsContent value="curl"><CodeBlock code={curlSnippet} language="bash" title="Terminal" /></TabsContent>
                  </div>
                </Tabs>

                <div className="grid gap-6 md:grid-cols-2 mt-4">
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <ArrowRight className="h-3 w-3 text-primary" /> Request Headers
                    </h4>
                    <div className="rounded-2xl border overflow-hidden">
                      <table className="w-full text-[11px] leading-6">
                        <tbody className="divide-y">
                          <tr className="bg-muted/30">
                            <td className="p-2 font-bold">Content-Type</td>
                            <td className="p-2 font-mono text-primary">application/json</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-bold">x-api-key</td>
                            <td className="p-2 font-mono text-primary">Your Key</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <ArrowRight className="h-3 w-3 text-emerald-500" /> Response (200 OK)
                    </h4>
                    <div className="rounded-2xl border bg-black/[0.02] p-2">
                      <pre className="text-[10px] font-mono leading-relaxed">
                        {`{\n  "verified": true,\n  "amount": 25.00,\n  "error": null\n}`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Method 4: Advanced */}
          <AccordionItem value="method-4" className="border border-primary/10 rounded-3xl overflow-hidden bg-card transition-all data-[state=open]:ring-2 data-[state=open]:ring-primary/20">
            <AccordionTrigger className="hover:no-underline px-6 py-6 group">
              <div className="flex items-center gap-4 text-left">
                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 group-data-[state=open]:bg-indigo-500 group-data-[state=open]:text-white transition-colors">
                  <Cloud className="h-6 w-6 text-indigo-500 group-data-[state=open]:text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">Custom Domain Proxy</h3>
                    <Badge variant="outline" className="text-[10px] py-0">PRO · ADVANCED</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Proxy requests through your own domain for a professional look.</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-8 pt-2">
              <div className="space-y-6">
                <InfoBox icon={Shield} title="Why use a Proxy?" variant="info">
                  Hides the backend provider, allows customization of CORS, and lets you use professional URLs like <code className="text-primary translate-y-px">api.yourdomain.com/verify</code>.
                </InfoBox>
                <div className="space-y-4">
                  <p className="text-sm font-bold opacity-80 pl-1">Simple Cloudflare Worker Proxy:</p>
                  <CodeBlock code={cfWorkerCode} language="javascript" title="worker.js" />
                </div>
                <div className="rounded-2xl border bg-muted/10 p-5">
                  <h4 className="font-bold text-sm mb-3">Quick Steps:</h4>
                  <ol className="text-xs space-y-2 list-decimal list-inside text-muted-foreground">
                    <li>Create a new Worker in Cloudflare Dashboard</li>
                    <li>Paste the code above and Deploy</li>
                    <li>Add a Custom Domain like <code className="bg-muted px-1 rounded">api.yoursite.com</code></li>
                    <li>Update your frontend to point to your new URL!</li>
                  </ol>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Method 5: Dynamic Settings */}
          <AccordionItem value="method-5" className="border border-primary/10 rounded-3xl overflow-hidden bg-card transition-all data-[state=open]:ring-2 data-[state=open]:ring-primary/20">
            <AccordionTrigger className="hover:no-underline px-6 py-6 group">
              <div className="flex items-center gap-4 text-left">
                <div className="h-12 w-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0 group-data-[state=open]:bg-violet-500 group-data-[state=open]:text-white transition-colors">
                  <Wrench className="h-6 w-6 text-violet-500 group-data-[state=open]:text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">Dynamic Payment Config</h3>
                    <Badge variant="outline" className="text-[10px] py-0">AUTOMATION</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Fetch your Pay ID and QR codes dynamically via API.</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-8 pt-2">
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">Don't hardcode your Binance ID or Wallet addresses. Use this API to fetch them so they stay in sync with your dashboard settings automatically.</p>
                <div className="bg-muted/50 p-4 rounded-2xl flex items-center gap-2 border">
                  <Badge className="bg-violet-500">GET</Badge>
                  <code className="text-xs font-mono break-all opacity-80">{configEndpoint}</code>
                </div>
                <CodeBlock
                  code={`async function loadConfig() {\n  const res = await fetch("${configEndpoint}", { headers: {"x-api-key": "${displayKey}" }});\n  const { binance_pay, bep20 } = await res.json();\n  // ... bind to your UI\n}`}
                  language="javascript"
                  title="Dynamic Loading"
                />
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>

      {/* ─── Troubleshooting / Support ─── */}
      <div className="grid gap-6 sm:grid-cols-2 pt-10">
        <InfoBox icon={AlertTriangle} title="Verification Failure?" variant="warning">
          <p className="mb-2">Ensure the user provided the <strong>correct</strong> ID:</p>
          <ul className="text-xs space-y-1">
            <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3" /> prepay_id_1234 (Binance Pay)</li>
            <li className="flex items-center gap-2"><ArrowRight className="h-3 w-3" /> 0xabc...123 (BEP20 Tx Hash)</li>
            <li className="flex items-center gap-2 font-bold text-foreground">Each TX ID can only be verified once.</li>
          </ul>
        </InfoBox>
        <InfoBox icon={ExternalLink} title="Need Help?" variant="info">
          <p className="mb-4">Check our community guides or reach out to support for custom integration help.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="rounded-xl border-[#26A1DE]/30 bg-[#26A1DE]/5 hover:bg-[#26A1DE]/10 gap-3 h-12 px-6 group transition-all" asChild>
              <a href="https://t.me/hibigibi123" target="_blank" rel="noreferrer" className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#26A1DE]">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.53-1.39.52-.46-.01-1.33-.26-1.98-.48-.8-.27-1.43-.42-1.37-.89.03-.25.38-.51 1.03-.78 4.04-1.76 6.74-2.92 8.09-3.48 3.85-1.6 4.64-1.88 5.17-1.89.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.13-.02.19z" />
                </svg>
                <span className="font-bold text-[#26A1DE]">Contact @hibigibi123</span>
              </a>
            </Button>
            <Button variant="secondary" className="rounded-xl h-12 px-6" asChild>
              <a href="https://discord.gg/vsAavHVEe2" target="_blank" rel="noreferrer">Visit Support Center</a>
            </Button>
          </div>
        </InfoBox>
      </div>

    </div>
  );
}
