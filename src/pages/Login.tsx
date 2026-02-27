import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { safeError } from "@/lib/safe-error";

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 2 * 60 * 1000; // 2 minutes

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const isLockedOut = lockoutUntil && Date.now() < lockoutUntil;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLockedOut) {
      const remaining = Math.ceil(((lockoutUntil as number) - Date.now()) / 1000);
      toast.error(`Too many attempts. Try again in ${remaining}s.`);
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (password.length < 6 || password.length > 128) {
      toast.error("Password must be between 6 and 128 characters.");
      return;
    }

    setLoading(true);
    const { error } = await signIn(trimmedEmail, password);

    if (error) {
      const { data: isBanned } = await supabase.rpc("check_is_banned", { target_email: trimmedEmail });

      if (isBanned) {
        toast.error("Your account has been banned. Please contact support.");
        setAttempts(0);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= MAX_ATTEMPTS) {
          setLockoutUntil(Date.now() + LOCKOUT_DURATION_MS);
          setAttempts(0);
          toast.error("Too many failed attempts. Account temporarily locked for 2 minutes.");
        } else {
          toast.error("Invalid email or password.");
        }
      }
    } else {
      setAttempts(0);
      setLockoutUntil(null);
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden bg-[#0B0E11]">
      {/* Navigation Header */}
      <div className="absolute top-0 left-0 right-0 p-8 flex items-center justify-between z-50">
        <Link to="/" className="flex items-center gap-2 group transition-all hover:opacity-80">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20">
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-primary"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            <span className="text-primary text-glow">Binance</span>Verify
          </span>
        </Link>
      </div>

      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left Side: Illustration or Text */}
        <div className="hidden lg:flex flex-col space-y-8 animate-in slide-in-from-left duration-1000">
          <div className="space-y-4">
            <h1 className="text-5xl font-black tracking-tight leading-tight">
              Access your <br />
              <span className="text-primary text-glow">Verification Hub</span>
            </h1>
            <p className="text-lg text-muted-foreground font-medium max-w-sm">
              Log in to manage your API configurations, view live telemetry, and scale your crypto gateways.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <p className="text-3xl font-black text-primary mb-1">99.9%</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Efficiency</p>
            </div>
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <p className="text-3xl font-black text-primary mb-1">&lt;1s</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Latency</p>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="animate-in fade-in zoom-in duration-700">
          <Card className="rounded-[2.5rem] border-border/40 bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="p-8 sm:p-12 space-y-8">
              <div className="space-y-2 text-center lg:text-left">
                <CardTitle className="text-3xl font-black">Welcome Back</CardTitle>
                <CardDescription className="text-base font-medium">Please enter your credentials to resume session.</CardDescription>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Account ID (Email)</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={!!isLockedOut}
                    className="h-14 rounded-2xl bg-background/50 border-border/40 font-bold focus:ring-primary/20"
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Authorization Secret</Label>
                    <Link to="#" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Forgot Pin?</Link>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      disabled={!!isLockedOut}
                      className="h-14 rounded-2xl bg-background/50 border-border/40 font-bold focus:ring-primary/20 pr-12"
                      autoComplete="current-password"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {isLockedOut && (
                  <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold text-center animate-bounce">
                    Security Lock active. Try again in {Math.ceil(((lockoutUntil as number) - Date.now()) / 1000)}s.
                  </div>
                )}

                <Button type="submit" disabled={loading || !!isLockedOut} className="w-full h-16 rounded-2xl font-black text-lg gradient-primary shadow-2xl shadow-primary/30 active:scale-95 transition-all mt-4 text-white">
                  {loading ? "Authenticating..." : "Log In Now"}
                </Button>
              </form>

              <div className="pt-4 flex items-center justify-center gap-2">
                <span className="text-sm font-bold text-muted-foreground">New to the protocol?</span>
                <Link to="/signup" className="text-sm font-black text-primary hover:underline">Sign Up</Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
