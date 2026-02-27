import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Link as LinkIcon, ExternalLink, Zap, MousePointer2, Settings, Globe, ShieldCheck, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function PaymentLinks() {
    const { user } = useAuth();
    const [amount, setAmount] = useState("");
    const [orderId, setOrderId] = useState("");
    const [successUrl, setSuccessUrl] = useState("");
    const [generatedLink, setGeneratedLink] = useState("");

    const baseUrl = window.location.origin;

    useEffect(() => {
        if (!user || (!amount && !orderId && !successUrl)) {
            setGeneratedLink("");
            return;
        }

        try {
            const url = new URL(`${baseUrl}/pay/${user.id}`);
            if (amount && !isNaN(parseFloat(amount))) {
                url.searchParams.append("amount", parseFloat(amount).toFixed(2));
            }
            if (orderId) {
                url.searchParams.append("orderId", orderId);
            }
            if (successUrl) {
                url.searchParams.append("successUrl", successUrl);
            }
            setGeneratedLink(url.toString());
        } catch (e) {
            setGeneratedLink("");
        }
    }, [user, amount, orderId, successUrl, baseUrl]);

    const copyLink = async () => {
        if (!generatedLink) return;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(generatedLink);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = generatedLink;
                textArea.style.top = "0";
                textArea.style.left = "0";
                textArea.style.position = "fixed";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                } catch (err) {
                    console.error('Fallback error', err);
                }
                document.body.removeChild(textArea);
            }
            toast.success("Payment link copied to terminal! 🚀");
        } catch (err) {
            toast.error("Failed to copy link");
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-6 w-6 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                            <MousePointer2 className="h-3.5 w-3.5 text-indigo-500" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500">No-Code Solution</span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight">One-Click Pay Links</h1>
                    <p className="text-muted-foreground font-medium">Generate shareable payment endpoints for direct customer settlement.</p>
                </div>
                <div className="h-12 flex items-center gap-4 px-6 rounded-2xl bg-muted/30 border border-border/40">
                    <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">Global Network Active</span>
                    </div>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-5">
                {/* Generator Options */}
                <div className="lg:col-span-3 space-y-8">
                    <Card className="rounded-[2.5rem] border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden shadow-xl border-l-4 border-l-primary">
                        <CardHeader className="p-8 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Settings className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-black">Link Constructor</CardTitle>
                                    <CardDescription className="font-bold opacity-70">Define the payload for your smart payment link.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Settlement Amount (USDT)</Label>
                                    <div className="relative group">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-50" />
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="pl-12 h-14 rounded-2xl border-border bg-background/50 font-black text-lg focus:ring-primary/10"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Internal Reference (ID)</Label>
                                    <div className="relative group">
                                        <Zap className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-50" />
                                        <Input
                                            placeholder="INV-0001"
                                            value={orderId}
                                            onChange={(e) => setOrderId(e.target.value)}
                                            className="pl-12 h-14 rounded-2xl border-border bg-background/50 font-bold focus:ring-primary/10"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Settlement Redirect (Return URL)</Label>
                                <div className="relative group">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-50" />
                                    <Input
                                        placeholder="https://yourbrand.com/success"
                                        value={successUrl}
                                        onChange={(e) => setSuccessUrl(e.target.value)}
                                        className="pl-12 h-14 rounded-2xl border-border bg-background/50 font-bold focus:ring-primary/10"
                                    />
                                </div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 ml-1">Customers will be routed here after verification.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="p-8 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-4">
                        <ShieldCheck className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-black text-emerald-500 uppercase tracking-widest">Enterprise Protection</p>
                            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                                Every generated link is cryptographically bound to your identity and protected by our secondary verification layer.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Live Preview Card */}
                <div className="lg:col-span-2">
                    <Card className="rounded-[2.5rem] border-primary/20 bg-background/50 backdrop-blur-xl overflow-hidden h-full flex flex-col shadow-2xl group border-t-8 border-t-primary">
                        <CardHeader className="p-8 text-center">
                            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                                <LinkIcon className="h-8 w-8 text-primary" />
                            </div>
                            <CardTitle className="text-2xl font-black">Live Token</CardTitle>
                            <CardDescription className="font-bold">Production-ready endpoint</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 flex-1 flex flex-col justify-center space-y-8">
                            <div className="p-6 rounded-3xl bg-muted/40 border border-border shadow-inner relative overflow-hidden group/link min-h-[140px] flex items-center justify-center">
                                {generatedLink ? (
                                    <div className="space-y-4 w-full">
                                        <code className="block text-center font-mono text-xs font-black text-primary break-all leading-relaxed">
                                            {generatedLink}
                                        </code>
                                        <div className="flex justify-center">
                                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Payload Ready</Badge>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-2 opacity-30">
                                        <Zap className="h-8 w-8 mx-auto animate-pulse" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Parameters</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <Button
                                    onClick={copyLink}
                                    disabled={!generatedLink || !amount}
                                    className="w-full h-16 rounded-2xl font-black text-lg gradient-primary shadow-xl shadow-primary/30 active:scale-95 transition-all text-white"
                                >
                                    <Copy className="h-5 w-5 mr-3" /> Copy Deployment Link
                                </Button>
                                {generatedLink && amount && (
                                    <Button variant="outline" asChild className="w-full h-12 rounded-xl font-bold border-border/50 hover:bg-muted transition-all">
                                        <a href={generatedLink} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-4 w-4 mr-2" /> Live Preview
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="p-8 pt-0 justify-center">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Secured via gateway v1.4</p>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
