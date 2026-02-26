import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    console.error("404 Error: Non-existent route:", location.pathname);

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    const redirect = setTimeout(() => {
      navigate("/");
    }, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(redirect);
    };
  }, [location.pathname, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center animate-in fade-in duration-500">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(var(--primary-rgb),0.1)_0%,transparent_100%)]" />

      <div className="relative mb-8">
        <h1 className="text-9xl font-black tracking-tighter text-primary/20 select-none">404</h1>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold tracking-tight">Oops!</span>
        </div>
      </div>

      <h2 className="mb-2 text-2xl font-semibold tracking-tight">Lost in the blockchain?</h2>
      <p className="mb-8 max-w-[400px] text-muted-foreground">
        The page you're searching for does not exist.
        Redirecting you to the home page in <span className="font-bold text-primary">{countdown}s</span>...
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={() => navigate(-1)} variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Go Back
        </Button>
        <Button onClick={() => navigate("/")} className="gap-2 shadow-lg shadow-primary/20">
          <Home className="h-4 w-4" /> Take Me Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
