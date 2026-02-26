import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Copy, CheckCircle, Wallet, CreditCard, Shield, XCircle, AlertCircle, ArrowRight, Check, Clock, TimerOff } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SESSION_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export default function Checkout() {
    const { merchantId } = useParams();
    const [searchParams] = useSearchParams();
    const amountParam = searchParams.get("amount");
    const orderId = searchParams.get("orderId");
    const successUrl = searchParams.get("successUrl");
    const tsParam = searchParams.get("ts");

    const [amount] = useState<number | null>(amountParam ? parseFloat(amountParam) : null);
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [paymentType, setPaymentType] = useState<"bep20" | "binance_pay">("bep20");
    const [txId, setTxId] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [success, setSuccess] = useState(false);
    const [verifyResult, setVerifyResult] = useState<any>(null);
    const [lastVerifiedTxId, setLastVerifiedTxId] = useState("");
    const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

    // ─── Countdown Timer ───
    const sessionStart = tsParam ? parseInt(tsParam) : Date.now();
    const [timeLeft, setTimeLeft] = useState<number>(() => {
        const remaining = (sessionStart + SESSION_DURATION_MS) - Date.now();
        return Math.max(0, remaining);
    });
    const isExpired = timeLeft <= 0;

    useEffect(() => {
        if (isExpired || success) return;
        const interval = setInterval(() => {
            const remaining = (sessionStart + SESSION_DURATION_MS) - Date.now();
            if (remaining <= 0) {
                setTimeLeft(0);
                clearInterval(interval);
            } else {
                setTimeLeft(remaining);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [sessionStart, isExpired, success]);

    const formatTime = (ms: number) => {
        const totalSec = Math.floor(ms / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    const timerPercent = Math.max(0, (timeLeft / SESSION_DURATION_MS) * 100);
    const isUrgent = timeLeft < 2 * 60 * 1000; // less than 2 min

    useEffect(() => {
        if (!merchantId) { setError("Invalid checkout URL. Merchant ID missing."); setLoading(false); return; }
        if (!amount || isNaN(amount) || amount <= 0) { setError("Invalid payment amount specified."); setLoading(false); return; }

        // Check if already expired on load
        if (isExpired) { setLoading(false); return; }

        const loadConfig = async () => {
            try {
                const res = await fetch(`${SUPABASE_URL}/functions/v1/public-get-config?merchant_id=${merchantId}`);
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setConfig(data);
                if (data.bep20?.wallet_address) setPaymentType("bep20");
                else if (data.binance_pay?.pay_id) setPaymentType("binance_pay");
                else throw new Error("Merchant has no active payment methods.");
            } catch (e: any) {
                setError(e.message || "Failed to load merchant configuration.");
            } finally {
                setLoading(false);
            }
        };
        loadConfig();
    }, [merchantId, amount, isExpired]);

    const copyText = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedStates((prev) => ({ ...prev, [id]: true }));
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopiedStates((prev) => ({ ...prev, [id]: false })), 2000);
    };

    const runVerification = async (currentTxId: string) => {
        if (isExpired) { toast.error("Session expired. Please request a new payment link."); return; }
        if (!currentTxId.trim()) { toast.error("Please enter a transaction ID"); return; }
        if (!amount) return;

        setVerifying(true);
        setVerifyResult(null);
        setLastVerifiedTxId(currentTxId.trim());
        try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/public-verify-payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    merchant_id: merchantId,
                    transaction_id: currentTxId.trim(),
                    payment_type: paymentType,
                    expected_amount: amount,
                    order_id: orderId,
                    session_ts: sessionStart,
                }),
            });
            const data = await res.json();
            setVerifyResult(data);

            if (data.verified) {
                toast.success("Payment verified successfully! 🎉");
                setSuccess(true);
                if (successUrl) {
                    setTimeout(() => { window.location.href = successUrl; }, 3000);
                }
            } else {
                toast.error(data.error || "Verification failed. Check your transaction details.");
            }
        } catch (e: any) {
            toast.error(e.message || "An unexpected error occurred.");
            setVerifyResult({ verified: false, error: e.message || "An unexpected network error occurred." });
        }
        setVerifying(false);
    };

    const handleVerifyClick = () => {
        runVerification(txId);
    };

    // Auto-verify effect
    useEffect(() => {
        if (verifying || isExpired || success || !amount) return;

        const trimmed = txId.trim();
        // If it looks like a hash or ID, wait a moment then auto verify
        // Only auto-verify once per unique input to prevent infinite loops if they leave the failed text in the box
        if (trimmed.length > 15 && trimmed !== lastVerifiedTxId) {
            const timer = setTimeout(() => {
                runVerification(trimmed);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [txId, verifying, isExpired, success, amount, lastVerifiedTxId]); // Run when dependencies change

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative h-16 w-16">
                        <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
                        <div className="absolute inset-2 rounded-full border-r-2 border-primary/50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                    </div>
                    <p className="text-primary/70 animate-pulse font-medium tracking-wide">Initializing Secure Checkout...</p>
                </div>
            </div>
        );
    }

    if (error || !config) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05)_0%,transparent_50%)]" />
                <Card className="w-full max-w-md border-red-500/20 bg-slate-900/80 backdrop-blur-xl shadow-2xl z-10">
                    <CardContent className="pt-8 pb-6 text-center space-y-5">
                        <div className="h-20 w-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center ring-1 ring-red-500/20 animate-pulse">
                            <XCircle className="h-10 w-10 text-red-500" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-white">Checkout Unavailable</h2>
                            <p className="text-slate-400 text-sm">{error || "Configuration not found"}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ─── Expired State ───
    if (isExpired && !success) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05)_0%,transparent_50%)]" />
                <Card className="w-full max-w-md border-red-500/20 bg-slate-900/80 backdrop-blur-xl shadow-2xl z-10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
                    <CardContent className="pt-10 pb-8 text-center space-y-6">
                        <div className="relative">
                            <div className="h-20 w-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center ring-2 ring-red-500/20">
                                <TimerOff className="h-10 w-10 text-red-400" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-white">Session Expired</h2>
                            <p className="text-slate-400 text-sm max-w-xs mx-auto">
                                This payment session has expired after 10 minutes for security reasons.
                            </p>
                        </div>
                        <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/50 space-y-2 text-left">
                            <p className="text-xs font-semibold text-slate-300">What to do:</p>
                            <ul className="text-xs text-slate-400 space-y-1.5 ml-1">
                                <li className="flex gap-2"><span className="text-red-400">•</span> Request a new payment link from the merchant</li>
                                <li className="flex gap-2"><span className="text-red-400">•</span> If you already sent payment, contact the merchant directly</li>
                                <li className="flex gap-2"><span className="text-red-400">•</span> Each link is valid for 10 minutes only</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.1)_0%,transparent_50%)]" />

                <Card className="w-full max-w-md border-green-500/30 bg-slate-900/90 backdrop-blur-xl shadow-[0_0_50px_rgba(34,197,94,0.15)] text-center py-10 z-10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-600" />

                    <CardContent className="space-y-8 flex flex-col items-center justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
                            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30 relative z-10 animate-bounce">
                                <CheckCircle className="h-12 w-12 text-white" />
                            </div>
                        </div>

                        <div className="space-y-4 w-full">
                            <div>
                                <h2 className="text-3xl font-extrabold text-white tracking-tight">Payment Verified!</h2>
                                <p className="text-green-400 font-medium mt-1">Transaction Successful</p>
                            </div>

                            <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/50 space-y-3 mt-6">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">Amount Paid</span>
                                    <span className="text-white font-bold">${verifyResult?.amount} USDT</span>
                                </div>
                                {orderId && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">Order ID</span>
                                        <span className="text-slate-300 font-mono">{orderId}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">Status</span>
                                    <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/20 border-none">Completed</Badge>
                                </div>
                            </div>

                            {successUrl && (
                                <div className="pt-4 flex flex-col items-center animate-pulse">
                                    <p className="text-sm text-slate-400 mb-2">Redirecting to merchant...</p>
                                    <div className="flex gap-1">
                                        <div className="h-2 w-2 rounded-full bg-primary/60"></div>
                                        <div className="h-2 w-2 rounded-full bg-primary/60"></div>
                                        <div className="h-2 w-2 rounded-full bg-primary/60"></div>
                                    </div>
                                </div>
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
        <div className="min-h-screen bg-slate-950 flex flex-col items-center py-6 sm:py-12 px-3 sm:px-4 relative overflow-hidden font-sans selection:bg-primary/30">
            {/* Premium Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-[440px] space-y-4 sm:space-y-6 relative z-10">
                {/* Header Section */}
                <div className="text-center space-y-2 sm:space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-semibold backdrop-blur-md">
                        <Shield className="h-3.5 w-3.5" />
                        Secure Crypto Checkout
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                        Complete Order
                    </h1>
                    <p className="text-slate-400 text-sm">Send the exact amount below to proceed</p>
                </div>

                {/* Main Payment Card */}
                <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl relative overflow-hidden ring-1 ring-white/5">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-yellow-500 to-primary/50" />

                    {/* Amount + Timer Header */}
                    <CardHeader className="bg-slate-950/40 border-b border-slate-800/80 text-center pb-5 sm:pb-8 pt-5 sm:pt-8 px-4 sm:px-6 space-y-3">
                        <CardDescription className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-slate-400 mb-1">
                            Total to Pay
                        </CardDescription>
                        <div className="flex items-baseline justify-center gap-1.5 sm:gap-2">
                            <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-300 tracking-tighter">
                                ${amount?.toFixed(2)}
                            </span>
                            <span className="text-lg sm:text-xl font-bold text-primary">USDT</span>
                        </div>
                        {orderId && (
                            <Badge variant="outline" className="border-slate-700 bg-slate-800/50 text-slate-300 px-3 py-1 text-[10px] sm:text-xs">
                                Ref: {orderId}
                            </Badge>
                        )}

                        {/* ── Countdown Timer (inside header for visibility) ── */}
                        <div className="pt-2">
                            <div className={`
                                inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono font-bold
                                border backdrop-blur-sm transition-all duration-500
                                ${isUrgent
                                    ? 'border-red-500/40 bg-red-500/10 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                                    : 'border-slate-700 bg-slate-800/60 text-slate-300'
                                }
                            `}>
                                <Clock className={`h-3.5 w-3.5 ${isUrgent ? 'animate-pulse text-red-400' : 'text-primary'}`} />
                                <span className="tabular-nums text-sm">{formatTime(timeLeft)}</span>
                                <span className="text-[10px] font-sans font-medium opacity-60">remaining</span>
                            </div>
                            {/* Progress bar */}
                            <div className="mt-2.5 mx-auto w-40 h-1 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-linear"
                                    style={{
                                        width: `${timerPercent}%`,
                                        backgroundColor: isUrgent ? '#ef4444' : 'hsl(var(--primary))',
                                    }}
                                />
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-4 sm:p-6 space-y-5 sm:space-y-6">
                        {/* Payment Method Tabs */}
                        {(hasBep20 && hasBinancePay) && (
                            <div className="flex bg-slate-950 p-1.5 rounded-xl ring-1 ring-slate-800 shadow-inner">
                                <button
                                    className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${paymentType === 'bep20'
                                        ? 'bg-slate-800 text-white shadow-md ring-1 ring-slate-700'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-900/50'}`}
                                    onClick={() => { setPaymentType('bep20'); setVerifyResult(null); }}
                                >
                                    <Wallet className="h-4 w-4" /> BEP20 (BSC)
                                </button>
                                <button
                                    className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${paymentType === 'binance_pay'
                                        ? 'bg-slate-800 text-white shadow-md ring-1 ring-slate-700'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-900/50'}`}
                                    onClick={() => { setPaymentType('binance_pay'); setVerifyResult(null); }}
                                >
                                    <CreditCard className="h-4 w-4" /> Binance Pay
                                </button>
                            </div>
                        )}

                        {/* Only show one tab if only one method */}
                        {(hasBep20 && !hasBinancePay) && (
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Wallet className="h-4 w-4 text-primary" />
                                <span className="font-semibold text-slate-300">BEP20 (BSC) Transfer</span>
                            </div>
                        )}
                        {(!hasBep20 && hasBinancePay) && (
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <CreditCard className="h-4 w-4 text-primary" />
                                <span className="font-semibold text-slate-300">Binance Pay</span>
                            </div>
                        )}

                        {/* Payment Details */}
                        <div className="space-y-4">
                            {paymentType === "bep20" && hasBep20 && (
                                <div className="space-y-3">
                                    {config.bep20.image_url && (
                                        <div className="flex justify-center mb-4">
                                            <div className="p-2.5 sm:p-3 bg-white rounded-2xl shadow-xl ring-4 ring-slate-800/50">
                                                <img src={config.bep20.image_url} alt="QR Code" className="w-28 h-28 sm:w-36 sm:h-36 object-contain" />
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Recipient Address (BEP20 / BSC)</Label>
                                        <div className="flex items-center gap-2 group">
                                            <code className="flex-1 rounded-xl bg-slate-950 border border-slate-800 p-2.5 sm:p-3.5 text-[11px] sm:text-[13px] break-all font-mono text-slate-200 shadow-inner group-hover:border-primary/50 transition-colors leading-relaxed">
                                                {config.bep20.wallet_address}
                                            </code>
                                            <Button
                                                variant="outline"
                                                onClick={() => copyText(config.bep20.wallet_address, 'bep20')}
                                                className={`shrink-0 h-auto self-stretch rounded-xl border-slate-800 hover:bg-slate-800 hover:text-white transition-all min-w-[44px] ${copiedStates['bep20'] ? 'bg-green-500/20 border-green-500/50 text-green-400' : ''}`}
                                            >
                                                {copiedStates['bep20'] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4 text-slate-400" />}
                                            </Button>
                                        </div>
                                    </div>
                                    {/* Warning */}
                                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-[10px] sm:text-[11px] text-amber-400/80">
                                        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                        <span>Only send USDT on BSC (BEP20) network. Other networks = lost funds.</span>
                                    </div>
                                </div>
                            )}

                            {paymentType === "binance_pay" && hasBinancePay && (
                                <div className="space-y-3">
                                    {config.binance_pay.image_url && (
                                        <div className="flex justify-center mb-4">
                                            <div className="p-2.5 sm:p-3 bg-white rounded-2xl shadow-xl ring-4 ring-slate-800/50">
                                                <img src={config.binance_pay.image_url} alt="Binance Pay QR" className="w-28 h-28 sm:w-36 sm:h-36 object-contain" />
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Binance Pay ID</Label>
                                        <div className="flex items-center gap-2 group">
                                            <code className="flex-1 rounded-xl bg-slate-950 border border-slate-800 p-2.5 sm:p-3.5 text-sm break-all font-mono font-bold text-center text-slate-200 shadow-inner group-hover:border-primary/50 transition-colors">
                                                {config.binance_pay.pay_id}
                                            </code>
                                            <Button
                                                variant="outline"
                                                onClick={() => copyText(config.binance_pay.pay_id, 'binance')}
                                                className={`shrink-0 h-auto self-stretch rounded-xl border-slate-800 hover:bg-slate-800 hover:text-white transition-all min-w-[44px] ${copiedStates['binance'] ? 'bg-green-500/20 border-green-500/50 text-green-400' : ''}`}
                                            >
                                                {copiedStates['binance'] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4 text-slate-400" />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="w-full h-px bg-slate-800/60" />

                        {/* Error Display */}
                        {verifyResult && !verifyResult.verified && (
                            <div className="p-3 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                                    <p className="font-semibold text-red-400 text-sm">Verification Failed</p>
                                </div>
                                <p className="text-xs text-red-200/80 leading-relaxed">{verifyResult.error}</p>
                                <div className="pt-1 border-t border-red-500/10 mt-2 text-[10px] text-slate-500 space-y-0.5">
                                    <p>• Check transaction hash / order ID is correct</p>
                                    <p>• Wait a few minutes if just sent</p>
                                    <p>• Ensure exact amount ({amount?.toFixed(2)} USDT) was sent</p>
                                </div>
                            </div>
                        )}

                        {/* Verification Input & Button */}
                        <div className="space-y-3 sm:space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] sm:text-[11px] font-bold text-primary uppercase tracking-wider flex items-center justify-between">
                                    <span>{paymentType === "bep20" ? "Transaction Hash" : "Binance Order ID"}</span>
                                    <span className="text-slate-500 font-normal normal-case text-[9px] sm:text-[10px]">Required to verify</span>
                                </Label>
                                <Input
                                    className="border-slate-700 bg-slate-950/50 h-11 sm:h-12 text-white text-sm focus-visible:ring-primary/50 focus-visible:border-primary/50 rounded-xl"
                                    placeholder={paymentType === "bep20" ? "Paste 0x... hash here" : "Paste Binance Pay Order ID"}
                                    value={txId}
                                    onChange={(e) => {
                                        setTxId(e.target.value);
                                    }}
                                    disabled={isExpired}
                                />
                            </div>

                            <Button
                                onClick={handleVerifyClick}
                                disabled={verifying || !txId.trim() || isExpired}
                                className="w-full h-11 sm:h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/25 transition-all duration-300 text-sm sm:text-[15px] group rounded-xl disabled:opacity-50"
                            >
                                {verifying ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" /> Verifying...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        Verify Payment
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </span>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex items-center justify-center gap-2 text-[10px] sm:text-xs text-slate-500 pb-4">
                    <Shield className="h-3 w-3" />
                    <span>Protected by Binance Secure Payment Network</span>
                </div>
            </div>
        </div>
    );
}
