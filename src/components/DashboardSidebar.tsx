import { LayoutDashboard, Settings, Key, Activity, CreditCard, Shield, Users, BarChart3, Cog, FileText, LogOut, BookOpen, Link, Monitor, Globe, Bell } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const userItems = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Subscription", url: "/dashboard/subscription", icon: CreditCard },
  { title: "API Config", url: "/dashboard/api-config", icon: Settings },
  { title: "API Keys", url: "/dashboard/api-keys", icon: Key },
  { title: "Payment Links", url: "/dashboard/payment-links", icon: Link },
  { title: "Usage Logs", url: "/dashboard/logs", icon: Activity },
  { title: "Integration", url: "/dashboard/integration", icon: BookOpen },
];

const adminItems = [
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Subscriptions", url: "/admin/subscriptions", icon: BarChart3 },
  { title: "Settings", url: "/admin/settings", icon: Cog },
  { title: "Verification Logs", url: "/admin/logs", icon: FileText },
];

export function DashboardSidebar() {
  const { isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <Sidebar className="border-r border-border/40 bg-card/60 backdrop-blur-xl">
      <div className="p-8 pb-6 mb-2">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate("/")}>
          <div className="h-10 w-10 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight leading-none italic">
              BINANCE
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mt-1">
              Verify
            </span>
          </div>
        </div>
      </div>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-2">Console</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {userItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-11 rounded-xl px-4">
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 transition-all duration-300 group"
                      activeClassName="bg-primary/10 text-primary shadow-[inset_0_0_10px_rgba(var(--primary),0.05)] border-l-4 border-primary rounded-r-none"
                    >
                      <item.icon className="h-4 w-4 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                      <span className="font-bold text-sm tracking-tight">{item.title}</span>
                      {item.title === "Usage Logs" && (
                        <Badge className="ml-auto bg-primary/20 text-primary border-none text-[8px] h-4 min-w-[16px] flex items-center justify-center font-black animate-pulse">LIVE</Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="flex items-center gap-2 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 mb-2">
              Admin Control
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-11 rounded-xl px-4">
                      <NavLink
                        to={item.url}
                        end
                        className="flex items-center gap-3 transition-all duration-300 group"
                        activeClassName="bg-primary/10 text-primary border-l-4 border-primary rounded-r-none"
                      >
                        <item.icon className="h-4 w-4 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                        <span className="font-bold text-sm tracking-tight">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-6 border-t border-border/40 space-y-4">
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start border-[#26A1DE]/30 bg-[#26A1DE]/5 hover:bg-[#26A1DE]/10 gap-3 h-12 px-4 rounded-xl transition-all group overflow-hidden relative shadow-lg shadow-sky-500/5" asChild>
            <a href="https://t.me/hibigibi123" target="_blank" rel="noreferrer">
              <div className="absolute inset-0 bg-gradient-to-r from-sky-500/0 via-sky-500/5 to-sky-500/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#26A1DE] shrink-0 transform group-hover:scale-110 transition-transform">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.53-1.39.52-.46-.01-1.33-.26-1.98-.48-.8-.27-1.43-.42-1.37-.89.03-.25.38-.51 1.03-.78 4.04-1.76 6.74-2.92 8.09-3.48 3.85-1.6 4.64-1.88 5.17-1.89.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.13-.02.19z" />
              </svg>
              <span className="text-xs font-black text-[#26A1DE] uppercase tracking-widest">Support</span>
            </a>
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5 h-12 px-4 rounded-xl font-bold transition-all" onClick={handleSignOut}>
            <LogOut className="mr-3 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
