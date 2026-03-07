import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Loader2 } from "lucide-react";

const DashboardLayout = () => {
  const { operator, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!operator) return <Navigate to="/login" replace />;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex">
        {/* Sidebar - fixed position, independent scroll */}
        <div className="fixed top-0 left-0 h-screen z-50">
          <AppSidebar />
        </div>
        
        {/* Main content area - scrollable independently */}
        <div className="flex-1 flex flex-col ml-16 min-h-screen">
          <header className="h-14 flex items-center border-b px-4 gap-3 bg-card shrink-0 sticky top-0 z-40">
            <SidebarTrigger />
            <span className="text-sm font-medium text-muted-foreground">{operator.name}</span>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
