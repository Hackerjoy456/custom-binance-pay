import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Users, CreditCard, TrendingUp } from "lucide-react";

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, email, full_name"),
    ]).then(([subRes, profRes]) => {
      if (subRes.error) toast.error("Failed to load subscriptions");
      setSubscriptions(subRes.data || []);
      setProfiles(profRes.data || []);
      setLoading(false);
    }).catch(() => {
      toast.error("Failed to load data");
      setLoading(false);
    });
  }, []);

  const getEmail = (userId: string) => profiles.find(p => p.user_id === userId)?.email || "Unknown";

  const active = subscriptions.filter((s) => s.status === "active");
  const expired = subscriptions.filter((s) => s.status === "expired");

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Subscription Overview</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{subscriptions.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-500">{active.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{expired.length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Starts</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm">{getEmail(s.user_id)}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{s.plan_type}</Badge></TableCell>
                  <TableCell>
                    <Badge className={s.status === "active" ? "bg-green-600" : "bg-destructive"}>{s.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{format(new Date(s.starts_at), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-sm">{format(new Date(s.expires_at), "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
