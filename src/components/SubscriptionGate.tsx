import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { Link } from "react-router-dom";

export default function SubscriptionGate({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [hasActive, setHasActive] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    if (isAdmin) {
      setHasActive(true);
      return;
    }
    supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gte("expires_at", new Date().toISOString())
      .limit(1)
      .then(({ data }) => setHasActive((data?.length || 0) > 0));
  }, [user, isAdmin]);

  if (hasActive === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!hasActive) {
    return (
      <div className="flex items-center justify-center py-20">
        <Card className="max-w-md w-full border-primary/20 card-glow">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Subscription Required</h2>
            <p className="text-muted-foreground text-sm">
              You need an active subscription to access this feature. Purchase a plan to get started.
            </p>
            <Button asChild className="glow-primary">
              <Link to="/dashboard/subscription">View Plans</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
