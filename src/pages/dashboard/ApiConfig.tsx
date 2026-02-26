import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { safeError } from "@/lib/safe-error";
import { Save, Upload, Shield, Wallet, CreditCard, Globe } from "lucide-react";

export default function ApiConfig() {
  const { user } = useAuth();
  const [config, setConfig] = useState({
    binance_api_key: "",
    binance_api_secret: "",
    binance_pay_id: "",
    bep20_address: "",
    image_url: "",
    bep20_image_url: "",
    custom_endpoint_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPay, setUploadingPay] = useState(false);
  const [uploadingBep20, setUploadingBep20] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("api_configurations").select("*").eq("user_id", user.id).limit(1).then(({ data: rows }) => {
      const data = rows?.[0];
      if (data) {
        setConfig({
          binance_api_key: data.binance_api_key || "",
          binance_api_secret: data.binance_api_secret || "",
          binance_pay_id: data.binance_pay_id || "",
          bep20_address: data.bep20_address || "",
          image_url: data.image_url || "",
          bep20_image_url: (data as any).bep20_image_url || "",
          custom_endpoint_url: (data as any).custom_endpoint_url || "",
        });
      }
      setLoading(false);
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("api_configurations").upsert({
      user_id: user.id,
      binance_api_key: config.binance_api_key,
      binance_api_secret: config.binance_api_secret,
      binance_pay_id: config.binance_pay_id,
      bep20_address: config.bep20_address,
      image_url: config.image_url,
      bep20_image_url: config.bep20_image_url,
      custom_endpoint_url: config.custom_endpoint_url || null,
    } as any, { onConflict: "user_id" });

    if (error) toast.error(safeError(error, "Failed to save configuration"));
    else toast.success("Configuration saved!");
    setSaving(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "pay" | "bep20") => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const setUploading = type === "pay" ? setUploadingPay : setUploadingBep20;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${type}-logo.${ext}`;
    const { error } = await supabase.storage.from("user-images").upload(path, file, { upsert: true });
    if (error) {
      toast.error(safeError(error, "Failed to upload image"));
    } else {
      const { data } = supabase.storage.from("user-images").getPublicUrl(path);
      const field = type === "pay" ? "image_url" : "bep20_image_url";
      setConfig((c) => ({ ...c, [field]: data.publicUrl }));
      toast.success("Image uploaded!");
    }
    setUploading(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API Configuration</h1>
        <p className="text-muted-foreground">Configure your Binance credentials for payment verification</p>
      </div>

      <Card className="card-glow border-border/50 overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-1 gradient-primary" />
        <CardHeader className="pl-6">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Binance Credentials
          </CardTitle>
          <CardDescription>API key and secret used for both Binance Pay and BEP20 verification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pl-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Binance API Key</Label>
              <Input type="password" value={config.binance_api_key} onChange={(e) => setConfig((c) => ({ ...c, binance_api_key: e.target.value }))} placeholder="Enter your Binance API key" className="border-border/50 focus:border-primary" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Binance API Secret</Label>
              <Input type="password" value={config.binance_api_secret} onChange={(e) => setConfig((c) => ({ ...c, binance_api_secret: e.target.value }))} placeholder="Enter your Binance API secret" className="border-border/50 focus:border-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-glow border-border/50 overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/60" />
        <CardHeader className="pl-6">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> Binance Pay
          </CardTitle>
          <CardDescription>Merchant ID and QR/logo image for Binance Pay verification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pl-6">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Binance Pay Merchant ID</Label>
            <Input value={config.binance_pay_id} onChange={(e) => setConfig((c) => ({ ...c, binance_pay_id: e.target.value }))} placeholder="Enter your Binance Pay ID" className="border-border/50 focus:border-primary" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Binance Pay Image <span className="text-muted-foreground font-normal normal-case">(Optional)</span></Label>
            <div className="flex items-center gap-4">
              {config.image_url && <img src={config.image_url} alt="Binance Pay" className="h-16 w-16 rounded-lg object-cover border border-primary/20" />}
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/20 px-4 py-2 text-sm text-muted-foreground hover:bg-primary/5 hover:border-primary/40 transition-colors">
                  <Upload className="h-4 w-4" /> {uploadingPay ? "Uploading..." : "Upload Image"}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "pay")} disabled={uploadingPay} />
              </label>
              {config.image_url && (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => setConfig((c) => ({ ...c, image_url: "" }))}>
                  Remove
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-glow border-border/50 overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/40" />
        <CardHeader className="pl-6">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> BEP20 (BSC Network)
          </CardTitle>
          <CardDescription>Wallet address and QR/logo image for BEP20 token verification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pl-6">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">BEP20 Wallet Address</Label>
            <Input value={config.bep20_address} onChange={(e) => setConfig((c) => ({ ...c, bep20_address: e.target.value }))} placeholder="0x..." className="border-border/50 focus:border-primary font-mono" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">BEP20 Image <span className="text-muted-foreground font-normal normal-case">(Optional)</span></Label>
            <div className="flex items-center gap-4">
              {config.bep20_image_url && <img src={config.bep20_image_url} alt="BEP20" className="h-16 w-16 rounded-lg object-cover border border-primary/20" />}
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/20 px-4 py-2 text-sm text-muted-foreground hover:bg-primary/5 hover:border-primary/40 transition-colors">
                  <Upload className="h-4 w-4" /> {uploadingBep20 ? "Uploading..." : "Upload Image"}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "bep20")} disabled={uploadingBep20} />
              </label>
              {config.bep20_image_url && (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => setConfig((c) => ({ ...c, bep20_image_url: "" }))}>
                  Remove
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-glow border-border/50 overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-muted-foreground/30" />
        <CardHeader className="pl-6">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Custom API Endpoint
          </CardTitle>
          <CardDescription>Set a custom domain URL (e.g. via Cloudflare Worker proxy) to display instead of the default endpoint.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pl-6">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Custom Endpoint URL</Label>
            <Input value={config.custom_endpoint_url} onChange={(e) => setConfig((c) => ({ ...c, custom_endpoint_url: e.target.value }))} placeholder="https://api.yourdomain.com/verify" className="border-border/50 focus:border-primary" />
            <p className="text-xs text-muted-foreground">Leave empty to use the default endpoint</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} size="lg" className="glow-primary">
        <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save Configuration"}
      </Button>
    </div>
  );
}
