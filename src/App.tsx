import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AdminAuthProvider, useAdminAuth } from "@/contexts/AdminAuthContext";
import Index from "./pages/Index";
import OperatorLogin from "./pages/operator/OperatorLogin";
import OperatorDashboard from "./pages/operator/OperatorDashboard";
import DashboardHome from "./pages/operator/DashboardHome";
import OperatorFleetManagement from "./pages/operator/fleet/FleetManagement";
import OperatorRouteManagement from "./pages/operator/routes/RouteManagement";
import CreateTrip from "./pages/operator/trips/CreateTrip";
import TripMonitoring from "./pages/operator/trips/TripMonitoring";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDashboardHome from "./pages/admin/AdminDashboardHome";
import OperatorManagement from "./pages/admin/operators/OperatorManagement";
import AdminFleetManagement from "./pages/admin/fleet/FleetManagement";
import AdminRouteManagement from "./pages/admin/routes/RouteManagement";
import TripManagement from "./pages/admin/trips/TripManagement";
import BookingManagement from "./pages/admin/bookings/BookingManagement";
import AgentManagement from "./pages/admin/agents/AgentManagement";
import PaymentMonitoring from "./pages/admin/payments/PaymentMonitoring";
import PlatformSettings from "./pages/admin/settings/PlatformSettings";
import ReportsDashboard from "./pages/admin/reports/ReportsDashboard";
import AuditLogs from "./pages/admin/audit/AuditLogs";
import NotFound from "./pages/NotFound";
import OrganizationSettings from "./pages/operator/organization/OrganizationSettings";
import FinanceDashboard from "./pages/operator/finance/FinanceDashboard";
import WalletDashboard from "./pages/operator/wallet/WalletDashboard";
import AnalyticsDashboard from "./pages/operator/analytics/AnalyticsDashboard";
import OperatorAuditLogs from "./pages/operator/audit/OperatorAuditLogs";
import SeatSelection from "./pages/operator/bookings/SeatSelection";
import PassengerManifest from "./pages/operator/bookings/PassengerManifest";
import TripCancellation from "./pages/operator/trips/TripCancellation";
import NotificationsCenter from "./pages/operator/notifications/NotificationsCenter";
import LoyaltyPoints from "./pages/operator/loyalty/LoyaltyPoints";
import PriceHistory from "./pages/operator/routes/PriceHistory";
import BusCapacityConfig from "./pages/operator/fleet/BusCapacityConfig";
import DriverLicenseAlerts from "./pages/operator/fleet/DriverLicenseAlerts";
import FinancialLedger from "./pages/operator/finance/FinancialLedger";
import DriverTripAssignment from "./pages/operator/trips/DriverTripAssignment";
import DocumentExpiryAlerts from "./pages/operator/fleet/DocumentExpiryAlerts";
import MaintenanceScheduling from "./pages/operator/fleet/MaintenanceScheduling";
import SecurityAlertsDashboard from "./pages/operator/security/SecurityAlertsDashboard";
import EnterpriseDashboard from "./pages/admin/EnterpriseDashboard";
import DriverManagement from "./pages/admin/drivers/DriverManagement";
import SettlementManagement from "./pages/admin/settlements/SettlementManagement";
import SMSLogs from "./pages/admin/sms/SMSLogs";
import { OperatorUserProvider } from "./contexts/OperatorUserContext";

const queryClient = new QueryClient();

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
      
      {/* Operator Auth - No self-registration, only admin can create operators */}
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
        <Route path="fleet" element={<OperatorFleetManagement />} />
        <Route path="routes" element={<OperatorRouteManagement />} />
        <Route path="trips/create" element={<CreateTrip />} />
        <Route path="trips" element={<TripMonitoring />} />
        <Route path="finance" element={<FinanceDashboard />} />
        <Route path="wallet" element={<WalletDashboard />} />
        <Route path="analytics" element={<AnalyticsDashboard />} />
        <Route path="audit" element={<OperatorAuditLogs />} />
        <Route path="bookings/seat-selection" element={<SeatSelection />} />
        <Route path="bookings/passenger-manifest" element={<PassengerManifest />} />
        <Route path="trips/cancellation" element={<TripCancellation />} />
        <Route path="trips/assignment" element={<DriverTripAssignment />} />
        <Route path="notifications" element={<NotificationsCenter />} />
        <Route path="loyalty" element={<LoyaltyPoints />} />
        <Route path="routes/pricing" element={<PriceHistory />} />
        <Route path="fleet/capacity" element={<BusCapacityConfig />} />
        <Route path="fleet/driver-alerts" element={<DriverLicenseAlerts />} />
        <Route path="fleet/document-alerts" element={<DocumentExpiryAlerts />} />
        <Route path="fleet/maintenance" element={<MaintenanceScheduling />} />
        <Route path="finance/ledger" element={<FinancialLedger />} />
        <Route path="security" element={<SecurityAlertsDashboard />} />
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
        <Route path="enterprise" element={<EnterpriseDashboard />} />
        <Route path="operators" element={<OperatorManagement />} />
        <Route path="agents" element={<AgentManagement />} />
        <Route path="drivers" element={<DriverManagement />} />
        <Route path="fleet" element={<AdminFleetManagement />} />
        <Route path="routes" element={<AdminRouteManagement />} />
        <Route path="trips" element={<TripManagement />} />
        <Route path="bookings" element={<BookingManagement />} />
        <Route path="payments" element={<PaymentMonitoring />} />
        <Route path="settlements" element={<SettlementManagement />} />
        <Route path="sms" element={<SMSLogs />} />
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
