import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { safeError } from "@/lib/safe-error";
import { Save, Upload, Shield, Wallet, CreditCard, Globe, AlertCircle, CheckCircle2, AlertTriangle, EyeOff, Eye } from "lucide-react";

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
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [lastSavedConfig, setLastSavedConfig] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("api_configurations").select("*").eq("user_id", user.id).limit(1).then(({ data: rows }) => {
      const data = rows?.[0];
      if (data) {
        const loadedConfig = {
          binance_api_key: data.binance_api_key || "",
          binance_api_secret: data.binance_api_secret || "",
          binance_pay_id: data.binance_pay_id || "",
          bep20_address: data.bep20_address || "",
          image_url: data.image_url || "",
          bep20_image_url: (data as any).bep20_image_url || "",
          custom_endpoint_url: (data as any).custom_endpoint_url || "",
        };
        setConfig(loadedConfig);
        setLastSavedConfig(loadedConfig);
      } else {
        // Fallback for empty state on new users
        setLastSavedConfig(config);
      }
      setLoading(false);
    });
  }, [user]);

  // Handle auto-saving when config changes
  useEffect(() => {
    if (loading || !lastSavedConfig) return;

    // Only auto-save if something actually changed between saves
    if (JSON.stringify(config) === JSON.stringify(lastSavedConfig)) return;

    const timer = setTimeout(() => {
      handleSave(); // Show toast on auto-save as requested by user
    }, 1200);

    return () => clearTimeout(timer);
  }, [config, loading, lastSavedConfig]);

  const handleSave = async (silent = false) => {
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

    if (error) {
      toast.error(safeError(error, "Failed to save configuration"));
    } else {
      setLastSavedConfig(config);
      toast.success("Configuration auto-saved!");
    }
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
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden mb-6 mt-2 relative">
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary/50" />
            <div className="bg-primary/10 border-b border-primary/10 px-4 py-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              <h4 className="font-semibold text-primary tracking-wide">How to securely connect your Binance account</h4>
            </div>

            <div className="p-5 space-y-0 text-sm text-slate-300">
              <div className="flex gap-4">
                <div className="flex flex-col items-center mt-0.5">
                  <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold ring-1 ring-primary/30">1</div>
                  <div className="w-px h-full bg-slate-800 my-2"></div>
                </div>
                <div className="pb-6">
                  <p className="mt-1">Log in to <strong>Binance</strong>, go to your profile menu, and select <strong>API Management</strong>.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center mt-0.5">
                  <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold ring-1 ring-primary/30">2</div>
                  <div className="w-px h-full bg-slate-800 my-2"></div>
                </div>
                <div className="pb-6">
                  <p className="mt-1">Click <strong>Create API</strong> and choose the <strong>System generated</strong> option.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center mt-0.5">
                  <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold ring-1 ring-primary/30">3</div>
                  <div className="w-px h-full bg-slate-800 my-2"></div>
                </div>
                <div className="pb-6 space-y-3 w-full max-w-lg">
                  <p className="mt-1">Under <strong>API restrictions</strong>, ensure ONLY the following is checked:</p>
                  <div className="bg-[#181a20] rounded-xl p-4 border border-slate-800 shadow-inner space-y-3 font-medium">
                    <div className="flex items-center gap-3 text-slate-200 bg-slate-800/30 p-2 rounded-md">
                      <div className="bg-primary flex items-center justify-center rounded-sm h-4 w-4 shrink-0">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 9L1.5 6L2.56 4.94L4.5 6.88L9.44 1.94L10.5 3L4.5 9Z" fill="#181a20" /></svg>
                      </div>
                      <span className="text-sm">Enable Reading</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 p-2 opacity-50">
                      <div className="h-4 w-4 rounded-sm border-2 border-slate-600 shrink-0" />
                      <span className="text-sm">Enable Withdrawals (Do NOT check)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center mt-0.5">
                  <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold ring-1 ring-primary/30">4</div>
                </div>
                <div className="w-full max-w-lg">
                  <p className="mt-1">Under <strong>IP access restrictions</strong>, select:</p>
                  <p className="mt-3 font-medium bg-[#181a20] border border-slate-800 inline-flex items-center gap-2 px-3 py-2 rounded-md">
                    <div className="h-3 w-3 rounded-full border-[3px] border-primary" /> Unrestricted (Less Secure)
                  </p>
                  <div className="mt-3 p-3.5 bg-red-500/5 border border-red-500/20 text-[#f6465d] text-[13px] rounded-lg flex items-start gap-2.5 leading-relaxed font-medium">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <p>This API Key allows access from any IP address. To protect your funds, if the IP is unrestricted and any permission other than Reading is enabled, this API key will be deleted.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Binance API Key</Label>
              <div className="relative">
                <Input type={showApiKey ? "text" : "password"} value={config.binance_api_key} onChange={(e) => setConfig((c) => ({ ...c, binance_api_key: e.target.value }))} placeholder="Enter your Binance API key" className="border-border/50 focus:border-primary pr-10" />
                <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Binance API Secret</Label>
              <div className="relative">
                <Input type={showApiSecret ? "text" : "password"} value={config.binance_api_secret} onChange={(e) => setConfig((c) => ({ ...c, binance_api_secret: e.target.value }))} placeholder="Enter your Binance API secret" className="border-border/50 focus:border-primary pr-10" />
                <button type="button" onClick={() => setShowApiSecret(!showApiSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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

      <div className="flex items-center gap-4">
        <Button onClick={() => handleSave()} disabled={saving} size="lg" className="glow-primary">
          <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save Configuration"}
        </Button>
        {saving && <span className="text-sm text-muted-foreground animate-pulse">Auto-saving...</span>}
      </div>
    </div>
  );
}
