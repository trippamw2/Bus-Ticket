import { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Button } from '@/components/ui/button';
import { 
  Shield, Users, Settings, BarChart3, FileText,
  Menu, X, LogOut, LayoutDashboard, Activity,
  Bus, Route, Calendar, Ticket, CreditCard, Wallet,
  Bell, Search, ChevronRight, MessageSquare, Car, DollarSign
} from 'lucide-react';

const AdminDashboard = () => {
  const { admin, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/enterprise', label: 'Enterprise', icon: Activity },
    { path: '/admin/operators', label: 'Operators', icon: Users },
    { path: '/admin/agents', label: 'Agents', icon: Wallet },
    { path: '/admin/drivers', label: 'Drivers', icon: Car },
    { path: '/admin/fleet', label: 'Fleet', icon: Bus },
    { path: '/admin/routes', label: 'Routes', icon: Route },
    { path: '/admin/trips', label: 'Trips', icon: Calendar },
    { path: '/admin/bookings', label: 'Bookings', icon: Ticket },
    { path: '/admin/payments', label: 'Payments', icon: CreditCard },
    { path: '/admin/settlements', label: 'Settlements', icon: DollarSign },
    { path: '/admin/sms', label: 'SMS Logs', icon: MessageSquare },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
    { path: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { path: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white/80 backdrop-blur-md border-b sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-lg flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          BusLink
        </span>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </header>

      {/* Fixed Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 w-64 h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white shadow-2xl
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
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
            <p className="text-xs text-amber-400/80 font-medium">Malawi Bus Marketplace</p>
          </div>
        </div>
        
        {/* Admin Info */}
        <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/30">
          <p className="text-sm font-medium text-white truncate">{admin?.email || 'Admin'}</p>
          <p className="text-xs text-slate-400">Super Administrator</p>
        </div>
        
        {/* Navigation - Scrollable */}
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-220px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25' 
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                <span className="font-medium">{item.label}</span>
                {isActive && <ChevronRight className="ml-auto h-4 w-4 opacity-70" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-700/50 bg-slate-900/50">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-xl"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen">
        {/* Top Bar */}
        <header className="h-16 bg-white/60 backdrop-blur-md border-b sticky top-0 z-30 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-4 py-2 bg-slate-100/50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white w-64 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-slate-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium shadow-lg shadow-blue-500/20">
              A
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
