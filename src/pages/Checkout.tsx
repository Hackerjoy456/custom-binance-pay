import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Copy, CheckCircle, Wallet, CreditCard, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Checkout() {
    const { merchantId } = useParams();
    const [searchParams] = useSearchParams();
    const amountParam = searchParams.get("amount");
    const orderId = searchParams.get("orderId");
    const webhookUrl = searchParams.get("webhookUrl"); // Just for reference
    const successUrl = searchParams.get("successUrl");

    const [amount, setAmount] = useState<number | null>(amountParam ? parseFloat(amountParam) : null);
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [paymentType, setPaymentType] = useState<"bep20" | "binance_pay">("bep20");
    const [txId, setTxId] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!merchantId) {
            setError("Invalid checkout URL. Merchant ID missing.");
            setLoading(false);
            return;
        }

        if (!amount || isNaN(amount) || amount <= 0) {
            setError("Invalid payment amount specified.");
            setLoading(false);
            return;
        }

        const loadConfig = async () => {
            try {
                const { data, error } = await supabase.functions.invoke("public-get-config", {
                    body: { merchant_id: merchantId },
                });

                if (error) throw error;
                if (data?.error) throw new Error(data.error);

                setConfig(data);

                // Auto-select payment method
                if (data.bep20?.wallet_address) {
                    setPaymentType("bep20");
                } else if (data.binance_pay?.pay_id) {
                    setPaymentType("binance_pay");
                } else {
                    throw new Error("Merchant has no active payment methods.");
                }
            } catch (e: any) {
                setError(e.message || "Failed to load merchant configuration.");
            } finally {
                setLoading(false);
            }
        };

        loadConfig();
    }, [merchantId, amount]);

    const copyText = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
    };

    const handleVerify = async () => {
        if (!txId.trim()) { toast.error("Please enter a transaction ID"); return; }
        if (!amount) return;

        setVerifying(true);
        try {
            const { data, error } = await supabase.functions.invoke("public-verify-payment", {
                body: {
                    merchant_id: merchantId,
                    transaction_id: txId.trim(),
                    payment_type: paymentType,
                    expected_amount: amount,
                    order_id: orderId,
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
                toast.success("Payment verified successfully! 🎉");
                setSuccess(true);
                if (successUrl) {
                    setTimeout(() => {
                        window.location.href = successUrl;
                    }, 3000);
                }
            } else {
                toast.error(data?.error || "Verification failed. Check your transaction details.");
            }
        } catch (e: any) {
            toast.error(e.message || "An unexpected error occurred.");
        }
        setVerifying(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Loading secure checkout...</p>
                </div>
            </div>
        );
    }

    if (error || !config) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md border-destructive/20 card-glow">
                    <CardHeader className="text-center">
                        <CardTitle className="text-destructive">Checkout Unavailable</CardTitle>
                        <CardDescription>{error || "Configuration not found"}</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md border-success/30 glow-success text-center py-10">
                    <CardContent className="space-y-6 flex flex-col items-center justify-center">
                        <div className="h-20 w-20 rounded-full bg-success/20 flex items-center justify-center animate-bounce">
                            <CheckCircle className="h-10 w-10 text-success" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-foreground">Payment Successful!</h2>
                            <p className="text-muted-foreground">Your transaction has been verified.</p>
                            {successUrl && (
                                <p className="text-sm text-muted-foreground mt-4 animate-pulse">
                                    Redirecting back to merchant...
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const hasBep20 = !!config.bep20?.wallet_address;
    const hasBinancePay = !!config.binance_pay?.pay_id;

    return (
        <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4 relative overflow-hidden">
            {/* Glow Orbs */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="w-full max-w-md space-y-8 relative z-10">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-semibold mb-2">
                        <Shield className="h-3.5 w-3.5" />
                        Secure Payment Gateway
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Complete Payment</h1>
                    <p className="text-muted-foreground">Send exact amount to complete your order</p>
                </div>

                <Card className="border-primary/20 shadow-2xl shadow-primary/5 card-glow relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 gradient-primary" />

                    <CardHeader className="bg-muted/30 border-b border-border/50 text-center pb-8 pt-8">
                        <CardDescription className="text-xs uppercase tracking-wider font-bold mb-1">Total to Pay</CardDescription>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-5xl font-black text-primary text-glow-strong tracking-tighter">
                                ${amount?.toFixed(2)}
                            </span>
                            <span className="text-xl font-bold text-muted-foreground mt-2">USDT</span>
                        </div>
                        {orderId && (
                            <Badge variant="outline" className="mt-4 border-primary/20 bg-background/50">
                                Order ID: {orderId}
                            </Badge>
                        )}
                    </CardHeader>

                    <CardContent className="p-6 space-y-6">
                        <div className="flex bg-muted/50 p-1 rounded-lg">
                            {hasBep20 && (
                                <button
                                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 ${paymentType === 'bep20' ? 'bg-background shadow text-primary border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}
                                    onClick={() => setPaymentType('bep20')}
                                >
                                    <Wallet className="h-4 w-4" /> BEP20
                                </button>
                            )}
                            {hasBinancePay && (
                                <button
                                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 ${paymentType === 'binance_pay' ? 'bg-background shadow text-primary border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}
                                    onClick={() => setPaymentType('binance_pay')}
                                >
                                    <CreditCard className="h-4 w-4" /> Binance Pay
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            {paymentType === "bep20" && hasBep20 && (
                                <div className="space-y-3">
                                    {config.bep20.image_url && (
                                        <div className="flex justify-center mb-4">
                                            <div className="p-2 bg-white rounded-xl">
                                                <img src={config.bep20.image_url} alt="QR Code" className="w-32 h-32 object-contain" />
                                            </div>
                                        </div>
                                    )}
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Recipient Address (BEP20 / BSC)</Label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 rounded-lg bg-muted/60 border border-border p-3 text-xs break-all font-mono text-foreground">{config.bep20.wallet_address}</code>
                                        <Button variant="outline" size="icon" onClick={() => copyText(config.bep20.wallet_address)} className="shrink-0">
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {paymentType === "binance_pay" && hasBinancePay && (
                                <div className="space-y-3">
                                    {config.binance_pay.image_url && (
                                        <div className="flex justify-center mb-4">
                                            <div className="p-2 bg-white rounded-xl">
                                                <img src={config.binance_pay.image_url} alt="Binance Pay QR" className="w-32 h-32 object-contain" />
                                            </div>
                                        </div>
                                    )}
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Binance Pay ID</Label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 rounded-lg bg-muted/60 border border-border p-3 text-sm break-all font-mono font-bold text-center text-foreground">{config.binance_pay.pay_id}</code>
                                        <Button variant="outline" size="icon" onClick={() => copyText(config.binance_pay.pay_id)} className="shrink-0">
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="w-full h-px bg-border/50 my-6" />

                        <div className="space-y-3">
                            <Label className="text-xs font-semibold uppercase text-primary">
                                {paymentType === "bep20" ? "Transaction Hash" : "Binance Order ID"}
                            </Label>
                            <Input
                                className="border-primary/20 h-12"
                                placeholder={paymentType === "bep20" ? "0x..." : "Enter Order ID"}
                                value={txId}
                                onChange={(e) => setTxId(e.target.value)}
                            />
                            <Button
                                onClick={handleVerify}
                                disabled={verifying || !txId.trim()}
                                className="w-full h-12 glow-primary font-bold transition-all text-[15px] mt-2 group"
                            >
                                {verifying ? (
                                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...</>
                                ) : (
                                    <>Verify Payment <CheckCircle className="ml-2 h-4 w-4 transition-transform group-hover:scale-110" /></>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-muted-foreground opacity-70">
                    Powered by Binance Payment Gateway
                </p>
            </div>
        </div>
    );
}
