import { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  Users, 
  Settings, 
  BarChart3, 
  FileText,
  Menu, 
  X, 
  LogOut,
  LayoutDashboard,
  Activity,
  Bus,
  Route,
  Calendar
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
    { path: '/admin/operators', label: 'Operator Management', icon: Users },
    { path: '/admin/fleet', label: 'Fleet Management', icon: Bus },
    { path: '/admin/routes', label: 'Route Management', icon: Route },
    { path: '/admin/trips', label: 'Trip Management', icon: Calendar },
    { path: '/admin/settings', label: 'Platform Settings', icon: Settings },
    { path: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { path: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between lg:hidden">
        <span className="font-bold text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          BusLink Admin
        </span>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </header>

      <div className="flex">
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">BusLink</span>
            </div>
            <p className="text-sm text-gray-400 mt-1">Admin Panel</p>
            <p className="text-xs text-gray-500 mt-1">{admin?.email}</p>
          </div>
          
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary text-white' 
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5 mr-2" />
              Sign Out
            </Button>
          </div>
        </aside>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
