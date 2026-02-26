import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminVerificationLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("payment_verification_logs").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("profiles").select("user_id, email"),
    ]).then(([logRes, profRes]) => {
      if (logRes.error) toast.error("Failed to load verification logs");
      setLogs(logRes.data || []);
      setProfiles(profRes.data || []);
      setLoading(false);
    }).catch(() => {
      toast.error("Failed to load data");
      setLoading(false);
    });
  }, []);

  const getEmail = (userId: string) => profiles.find(p => p.user_id === userId)?.email || "Unknown";

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">All Verification Logs</h1>
      <p className="text-muted-foreground">System-wide payment verification history</p>

      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No verification logs yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{getEmail(log.user_id)}</TableCell>
                    <TableCell className="font-mono text-xs">{log.transaction_id || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{log.payment_type || "—"}</Badge></TableCell>
                    <TableCell>{log.expected_amount ?? "—"}</TableCell>
                    <TableCell>{log.actual_amount ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={log.status === "success" ? "bg-green-600" : log.status === "failed" ? "bg-destructive" : "bg-yellow-600"}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{format(new Date(log.created_at), "MMM d, HH:mm")}</TableCell>
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
