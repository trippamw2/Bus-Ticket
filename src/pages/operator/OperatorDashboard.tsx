import { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bus, Route, Calendar, Users, Menu, X, LogOut, LayoutDashboard, Plus,
  Wallet, BarChart3, Settings, Building2, FileText, DollarSign,
  Gift, TrendingUp, ShieldAlert, CalendarClock, UsersRound, Bell, Armchair
} from 'lucide-react';

const OperatorDashboard = () => {
  const { operator, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { path: '/operator/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/operator/organization', label: 'Organization', icon: Building2 },
    { path: '/operator/fleet', label: 'Fleet', icon: Bus },
    { path: '/operator/routes', label: 'Routes', icon: Route },
    { path: '/operator/trips/create', label: 'Schedule Trip', icon: Plus },
    { path: '/operator/trips', label: 'Trip Monitor', icon: Users },
    { path: '/operator/trips/cancellation', label: 'Trip Cancellation', icon: CalendarClock },
    { path: '/operator/trips/assignment', label: 'Driver Assignment', icon: UsersRound },
    { path: '/operator/bookings/seat-selection', label: 'Seat Selection', icon: Armchair },
    { path: '/operator/bookings/passenger-manifest', label: 'Passenger Manifest', icon: Users },
    { path: '/operator/routes/pricing', label: 'Price History', icon: TrendingUp },
    { path: '/operator/fleet/capacity', label: 'Bus Capacity', icon: Bus },
    { path: '/operator/fleet/driver-alerts', label: 'License Alerts', icon: FileText },
    { path: '/operator/fleet/document-alerts', label: 'Document Alerts', icon: FileText },
    { path: '/operator/fleet/maintenance', label: 'Maintenance', icon: Calendar },
    { path: '/operator/finance', label: 'Finance', icon: DollarSign },
    { path: '/operator/finance/ledger', label: 'Ledger', icon: FileText },
    { path: '/operator/wallet', label: 'Wallet', icon: Wallet },
    { path: '/operator/loyalty', label: 'Loyalty', icon: Gift },
    { path: '/operator/notifications', label: 'Notifications', icon: Bell },
    { path: '/operator/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/operator/security', label: 'Security', icon: ShieldAlert },
    { path: '/operator/audit', label: 'Audit Logs', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden bg-card border-b px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-lg">BusLink</span>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-4 border-b">
            <h1 className="font-bold text-xl">BusLink</h1>
            <p className="text-sm text-muted-foreground truncate">{operator?.company_name || operator?.name}</p>
            <Badge variant="outline" className="mt-1 text-xs capitalize">{operator?.status}</Badge>
          </div>
          
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                    ${isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 min-h-screen">
          <Outlet />
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default OperatorDashboard;
