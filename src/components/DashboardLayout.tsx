import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menu, X, Bus } from "lucide-react";
import { useState } from "react";

const DashboardLayout = () => {
  const { operator, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!operator) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white/80 backdrop-blur-md border-b sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-lg flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
            <Bus className="h-4 w-4 text-white" />
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
        <AppSidebar />
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-14 bg-white/60 backdrop-blur-md border-b sticky top-0 z-30 px-6 items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{operator.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-600 font-medium">● Active</span>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6">
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

export default DashboardLayout;
