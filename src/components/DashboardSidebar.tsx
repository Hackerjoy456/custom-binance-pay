import { LayoutDashboard, Settings, Key, Activity, CreditCard, Shield, Users, BarChart3, Cog, FileText, LogOut, BookOpen } from "lucide-react";
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

const userItems = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Subscription", url: "/dashboard/subscription", icon: CreditCard },
  { title: "API Config", url: "/dashboard/api-config", icon: Settings },
  { title: "API Keys", url: "/dashboard/api-keys", icon: Key },
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
    <Sidebar className="border-r border-border/50">
      <div className="p-4 border-b border-border/50">
        <span className="text-lg font-bold tracking-tight">
          <span className="text-primary text-glow">Binance</span>Verify
        </span>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70">Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {userItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-primary/5 transition-colors" activeClassName="bg-primary/10 text-primary font-medium border-r-2 border-primary">
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground/70">
              <Shield className="h-3 w-3 text-primary" /> Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end className="hover:bg-primary/5 transition-colors" activeClassName="bg-primary/10 text-primary font-medium border-r-2 border-primary">
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-border/50">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-destructive/5" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
