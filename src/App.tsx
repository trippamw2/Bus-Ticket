import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AdminAuthProvider, useAdminAuth } from "@/contexts/AdminAuthContext";
import Index from "./pages/Index";
import OperatorRegister from "./pages/OperatorRegister";
import OperatorLogin from "./pages/operator/OperatorLogin";
import OperatorDashboard from "./pages/operator/OperatorDashboard";
import DashboardHome from "./pages/operator/DashboardHome";
import FleetManagement from "./pages/operator/fleet/FleetManagement";
import RouteManagement from "./pages/operator/routes/RouteManagement";
import CreateTrip from "./pages/operator/trips/CreateTrip";
import TripMonitoring from "./pages/operator/trips/TripMonitoring";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDashboardHome from "./pages/admin/AdminDashboardHome";
import OperatorManagement from "./pages/admin/operators/OperatorManagement";
import PlatformSettings from "./pages/admin/settings/PlatformSettings";
import ReportsDashboard from "./pages/admin/reports/ReportsDashboard";
import AuditLogs from "./pages/admin/audit/AuditLogs";
import NotFound from "./pages/NotFound";
import OrganizationSettings from "./pages/operator/organization/OrganizationSettings";
import FinanceDashboard from "./pages/operator/finance/FinanceDashboard";
import WalletDashboard from "./pages/operator/wallet/WalletDashboard";
import AnalyticsDashboard from "./pages/operator/analytics/AnalyticsDashboard";
import OperatorAuditLogs from "./pages/operator/audit/OperatorAuditLogs";
import { OperatorUserProvider } from "./contexts/OperatorUserContext";


const queryClient = new QueryClient();

// Protected Route wrapper for operators
function OperatorProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/operator/login" replace />;
  }
  
  return <>{children}</>;
}

// Protected Route wrapper for admin
function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, admin, loading } = useAdminAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user || !admin) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/register-operator" element={<OperatorRegister />} />
      
      {/* Operator Auth */}
      <Route path="/operator/login" element={<OperatorLogin />} />
      
      {/* Operator Dashboard (Protected) */}
      <Route path="/operator" element={
        <OperatorProtectedRoute>
          <OperatorUserProvider>
            <OperatorDashboard />
          </OperatorUserProvider>
        </OperatorProtectedRoute>
      }>
        <Route index element={<Navigate to="/operator/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardHome />} />
        <Route path="organization" element={<OrganizationSettings />} />
        <Route path="fleet" element={<FleetManagement />} />
        <Route path="routes" element={<RouteManagement />} />
        <Route path="trips/create" element={<CreateTrip />} />
        <Route path="trips" element={<TripMonitoring />} />
        <Route path="finance" element={<FinanceDashboard />} />
        <Route path="wallet" element={<WalletDashboard />} />
        <Route path="analytics" element={<AnalyticsDashboard />} />
        <Route path="audit" element={<OperatorAuditLogs />} />
      </Route>

      
      {/* Admin Auth */}
      <Route path="/admin/login" element={<AdminLogin />} />
      
      {/* Admin Dashboard (Protected) */}
      <Route path="/admin" element={
        <AdminProtectedRoute>
          <AdminDashboard />
        </AdminProtectedRoute>
      }>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardHome />} />
        <Route path="operators" element={<OperatorManagement />} />
        <Route path="settings" element={<PlatformSettings />} />
        <Route path="reports" element={<ReportsDashboard />} />
        <Route path="audit-logs" element={<AuditLogs />} />
      </Route>
      
      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AdminAuthProvider>
            <AppRoutes />
          </AdminAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
