import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { Activity, Terminal, ShieldCheck, ShieldAlert, Hash, ChevronRight, Download, Filter, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function Logs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("payment_verification_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        toast.error(error.message || "Failed to load telemetry data");
        setLogs([]);
      } else {
        setLogs(data || []);
      }
      setLoading(false);
    };

    fetchLogs();

    const channelId = `telemetry-${user.id}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payment_verification_logs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log("Realtime event received:", payload);
          setLogs(prev => [payload.new, ...prev].slice(0, 100));
          toast.info("Incoming telemetry stream detected", {
            description: `Transaction ${payload.new.transaction_id?.slice(0, 8)}... verified.`,
            icon: <Activity className="h-4 w-4 text-primary" />
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to telemetry updates');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Realtime subscription error:', status);
          toast.error("Realtime stream disrupted. Manual refresh may be required.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleExport = () => {
    const headers = ["ID", "Transaction ID", "Payment Type", "Expected", "Actual", "Status", "Timestamp"];
    const csvData = filtered.map(log => [
      log.id,
      log.transaction_id || "N/A",
      log.payment_type,
      log.expected_amount,
      log.actual_amount,
      log.status,
      format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")
    ].join(","));

    const blob = new Blob([[headers.join(","), ...csvData].join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gateway_telemetry_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;
    a.click();
    toast.success("Telemetry report generated");
  };

  const filtered = logs.filter(log => (log.transaction_id || "").toLowerCase().includes(search.toLowerCase()));

  const chartData = [...logs].reverse().slice(-20).map(l => ({
    time: format(new Date(l.created_at), "HH:mm"),
    amount: l.actual_amount,
    status: l.status === 'success' ? 1 : 0
  }));

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <Terminal className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">Live Traffic Monitoring</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Usage Telemetry</h1>
          <p className="text-muted-foreground font-medium">Historical record of all payment verification requests processed by your API.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleExport} variant="outline" className="rounded-xl border-border/50 gap-2 font-bold h-11"><Download className="h-4 w-4" /> Export</Button>
          <Button onClick={() => setShowAnalysis(!showAnalysis)} className={`rounded-xl font-black h-11 px-6 shadow-xl transition-all hover:scale-105 ${showAnalysis ? 'bg-primary text-white shadow-primary/20' : 'bg-muted/50 border border-border/40'}`}>
            <Activity className="h-4 w-4 mr-2" /> {showAnalysis ? 'Hide Analysis' : 'Live Analysis'}
          </Button>
        </div>
      </div>

      {showAnalysis && (
        <Card className="rounded-[2.5rem] border-primary/20 bg-card/40 backdrop-blur-xl overflow-hidden animate-in slide-in-from-top duration-500">
          <CardHeader className="p-8 pb-0">
            <CardTitle className="text-lg font-black uppercase tracking-widest text-primary">Real-time Load Analysis</CardTitle>
            <CardDescription className="font-bold">Visualizing transaction volume and success rate of incoming stream.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="#888" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                <YAxis stroke="#888" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.8)', color: '#fff' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="amount" stroke="var(--primary)" fillOpacity={1} fill="url(#colorAmount)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-[2.5rem] border-border/40 overflow-hidden bg-card/40 backdrop-blur-md shadow-2xl">
        <CardHeader className="p-8 border-b border-border/40 bg-muted/5">
          <div className="flex flex-col sm:flex-row gap-6 justify-between items-center">
            <div className="relative w-full max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-50" />
              <Input
                placeholder="Search by Transaction ID (Hash)..."
                className="pl-12 h-14 rounded-2xl border-border/40 bg-background font-medium focus:ring-primary/20 text-sm shadow-inner"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Listening for events
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-32 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="h-24 w-24 rounded-[2rem] bg-muted border border-dashed border-border flex items-center justify-center">
                  <Activity className="h-10 w-10 text-muted-foreground opacity-20" />
                </div>
                <div className="absolute -inset-4 bg-primary/5 rounded-full blur-3xl opacity-50" />
              </div>
              <div className="space-y-1 relative">
                <p className="text-xl font-black">Quiet on the horizon</p>
                <p className="text-sm font-medium text-muted-foreground max-w-[320px]">No verification activities detected. Ensure your integration is correctly pointing to your endpoint.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow className="hover:bg-transparent border-border/40">
                    <TableHead className="py-5 pl-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Transaction Identity</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Gateway Type</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Value Analysis (Exp/Act)</TableHead>
                    <TableHead className="py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">System Status</TableHead>
                    <TableHead className="py-5 pr-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Execution Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log) => (
                    <TableRow key={log.id} className="group hover:bg-primary/5 transition-all border-border/40">
                      <TableCell className="py-5 pl-8">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                            <Hash className="h-4 w-4 text-muted-foreground opacity-50" />
                          </div>
                          <code className="font-mono text-xs font-bold text-primary tracking-tight">
                            {log.transaction_id ? `${log.transaction_id.slice(0, 16)}...` : "—"}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <Badge variant="outline" className={`rounded-xl px-3 py-1 font-black text-[10px] uppercase tracking-wider ${log.payment_type === 'binance_pay' ? 'text-amber-500 border-amber-500/20 bg-amber-500/5' : 'text-blue-500 border-blue-500/20 bg-blue-500/5'}`}>
                          {log.payment_type || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 font-black text-sm">
                            <span className="opacity-50 text-xs">$</span><span>{log.expected_amount ?? "0"}</span>
                            <ChevronRight className="h-3 w-3 text-muted-foreground opacity-30" />
                            <span className={log.actual_amount >= log.expected_amount ? 'text-emerald-500' : 'text-destructive'}>
                              <span className="opacity-50 text-xs">$</span>{log.actual_amount ?? "0"}
                            </span>
                          </div>
                          <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${log.status === 'success' ? 'bg-emerald-500' : 'bg-destructive'}`} style={{ width: '100%' }} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        {log.status === 'success' ? (
                          <div className="flex items-center gap-2 text-emerald-500">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Verified</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-destructive">
                            <ShieldAlert className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{log.status}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-5 pr-8 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-black text-foreground">{format(new Date(log.created_at), "MMM d, HH:mm")}</span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-50 tracking-tighter">{format(new Date(log.created_at), "s's'")} Latency</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <div className="p-8 border-t border-border/40 bg-muted/5 flex items-center justify-between">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">{filtered.length} events retrieved from registry</p>
          <div className="flex gap-2">
            <Button variant="ghost" className="rounded-xl h-10 px-6 font-black text-xs hover:bg-primary/10">Show older logs</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
