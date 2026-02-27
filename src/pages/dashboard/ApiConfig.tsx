import { useEffect, useState, ChangeEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { safeError } from "@/lib/safe-error";
import {
  Save, Upload, Shield, Wallet, CreditCard, Globe, AlertCircle,
  CheckCircle2, AlertTriangle, EyeOff, Eye, Image as ImageIcon,
  ArrowRight, Info, Terminal, RefreshCw, Key, Bell, Send, MessageSquare
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
    telegram_token: "",
    telegram_chat_id: "",
    discord_webhook_url: "",
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
          telegram_token: (data as any).telegram_token || "",
          telegram_chat_id: (data as any).telegram_chat_id || "",
          discord_webhook_url: (data as any).discord_webhook_url || "",
        };
        setConfig(loadedConfig);
        setLastSavedConfig(loadedConfig);
      } else {
        setLastSavedConfig(config);
      }
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (loading || !lastSavedConfig) return;
    if (JSON.stringify(config) === JSON.stringify(lastSavedConfig)) return;
    const timer = setTimeout(() => {
      handleSave();
    }, 2000);
    return () => clearTimeout(timer);
  }, [config, loading, lastSavedConfig]);

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
      telegram_token: config.telegram_token || null,
      telegram_chat_id: config.telegram_chat_id || null,
      discord_webhook_url: config.discord_webhook_url || null,
    } as any, { onConflict: "user_id" });

    if (error) {
      toast.error(safeError(error, "Failed to synchronize configuration"));
    } else {
      setLastSavedConfig(config);
      toast.success("Cloud synchronization complete.");
    }
    setSaving(false);
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>, type: "pay" | "bep20") => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const setUploading = type === "pay" ? setUploadingPay : setUploadingBep20;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${type}-logo.${ext}`;
    const { error } = await supabase.storage.from("user-images").upload(path, file, { upsert: true });
    if (error) {
      toast.error(safeError(error, "Asset upload rejected"));
    } else {
      const { data } = supabase.storage.from("user-images").getPublicUrl(path);
      const field = type === "pay" ? "image_url" : "bep20_image_url";
      setConfig((c) => ({ ...c, [field]: data.publicUrl }));
      toast.success("Design assets updated.");
    }
    setUploading(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20 animate-in fade-in duration-700">
      {/* Page Title */}
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">API Identity</h1>
          <p className="text-muted-foreground font-medium italic">Configure your Binance gateway and visual identification assets.</p>
        </div>
        <div className="flex items-center gap-4 px-5 py-2.5 rounded-2xl bg-muted/40 border border-border/40">
          <div className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 text-primary ${saving ? 'animate-spin' : ''}`} />
            <span className="text-xs font-black uppercase tracking-widest">{saving ? 'Syncing...' : 'Cloud in Sync'}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-10">
        {/* Step-by-Step Guide Card */}
        <Card className="rounded-[2.5rem] border-primary/20 bg-slate-950 text-slate-100 overflow-hidden shadow-2xl relative">
          <div className="absolute top-0 left-0 right-0 h-1.5 gradient-primary" />
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <Terminal className="h-6 w-6 text-slate-900" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black">Secure Connection Protocol</CardTitle>
                <CardDescription className="text-slate-400 font-bold">Follow these steps to safely authorize your Binance account.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                {[
                  { nr: 1, title: 'API Management', desc: 'Navigate to Profile > API Management in your Binance console.' },
                  { nr: 2, title: 'System Generated', desc: 'Create a new key using the System Generated option for maximum security.' },
                  { nr: 3, title: 'Restrict Access', desc: 'Only enable "Reading". DO NOT enable withdrawals or transfers.' },
                ].map((s) => (
                  <div key={s.nr} className="flex gap-4 group">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-sm shrink-0 group-hover:scale-110 transition-transform">{s.nr}</div>
                    <div className="space-y-1 pt-0.5">
                      <p className="font-black text-sm uppercase tracking-widest text-primary">{s.title}</p>
                      <p className="text-sm text-slate-400 font-medium leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800 flex flex-col justify-center gap-4">
                <div className="flex items-center gap-3 text-amber-400">
                  <AlertTriangle className="h-6 w-6 shrink-0" />
                  <p className="text-sm font-black uppercase tracking-widest">Crucial Warning</p>
                </div>
                <p className="text-xs font-medium text-slate-400 leading-relaxed italic">
                  For IP Access Restrictions, you must select "Unrestricted" if you are using our serverless verifier.
                  Your account remains safe as long as "Withdrawals" are disabled.
                </p>
                <div className="mt-2 h-px bg-slate-800" />
                <div className="flex items-center gap-4 group-hover:bg-slate-800/50 p-2 rounded-xl transition-all">
                  <div className="h-8 w-8 rounded-lg bg-[#F3BA2F] flex items-center justify-center shadow-lg shadow-[#F3BA2F]/20">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-slate-900"><path d="M16.624 13.9202l2.711 2.7112-2.711 2.7112-2.711-2.7112 2.711-2.7112zm-3.999 0l2.711 2.7112-2.711 2.7112-2.711-2.7112 2.711-2.7112zm3.999-4l2.711 2.7112-2.711 2.7112-2.711-2.7112 2.711-2.7112zm-3.999 0l2.711 2.7112-2.711 2.7112-2.711-2.7112 2.711-2.7112zm3.999-4l2.711 2.7112-2.711 2.7112-2.711-2.7112 2.711-2.7112zM7.376 9.9202l2.711 2.7112-2.711 2.7112-2.711-2.7112 2.711-2.7112zm3.999 0l2.711 2.7112-2.711 2.7112-2.711-2.7112 2.711-2.7112zm-3.999-4l2.711 2.7112-2.711 2.7112-2.711-2.7112 2.711-2.7112z" /></svg>
                  </div>
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-100">Verified Connection</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credentials Section */}
        <div className="grid gap-10 md:grid-cols-1">
          <Card className="rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden border-l-4 border-l-primary shadow-xl">
            <CardHeader className="p-8">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-primary" />
                <CardTitle className="font-black text-xl">Primary Authorization</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Binance API Key</Label>
                  <div className="relative group">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={config.binance_api_key}
                      onChange={(e) => setConfig((c) => ({ ...c, binance_api_key: e.target.value }))}
                      placeholder="v3_..."
                      className="pl-12 h-14 rounded-2xl border-border bg-background/50 font-mono text-xs focus:ring-primary/10"
                    />
                    <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground p-1 hover:text-primary transition-colors">
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Binance API Secret</Label>
                  <div className="relative group">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
                    <Input
                      type={showApiSecret ? "text" : "password"}
                      value={config.binance_api_secret}
                      onChange={(e) => setConfig((c) => ({ ...c, binance_api_secret: e.target.value }))}
                      placeholder="••••••••••••••••"
                      className="pl-12 h-14 rounded-2xl border-border bg-background/50 font-mono text-xs focus:ring-primary/10"
                    />
                    <button type="button" onClick={() => setShowApiSecret(!showApiSecret)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground p-1 hover:text-primary transition-colors">
                      {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods Section */}
          <div className="grid md:grid-cols-2 gap-10">
            {/* Binance Pay Card */}
            <Card className="rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden group shadow-lg">
              <CardHeader className="p-8 flex flex-row justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="font-black text-xl">Binance Pay</CardTitle>
                  <Badge className="bg-amber-500 text-white border-none rounded-lg text-[10px] uppercase font-black px-2 py-0.5 tracking-wider">Fast Route</Badge>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Merchant Pay ID</Label>
                  <Input value={config.binance_pay_id} onChange={(e) => setConfig((c) => ({ ...c, binance_pay_id: e.target.value }))} className="h-14 rounded-2xl border-border bg-background focus:ring-amber-500/10 font-black text-lg" />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Visual ID (QR/Logo)</Label>
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/40">
                    {config.image_url ? (
                      <div className="relative group/img">
                        <img src={config.image_url} alt="Pay QR" className="h-20 w-20 rounded-xl object-cover border border-border shadow-xl transform group-hover/img:scale-105 transition-transform" />
                        <button className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-opacity" onClick={() => setConfig(c => ({ ...c, image_url: '' }))}>
                          <EyeOff className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-xl bg-background border-2 border-dashed border-border flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground opacity-30" />
                      </div>
                    )}
                    <label className="flex-1 cursor-pointer">
                      <div className="h-14 rounded-xl border border-border bg-background flex items-center justify-center gap-3 font-bold text-sm tracking-tight hover:bg-muted transition-colors">
                        <Upload className={`h-4 w-4 ${uploadingPay ? 'animate-bounce' : ''}`} />
                        {uploadingPay ? 'Syncing...' : 'Update Asset'}
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "pay")} />
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* BEP20 Card */}
            <Card className="rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden group shadow-lg">
              <CardHeader className="p-8 flex flex-row justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="font-black text-xl text-primary">BEP20 Network</CardTitle>
                  <Badge className="bg-primary text-white border-none rounded-lg text-[10px] uppercase font-black px-2 py-0.5 tracking-wider">Blockchain</Badge>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Wallet Address (BSC)</Label>
                  <Input value={config.bep20_address} onChange={(e) => setConfig((c) => ({ ...c, bep20_address: e.target.value }))} className="h-14 rounded-2xl border-border bg-background focus:ring-primary/10 font-mono text-xs font-bold" />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Asset Token Icon</Label>
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/40">
                    {config.bep20_image_url ? (
                      <div className="relative group/img">
                        <img src={config.bep20_image_url} alt="BEP Logo" className="h-20 w-20 rounded-xl object-cover border border-border shadow-xl transform group-hover/img:scale-105 transition-transform" />
                        <button className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-opacity" onClick={() => setConfig(c => ({ ...c, bep20_image_url: '' }))}>
                          <EyeOff className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-xl bg-background border-2 border-dashed border-border flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground opacity-30" />
                      </div>
                    )}
                    <label className="flex-1 cursor-pointer">
                      <div className="h-14 rounded-xl border border-border bg-background flex items-center justify-center gap-3 font-bold text-sm tracking-tight hover:bg-muted transition-colors">
                        <Upload className={`h-4 w-4 ${uploadingBep20 ? 'animate-bounce' : ''}`} />
                        {uploadingBep20 ? 'Syncing...' : 'Update Asset'}
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "bep20")} />
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Notification Webhooks Card */}
        <Card className="rounded-[2.5rem] border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden border-l-4 border-l-emerald-500 shadow-xl">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Bell className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-xl font-black">Notification Webhooks</CardTitle>
                <CardDescription className="font-bold opacity-70">Get real-time alerts for payment verifications.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-4 space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Telegram Set */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Send className="h-4 w-4 text-[#26A1DE]" />
                  <span className="text-xs font-black uppercase tracking-widest text-[#26A1DE]">Telegram Alert Bot</span>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Bot API Token</Label>
                  <Input
                    value={config.telegram_token}
                    onChange={(e) => setConfig(c => ({ ...c, telegram_token: e.target.value }))}
                    placeholder="58392...:AA..."
                    className="h-12 rounded-xl bg-background border-border font-mono text-xs"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Recipient Chat ID</Label>
                  <Input
                    value={config.telegram_chat_id}
                    onChange={(e) => setConfig(c => ({ ...c, telegram_chat_id: e.target.value }))}
                    placeholder="-100..."
                    className="h-12 rounded-xl bg-background border-border font-mono text-xs"
                  />
                </div>
              </div>

              {/* Discord Set */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-[#5865F2]" />
                  <span className="text-xs font-black uppercase tracking-widest text-[#5865F2]">Discord Webhook</span>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Webhook URL</Label>
                  <Input
                    value={config.discord_webhook_url}
                    onChange={(e) => setConfig(c => ({ ...c, discord_webhook_url: e.target.value }))}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="h-12 rounded-xl bg-background border-border font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Global Proxy Routing Card */}
        <Card className="rounded-[2.5rem] border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden border-l-4 border-l-slate-400 group shadow-xl">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-400/10 flex items-center justify-center">
                <Globe className="h-6 w-6 text-slate-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-black">Global Routing Mask</CardTitle>
                <CardDescription className="font-bold opacity-70">Optional custom domain mapping for your verification API.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-4 space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <Terminal className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 opacity-40" />
                <Input
                  value={config.custom_endpoint_url}
                  onChange={(e) => setConfig((c) => ({ ...c, custom_endpoint_url: e.target.value }))}
                  placeholder="https://api.yourbrand.com/v1/auth"
                  className="pl-14 h-16 rounded-2xl border-border bg-background/50 font-bold focus:ring-slate-400/10"
                />
              </div>
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-400/5 border border-slate-400/20">
                <Info className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Routing Mode</p>
                  <p className="text-xs font-semibold text-slate-400 leading-relaxed italic">
                    Enter a custom URL if you are using a proxy server (e.g. Cloudflare Worker or Nginx).
                    If empty, the system defaults to our high-speed global endpoint.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Sync Trigger */}
      <div className="pt-6 flex justify-center">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
          className="h-16 px-12 rounded-2xl font-black text-lg gradient-primary shadow-2xl shadow-primary/30 active:scale-95 transition-all"
        >
          {saving ? <RefreshCw className="mr-3 h-5 w-5 animate-spin" /> : <Save className="mr-3 h-6 w-6" />}
          Save All Configurations
        </Button>
      </div>
    </div >
  );
}
