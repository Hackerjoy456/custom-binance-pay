import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { safeError } from "@/lib/safe-error";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim();

    // Validation
    if (!trimmedEmail || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (trimmedName && (trimmedName.length < 2 || trimmedName.length > 100)) {
      toast.error("Name must be between 2 and 100 characters.");
      return;
    }

    // Sanitize name — strip HTML/script tags
    const sanitizedName = trimmedName.replace(/<[^>]*>/g, "").replace(/[<>'"`;]/g, "");

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (password.length > 128) {
      toast.error("Password must be less than 128 characters.");
      return;
    }

    // Password strength check
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      toast.error("Password must contain at least one uppercase letter, one lowercase letter, and one number.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await signUp(trimmedEmail, password, sanitizedName);
    if (error) {
      // Generic error message
      toast.error("Could not create account. Please try again.");
    } else {
      toast.success("Account created successfully!");
      // Since email confirmation is off, they are automatically logged in or can proceed
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
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left Side: Brand & Value Prop */}
        <div className="hidden lg:flex flex-col space-y-8 animate-in slide-in-from-left duration-1000">
          <div className="space-y-4">
            <h1 className="text-5xl font-black tracking-tight leading-tight">
              Start your journey with <br />
              <span className="text-primary text-glow">Binance Verify</span>
            </h1>
            <p className="text-lg text-muted-foreground font-medium max-w-md">
              Secure, instant, and reliable crypto payment verification for your web applications.
            </p>
          </div>

          <div className="space-y-6">
            {[
              { title: "Global Infrastructure", desc: "Enterprise-grade nodes ensures 99.9% uptime." },
              { title: "Advanced Security", desc: "Private credentials remain encrypted at all times." },
              { title: "Developer First", desc: "Clean REST API with instantaneous live traffic streams." },
            ].map((feature, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-transform hover:scale-105">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-primary font-black">{i + 1}</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-100">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Signup Form */}
        <div className="animate-in fade-in zoom-in duration-700">
          <Card className="rounded-[2.5rem] border-border/40 bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="p-8 sm:p-12 space-y-8">
              <div className="space-y-2 text-center lg:text-left">
                <CardTitle className="text-3xl font-black">Sign Up</CardTitle>
                <CardDescription className="text-base font-medium">Join the next generation of crypto commerce.</CardDescription>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="h-14 rounded-2xl bg-background/50 border-border/40 font-bold focus:ring-primary/20"
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="h-14 rounded-2xl bg-background/50 border-border/40 font-bold focus:ring-primary/20"
                    autoComplete="email"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="h-14 rounded-2xl bg-background/50 border-border/40 font-bold focus:ring-primary/20 pr-12"
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="h-14 rounded-2xl bg-background/50 border-border/40 font-bold focus:ring-primary/20 pr-12"
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-16 rounded-2xl font-black text-lg gradient-primary shadow-2xl shadow-primary/30 active:scale-95 transition-all mt-4 text-white">
                  {loading ? "Processing..." : "Sign Up Now"}
                </Button>
              </form>

              <div className="pt-4 flex items-center justify-center gap-2">
                <span className="text-sm font-bold text-muted-foreground">Already have an account?</span>
                <Link to="/login" className="text-sm font-black text-primary hover:underline">Sign In</Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
