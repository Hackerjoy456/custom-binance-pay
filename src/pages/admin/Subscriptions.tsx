import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Users, CreditCard, TrendingUp, History, Download, Filter, Search, Calendar, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function StatCard({ label, value, subValue, icon: Icon, trend }: { label: string; value: string | number; subValue?: string; icon: any; trend?: string }) {
  return (
    <Card className="border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden group hover:scale-[1.02] transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</p>
            <h3 className="text-3xl font-black tracking-tight">{value}</h3>
            {subValue && (
              <p className="text-xs font-bold text-muted-foreground mt-1 flex items-center gap-1">
                {trend === 'up' ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingUp className="h-3 w-3 text-destructive rotate-180" />}
                {subValue}
              </p>
            )}
          </div>
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const getProfile = (userId: string) => profiles.find(p => p.user_id === userId);

  const active = subscriptions.filter((s) => s.status === "active");
  const expired = subscriptions.filter((s) => s.status === "expired");
  const filtered = subscriptions.filter(s => {
    const p = getProfile(s.user_id);
    return (p?.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (p?.full_name || "").toLowerCase().includes(search.toLowerCase());
  });

  const handleExport = () => {
    const headers = ["ID", "Email", "Full Name", "Plan", "Status", "Starts At", "Expires At"];
    const csvData = filtered.map(s => {
      const p = getProfile(s.user_id);
      return [
        s.id,
        p?.email || "N/A",
        `"${(p?.full_name || "Anonymous").replace(/"/g, '""')}"`,
        s.plan_type,
        s.status,
        format(new Date(s.starts_at), "yyyy-MM-dd"),
        format(new Date(s.expires_at), "yyyy-MM-dd")
      ].join(",");
    });
    const blob = new Blob([[headers.join(","), ...csvData].join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscriptions_report_${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    toast.success("Subscription report exported.");
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">Subscription Logs</h1>
          <p className="text-muted-foreground font-medium">Global history of all active and past memberships.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleExport} variant="outline" className="rounded-xl border-border/50 gap-2 font-bold h-11"><Download className="h-4 w-4" /> Reports</Button>
          <Button className="rounded-xl gradient-primary font-black h-11 px-6 shadow-xl shadow-primary/20"><Filter className="h-4 w-4 mr-2" /> Filter Logs</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Records" value={subscriptions.length} subValue="+12% from last month" trend="up" icon={History} />
        <StatCard label="Active Subscriptions" value={active.length} subValue="Real-time status" trend="up" icon={CheckCircle2} />
        <StatCard label="Expired / Cancelled" value={expired.length + subscriptions.filter(s => s.status === 'cancelled').length} subValue="Churn monitoring" trend="down" icon={Clock} />
      </div>

      <Card className="rounded-[2rem] border-border/40 overflow-hidden bg-card/50 backdrop-blur-sm">
        <CardHeader className="p-8 border-b border-border/40">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search records by user..."
                className="pl-11 h-12 rounded-2xl border-border/40 bg-background font-medium focus:ring-primary/20"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4 text-sm font-bold text-muted-foreground">
              <span>Sort by:</span>
              <select className="bg-transparent border-none focus:ring-0 text-foreground cursor-pointer">
                <option>Latest Created</option>
                <option>Oldest</option>
                <option>Status</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow className="hover:bg-transparent border-border/40">
                  <TableHead className="py-5 pl-8 text-xs font-black uppercase tracking-[0.1em]">User Information</TableHead>
                  <TableHead className="py-5 text-xs font-black uppercase tracking-[0.1em]">Plan Level</TableHead>
                  <TableHead className="py-5 text-xs font-black uppercase tracking-[0.1em]">Current Status</TableHead>
                  <TableHead className="py-5 text-xs font-black uppercase tracking-[0.1em]">Active Period</TableHead>
                  <TableHead className="py-5 pr-8 text-xs font-black uppercase tracking-[0.1em] text-right">Identifier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const profile = getProfile(s.user_id);
                  return (
                    <TableRow key={s.id} className="group hover:bg-muted/30 transition-all border-border/40">
                      <TableCell className="py-5 pl-8">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-muted border border-border flex items-center justify-center font-bold text-xs uppercase">
                            {(profile?.email?.[0] || 'U')}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{profile?.full_name || 'Anonymous User'}</span>
                            <span className="text-xs text-muted-foreground font-mono">{profile?.email || 'N/A'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <Badge className={`rounded-lg px-3 py-1 font-black text-[10px] uppercase tracking-wider border-none ${s.plan_type === 'yearly' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' :
                          s.plan_type === 'monthly' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' :
                            'bg-primary text-white shadow-lg shadow-primary/20'
                          }`}>
                          {s.plan_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${s.status === "active" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-destructive"}`} />
                          <span className={`text-[11px] font-black uppercase tracking-widest ${s.status === "active" ? "text-emerald-500" : "text-destructive"}`}>
                            {s.status}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs font-bold">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>{format(new Date(s.starts_at), "MMM d")}</span>
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            <span className="text-primary">{format(new Date(s.expires_at), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 pr-8 text-right">
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded border border-border/40">
                          ID: {s.id.slice(0, 8)}...
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <div className="p-8 border-t border-border/40 bg-muted/5 flex items-center justify-between">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            End of results · {filtered.length} logs found
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="rounded-lg h-9 font-black hover:bg-primary/10 hover:text-primary">Load Previous</Button>
            <div className="h-9 w-px bg-border/40 mx-2" />
            <Button variant="ghost" size="sm" onClick={handleExport} className="rounded-lg h-9 font-black hover:bg-primary/10 hover:text-primary">Download CSV</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
);
