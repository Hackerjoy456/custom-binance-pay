import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Link as LinkIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";

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
                // Fallback for non-https older environments (sometimes occurs in dev preview environments)
                const textArea = document.createElement("textarea");
                textArea.value = generatedLink;
                // Avoid scrolling to bottom
                textArea.style.top = "0";
                textArea.style.left = "0";
                textArea.style.position = "fixed";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                } catch (err) {
                    console.error('Fallback: Oops, unable to copy', err);
                }
                document.body.removeChild(textArea);
            }
            toast.success("Payment link copied to clipboard!");
        } catch (err) {
            toast.error("Failed to copy link");
            console.error(err);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Payment Links</h1>
                <p className="text-muted-foreground mt-2">
                    Create simple shareable links to get paid directly without writing any code.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-border/50 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -z-10" />
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LinkIcon className="h-5 w-5 text-primary" />
                            Generator Options
                        </CardTitle>
                        <CardDescription>Configure the details of your payment link.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount (USDT) <span className="text-red-500">*</span></Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="25.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="bg-muted/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="orderId">Order ID / Description (Optional)</Label>
                            <Input
                                id="orderId"
                                placeholder="INV-001 or Website Design"
                                value={orderId}
                                onChange={(e) => setOrderId(e.target.value)}
                                className="bg-muted/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="successUrl">Redirect URL After Payment (Optional)</Label>
                            <Input
                                id="successUrl"
                                placeholder="https://yourwebsite.com/thank-you"
                                value={successUrl}
                                onChange={(e) => setSuccessUrl(e.target.value)}
                                className="bg-muted/50"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 shadow-lg group">
                    <CardHeader>
                        <CardTitle>Your Payment Link</CardTitle>
                        <CardDescription>Share this link directly with your customers.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/50 break-all font-mono text-sm text-muted-foreground min-h-[100px] flex items-center justify-center text-center leading-relaxed">
                            {generatedLink ? (
                                <span className="text-foreground">{generatedLink}</span>
                            ) : (
                                "Enter amount above to generate a link"
                            )}
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={copyLink}
                                disabled={!generatedLink || !amount}
                                className="w-full gap-2 font-semibold shadow-md"
                            >
                                <Copy className="h-4 w-4" />
                                Copy Link
                            </Button>
                            {generatedLink && amount && (
                                <Button variant="outline" asChild className="shrink-0 gap-2">
                                    <a href={generatedLink} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
