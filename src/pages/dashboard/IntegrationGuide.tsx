import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Copy, CheckCircle, ExternalLink, Code2, Terminal,
  Zap, Key, Settings, Rocket, BookOpen, Shield, AlertTriangle,
  ArrowRight, Globe, FileCode, Package, Cloud, Link2,
  CheckCheck, Info, Lightbulb, MonitorSmartphone, Link
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
    <div className="relative group rounded-lg overflow-hidden border border-border">
      {title && (
        <div className="flex items-center justify-between bg-muted/60 px-4 py-2 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{language}</Badge>
        </div>
      )}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 bg-background/80 backdrop-blur-sm"
          onClick={handleCopy}
        >
          {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
        <pre className="bg-muted/30 p-4 overflow-x-auto text-sm font-mono leading-relaxed">
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
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
          {step}
        </div>
        {step < total && <div className="w-px flex-1 bg-border mt-2" />}
      </div>
      <div className="pb-8 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        {children}
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
    info: "border-primary/20 bg-primary/5",
    warning: "border-amber-500/30 bg-amber-500/5",
    success: "border-green-500/30 bg-green-500/5",
  };
  const iconStyles = {
    info: "text-primary",
    warning: "text-amber-500",
    success: "text-green-500",
  };
  return (
    <div className={`rounded-lg border p-4 ${styles[variant]}`}>
      <p className={`flex items-center gap-2 font-semibold text-sm mb-2 ${iconStyles[variant]}`}>
        <Icon className="h-4 w-4" /> {title}
      </p>
      <div className="text-sm text-muted-foreground space-y-1">{children}</div>
    </div>
  );
}

/* ─── Main Component ─── */

export default function IntegrationGuide() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("api_keys").select("api_key").eq("user_id", user.id).eq("is_active", true).limit(1)
      .then(({ data }) => setApiKey(data?.[0]?.api_key || null));
  }, [user]);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const endpoint = `https://${projectId}.supabase.co/functions/v1/verify-payment`;
  const configEndpoint = `https://${projectId}.supabase.co/functions/v1/get-config`;
  const sdkUrl = `https://${projectId}.supabase.co/functions/v1/binance-verify-sdk`;
  const displayKey = apiKey || "YOUR_API_KEY";
  const checkoutUrl = user ? `${window.location.origin}/pay/${user.id}?amount=25.00&orderId=ORDER_12345` : `${window.location.origin}/pay/YOUR_MERCHANT_ID?amount=25.00`;

  /* ─── Code Snippets ─── */

  const curlSnippet = `curl -X POST '${endpoint}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: ${displayKey}' \\
  -d '{
    "transaction_id": "TRANSACTION_ID_HERE",
    "payment_type": "binance_pay",
    "expected_amount": 25.00
  }'`;

  const jsSnippet = `// Step 1: Create a reusable verify function
async function verifyPayment(transactionId, paymentType, expectedAmount) {
  const response = await fetch('${endpoint}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': '${displayKey}'
    },
    body: JSON.stringify({
      transaction_id: transactionId,
      payment_type: paymentType,     // "binance_pay" or "bep20"
      expected_amount: expectedAmount // The amount you expect the user to pay
    })
  });

  const data = await response.json();

  if (data.verified) {
    console.log('✅ Payment verified! Amount:', data.amount);
    // → Grant access, update order status, etc.
  } else {
    console.log('❌ Payment not verified:', data.error);
    // → Show error to user, ask them to retry
  }

  return data;
}

// Step 2: Call it when user submits their transaction ID
// For Binance Pay:
verifyPayment('prepay_id_123456', 'binance_pay', 25.00);

// For BEP20 (on-chain transfer):
verifyPayment('0xabc123...def456', 'bep20', 10.00);`;

  const pythonSnippet = `import requests

# Your credentials (get these from your dashboard)
API_KEY = "${displayKey}"
ENDPOINT = "${endpoint}"

def verify_payment(transaction_id: str, payment_type: str, expected_amount: float) -> dict:
    """
    Verify a Binance payment.
    
    Args:
        transaction_id: The Binance Pay prepay ID or BEP20 tx hash
        payment_type: Either "binance_pay" or "bep20"
        expected_amount: The amount you expect (e.g. 25.00)
    
    Returns:
        dict with 'verified' (bool), 'amount' (float), 'error' (str or None)
    """
    response = requests.post(
        ENDPOINT,
        headers={
            "Content-Type": "application/json",
            "x-api-key": API_KEY
        },
        json={
            "transaction_id": transaction_id,
            "payment_type": payment_type,
            "expected_amount": expected_amount
        }
    )
    return response.json()

# Example usage:
result = verify_payment("prepay_id_123", "binance_pay", 25.00)
if result["verified"]:
    print(f"✅ Payment confirmed! Amount: {result['amount']}")
else:
    print(f"❌ Failed: {result.get('error', 'Unknown error')}")`;

  const phpSnippet = `<?php
// Your credentials (get these from your dashboard)
$apiKey = "${displayKey}";
$endpoint = "${endpoint}";

/**
 * Verify a Binance payment
 * 
 * @param string $transactionId  Binance Pay prepay ID or BEP20 tx hash
 * @param string $paymentType    "binance_pay" or "bep20"
 * @param float  $expectedAmount Amount you expect
 * @return array  Response with 'verified', 'amount', 'error'
 */
function verifyPayment($transactionId, $paymentType, $expectedAmount) {
    global $apiKey, $endpoint;
    
    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode([
            "transaction_id" => $transactionId,
            "payment_type"   => $paymentType,
            "expected_amount" => $expectedAmount
        ]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "Content-Type: application/json",
            "x-api-key: $apiKey"
        ]
    ]);

    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
}

// Example usage:
$result = verifyPayment("prepay_id_123", "binance_pay", 25.00);
if ($result["verified"]) {
    echo "✅ Payment verified! Amount: " . $result["amount"];
} else {
    echo "❌ Failed: " . $result["error"];
}
?>`;

  const sdkSnippet = `<!-- ════════════════════════════════════════════════ -->
<!-- STEP 1: Add this script tag to your HTML <head> -->
<!-- ════════════════════════════════════════════════ -->
<script src="${sdkUrl}"></script>

<!-- ════════════════════════════════════════════════ -->
<!-- STEP 2: Initialize the SDK (put before </body>) -->
<!-- ════════════════════════════════════════════════ -->
<script>
  BinanceVerify.init({
    apiKey: '${displayKey}',
    
    // ✅ Called when a payment is successfully verified
    onSuccess: function(result) {
      console.log('Payment verified!', result);
      // result.verified = true
      // result.amount   = 25.00
    },
    
    // ❌ Called when verification fails
    onError: function(error) {
      console.log('Verification failed:', error);
    }
  });
</script>`;

  const sdkVerifySnippet = `// ════════════════════════════════════════════════
// STEP 3: Call verify() when user submits their TX ID
// ════════════════════════════════════════════════

async function checkPayment() {
  // Get values from your form
  const txId = document.getElementById('txId').value;
  const type = 'binance_pay';  // or 'bep20' for on-chain transfers
  const amount = 25.00;        // the amount you expect

  // Call the SDK
  const result = await BinanceVerify.verify({
    transactionId: txId,
    paymentType: type,
    expectedAmount: amount
  });

  // Handle the result
  if (result.verified) {
    alert('✅ Payment verified! Amount: ' + result.amount);
    // → Unlock content, redirect to success page, etc.
  } else {
    alert('❌ ' + result.error);
    // → Show retry option
  }
}`;

  const fullHtmlExample = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payment Verification</title>
  <!-- Load the BinanceVerify SDK -->
  <script src="${sdkUrl}"><\/script>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 480px; margin: 40px auto; padding: 0 20px; }
    .form-group { margin-bottom: 16px; }
    label { display: block; margin-bottom: 4px; font-weight: 600; font-size: 14px; }
    input, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
    button { width: 100%; padding: 12px; background: #F0B90B; color: #000; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 16px; }
    button:hover { background: #d4a50a; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .result { margin-top: 16px; padding: 12px; border-radius: 8px; display: none; }
    .result.show { display: block; }
    .success { background: #e8f5e9; color: #2e7d32; }
    .error { background: #fce4ec; color: #c62828; }
    .loading { background: #fff3e0; color: #e65100; }
  </style>
</head>
<body>
  <h1>🔐 Verify Your Payment</h1>
  <p style="color: #666; margin-bottom: 24px;">
    Enter the transaction ID from your Binance payment to verify it.
  </p>
  
  <div class="form-group">
    <label>Transaction ID / Prepay ID</label>
    <input type="text" id="txId" placeholder="e.g. prepay_id_abc123 or 0x...">
  </div>
  
  <div class="form-group">
    <label>Payment Method</label>
    <select id="payType">
      <option value="binance_pay">Binance Pay</option>
      <option value="bep20">BEP20 (On-chain Transfer)</option>
    </select>
  </div>
  
  <div class="form-group">
    <label>Expected Amount (USDT)</label>
    <input type="number" id="amount" placeholder="25.00" step="0.01" min="0">
  </div>
  
  <button id="verifyBtn" onclick="verify()">Verify Payment</button>
  <div id="result" class="result"></div>

  <script>
    // Initialize the SDK with your API key
    BinanceVerify.init({ apiKey: '${displayKey}' });
    
    async function verify() {
      const btn = document.getElementById('verifyBtn');
      const el = document.getElementById('result');
      
      // Show loading state
      btn.disabled = true;
      btn.textContent = 'Verifying...';
      el.className = 'result show loading';
      el.innerHTML = '⏳ Checking with Binance...';
      
      try {
        const result = await BinanceVerify.verify({
          transactionId: document.getElementById('txId').value,
          paymentType: document.getElementById('payType').value,
          expectedAmount: parseFloat(document.getElementById('amount').value)
        });
        
        if (result.verified) {
          el.className = 'result show success';
          el.innerHTML = '✅ Payment verified! Amount: $' + result.amount;
        } else {
          el.className = 'result show error';
          el.innerHTML = '❌ ' + (result.error || 'Verification failed');
        }
      } catch (err) {
        el.className = 'result show error';
        el.innerHTML = '❌ Network error. Please try again.';
      }
      
      // Reset button
      btn.disabled = false;
      btn.textContent = 'Verify Payment';
    }
  <\/script>
</body>
</html>`;

  // Complete Cloudflare Worker code (single file, production-ready)
  const cfWorkerCode = `/**
 * BinanceVerify — Cloudflare Worker Proxy
 * 
 * This worker forwards verification requests to the BinanceVerify API
 * through your own custom domain (e.g. api.yourdomain.com).
 * 
 * Benefits:
 *  - Hides the real API URL from end users
 *  - Full control over CORS, rate limiting, caching
 *  - Works on Cloudflare's free plan (100,000 requests/day)
 * 
 * Setup:
 *  1. Create a new Worker in Cloudflare Dashboard
 *  2. Paste this entire code
 *  3. Deploy
 *  4. (Optional) Add a custom domain in Worker Settings → Triggers
 */

const TARGET_URL = "${endpoint}";

// CORS headers — change "*" to your actual domain in production
// e.g. "https://yourwebsite.com"
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request) {
    // ─── Handle CORS preflight (browser sends this before POST) ───
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // ─── Only allow POST requests ───
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        {
          status: 405,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    try {
      // ─── Forward the request to BinanceVerify API ───
      const response = await fetch(TARGET_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": request.headers.get("x-api-key") || "",
        },
        body: request.body,
      });

      // ─── Return the API response with CORS headers ───
      const data = await response.text();
      return new Response(data, {
        status: response.status,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      // ─── Handle network errors ───
      return new Response(
        JSON.stringify({ error: "Proxy error. Please try again." }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }
  },
};`;

  return (
    <div className="space-y-8 max-w-4xl">

      {/* ═══════════════════════════════════════ */}
      {/* HERO HEADER                            */}
      {/* ═══════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Integration Guide</h1>
            <p className="text-muted-foreground text-sm">
              Add Binance payment verification to any website — takes under 5 minutes
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* HOW IT WORKS — Visual flow              */}
      {/* ═══════════════════════════════════════ */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            How It Works
          </CardTitle>
          <CardDescription>Understand the verification flow before you code</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              { icon: MonitorSmartphone, label: "User pays", desc: "User sends payment via Binance Pay or BEP20 transfer" },
              { icon: Key, label: "User submits TX ID", desc: "They paste the transaction/prepay ID into your website" },
              { icon: Globe, label: "You call our API", desc: "Your site sends the TX ID to our verification endpoint" },
              { icon: CheckCheck, label: "Get result", desc: "API returns verified: true/false with the actual amount" },
            ].map((item, i) => (
              <div key={i} className="relative text-center p-3 rounded-lg bg-muted/40 border border-border">
                <div className="flex justify-center mb-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <p className="font-semibold text-xs mb-1">{item.label}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{item.desc}</p>
                {i < 3 && (
                  <ArrowRight className="hidden sm:block absolute -right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 z-10" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════ */}
      {/* YOUR CREDENTIALS                       */}
      {/* ═══════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Your Credentials
          </CardTitle>
          <CardDescription>These values are pre-filled in all code examples below</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <span className="text-xs font-medium text-muted-foreground">API Endpoint</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] px-1.5 border-primary/40 text-primary">POST</Badge>
                <code className="text-xs break-all">{endpoint}</code>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <span className="text-xs font-medium text-muted-foreground">API Key</span>
              <code className="text-xs block">
                {apiKey ? `${apiKey.slice(0, 12)}···${apiKey.slice(-8)}` : (
                  <span className="text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> No active API key — generate one in API Keys page
                  </span>
                )}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════ */}
      {/* GETTING STARTED — Step by Step          */}
      {/* ═══════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            Quick Start — 4 Steps
          </CardTitle>
          <CardDescription>Follow these steps in order to get up and running</CardDescription>
        </CardHeader>
        <CardContent>
          <StepCard step={1} total={4} icon={Key} title="Get Your API Key"
            description="Go to the Subscription page → purchase a plan → then go to API Keys page → click 'Generate New Key'. Copy and save your key — you'll need it in your code." />
          <StepCard step={2} total={4} icon={Settings} title="Configure Your Binance Account"
            description="Go to API Config page and fill in your Binance credentials:">
            <ul className="text-xs text-muted-foreground space-y-1 ml-1">
              <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-primary" /> <strong>Binance API Key + Secret</strong> — get from binance.com → API Management</li>
              <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-primary" /> <strong>Binance Pay Merchant ID</strong> — if using Binance Pay</li>
              <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-primary" /> <strong>BEP20 Wallet Address</strong> — if accepting on-chain transfers</li>
            </ul>
          </StepCard>
          <StepCard step={3} total={4} icon={Code2} title="Add Code to Your Website"
            description="Choose one of the methods below — either the JS SDK (easiest, just 1 script tag) or the REST API (any language)." />
          <StepCard step={4} total={4} icon={Zap} title="Test & Go Live"
            description="Make a small real payment, verify it using your integration, and confirm you get 'verified: true'. Then deploy to production!" />
        </CardContent>
      </Card>

      <Separator />

      {/* ═══════════════════════════════════════ */}
      {/* METHOD 0 — Hosted Checkout Page         */}
      {/* ═══════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Link className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Method 1 — Hosted Checkout Page</h2>
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">No Code Required</Badge>
        </div>

        <InfoBox icon={Lightbulb} title="When to use this">
          <p>Best for <strong>direct links, simple websites, or no-code platforms</strong>. Just redirect your users to our secure checkout page. We handle the UI, payment methods, and verification for you.</p>
        </InfoBox>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Link directly to the checkout screen</CardTitle>
            <CardDescription>Use this URL in your buttons or redirect the user to it. Customize the amount and orderId parameters as needed.</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock code={checkoutUrl} language="url" title="Payment Link" />
            <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2 text-sm text-muted-foreground">
              <p>You can optionally set up a webhook URL in the <strong>API Config</strong> tab to automatically receive a backend notification when the payment is verified.</p>
            </div>
            <Button variant="outline" className="mt-4 gap-2" asChild>
              <a href={checkoutUrl} target="_blank" rel="noreferrer">
                Test Checkout Page <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* ═══════════════════════════════════════ */}
      {/* METHOD 1 — JavaScript SDK               */}
      {/* ═══════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Method 2 — JavaScript SDK</h2>
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">Easiest</Badge>
        </div>

        <InfoBox icon={Lightbulb} title="When to use this">
          <p>Best for <strong>static websites, landing pages, or any HTML page</strong>. No npm, no build tools, no server needed. Just add a script tag and you're done.</p>
        </InfoBox>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">1. Add the SDK & Initialize</CardTitle>
            <CardDescription>Copy this into your HTML file. The SDK loads automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock code={sdkSnippet} language="html" title="Add to your HTML" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">2. Verify a Payment</CardTitle>
            <CardDescription>Call this function when the user submits their transaction ID (e.g. on form submit).</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock code={sdkVerifySnippet} language="javascript" title="Call when user clicks 'Verify'" />
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/[0.02]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileCode className="h-4 w-4 text-primary" />
              Complete Working Example
            </CardTitle>
            <CardDescription>
              Copy this entire code → save as <code className="text-xs bg-muted px-1 rounded">verify.html</code> → open in your browser. It works immediately!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock code={fullHtmlExample} language="html" title="verify.html — Ready to use" />
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* ═══════════════════════════════════════ */}
      {/* METHOD 2 — REST API                     */}
      {/* ═══════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Method 3 — REST API</h2>
        </div>

        <InfoBox icon={Lightbulb} title="When to use this">
          <p>Best for <strong>server-side apps</strong> (Node.js, Python, PHP, etc.) where you verify payments on your backend before granting access.</p>
        </InfoBox>

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="curl">
              <TabsList className="w-full max-w-md grid grid-cols-4">
                <TabsTrigger value="curl">cURL</TabsTrigger>
                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
                <TabsTrigger value="php">PHP</TabsTrigger>
              </TabsList>
              <TabsContent value="curl" className="mt-4">
                <p className="text-xs text-muted-foreground mb-3">Fastest way to test — run this in your terminal right now:</p>
                <CodeBlock code={curlSnippet} language="bash" title="Terminal — test immediately" />
              </TabsContent>
              <TabsContent value="javascript" className="mt-4">
                <p className="text-xs text-muted-foreground mb-3">Using the built-in <code className="bg-muted px-1 rounded">fetch()</code> API — works in Node.js and browsers:</p>
                <CodeBlock code={jsSnippet} language="javascript" title="JavaScript (fetch API)" />
              </TabsContent>
              <TabsContent value="python" className="mt-4">
                <p className="text-xs text-muted-foreground mb-3">Using the <code className="bg-muted px-1 rounded">requests</code> library — install with <code className="bg-muted px-1 rounded">pip install requests</code>:</p>
                <CodeBlock code={pythonSnippet} language="python" title="Python (requests)" />
              </TabsContent>
              <TabsContent value="php" className="mt-4">
                <p className="text-xs text-muted-foreground mb-3">Using PHP's built-in cURL extension:</p>
                <CodeBlock code={phpSnippet} language="php" title="PHP (cURL)" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* ═══════════════════════════════════════ */}
      {/* API REFERENCE                           */}
      {/* ═══════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">API Reference</h2>
        </div>

        {/* Request & Response side by side */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Request Body (POST)</CardTitle>
              <CardDescription>Send this JSON in the request body</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={`{
  "transaction_id": "string",     // Required
  "payment_type": "string",      // "binance_pay" or "bep20"
  "expected_amount": number      // e.g. 25.00
}`}
                language="json"
              />
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <p><strong>transaction_id</strong> — The Binance Pay prepay ID (e.g. <code className="bg-muted px-1 rounded">prepay_id_abc123</code>) or BEP20 transaction hash (e.g. <code className="bg-muted px-1 rounded">0xabc...def</code>)</p>
                <p><strong>payment_type</strong> — Use <code className="bg-muted px-1 rounded">binance_pay</code> for Binance Pay or <code className="bg-muted px-1 rounded">bep20</code> for on-chain BEP20 transfers</p>
                <p><strong>expected_amount</strong> — The amount in USDT you expect the user to have paid</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Response</CardTitle>
              <CardDescription>What you get back</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">✅ Success (200)</p>
                <CodeBlock
                  code={`{
  "verified": true,
  "amount": 25.00,
  "error": null,
  "image_url": "https://..."
}`}
                  language="json"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">❌ Failure (200)</p>
                <CodeBlock
                  code={`{
  "verified": false,
  "amount": null,
  "error": "Transaction not found or amount mismatch"
}`}
                  language="json"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Headers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Required Headers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Header</th>
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Value</th>
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-2 px-4 font-mono text-xs">Content-Type</td>
                    <td className="py-2 px-4 text-xs"><code className="bg-muted px-1 rounded">application/json</code></td>
                    <td className="py-2 px-4 text-xs text-muted-foreground">Always required</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-mono text-xs">x-api-key</td>
                    <td className="py-2 px-4 text-xs"><code className="bg-muted px-1 rounded">your-api-key</code></td>
                    <td className="py-2 px-4 text-xs text-muted-foreground">Your API key from the dashboard</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Error Codes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Error Codes</CardTitle>
            <CardDescription>HTTP status codes returned by the API</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Code</th>
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Meaning</th>
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">What to do</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-2 px-4 font-mono text-destructive">400</td>
                    <td className="py-2 px-4 text-muted-foreground">Missing required fields</td>
                    <td className="py-2 px-4 text-xs text-muted-foreground">Check that transaction_id, payment_type, and expected_amount are all provided</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-mono text-destructive">401</td>
                    <td className="py-2 px-4 text-muted-foreground">Invalid API key</td>
                    <td className="py-2 px-4 text-xs text-muted-foreground">Check your x-api-key header. Generate a new key if needed.</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-mono text-destructive">403</td>
                    <td className="py-2 px-4 text-muted-foreground">Subscription expired</td>
                    <td className="py-2 px-4 text-xs text-muted-foreground">Renew your subscription on the Subscription page</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-mono text-destructive">409</td>
                    <td className="py-2 px-4 text-muted-foreground">Duplicate transaction</td>
                    <td className="py-2 px-4 text-xs text-muted-foreground">This transaction was already verified — each TX can only be used once</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <Separator />

      {/* ═══════════════════════════════════════ */}
      {/* GET CONFIG API                          */}
      {/* ═══════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Get Payment Config API</h2>
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">New</Badge>
        </div>

        <InfoBox icon={Lightbulb} title="What is this?">
          <p>This API lets you <strong>fetch your payment configuration</strong> (Binance Pay ID, BEP20 wallet address, QR images) using just your API key. Use it to <strong>dynamically display payment details</strong> on your website — no need to hardcode them!</p>
        </InfoBox>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Endpoint</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] px-1.5 border-primary/40 text-primary">GET</Badge>
                <code className="text-xs break-all">{configEndpoint}</code>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Only requires the <code className="bg-muted px-1 rounded">x-api-key</code> header. No request body needed.</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="curl">
              <TabsList className="w-full max-w-md grid grid-cols-3">
                <TabsTrigger value="curl">cURL</TabsTrigger>
                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
              </TabsList>
              <TabsContent value="curl" className="mt-4">
                <CodeBlock
                  code={`curl '${configEndpoint}' \\
  -H 'x-api-key: ${displayKey}'`}
                  language="bash"
                  title="Fetch your config"
                />
              </TabsContent>
              <TabsContent value="javascript" className="mt-4">
                <CodeBlock
                  code={`async function getPaymentConfig() {
  const response = await fetch('${configEndpoint}', {
    headers: { 'x-api-key': '${displayKey}' }
  });
  const config = await response.json();
  
  // config.binance_pay.pay_id      → Binance Pay ID
  // config.binance_pay.image_url   → QR code / logo (if uploaded)
  // config.bep20.wallet_address    → BEP20 wallet address
  // config.bep20.image_url         → QR code / logo (if uploaded)
  
  return config;
}

// Example: Display payment details on your page
const config = await getPaymentConfig();

if (config.binance_pay.pay_id) {
  document.getElementById('payId').textContent = config.binance_pay.pay_id;
}
if (config.binance_pay.image_url) {
  document.getElementById('payQR').src = config.binance_pay.image_url;
}
if (config.bep20.wallet_address) {
  document.getElementById('walletAddr').textContent = config.bep20.wallet_address;
}`}
                  language="javascript"
                  title="Fetch and display config"
                />
              </TabsContent>
              <TabsContent value="python" className="mt-4">
                <CodeBlock
                  code={`import requests

config = requests.get(
    "${configEndpoint}",
    headers={"x-api-key": "${displayKey}"}
).json()

print("Binance Pay ID:", config["binance_pay"]["pay_id"])
print("BEP20 Address:", config["bep20"]["wallet_address"])`}
                  language="python"
                  title="Fetch config"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Response</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeBlock
              code={`{
  "binance_pay": {
    "pay_id": "123456789",           // Your Binance Pay ID (or null)
    "image_url": "https://..."       // QR/logo image (or null)
  },
  "bep20": {
    "wallet_address": "0xABC...",    // Your BEP20 address (or null)
    "image_url": "https://..."       // QR/logo image (or null)
  }
}`}
              language="json"
              title="Success response"
            />
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* CLOUDFLARE WORKER PROXY — Advanced      */}
      {/* ═══════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Custom Domain (Cloudflare Worker)</h2>
          <Badge variant="outline">Advanced · Optional</Badge>
        </div>

        <InfoBox icon={Lightbulb} title="Why use a custom domain?">
          <p>By default, your API calls go to our endpoint URL. With a Cloudflare Worker, you can proxy those requests through <strong>your own domain</strong> (e.g. <code className="bg-muted px-1 rounded">api.yourdomain.com</code>). This:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Hides the real backend URL from your users</li>
            <li>Looks more professional (your brand, your domain)</li>
            <li>Lets you add rate limiting, caching, and extra security</li>
            <li>Works on Cloudflare's <strong>free plan</strong> (100,000 requests/day)</li>
          </ul>
        </InfoBox>

        {/* Step 1: Prerequisites */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span>
              Prerequisites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> A free <a href="https://cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Cloudflare account</a></li>
              <li className="flex items-start gap-2"><CheckCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> A domain added to Cloudflare (for custom domain — optional)</li>
              <li className="flex items-start gap-2"><CheckCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Your BinanceVerify API key (from the API Keys page)</li>
            </ul>
          </CardContent>
        </Card>

        {/* Step 2: Create Worker */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
              Create the Cloudflare Worker
            </CardTitle>
            <CardDescription>This is the complete, production-ready code. Just copy and paste — nothing else needed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground mb-4">
              <li>Log in to <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Cloudflare Dashboard</a></li>
              <li>Go to <strong>Workers & Pages</strong> in the left sidebar</li>
              <li>Click <strong>Create</strong> → <strong>Create Worker</strong></li>
              <li>Give it a name (e.g. <code className="bg-muted px-1 rounded text-xs">binance-verify-proxy</code>)</li>
              <li>Click <strong>Deploy</strong> to create it with default code</li>
              <li>Click <strong>Edit Code</strong> → delete everything → paste the code below</li>
              <li>Click <strong>Deploy</strong> again</li>
            </ol>
            <CodeBlock code={cfWorkerCode} language="javascript" title="worker.js — Complete code (copy all of this)" />
          </CardContent>
        </Card>

        {/* Step 3: Custom Domain */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">3</span>
              Add Your Custom Domain (Optional)
            </CardTitle>
            <CardDescription>Make the worker accessible at your own URL like <code className="text-xs bg-muted px-1 rounded">api.yourdomain.com</code></CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>In Cloudflare, open your Worker → click <strong>Settings</strong> tab</li>
              <li>Scroll to <strong>Domains & Routes</strong></li>
              <li>Click <strong>Add</strong> → select <strong>Custom domain</strong></li>
              <li>Type your subdomain: <code className="bg-muted px-1 rounded text-xs">api.yourdomain.com</code></li>
              <li>Click <strong>Add domain</strong> — Cloudflare auto-configures DNS</li>
              <li>Wait 1-2 minutes for it to activate</li>
            </ol>

            <InfoBox icon={Link2} title="Link it to your dashboard" variant="success">
              <p>After setting up the custom domain, go to <strong>API Config → Custom Endpoint URL</strong> and paste your custom URL (e.g. <code className="bg-muted px-1 rounded text-xs">https://api.yourdomain.com</code>). This way the SDK and code snippets will auto-use your domain.</p>
            </InfoBox>
          </CardContent>
        </Card>

        {/* Step 4: Test */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">4</span>
              Test Your Worker
            </CardTitle>
            <CardDescription>Run this command to verify everything works</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <CodeBlock
              code={`# Replace with your actual worker URL or custom domain
curl -X POST 'https://binance-verify-proxy.YOUR_ACCOUNT.workers.dev' \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: ${displayKey}' \\
  -d '{
    "transaction_id": "TEST_TX_123",
    "payment_type": "binance_pay",
    "expected_amount": 10.00
  }'

# Expected response:
# {"verified": false, "error": "Transaction not found..."}
# (This is correct — the test TX doesn't exist)`}
              language="bash"
              title="Test with cURL"
            />

            <InfoBox icon={Lightbulb} title="How to find your Worker URL">
              <p>After deploying, your worker URL is shown in the Cloudflare dashboard. It looks like: <code className="bg-muted px-1 rounded text-xs">https://binance-verify-proxy.your-account.workers.dev</code></p>
            </InfoBox>
          </CardContent>
        </Card>

        {/* Pro Tips */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Security Best Practices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                <span><strong>Restrict CORS Origins:</strong> In the worker code, replace <code className="bg-muted px-1 rounded text-xs">"*"</code> in <code className="bg-muted px-1 rounded text-xs">Access-Control-Allow-Origin</code> with your actual website URL (e.g. <code className="bg-muted px-1 rounded text-xs">"https://yourwebsite.com"</code>) so only your site can call it.</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                <span><strong>Add Rate Limiting:</strong> Go to Cloudflare → Security → WAF → Rate Limiting Rules. Set a rule like "60 requests per minute per IP" to prevent abuse.</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                <span><strong>Monitor Logs:</strong> In Cloudflare → Workers → your worker → click <strong>Logs</strong> tab → <strong>Begin log stream</strong> to see real-time requests and debug issues.</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                <span><strong>Free Tier Limits:</strong> Cloudflare Workers free plan gives you 100,000 requests/day and 10ms CPU time per request — more than enough for payment verification.</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
