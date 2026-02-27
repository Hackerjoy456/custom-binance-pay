import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Activity, ShieldCheck, AlertCircle, Clock, Search, Filter, Download, Terminal, User, Hash, DollarSign, Trash2, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Swal from "sweetalert2";

export default function AdminVerificationLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("payment_verification_logs").select("*").order("created_at", { ascending: false }).limit(200),
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

  const filtered = logs.filter(log => {
    const email = getEmail(log.user_id).toLowerCase();
    const txId = (log.transaction_id || "").toLowerCase();
    const query = search.toLowerCase();
    return email.includes(query) || txId.includes(query);
  });

  const handleRelease = async (log: any) => {
    const result = await Swal.fire({
      title: "Release Transaction?",
      text: `This will remove the log entry for ${log.transaction_id || 'unnamed'} and allow it to be verified again by the system.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ec4899",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, release it!",
      background: "#0f172a",
      color: "#f8fafc",
      customClass: {
        popup: "rounded-[2rem] border border-border/40 backdrop-blur-xl",
        confirmButton: "rounded-xl px-6 py-3 font-black uppercase tracking-widest text-xs",
        cancelButton: "rounded-xl px-6 py-3 font-black uppercase tracking-widest text-xs"
      }
    });

    if (!result.isConfirmed) return;

    setIsDeleting(log.id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-maintenance", {
        body: {
          action: "release_transaction",
          transaction_id: log.transaction_id,
          user_id: log.user_id
        }
      });

      if (error) {
        // If it's a non-2xx error, the error object might have the message
        const errorMessage = typeof error === 'object' ? JSON.stringify(error) : error;
        throw new Error(errorMessage || "Edge Function invocation failed");
      }

      if (data?.error) throw new Error(data.error);

      setLogs(logs.filter(l => l.id !== log.id));

      await Swal.fire({
        title: "Released!",
        text: "The transaction has been successfully cleared from the registry.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#f8fafc",
        customClass: {
          popup: "rounded-[2rem] border border-border/40 backdrop-blur-xl"
        }
      });
    } catch (e: any) {
      console.error("Release error:", e);
      let message = e.message || "An unexpected error occurred.";

      // Try to parse the error context if it exists (for FunctionsHttpError)
      try {
        if (e.context && typeof e.context.json === 'function') {
          const details = await e.context.json();
          if (details.error) message = details.error;
        } else if (e.context && e.context.message) {
          message = e.context.message;
        }
      } catch (err) {
        console.warn("Could not parse error details", err);
      }

      Swal.fire({
        title: "Operation Failed",
        text: message,
        icon: "error",
        background: "#0f172a",
        color: "#f8fafc",
        customClass: {
          popup: "rounded-[2rem] border border-border/40 backdrop-blur-xl"
        }
      });
    } finally {
      setIsDeleting(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <Terminal className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">System Telemetry</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Security Audit Logs</h1>
          <p className="text-muted-foreground font-medium">Real-time tracking of every single payment verification attempt.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl border-border/50 gap-2 font-bold h-11"><Download className="h-4 w-4" /> Export CSV</Button>
          <Button className="rounded-xl gradient-primary font-black h-11 px-6 shadow-xl shadow-primary/20 hover:scale-105 transition-transform"><Activity className="h-4 w-4 mr-2" /> Live Stream</Button>
        </div>
      </div>

      {/* Main Logs Card */}
      <Card className="rounded-[2rem] border-border/40 overflow-hidden bg-card/50 backdrop-blur-sm shadow-2xl">
        <CardHeader className="p-8 border-b border-border/40 bg-muted/5">
          <div className="flex flex-col sm:flex-row gap-6 justify-between items-center">
            <div className="relative w-full max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-50" />
              <Input
                placeholder="Filter by Transaction ID or User Email..."
                className="pl-12 h-14 rounded-2xl border-border/40 bg-background font-medium focus:ring-primary/20 text-sm shadow-inner"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="h-10 px-4 rounded-xl border-border/40 font-bold bg-background flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Monitoring Live
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {filtered.length === 0 ? (
              <div className="py-32 flex flex-col items-center justify-center text-center space-y-4">
                <div className="h-20 w-20 rounded-3xl bg-muted/30 border border-dashed border-border flex items-center justify-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground opacity-20" />
                </div>
                <div className="space-y-1">
                  <p className="font-black text-xl">No telemetry detected</p>
                  <p className="text-sm font-medium text-muted-foreground max-w-[280px]">Adjust your filters or wait for new verification attempts in the system.</p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow className="hover:bg-transparent border-border/40">
                    <TableHead className="py-5 pl-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Verification Target</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Transaction ID (Hash)</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Method</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Amount (Exp/Act)</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Result</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Actions</TableHead>
                    <TableHead className="py-5 pr-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log) => (
                    <TableRow key={log.id} className="group hover:bg-muted/30 transition-all border-border/40">
                      <TableCell className="py-5 pl-8">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-bold text-sm tracking-tight">{getEmail(log.user_id)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex items-center gap-2 group/hash">
                          <Hash className="h-3 w-3 text-muted-foreground opacity-40" />
                          <span className="font-mono text-[11px] text-muted-foreground font-bold bg-muted/40 px-2 py-1 rounded truncate max-w-[150px] group-hover/hash:text-primary transition-colors">
                            {log.transaction_id || "SYSTEM_GENERATED"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <Badge variant="outline" className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border-border/60 ${log.payment_type === 'binance_pay' ? 'text-amber-500 border-amber-500/20 bg-amber-500/5' : 'text-blue-500 border-blue-500/20 bg-blue-500/5'}`}>
                          {log.payment_type || "INTERNAL"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-muted-foreground uppercase opacity-50 tracking-tighter leading-none mb-1">Expected / Actual</span>
                            <div className="flex items-center gap-1.5 font-black text-sm">
                              <span className="text-primary">${log.expected_amount ?? "0"}</span>
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              <span className={log.actual_amount >= log.expected_amount ? 'text-emerald-500' : 'text-destructive'}>
                                ${log.actual_amount ?? "0"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex flex-wrap gap-2">
                          {log.status === 'success' ? (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 font-black text-[10px] uppercase shadow-emerald-500/10 shadow-lg">
                              Verification Passed
                            </Badge>
                          ) : log.status === 'failed' ? (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20 px-3 py-1 font-black text-[10px] uppercase shadow-destructive/10 shadow-lg">
                              Failed Attack
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-3 py-1 font-black text-[10px] uppercase shadow-amber-500/10 shadow-lg italic">
                              {log.status}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-5 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                          onClick={() => handleRelease(log)}
                          disabled={isDeleting === log.id}
                        >
                          {isDeleting === log.id ? <Clock className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell className="py-5 pr-8 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-black tracking-tight">{format(new Date(log.created_at), "MMM d, HH:mm")}</span>
                          <span className="text-[10px] font-bold text-muted-foreground opacity-50 uppercase">{format(new Date(log.created_at), "ss's'")} Latency</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
        <div className="p-8 border-t border-border/40 bg-muted/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-xs font-bold text-muted-foreground tracking-widest uppercase">
              Displaying <span className="text-foreground">{filtered.length} audit logs</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="rounded-xl h-10 px-5 font-black text-xs hover:bg-primary/10">Show More</Button>
            <div className="h-10 w-px bg-border/40 mx-2" />
            <Button
              variant="ghost"
              className="rounded-xl h-10 px-5 font-black text-xs text-destructive hover:bg-destructive/10"
              onClick={async () => {
                const result = await Swal.fire({
                  title: "Purge All Logs?",
                  text: "This will permanently delete every single verification record. This is a destructive operation.",
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonColor: "#ef4444",
                  confirmButtonText: "Yes, Purge Everything",
                  background: "#0f172a",
                  color: "#f8fafc",
                });
                if (result.isConfirmed) {
                  try {
                    const { data, error } = await supabase.functions.invoke("admin-maintenance", { body: { action: "clear_logs" } });
                    if (error) throw error;
                    setLogs([]);
                    Swal.fire({ title: "Purged", icon: "success", background: "#0f172a", color: "#f8fafc" });
                  } catch (e: any) {
                    Swal.fire({ title: "Error", text: e.message || "Failed to purge logs", icon: "error", background: "#0f172a", color: "#f8fafc" });
                  }
                }
              }}
            >
              Purge Logs
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
);
