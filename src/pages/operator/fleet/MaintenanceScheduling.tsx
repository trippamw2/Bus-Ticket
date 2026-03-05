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
import { Loader2, Wrench, Calendar, Bus, DollarSign, Clock, AlertTriangle, CheckCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Bus {
  id: string;
  plate_number: string;
}

interface MaintenanceLog {
  id: string;
  bus_id: string;
  maintenance_type: string;
  description: string | null;
  cost: number | null;
  performed_date: string | null;
  next_due_date: string | null;
  status: string;
  created_at: string;
}

const MAINTENANCE_TYPES = [
  { value: 'routine', label: 'Routine Service' },
  { value: 'repair', label: 'Repair' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'tire_replacement', label: 'Tire Replacement' },
  { value: 'engine_service', label: 'Engine Service' },
  { value: 'brake_service', label: 'Brake Service' },
  { value: 'oil_change', label: 'Oil Change' },
  { value: 'other', label: 'Other' },
];

const MaintenanceScheduling = () => {
  const { operator } = useAuth();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState("");
  const [maintForm, setMaintForm] = useState({
    maintenance_type: "",
    description: "",
    cost: "",
    performed_date: "",
    next_due_date: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (operator) {
      fetchData();
    }
  }, [operator, operator?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get buses for this operator
      const { data: busesData } = await supabase
        .from("buses")
        .select("id, plate_number")
        .eq("operator_id", operator?.id);
      setBuses(busesData || []);

      const busIds = busesData?.map(b => b.id) || [];
      
      if (busIds.length > 0) {
        // Get maintenance logs
        const { data: maintData } = await supabase
          .from("maintenance_logs")
          .select("*")
          .in("bus_id", busIds)
          .order("next_due_date", { ascending: true });
        setMaintenanceLogs(maintData || []);
      } else {
        setMaintenanceLogs([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const getBusPlate = (busId: string) => {
    const bus = buses.find(b => b.id === busId);
    return bus?.plate_number || "Unknown";
  };

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const today = new Date();
    const days = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getDueStatus = (dueDate: string | null, performedDate: string | null) => {
    if (performedDate) return { status: "completed", label: "Completed", variant: "default" as const, color: "bg-green-50" };
    if (!dueDate) return { status: "scheduled", label: "Scheduled", variant: "secondary" as const, color: "" };
    
    const days = getDaysUntilDue(dueDate);
    if (days === null) return { status: "unknown", label: "Unknown", variant: "secondary" as const, color: "" };
    
    if (days < 0) return { status: "overdue", label: `${Math.abs(days)} days overdue`, variant: "destructive" as const, color: "bg-red-50" };
    if (days <= 7) return { status: "urgent", label: `${days} days - Urgent`, variant: "destructive" as const, color: "bg-red-50" };
    if (days <= 30) return { status: "upcoming", label: `${days} days`, variant: "outline" as const, color: "bg-amber-50" };
    return { status: "scheduled", label: `${days} days`, variant: "secondary" as const, color: "" };
  };

  const handleSaveMaintenance = async () => {
    if (!selectedBusId || !maintForm.maintenance_type) {
      toast.error("Please fill required fields");
      return;
    }

    setSaving(true);
    try {
      await supabase.from("maintenance_logs").insert({
        bus_id: selectedBusId,
        maintenance_type: maintForm.maintenance_type,
        description: maintForm.description || null,
        cost: maintForm.cost ? parseFloat(maintForm.cost) : null,
        performed_date: maintForm.performed_date || null,
        next_due_date: maintForm.next_due_date || null,
        status: maintForm.performed_date ? "completed" : "scheduled",
      });

      toast.success("Maintenance scheduled");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error("Failed to schedule maintenance");
    }
    setSaving(false);
  };

  const deleteMaintenance = async (maintId: string) => {
    if (!confirm("Delete this maintenance record?")) return;
    
    try {
      await supabase.from("maintenance_logs").delete().eq("id", maintId);
      toast.success("Maintenance record deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete record");
    }
  };

  const markAsCompleted = async (maintId: string) => {
    try {
      await supabase
        .from("maintenance_logs")
        .update({ status: "completed", performed_date: new Date().toISOString().split('T')[0] })
        .eq("id", maintId);
      toast.success("Marked as completed");
      fetchData();
    } catch (error) {
      toast.error("Failed to update");
    }
  };

  const resetForm = () => {
    setSelectedBusId("");
    setMaintForm({
      maintenance_type: "",
      description: "",
      cost: "",
      performed_date: "",
      next_due_date: "",
    });
  };

  // Calculate stats
  const completedLogs = maintenanceLogs.filter(l => l.status === "completed");
  const upcomingLogs = maintenanceLogs.filter(l => !l.performed_date && l.next_due_date);
  const overdueLogs = maintenanceLogs.filter(l => {
    const days = getDaysUntilDue(l.next_due_date);
    return days !== null && days < 0 && !l.performed_date;
  });
  const totalCost = completedLogs.reduce((sum, l) => sum + (l.cost || 0), 0);

  const getFilteredLogs = () => {
    switch (activeTab) {
      case "completed": return maintenanceLogs.filter(l => l.status === "completed");
      case "upcoming": return maintenanceLogs.filter(l => !l.performed_date);
      case "overdue": return maintenanceLogs.filter(l => {
        const days = getDaysUntilDue(l.next_due_date);
        return days !== null && days < 0 && !l.performed_date;
      });
      default: return maintenanceLogs;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Maintenance Scheduling
          </h1>
          <p className="text-sm text-muted-foreground">
            Schedule and track bus maintenance
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Maintenance
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{maintenanceLogs.length}</div>
          </CardContent>
        </Card>

        <Card className="border-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{overdueLogs.length}</div>
          </CardContent>
        </Card>

        <Card className="border-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{upcomingLogs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">MWK {totalCost.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcomingLogs.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdueLogs.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedLogs.length})</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === "upcoming" && "Upcoming Maintenance"}
                {activeTab === "overdue" && "Overdue Maintenance"}
                {activeTab === "completed" && "Completed Maintenance"}
                {activeTab === "all" && "All Maintenance Records"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : getFilteredLogs().length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No maintenance records found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bus</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Performed</TableHead>
                      <TableHead>Next Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredLogs().map((log) => {
                      const statusInfo = getDueStatus(log.next_due_date, log.performed_date);
                      return (
                        <TableRow key={log.id} className={statusInfo.color}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Bus className="h-4 w-4 text-muted-foreground" />
                              {getBusPlate(log.bus_id)}
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">
                            {MAINTENANCE_TYPES.find(t => t.value === log.maintenance_type)?.label || log.maintenance_type}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {log.description || "-"}
                          </TableCell>
                          <TableCell>
                            {log.cost ? `MWK ${log.cost.toLocaleString()}` : "-"}
                          </TableCell>
                          <TableCell>
                            {log.performed_date || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {log.next_due_date || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusInfo.variant}>
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {!log.performed_date && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsCompleted(log.id)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => deleteMaintenance(log.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Maintenance Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Maintenance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Bus</Label>
              <Select value={selectedBusId} onValueChange={setSelectedBusId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bus" />
                </SelectTrigger>
                <SelectContent>
                  {buses.map((bus) => (
                    <SelectItem key={bus.id} value={bus.id}>
                      {bus.plate_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Maintenance Type</Label>
              <Select value={maintForm.maintenance_type} onValueChange={(v) => setMaintForm({ ...maintForm, maintenance_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Description of work to be done"
                value={maintForm.description}
                onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Estimated Cost (MWK)</Label>
              <Input
                type="number"
                placeholder="0"
                value={maintForm.cost}
                onChange={(e) => setMaintForm({ ...maintForm, cost: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Performed Date</Label>
                <Input
                  type="date"
                  value={maintForm.performed_date}
                  onChange={(e) => setMaintForm({ ...maintForm, performed_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Next Due Date</Label>
                <Input
                  type="date"
                  value={maintForm.next_due_date}
                  onChange={(e) => setMaintForm({ ...maintForm, next_due_date: e.target.value })}
                />
              </div>
            </div>

            <Button
              onClick={handleSaveMaintenance}
              className="w-full"
              disabled={saving || !selectedBusId || !maintForm.maintenance_type}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule Maintenance
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaintenanceScheduling;
