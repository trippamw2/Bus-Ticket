import { BarChart3, Bus, Map, CalendarPlus, Users, FileText, CreditCard, Settings, LogOut, Menu, X, Wallet, ChevronDown, TrendingUp, Clock } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// Simplified menu for bus booking operators
const menuGroups = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
    ]
  },
  {
    title: "Operations",
    items: [
      { title: "Fleet", url: "/dashboard/fleet", icon: Bus },
      { title: "Routes", url: "/dashboard/routes", icon: Map },
      { title: "Create Trip", url: "/dashboard/trips/create", icon: CalendarPlus },
      { title: "Trip Monitor", url: "/dashboard/trips/monitor", icon: TrendingUp },
    ]
  },
  {
    title: "Bookings",
    items: [
      { title: "All Bookings", url: "/dashboard/bookings", icon: FileText },
      { title: "Seat Selection", url: "/dashboard/bookings/seat-selection", icon: Users },
    ]
  },
  {
    title: "Finance",
    items: [
      { title: "Finance", url: "/dashboard/finance", icon: CreditCard },
      { title: "Wallet", url: "/dashboard/wallet", icon: Wallet },
    ]
  },
  {
    title: "Settings",
    items: [
      { title: "Organization", url: "/dashboard/organization", icon: Settings },
    ]
  }
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut, operator } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(menuGroups.map(g => g.title));

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  return (
    <>
      {/* Mobile toggle button */}
      <Button 
        variant="ghost" 
        size="icon"
        className="lg:hidden fixed top-3 left-3 z-50 bg-white shadow-md"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-40 h-screen w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white shadow-2xl
        transform transition-transform duration-300 lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-20 px-4 flex items-center border-b border-slate-700/50 bg-gradient-to-r from-blue-900/50 to-slate-900">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-white" stroke="currentColor" strokeWidth="2">
              <path d="M8 6v6h8V6M4 10h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4a2 2 0 012-2z" />
              <path d="M4 18v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 14l3-3 2 2 3-3" />
            </svg>
          </div>
          <div className="ml-3">
            <span className="font-bold text-xl tracking-tight">BusLink</span>
            <p className="text-xs text-amber-400/80 font-medium">Operator Portal</p>
          </div>
        </div>
        
        {/* Operator Info */}
        <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/30">
          <p className="text-sm font-medium text-white truncate">{operator?.name || 'Operator'}</p>
          <p className="text-xs text-emerald-400">● Active</p>
        </div>
        
        {/* Navigation - Grouped & Scrollable */}
        <nav className="p-3 overflow-y-auto h-[calc(100vh-180px)]">
          {menuGroups.map((group) => (
            <div key={group.title} className="mb-4">
              <button
                onClick={() => toggleGroup(group.title)}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200"
              >
                {group.title}
                <ChevronDown className={`h-3 w-3 transition-transform ${expandedGroups.includes(group.title) ? 'rotate-180' : ''}`} />
              </button>
              <div className={`space-y-1 overflow-hidden transition-all ${expandedGroups.includes(group.title) ? 'max-h-96 mt-1' : 'max-h-0'}`}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.url;
                  return (
                    <NavLink
                      key={item.url}
                      to={item.url}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                        isActive 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25' 
                          : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                      }`}
                      activeClassName="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25"
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                      <span className="text-sm font-medium">{item.title}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-700/50 bg-slate-900/50">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-xl"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
