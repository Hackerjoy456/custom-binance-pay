import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Search, Clock, Trash2, Gift, ShieldCheck, ShieldOff, Ban, UserX, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { safeError } from "@/lib/safe-error";

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
      if (!res.ok) {
        throw new Error(data?.error || "Action failed");
      }
      toast.success(data.message || `User ${confirmDialog.action} successfully`);
    } catch (e: any) {
      toast.error(safeError(e, `Failed to ${confirmDialog.action} user`));
    }
    setActionLoading(false);
    setConfirmDialog(null);
    load();
  };

  const filtered = profiles.filter((p) =>
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">{profiles.length} total users</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const sub = getUserSub(p.user_id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.email}</TableCell>
                    <TableCell>{p.full_name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={isAdmin(p.user_id) ? "default" : "outline"} className={isAdmin(p.user_id) ? "bg-primary" : ""}>
                        {isAdmin(p.user_id) ? "Admin" : "User"}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{sub?.plan_type || "None"}</Badge></TableCell>
                    <TableCell className="text-sm">{sub ? format(new Date(sub.expires_at), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell>
                      <Badge className={p.is_banned ? "bg-black" : (sub ? "bg-green-600" : "bg-destructive")}>
                        {p.is_banned ? "Banned" : (sub ? "Active" : "Inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {isSuperAdmin && !isSelf(p.user_id) && (
                          <Button variant="ghost" size="sm" onClick={() => handleToggleAdmin(p.user_id)}>
                            {isAdmin(p.user_id) ? <><ShieldOff className="h-3 w-3 mr-1 text-destructive" /> Demote</> : <><ShieldCheck className="h-3 w-3 mr-1 text-primary" /> Make Admin</>}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setGiveSubDialog(p.user_id)}>
                          <Gift className="h-3 w-3 mr-1" /> Give Sub
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDaysDialog({ userId: p.user_id, action: "extend" })} disabled={!sub}>
                          <Clock className="h-3 w-3 mr-1" /> Extend
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDaysDialog({ userId: p.user_id, action: "reduce" })} disabled={!sub}>
                          <Clock className="h-3 w-3 mr-1" /> Reduce
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleCancelSub(p.user_id)} disabled={!sub}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                        {!isSelf(p.user_id) && (
                          <>
                            {isSuperAdmin && (
                              <Button variant="ghost" size="sm" onClick={() => setConfirmDialog({ userId: p.user_id, email: p.email, action: p.is_banned ? "unban" : "ban" })}>
                                {p.is_banned ? <><UserCheck className="h-3 w-3 mr-1 text-green-600" /> Unban</> : <><Ban className="h-3 w-3 mr-1 text-warning" /> Ban</>}
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => setConfirmDialog({ userId: p.user_id, email: p.email, action: "delete" })}>
                              <UserX className="h-3 w-3 mr-1 text-destructive" /> Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Extend/Reduce Dialog */}
      <Dialog open={!!daysDialog} onOpenChange={() => setDaysDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{daysDialog?.action} Subscription</DialogTitle>
            <DialogDescription>Enter the number of days to {daysDialog?.action}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Days</Label>
              <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} min="1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDaysDialog(null)}>Cancel</Button>
            <Button onClick={handleExtendReduce}>{daysDialog?.action === "extend" ? "Extend" : "Reduce"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Give Subscription Dialog */}
      <Dialog open={!!giveSubDialog} onOpenChange={() => setGiveSubDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Give Subscription</DialogTitle>
            <DialogDescription>Choose a plan to give this user.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plan Type</Label>
              <Select value={givePlanType} onValueChange={setGivePlanType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly (7 days)</SelectItem>
                  <SelectItem value="monthly">Monthly (30 days)</SelectItem>
                  <SelectItem value="yearly">Yearly (365 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGiveSubDialog(null)}>Cancel</Button>
            <Button onClick={handleGiveSubscription}>Give Subscription</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban/Delete Confirmation Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => !actionLoading && setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize flex items-center gap-2">
              {confirmDialog?.action === "ban" ? <Ban className="h-5 w-5 text-warning" /> : (confirmDialog?.action === "unban" ? <UserCheck className="h-5 w-5 text-green-600" /> : <UserX className="h-5 w-5 text-destructive" />)}
              {confirmDialog?.action === "ban" ? "Ban User" : (confirmDialog?.action === "unban" ? "Unban User" : "Delete User")}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.action === "ban"
                ? `Are you sure you want to ban ${confirmDialog?.email}? They will be unable to log in, and their subscription & API keys will be revoked.`
                : confirmDialog?.action === "unban"
                  ? `Are you sure you want to unban ${confirmDialog?.email}? They will be able to log in again.`
                  : `Are you sure you want to permanently delete ${confirmDialog?.email}? This will remove ALL their data including subscriptions, API keys, logs, and their account. This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)} disabled={actionLoading}>Cancel</Button>
            <Button variant={confirmDialog?.action === "unban" ? "default" : "destructive"} onClick={handleUserAction} disabled={actionLoading}>
              {actionLoading ? "Processing..." : confirmDialog?.action === "ban" ? "Ban User" : (confirmDialog?.action === "unban" ? "Unban User" : "Delete User")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
