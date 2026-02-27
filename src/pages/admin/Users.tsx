import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays, subDays, addMonths, addYears } from "date-fns";
import {
  Search, Clock, Trash2, Gift, ShieldCheck, ShieldOff, Ban, UserX, UserCheck,
  Users as UsersIcon, UserPlus, Shield, Activity, MoreVertical, Mail,
  Filter, Download, ChevronRight, AlertTriangle, Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { safeError } from "@/lib/safe-error";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/* ── Admin Stat Component ────────────────────────── */
function AdminStat({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <Card className="border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden group transition-all hover:scale-[1.02]">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-2xl ${color} bg-opacity-10 flex items-center justify-center shrink-0 shadow-lg`}>
            <Icon className={`h-6 w-6 ${color.replace('bg-', 'text-')}`} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</p>
            <h3 className="text-2xl font-black mt-0.5">{value}</h3>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminUsers() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [daysDialog, setDaysDialog] = useState<{ userId: string; action: "extend" | "reduce" } | null>(null);
  const [days, setDays] = useState("7");
  const [giveSubDialog, setGiveSubDialog] = useState<string | null>(null);
  const [givePlanType, setGivePlanType] = useState<string>("monthly");
  const [confirmDialog, setConfirmDialog] = useState<{ userId: string; email: string; action: "ban" | "unban" | "delete" } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [addUserDialog, setAddUserDialog] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", fullName: "", role: "user" });
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    try {
      const [profRes, subRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("*").eq("status", "active"),
        supabase.from("user_roles").select("*"),
      ]);
      setProfiles(profRes.data || []);
      setSubscriptions(subRes.data || []);
      setRoles(rolesRes.data || []);
    } catch {
      toast.error("Failed to load users");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getUserSub = (userId: string) => subscriptions.find((s) => s.user_id === userId && new Date(s.expires_at) > new Date());
  const isAdmin = (userId: string) => roles.some((r) => r.user_id === userId && r.role === "admin");
  const isSelf = (userId: string) => user?.id === userId;
  const isSuperAdmin = user?.email === "hackf1283@gmail.com";

  const handleToggleAdmin = async (userId: string) => {
    if (!isSuperAdmin) { toast.error("Only the super admin can manage admin roles"); return; }
    if (isSelf(userId)) { toast.error("You cannot change your own admin role"); return; }
    const admin = isAdmin(userId);
    try {
      if (admin) {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        if (error) throw error;
        toast.success("Admin role removed");
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" as const });
        if (error) throw error;
        toast.success("User promoted to admin");
      }
    } catch (e) {
      toast.error(safeError(e, "Failed to update admin role"));
    }
    load();
  };

  const handleExtendReduce = async () => {
    if (!daysDialog) return;
    const sub = getUserSub(daysDialog.userId);
    if (!sub) { toast.error("No active subscription found"); setDaysDialog(null); return; }
    try {
      const current = new Date(sub.expires_at);
      const newDate = daysDialog.action === "extend" ? addDays(current, parseInt(days)) : subDays(current, parseInt(days));

      if (newDate <= new Date()) {
        const { error: e1 } = await supabase.from("subscriptions").update({ status: "expired" as const, expires_at: new Date().toISOString() }).eq("id", sub.id);
        if (e1) throw e1;
        await supabase.from("api_keys").update({ is_active: false }).eq("user_id", daysDialog.userId).eq("is_active", true);
        toast.success("Subscription expired and API key revoked");
      } else {
        const { error } = await supabase.from("subscriptions").update({ expires_at: newDate.toISOString() }).eq("id", sub.id);
        if (error) throw error;
        toast.success(`Subscription ${daysDialog.action}ed by ${days} days`);
      }
    } catch (e) {
      toast.error(safeError(e, "Failed to update subscription"));
    }
    setDaysDialog(null);
    load();
  };

  const handleGiveSubscription = async () => {
    if (!giveSubDialog) return;
    try {
      const now = new Date();
      let expiresAt: Date;
      if (givePlanType === "weekly") expiresAt = addDays(now, 7);
      else if (givePlanType === "monthly") expiresAt = addMonths(now, 1);
      else expiresAt = addYears(now, 1);

      const oldSub = getUserSub(giveSubDialog);
      if (oldSub) {
        await supabase.from("subscriptions").update({ status: "expired" as const }).eq("id", oldSub.id);
      }

      const { error } = await supabase.from("subscriptions").insert({
        user_id: giveSubDialog,
        plan_type: givePlanType as "weekly" | "monthly" | "yearly",
        expires_at: expiresAt.toISOString(),
      });
      if (error) throw error;

      const { data: existingKeys } = await supabase
        .from("api_keys").select("id").eq("user_id", giveSubDialog).eq("is_active", true).limit(1);

      if (!existingKeys || existingKeys.length === 0) {
        await supabase.from("api_keys").insert({ user_id: giveSubDialog });
      }

      toast.success(`${givePlanType} subscription given with API key!`);
    } catch (e) {
      toast.error(safeError(e, "Failed to give subscription"));
    }
    setGiveSubDialog(null);
    load();
  };

  const handleCancelSub = async (userId: string) => {
    try {
      const sub = getUserSub(userId);
      if (sub) {
        const { error } = await supabase.from("subscriptions").update({ status: "cancelled" as const }).eq("id", sub.id);
        if (error) throw error;
      }
      await supabase.from("api_keys").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);
      toast.success("Subscription cancelled & API key revoked");
    } catch (e) {
      toast.error(safeError(e, "Failed to cancel subscription"));
    }
    load();
  };

  const handleUserAction = async () => {
    if (!confirmDialog) return;
    setActionLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/admin-manage-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          action: confirmDialog.action,
          target_user_id: confirmDialog.userId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Action failed");
      toast.success(data.message || `User ${confirmDialog.action} successfully`);
    } catch (e: any) {
      toast.error(safeError(e, `Failed to ${confirmDialog.action} user`));
    }
    setActionLoading(false);
    setConfirmDialog(null);
    load();
  };

  const filtered = profiles.filter((p) => {
    const matchesSearch = p.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.full_name || "").toLowerCase().includes(search.toLowerCase());

    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "banned") return matchesSearch && p.is_banned;
    if (statusFilter === "active") return matchesSearch && !p.is_banned && getUserSub(p.user_id);
    if (statusFilter === "inactive") return matchesSearch && !p.is_banned && !getUserSub(p.user_id);
    return matchesSearch;
  });

  const handleExport = () => {
    const headers = ["ID", "Email", "Full Name", "Role", "Subscription Status", "Expires At", "Banned"];
    const csvData = filtered.map(p => {
      const sub = getUserSub(p.user_id);
      const isUserAdmin = isAdmin(p.user_id);
      return [
        p.user_id,
        p.email,
        `"${(p.full_name || "Anonymous").replace(/"/g, '""')}"`,
        isUserAdmin ? "Admin" : "User",
        sub ? "Active" : "None",
        sub ? format(new Date(sub.expires_at), "yyyy-MM-dd HH:mm") : "N/A",
        p.is_banned ? "Yes" : "No"
      ].join(",");
    });
    const blob = new Blob([[headers.join(","), ...csvData].join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_export_${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    toast.success("CSV export initialized.");
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast.error("Email and password are required");
      return;
    }
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: {
          action: "create",
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.fullName,
          role: newUser.role
        }
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      toast.success("User created successfully");
      setAddUserDialog(false);
      setNewUser({ email: "", password: "", fullName: "", role: "user" });
      load();
    } catch (e) {
      toast.error(safeError(e, "Failed to create user"));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">User Management</h1>
          <p className="text-muted-foreground font-medium">Configure roles, handle bans, and grant subscriptions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExport} variant="outline" className="rounded-xl border-border/50 gap-2 font-bold h-11"><Download className="h-4 w-4" /> Export</Button>
          <Button onClick={() => setAddUserDialog(true)} className="rounded-xl gradient-primary font-black h-11 px-6 shadow-xl shadow-primary/20"><UserPlus className="h-4 w-4 mr-2" /> Add User</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStat icon={UsersIcon} label="Total Users" value={profiles.length} color="bg-primary" />
        <AdminStat icon={Shield} label="Admins" value={roles.length} color="bg-indigo-500" />
        <AdminStat icon={Activity} label="Active Subs" value={subscriptions.length} color="bg-emerald-500" />
        <AdminStat icon={Ban} label="Banned" value={profiles.filter(p => p.is_banned).length} color="bg-red-500" />
      </div>

      {/* Main Table Card */}
      <Card className="rounded-3xl border-border/40 overflow-hidden bg-card/50 backdrop-blur-sm">
        <CardHeader className="p-6 border-b border-border/40 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 h-11 rounded-xl bg-background border-border/40 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="rounded-xl h-11 w-11 border-border/40"><Filter className="h-4 w-4" /></Button>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-11 rounded-xl border-border/40 font-bold bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Plan</SelectItem>
                  <SelectItem value="inactive">No Plan</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow className="hover:bg-transparent border-border/40">
                  <TableHead className="py-4 pl-6 text-xs font-black uppercase tracking-widest">User Details</TableHead>
                  <TableHead className="py-4 text-xs font-black uppercase tracking-widest">Access Role</TableHead>
                  <TableHead className="py-4 text-xs font-black uppercase tracking-widest">Current Plan</TableHead>
                  <TableHead className="py-4 text-xs font-black uppercase tracking-widest">Expiry</TableHead>
                  <TableHead className="py-4 text-xs font-black uppercase tracking-widest">Account Status</TableHead>
                  <TableHead className="py-4 pr-6 text-right text-xs font-black uppercase tracking-widest">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const sub = getUserSub(p.user_id);
                  const isUserAdmin = isAdmin(p.user_id);
                  return (
                    <TableRow key={p.id} className="group hover:bg-muted/30 transition-colors border-border/40">
                      <TableCell className="py-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                            {p.email[0].toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm tracking-tight">{p.full_name || "Anonymous User"}</span>
                            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {p.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge
                          variant={isUserAdmin ? "default" : "outline"}
                          className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${isUserAdmin ? "gradient-primary shadow-lg shadow-primary/20 border-none" : "border-border/60"}`}
                        >
                          {isUserAdmin ? "Admin" : "Standard User"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-bold capitalize rounded-lg px-2 py-0.5 text-[11px] bg-muted/80">
                            {sub?.plan_type || "No Plan"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-sm font-medium">
                        {sub ? format(new Date(sub.expires_at), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${p.is_banned ? 'bg-black animate-pulse' : (sub ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-destructive')}`} />
                          <span className={`text-[11px] font-black uppercase tracking-widest ${p.is_banned ? 'text-black' : (sub ? 'text-emerald-500' : 'text-destructive')}`}>
                            {p.is_banned ? "Banned" : (sub ? "Active" : "Inactive")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 hover:bg-primary/10 hover:text-primary"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-2xl border-border/40 p-2 shadow-2xl">
                            <DropdownMenuLabel className="px-3 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground">User Management</DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            {isSuperAdmin && !isSelf(p.user_id) && (
                              <DropdownMenuItem onClick={() => handleToggleAdmin(p.user_id)} className="rounded-xl py-2 cursor-pointer">
                                {isUserAdmin ? <><ShieldOff className="h-4 w-4 mr-3 text-destructive" /> Remove Admin</> : <><ShieldCheck className="h-4 w-4 mr-3 text-primary" /> Grant Admin</>}
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem onClick={() => setGiveSubDialog(p.user_id)} className="rounded-xl py-2 cursor-pointer">
                              <Gift className="h-4 w-4 mr-3 text-indigo-500" /> Gift Subscription
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => setDaysDialog({ userId: p.user_id, action: "extend" })} disabled={!sub} className="rounded-xl py-2 cursor-pointer">
                              <Clock className="h-4 w-4 mr-3 text-emerald-500" /> Extend Access
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => setDaysDialog({ userId: p.user_id, action: "reduce" })} disabled={!sub} className="rounded-xl py-2 cursor-pointer text-amber-500">
                              <Clock className="h-4 w-4 mr-3" /> Reduce Access
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {!isSelf(p.user_id) && (
                              <>
                                {isSuperAdmin && (
                                  <DropdownMenuItem onClick={() => setConfirmDialog({ userId: p.user_id, email: p.email, action: p.is_banned ? "unban" : "ban" })} className={`rounded-xl py-2 cursor-pointer font-bold ${p.is_banned ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {p.is_banned ? <><UserCheck className="h-4 w-4 mr-3" /> Lift Ban</> : <><Ban className="h-4 w-4 mr-3" /> Ban Account</>}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => setConfirmDialog({ userId: p.user_id, email: p.email, action: "delete" })} className="rounded-xl py-2 cursor-pointer text-destructive font-bold">
                                  <UserX className="h-4 w-4 mr-3" /> Delete Data
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <div className="p-6 border-t border-border/40 bg-muted/5 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Showing <span className="text-foreground font-bold">{filtered.length}</span> entries</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-lg font-bold">Previous</Button>
            <Button variant="outline" size="sm" className="rounded-lg font-bold bg-muted/50 border-primary/20 text-primary">1</Button>
            <Button variant="outline" size="sm" className="rounded-lg font-bold">Next</Button>
          </div>
        </div>
      </Card>

      {/* Modern Dialogs */}
      <Dialog open={!!daysDialog} onOpenChange={() => setDaysDialog(null)}>
        <DialogContent className="rounded-[2rem] border-primary/10 p-0 overflow-hidden sm:max-w-md">
          <div className="p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black capitalize flex items-center gap-3">
                <Clock className="h-6 w-6 text-primary" /> {daysDialog?.action} Subscription
              </DialogTitle>
              <DialogDescription className="font-medium text-base">Adjust user's active access time manually.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1">Days to {daysDialog?.action}</Label>
                <Input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  min="1"
                  className="h-12 rounded-xl focus:ring-2 focus:ring-primary/20 font-bold px-4"
                />
              </div>
            </div>
            <DialogFooter className="gap-3 sm:gap-0">
              <Button variant="ghost" onClick={() => setDaysDialog(null)} className="rounded-xl h-12 font-bold flex-1">Abort</Button>
              <Button onClick={handleExtendReduce} className="rounded-xl h-12 font-black gradient-primary flex-1 shadow-lg shadow-primary/20">Commit Changes</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!giveSubDialog} onOpenChange={() => setGiveSubDialog(null)}>
        <DialogContent className="rounded-[2.5rem] border-primary/10 p-0 overflow-hidden sm:max-w-md shadow-2xl">
          <div className="p-8 space-y-8">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black flex items-center gap-3">
                <Gift className="h-8 w-8 text-indigo-500" /> Gift Plan
              </DialogTitle>
              <DialogDescription className="text-base font-medium">Immediately grant a premium plan to this user.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Plan Package</Label>
                <Select value={givePlanType} onValueChange={setGivePlanType}>
                  <SelectTrigger className="h-14 rounded-2xl border-border bg-muted/20 font-bold px-5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="weekly" className="py-3 font-semibold">Weekly (Explorer Batch)</SelectItem>
                    <SelectItem value="monthly" className="py-3 font-semibold">Monthly (Professional)</SelectItem>
                    <SelectItem value="yearly" className="py-3 font-semibold">Yearly (Power User)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-primary">Caution</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">This will override any current active plan the user might have.</p>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-3 pt-2">
              <Button variant="ghost" onClick={() => setGiveSubDialog(null)} className="h-14 rounded-2xl font-bold flex-1">Cancel</Button>
              <Button onClick={handleGiveSubscription} className="h-14 rounded-2xl font-black text-lg gradient-primary flex-[1.5] shadow-xl shadow-primary/30 active:scale-95 transition-transform text-white">Deliver Gift</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDialog} onOpenChange={() => !actionLoading && setConfirmDialog(null)}>
        <DialogContent className="rounded-[2.5rem] border-destructive/20 p-0 shadow-2xl sm:max-w-md overflow-hidden">
          <div className="p-10 space-y-8 text-center">
            <div className={`mx-auto h-20 w-20 rounded-3xl flex items-center justify-center shadow-xl shadow-destructive/20 ${confirmDialog?.action === 'ban' ? 'bg-amber-500/10' : confirmDialog?.action === 'unban' ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
              {confirmDialog?.action === "ban" ? <Ban className="h-10 w-10 text-amber-500" /> : (confirmDialog?.action === "unban" ? <UserCheck className="h-10 w-10 text-emerald-500" /> : <UserX className="h-10 w-10 text-destructive" />)}
            </div>
            <DialogHeader>
              <DialogTitle className="text-3xl font-black capitalize text-center leading-tight">
                {confirmDialog?.action === "ban" ? "Confirm Account Suspension" : (confirmDialog?.action === "unban" ? "Restore Account Access" : "Terminate User Entity")}
              </DialogTitle>
              <DialogDescription className="text-base text-center pt-2 font-medium">
                {confirmDialog?.action === "ban"
                  ? `Are you sure you want to ban ${confirmDialog?.email}? This prevents all further access immediately.`
                  : confirmDialog?.action === "unban"
                    ? `Restore full system access for ${confirmDialog?.email}?`
                    : `PROCEED WITH CAUTION: This will permanently purge all telemetry, subscriptions, and identity data for ${confirmDialog?.email}.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-col gap-3">
              <Button
                variant={confirmDialog?.action === "unban" ? "default" : "destructive"}
                onClick={handleUserAction}
                disabled={actionLoading}
                className={`h-14 rounded-2xl font-black text-lg shadow-xl shadow-destructive/20 active:scale-95 transition-all ${confirmDialog?.action === 'unban' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : ''}`}
              >
                {actionLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Working...</> : `Confirm ${confirmDialog?.action}`}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDialog(null)} disabled={actionLoading} className="h-12 rounded-xl font-bold opacity-60 hover:opacity-100">Dismiss</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={addUserDialog} onOpenChange={setAddUserDialog}>
        <DialogContent className="rounded-3xl border-border/40 bg-card/95 backdrop-blur-xl max-w-md p-0 overflow-hidden shadow-2xl">
          <div className="p-8 space-y-8">
            <DialogHeader>
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-2xl font-black">Provision New Identity</DialogTitle>
              <DialogDescription className="font-bold">Manually create a new user profile in the system registry.</DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
                <Input
                  type="email"
                  placeholder="identity@core.sys"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="h-14 rounded-2xl bg-background border-border/40 font-bold focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Authorization Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="h-14 rounded-2xl bg-background border-border/40 font-bold focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Identity Name</Label>
                <Input
                  placeholder="Agent Smith"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  className="h-14 rounded-2xl bg-background border-border/40 font-bold focus:ring-primary/20"
                />
              </div>
              {isSuperAdmin && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Deployment Role</Label>
                  <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                    <SelectTrigger className="h-14 rounded-2xl bg-background border-border/40 font-bold focus:ring-primary/20">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border/40 bg-card/95 backdrop-blur-xl">
                      <SelectItem value="user" className="font-bold py-3">User</SelectItem>
                      <SelectItem value="admin" className="font-bold py-3 text-primary">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter className="gap-3 pt-2">
              <Button variant="ghost" onClick={() => setAddUserDialog(false)} className="h-14 rounded-2xl font-bold flex-1">Abort</Button>
              <Button onClick={handleAddUser} disabled={actionLoading} className="h-14 rounded-2xl gradient-primary font-black flex-[1.5] shadow-xl shadow-primary/30 active:scale-95 transition-transform text-white">
                {actionLoading ? "Syncing..." : "Execute Provisioning"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}
