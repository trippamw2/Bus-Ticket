import { Bus, Map, CalendarPlus, BarChart3, LogOut, Users, Settings, CreditCard, FileText, Shield, Bell } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Fleet", url: "/dashboard/fleet", icon: Bus },
  { title: "Routes", url: "/dashboard/routes", icon: Map },
  { title: "Create Trip", url: "/dashboard/trips/create", icon: CalendarPlus },
  { title: "Trip Monitor", url: "/dashboard/trips/monitor", icon: BarChart3 },
  { title: "Passengers", url: "/dashboard/passengers", icon: Users },
  { title: "Bookings", url: "/dashboard/bookings", icon: FileText },
  { title: "Finance", url: "/dashboard/finance", icon: CreditCard },
  { title: "Wallet", url: "/dashboard/wallet", icon: CreditCard },
  { title: "Loyalty", url: "/dashboard/loyalty", icon: Users },
  { title: "Notifications", url: "/dashboard/notifications", icon: Bell },
  { title: "Security", url: "/dashboard/security", icon: Shield },
  { title: "Audit Logs", url: "/dashboard/audit", icon: FileText },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon" className="h-screen">
      <SidebarContent className="h-full flex flex-col">
        {/* Logo / Brand */}
        <div className="h-14 flex items-center px-4 border-b">
          {!collapsed && <span className="font-bold text-lg">BusLink</span>}
          {collapsed && <span className="font-bold text-lg">B</span>}
        </div>
        
        {/* Menu Items - scrollable */}
        <div className="flex-1 overflow-y-auto py-2">
          <SidebarGroup>
            <SidebarGroupLabel>
              {!collapsed && <span className="text-xs uppercase tracking-wider">Menu</span>}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="hover:bg-sidebar-accent/50"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
        
        {/* Footer - logout */}
        <SidebarFooter className="border-t shrink-0">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sign Out</span>}
          </Button>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}
