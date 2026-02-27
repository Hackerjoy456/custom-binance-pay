import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    Loader2, Copy, CheckCircle, Wallet, CreditCard, Shield, XCircle,
    AlertCircle, ArrowRight, Check, Clock, TimerOff, Zap, ShieldCheck,
    Lock, Info, MessageCircle, HelpCircle, GraduationCap, Headset
} from "lucide-react";

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
                    setTimeout(() => {
                        try {
                            const redirectUrl = new URL(successUrl);
                            if (orderId) redirectUrl.searchParams.append("order_id", orderId);
                            if (data.amount) redirectUrl.searchParams.append("amount", data.amount.toString());
                            redirectUrl.searchParams.append("tx_id", currentTxId.trim());
                            redirectUrl.searchParams.append("status", "success");
                            window.location.href = redirectUrl.toString();
                        } catch (err) {
                            window.location.href = successUrl;
                        }
                    }, 3000);
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

    useEffect(() => {
        if (verifying || isExpired || success || !amount) return;
        const trimmed = txId.trim();
        if (trimmed.length > 20 && trimmed !== lastVerifiedTxId) {
            const timer = setTimeout(() => {
                runVerification(trimmed);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [txId, verifying, isExpired, success, amount, lastVerifiedTxId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0b0e11] flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative h-20 w-20">
                        <div className="absolute inset-0 rounded-full border-[3px] border-primary/20" />
                        <div className="absolute inset-0 rounded-full border-t-[3px] border-primary animate-spin" />
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-black text-white tracking-tight animate-pulse">BINANCE VERIFY</p>
                        <p className="text-primary/60 text-[10px] font-black uppercase tracking-widest mt-1">Establishing Secure Channel</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !config) {
        return (
            <div className="min-h-screen bg-[#0b0e11] flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.1)_0%,transparent_50%)]" />
                <Card className="w-full max-w-sm border-red-500/20 bg-[#1e2329]/80 backdrop-blur-3xl shadow-2xl z-10 rounded-[2.5rem]">
                    <CardContent className="pt-12 pb-10 text-center space-y-6">
                        <div className="h-20 w-20 mx-auto rounded-[2rem] bg-red-500/10 flex items-center justify-center ring-1 ring-red-500/20">
                            <XCircle className="h-10 w-10 text-red-500" />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-2xl font-black text-white tracking-tighter">Connection Interrupted</h2>
                            <p className="text-slate-400 text-xs font-bold leading-relaxed px-4">{error || "Gateway response timed out"}</p>
                        </div>
                        <Button
                            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl font-black uppercase tracking-widest text-[10px] h-12 w-full max-w-[200px]"
                            onClick={() => window.location.reload()}
                        >
                            Reconnect Gateway
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isExpired && !success) {
        return (
            <div className="min-h-screen bg-[#0b0e11] flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(240,185,11,0.05)_0%,transparent_50%)]" />
                <Card className="w-full max-w-sm border-slate-800 bg-[#1e2329]/90 backdrop-blur-3xl shadow-2xl z-10 rounded-[3rem] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 to-orange-500" />
                    <CardContent className="pt-16 pb-12 text-center space-y-8">
                        <div className="h-24 w-24 mx-auto rounded-[2.5rem] bg-amber-500/10 flex items-center justify-center ring-2 ring-amber-500/20 animate-pulse">
                            <TimerOff className="h-12 w-12 text-amber-500" />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-3xl font-black text-white tracking-tighter italic">ID EXPIRED</h2>
                            <p className="text-slate-400 text-xs font-bold max-w-[240px] mx-auto leading-relaxed">
                                Current payment ID has been revoked for security. Please request a new identifier.
                            </p>
                        </div>

                        <div className="pt-4">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">Secure Audit Code: 0x82...{merchantId?.slice(-4)}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-[#0b0e11] flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1)_0%,transparent_50%)]" />
                <Card className="w-full max-w-[400px] border-emerald-500/30 bg-[#1e2329]/90 backdrop-blur-3xl shadow-[0_0_100px_rgba(16,185,129,0.2)] text-center pb-12 z-10 rounded-[3.5rem] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2.5 bg-gradient-to-r from-emerald-400 to-green-600" />
                    <CardContent className="pt-20 space-y-12 flex flex-col items-center">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-emerald-500/30 rounded-[3rem] animate-ping" />
                            <div className="h-32 w-32 rounded-[3.1rem] bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-2xl relative z-10">
                                <ShieldCheck className="h-16 w-16 text-white" />
                            </div>
                        </div>
                        <div className="space-y-6 w-full px-8">
                            <div>
                                <h1 className="text-4xl font-black text-white tracking-tighter mb-1 uppercase italic">Success</h1>
                                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.4em]">Settlement Authenticated</p>
                            </div>
                            <div className="bg-[#0b0e11]/60 rounded-[2.5rem] p-8 border border-slate-800 space-y-6 shadow-2xl">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-black uppercase tracking-widest text-[9px]">Amount Paid</span>
                                    <span className="text-white text-xl font-black italic tracking-tighter">${verifyResult?.amount} <span className="text-primary text-sm not-italic uppercase ml-1">usdt</span></span>
                                </div>
                                <div className="h-px bg-slate-800/80" />
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-black uppercase tracking-widest text-[9px]">Order Reference</span>
                                    <span className="text-slate-400 font-mono text-[11px] font-bold">{orderId || "-"}</span>
                                </div>
                            </div>
                            {successUrl && (
                                <div className="pt-8 flex flex-col items-center gap-4 group">
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 group-hover:text-emerald-400 transition-colors">Terminating Secure Channel</p>
                                    <div className="flex gap-2">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" />
                                        <div className="h-2 w-2 rounded-full bg-emerald-500/60 animate-bounce" style={{ animationDelay: '0.2s' }} />
                                        <div className="h-2 w-2 rounded-full bg-emerald-500/30 animate-bounce" style={{ animationDelay: '0.4s' }} />
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
        <div className="min-h-screen bg-[#0b0e11] flex flex-col items-center py-10 sm:py-20 px-4 relative overflow-hidden font-sans selection:bg-primary/40 selection:text-white">
            {/* Ultra High-End Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[5%] left-[10%] w-[60%] h-[60%] bg-[#f0b90b]/5 rounded-full blur-[180px] animate-pulse pointer-events-none" />
                <div className="absolute bottom-[5%] right-[10%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-[180px] animate-pulse pointer-events-none" style={{ animationDelay: '3s' }} />
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            </div>

            <div className="w-full max-w-[450px] space-y-6 sm:space-y-10 relative z-10 px-2 sm:px-0">
                {/* Brand Header - Responsive Scaling */}
                <div className="text-center space-y-2 group">
                    <div className="inline-flex items-center gap-2 mb-2 px-4 py-1.5 rounded-full bg-[#1e2329]/80 border border-slate-800 shadow-2xl backdrop-blur-xl transition-all hover:border-primary/50">
                        <Lock className="h-3 w-3 text-primary animate-pulse" />
                        <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.4em] text-white">Binance Verify Protocol</span>
                    </div>
                    <div className="flex flex-col items-center gap-0">
                        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tighter italic leading-none">ORDER</h1>
                        <p className="text-primary font-black uppercase tracking-[0.5em] text-[8px] sm:text-[10px] ml-1 opacity-80">Settlement Portal</p>
                    </div>
                </div>

                <div className="flex justify-center -mb-4">
                    <Button
                        variant="outline"
                        className="rounded-full h-10 px-6 border-slate-800 bg-[#1e2329]/50 backdrop-blur-xl text-xs font-black uppercase tracking-widest text-[#26A1DE] hover:bg-[#26A1DE]/10 hover:border-[#26A1DE]/40 transition-all gap-2"
                        onClick={() => window.open(`https://t.me/hibigibi123`, '_blank')}
                    >
                        <Headset className="h-4 w-4" /> Need Help?
                    </Button>
                </div>

                {/* Main Glass Card - Auto-Adjusting Layout */}
                <Card className="border-slate-800 bg-[#1e2329]/70 backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.5)] rounded-[2rem] sm:rounded-[3rem] overflow-hidden transition-all duration-700 hover:shadow-primary/5 border-t border-t-white/5 ring-1 ring-white/5">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary via-[#f8d33a] to-primary/40" />

                    <CardHeader className="p-6 sm:p-10 space-y-6 sm:space-y-8 text-center bg-gradient-to-b from-white/[0.03] to-transparent">
                        <div className="space-y-2">
                            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Exact Settlement</span>
                            <div className="flex items-center justify-center gap-3">
                                <span className="text-4xl sm:text-5xl font-black text-white tracking-tighter leading-none italic animate-in zoom-in duration-700">${amount?.toFixed(2)}</span>
                                <span className="text-lg sm:text-2xl font-black text-primary italic pt-3">USDT</span>
                            </div>
                        </div>

                        {/* Interactive Timer Badge */}
                        <div className="relative pt-1 flex flex-col items-center">
                            <div className={`
                                px-6 py-2.5 rounded-full flex items-center gap-3 border shadow-2xl transition-all duration-1000 ring-1 ring-white/5
                                ${isUrgent
                                    ? 'bg-red-500/10 border-red-500/30 text-red-500 animate-pulse'
                                    : 'bg-[#0b0e11]/90 border-slate-800 text-white shadow-inner'
                                }
                            `}>
                                <Clock className={`h-4 w-4 ${isUrgent ? 'animate-pulse' : 'text-primary'}`} />
                                <span className="text-xl sm:text-2xl font-black tabular-nums tracking-widest font-mono leading-none">{formatTime(timeLeft)}</span>
                            </div>
                            <div className="mt-4 w-32 sm:w-40 h-[2px] rounded-full bg-slate-800/60 overflow-hidden ring-1 ring-white/5">
                                <div
                                    className={`h-full transition-all duration-1000 ease-linear ${isUrgent ? 'bg-red-500' : 'bg-primary'}`}
                                    style={{ width: `${timerPercent}%` }}
                                />
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-8 sm:p-12 pt-0 space-y-10">
                        {/* High-End Method Toggle */}
                        {(hasBep20 && hasBinancePay) && (
                            <div className="p-1.5 rounded-full bg-[#0b0e11] border border-slate-800 flex shadow-2xl ring-1 ring-white/5 mx-auto max-w-[320px]">
                                <button
                                    onClick={() => { setPaymentType('bep20'); setVerifyResult(null); }}
                                    className={`flex-1 py-3 text-[9px] font-black uppercase tracking-[0.15em] rounded-full transition-all duration-500 flex items-center justify-center gap-2 ${paymentType === 'bep20'
                                        ? 'bg-[#1e2329] text-white shadow-[0_8px_20px_rgba(0,0,0,0.4)] ring-1 ring-slate-700'
                                        : 'text-slate-600 hover:text-slate-400'}`}
                                >
                                    <Wallet className={`h-3.5 w-3.5 ${paymentType === 'bep20' ? 'text-primary' : ''}`} /> BEP20
                                </button>
                                <button
                                    onClick={() => { setPaymentType('binance_pay'); setVerifyResult(null); }}
                                    className={`flex-1 py-3 text-[9px] font-black uppercase tracking-[0.15em] rounded-full transition-all duration-500 flex items-center justify-center gap-2 ${paymentType === 'binance_pay'
                                        ? 'bg-[#1e2329] text-white shadow-[0_8px_20px_rgba(0,0,0,0.4)] ring-1 ring-slate-700'
                                        : 'text-slate-600 hover:text-slate-400'}`}
                                >
                                    <CreditCard className={`h-3.5 w-3.5 ${paymentType === 'binance_pay' ? 'text-primary' : ''}`} /> PAY-ID
                                </button>
                            </div>
                        )}

                        {/* Visual Assets (QR) */}
                        <div className="flex flex-col items-center gap-6">
                            {paymentType === "bep20" && hasBep20 && config.bep20.image_url && (
                                <div className="p-4 bg-white rounded-[2rem] shadow-2xl transition-all duration-700 hover:scale-[1.02] animate-in zoom-in-95 ring-4 ring-white/5">
                                    <img src={config.bep20.image_url} alt="BSC" className="w-36 h-36 sm:w-48 sm:h-48 object-contain" />
                                </div>
                            )}
                            {paymentType === "binance_pay" && hasBinancePay && config.binance_pay.image_url && (
                                <div className="p-4 bg-white rounded-[2rem] shadow-2xl transition-all duration-700 hover:scale-[1.02] animate-in zoom-in-95 ring-4 ring-white/5">
                                    <img src={config.binance_pay.image_url} alt="PayID" className="w-36 h-36 sm:w-48 sm:h-48 object-contain" />
                                </div>
                            )}

                            <div className="w-full space-y-3">
                                <div className="space-y-1.5 px-1">
                                    <Label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Recipient Destination</Label>
                                    <div className="flex gap-2 group/field">
                                        <div className="flex-1 rounded-2xl bg-[#0b0e11]/80 border border-slate-800 p-4 text-[10px] sm:text-[12px] font-mono font-bold text-slate-300 shadow-inner break-all line-clamp-2 transition-all group-hover/field:border-primary/30 min-h-[56px] flex items-center justify-center">
                                            {paymentType === "bep20" ? config.bep20.wallet_address : config.binance_pay.pay_id}
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => copyText(paymentType === "bep20" ? config.bep20.wallet_address : config.binance_pay.pay_id, 'data')}
                                            className={`h-auto w-14 rounded-2xl border-slate-800 bg-[#0b0e11] hover:bg-slate-800 transition-all ${copiedStates['data'] ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'text-slate-500'}`}
                                        >
                                            {copiedStates['data'] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Critical Reminder - Redesigned */}
                        <div className="flex items-center gap-5 p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 shadow-inner group/warn">
                            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0 transition-transform group-hover/warn:rotate-12">
                                <AlertCircle className="h-5 w-5 text-amber-500" />
                            </div>
                            <p className="text-[10px] font-black text-amber-500/80 leading-relaxed uppercase tracking-widest">
                                Protocol: Use <span className="text-white">BEP20 / BSC</span> network only. Verified funds are settled instantly.
                            </p>
                        </div>

                        {/* Error Handling - Premium */}
                        {verifyResult && !verifyResult.verified && (
                            <div className="p-6 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 flex gap-5 animate-in slide-in-from-bottom-6 duration-700 shadow-2xl">
                                <div className="h-10 w-10 rounded-2xl bg-red-500/20 flex items-center justify-center shrink-0">
                                    <XCircle className="h-6 w-6 text-red-500 font-black" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-black text-[10px] text-white uppercase tracking-widest">Verification Terminated</p>
                                    <p className="text-[11px] text-red-400/90 font-bold leading-relaxed">{verifyResult.error}</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-5 pt-6 -mx-6 sm:-mx-12 px-6 sm:px-12 border-t border-slate-800/80 bg-white/[0.01]">
                            <div className="space-y-3">
                                <Label className="text-[8px] font-black text-primary uppercase tracking-[0.4em] flex items-center justify-between px-1">
                                    <span>{paymentType === "bep20" ? "Tx-Hash / Signature" : "Binance Order Reference"}</span>
                                    <span className="text-slate-600 italic lowercase font-bold opacity-50">Secure Input</span>
                                </Label>
                                <Input
                                    className="h-14 sm:h-16 rounded-2xl bg-[#0b0e11] border-slate-800 text-white font-mono text-center text-xs sm:text-base focus-visible:ring-primary/20 focus-visible:border-primary/50 shadow-inner group transition-all"
                                    placeholder={paymentType === "bep20" ? "Enter 0x... signature" : "Enter Order Identifier"}
                                    value={txId}
                                    onChange={(e) => setTxId(e.target.value)}
                                    disabled={isExpired}
                                />
                            </div>

                            <Button
                                onClick={handleVerifyClick}
                                disabled={verifying || !txId.trim() || isExpired}
                                className="w-full h-14 sm:h-16 bg-primary hover:bg-[#f8d33a] active:scale-[0.98] text-[#0b0e11] font-black uppercase tracking-[0.2em] shadow-xl rounded-2xl transition-all duration-500 text-xs sm:text-sm ring-1 ring-white/10"
                            >
                                {verifying ? (
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="h-5 w-5 animate-spin" /> Verifying...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        Release Payment <ArrowRight className="h-5 w-5" />
                                    </div>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Secure Compliance Footer */}
                <div className="flex flex-col items-center gap-6 text-slate-500 pb-16">
                    <div className="flex items-center gap-4 px-8 py-3 rounded-full border border-slate-800/50 bg-[#1e2329]/40 backdrop-blur-3xl shadow-2xl transition-all hover:bg-slate-800/80">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">Quantum-Safe Encryption Locked</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-30 select-none">
                        <GraduationCap className="h-3 w-3" />
                        <p className="text-[8px] font-black uppercase tracking-[0.5em]">Network Infrastructure Powered by Binance Cloud</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
