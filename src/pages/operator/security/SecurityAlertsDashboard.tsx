import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShieldAlert, ShieldCheck, AlertTriangle, Clock, Info, CheckCircle, XCircle, Plus, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: string;
  description: string;
  resolved: boolean;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

const ALERT_TYPES = [
  { value: 'fraud', label: 'Fraud Detection' },
  { value: 'payment_failed', label: 'Payment Failed' },
  { value: 'multiple_bookings', label: 'Multiple Bookings' },
  { value: 'suspicious_activity', label: 'Suspicious Activity' },
  { value: 'unusual_location', label: 'Unusual Location' },
  { value: 'chargeback', label: 'Chargeback' },
  { value: 'api_abuse', label: 'API Abuse' },
  { value: 'other', label: 'Other' },
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-blue-500' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
];

const SecurityAlertsDashboard = () => {
  const { operator } = useAuth();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertForm, setAlertForm] = useState({
    alert_type: "",
    severity: "medium",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("security_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (!error) {
        setAlerts(data || []);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
    setLoading(false);
  };

  const handleCreateAlert = async () => {
    if (!alertForm.alert_type || !alertForm.description) {
      toast.error("Please fill required fields");
      return;
    }

    setSaving(true);
    try {
      await supabase.from("security_alerts").insert({
        alert_type: alertForm.alert_type,
        severity: alertForm.severity,
        description: alertForm.description,
        resolved: false,
      });

      toast.success("Alert created");
      setDialogOpen(false);
      setAlertForm({ alert_type: "", severity: "medium", description: "" });
      fetchAlerts();
    } catch (error) {
      toast.error("Failed to create alert");
    }
    setSaving(false);
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await supabase
        .from("security_alerts")
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq("id", alertId);
      toast.success("Alert resolved");
      fetchAlerts();
    } catch (error) {
      toast.error("Failed to resolve alert");
    }
  };

  const unresolveAlert = async (alertId: string) => {
    try {
      await supabase
        .from("security_alerts")
        .update({ resolved: false, resolved_at: null })
        .eq("id", alertId);
      toast.success("Alert marked as unresolved");
      fetchAlerts();
    } catch (error) {
      toast.error("Failed to update alert");
    }
  };

  const deleteAlert = async (alertId: string) => {
    if (!confirm("Delete this alert?")) return;
    
    try {
      await supabase.from("security_alerts").delete().eq("id", alertId);
      toast.success("Alert deleted");
      fetchAlerts();
    } catch (error) {
      toast.error("Failed to delete alert");
    }
  };

  const getSeverityBadge = (severity: string) => {
    const sev = SEVERITY_LEVELS.find(s => s.value === severity);
    return (
      <Badge className={sev?.color || "bg-gray-500"}>
        {sev?.label || severity}
      </Badge>
    );
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'fraud':
        return <ShieldAlert className="h-5 w-5 text-red-500" />;
      case 'payment_failed':
        return <XCircle className="h-5 w-5 text-orange-500" />;
      case 'suspicious_activity':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  // Calculate stats
  const activeAlerts = alerts.filter(a => !a.resolved);
  const resolvedAlerts = alerts.filter(a => a.resolved);
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
  const highAlerts = activeAlerts.filter(a => a.severity === 'high');

  const getFilteredAlerts = () => {
    switch (activeTab) {
      case "active": return activeAlerts;
      case "resolved": return resolvedAlerts;
      case "critical": return activeAlerts.filter(a => a.severity === 'critical');
      case "all": return alerts;
      default: return alerts;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6" />
            Security Alerts Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor and manage security alerts and suspicious activities
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Report Issue
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{alerts.length}</div>
          </CardContent>
        </Card>

        <Card className="border-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{criticalAlerts.length}</div>
          </CardContent>
        </Card>

        <Card className="border-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              High
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{highAlerts.length}</div>
          </CardContent>
        </Card>

        <Card className="border-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{resolvedAlerts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="critical">
            Critical ({criticalAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved ({resolvedAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>Security Alerts</CardTitle>
              <CardDescription>
                Active security alerts requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : getFilteredAlerts().length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No security alerts
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredAlerts().map((alert) => (
                      <TableRow key={alert.id} className={!alert.resolved ? "bg-red-50" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getAlertTypeIcon(alert.alert_type)}
                            <span className="capitalize">
                              {ALERT_TYPES.find(t => t.value === alert.alert_type)?.label || alert.alert_type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          {alert.description}
                        </TableCell>
                        <TableCell>
                          {getSeverityBadge(alert.severity)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {new Date(alert.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {alert.resolved ? (
                            <Badge className="bg-green-500">Resolved</Badge>
                          ) : (
                            <Badge variant="destructive">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!alert.resolved ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resolveAlert(alert.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Resolve
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => unresolveAlert(alert.id)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Reopen
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => deleteAlert(alert.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Alert Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Security Issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Alert Type</Label>
              <Select value={alertForm.alert_type} onValueChange={(v) => setAlertForm({ ...alertForm, alert_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={alertForm.severity} onValueChange={(v) => setAlertForm({ ...alertForm, severity: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_LEVELS.map((sev) => (
                    <SelectItem key={sev.value} value={sev.value}>
                      {sev.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Describe the security issue..."
                value={alertForm.description}
                onChange={(e) => setAlertForm({ ...alertForm, description: e.target.value })}
              />
            </div>

            <Button
              onClick={handleCreateAlert}
              className="w-full"
              disabled={saving || !alertForm.alert_type || !alertForm.description}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Alert
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SecurityAlertsDashboard;
