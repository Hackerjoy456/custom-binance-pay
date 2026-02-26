import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { Activity } from "lucide-react";
import { toast } from "sonner";

export default function Logs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("payment_verification_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) {
          toast.error(error.message || "Failed to load usage logs");
          setLogs([]);
        } else {
          setLogs(data || []);
        }
        setLoading(false);
      });
  }, [user]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usage Logs</h1>
        <p className="text-muted-foreground">Recent payment verification requests</p>
      </div>

      <Card className="card-glow border-border/50 overflow-hidden">
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Activity className="h-7 w-7 text-primary" />
              </div>
              <p className="text-muted-foreground">No verification logs yet.</p>
              <p className="text-xs text-muted-foreground">Logs will appear here when your API receives verification requests.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Transaction ID</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Type</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Expected</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Actual</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="border-border/30 hover:bg-primary/5 transition-colors">
                    <TableCell className="font-mono text-xs text-primary">{log.transaction_id ? `${log.transaction_id.slice(0, 12)}...` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize border-primary/20 text-primary text-xs">
                        {log.payment_type || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{log.expected_amount != null ? `$${log.expected_amount}` : "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{log.actual_amount != null ? `$${log.actual_amount}` : "—"}</TableCell>
                    <TableCell>
                      <Badge className={
                        log.status === "success"
                          ? "bg-success/20 text-success border border-success/30 hover:bg-success/30"
                          : log.status === "failed"
                          ? "bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30"
                          : "bg-warning/20 text-warning border border-warning/30 hover:bg-warning/30"
                      }>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(log.created_at), "MMM d, HH:mm")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
