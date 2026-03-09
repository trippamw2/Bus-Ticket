import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wrench, Calendar, Bus, DollarSign, AlertTriangle, CheckCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface BusItem { id: string; plate_number: string; }
interface MaintenanceLog { id: string; bus_id: string; maintenance_type: string; description: string | null; cost: number | null; performed_date: string | null; next_due_date: string | null; status: string; }

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
  const [buses, setBuses] = useState<BusItem[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState("");
  const [maintForm, setMaintForm] = useState({ maintenance_type: "", description: "", cost: "", performed_date: "", next_due_date: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (operator) fetchData(); }, [operator, operator?.id]);

  const fetchData = async () => {
    setLoading(true);
    const { data: busesData } = await supabase.from("buses").select("id, plate_number").eq("operator_id", operator?.id);
    setBuses(busesData || []);
    const busIds = busesData?.map(b => b.id) || [];
    if (busIds.length > 0) {
      const { data } = await supabase.from("maintenance_logs").select("*").in("bus_id", busIds).order("next_due_date", { ascending: true });
      setMaintenanceLogs(data || []);
    } else { setMaintenanceLogs([]); }
    setLoading(false);
  };

  const getBusPlate = (id: string) => buses.find(b => b.id === id)?.plate_number || "Unknown";
  const getDaysUntilDue = (d: string | null) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / (1000*60*60*24)) : null;

  const getDueStatus = (dueDate: string | null, performed: string | null) => {
    if (performed) return { label: "Completed", variant: "default" as const, color: "bg-green-50" };
    const days = getDaysUntilDue(dueDate);
    if (days === null) return { label: "Scheduled", variant: "secondary" as const, color: "" };
    if (days < 0) return { label: `${Math.abs(days)}d overdue`, variant: "destructive" as const, color: "bg-red-50" };
    if (days <= 7) return { label: `${days}d - Urgent`, variant: "destructive" as const, color: "bg-red-50" };
    if (days <= 30) return { label: `${days}d`, variant: "outline" as const, color: "bg-amber-50" };
    return { label: `${days}d`, variant: "secondary" as const, color: "" };
  };

  const handleSaveMaintenance = async () => {
    if (!operator || !selectedBusId || !maintForm.maintenance_type) { toast.error("Fill required fields"); return; }
    setSaving(true);
    await supabase.from("maintenance_logs").insert({
      bus_id: selectedBusId, operator_id: operator.id,
      maintenance_type: maintForm.maintenance_type, description: maintForm.description || null,
      cost: maintForm.cost ? parseFloat(maintForm.cost) : null,
      performed_date: maintForm.performed_date || null, next_due_date: maintForm.next_due_date || null,
      status: maintForm.performed_date ? "completed" : "scheduled",
    });
    toast.success("Maintenance scheduled"); setDialogOpen(false);
    setSelectedBusId(""); setMaintForm({ maintenance_type: "", description: "", cost: "", performed_date: "", next_due_date: "" });
    fetchData(); setSaving(false);
  };

  const deleteMaintenance = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("maintenance_logs").delete().eq("id", id);
    toast.success("Deleted"); fetchData();
  };

  const markAsCompleted = async (id: string) => {
    await supabase.from("maintenance_logs").update({ status: "completed", performed_date: new Date().toISOString().split('T')[0] }).eq("id", id);
    toast.success("Completed"); fetchData();
  };

  const completedLogs = maintenanceLogs.filter(l => l.status === "completed");
  const upcomingLogs = maintenanceLogs.filter(l => !l.performed_date && l.next_due_date);
  const overdueLogs = maintenanceLogs.filter(l => { const d = getDaysUntilDue(l.next_due_date); return d !== null && d < 0 && !l.performed_date; });
  const totalCost = completedLogs.reduce((s, l) => s + (l.cost || 0), 0);

  const getFiltered = () => {
    switch (activeTab) { case "completed": return completedLogs; case "upcoming": return upcomingLogs; case "overdue": return overdueLogs; default: return maintenanceLogs; }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="h-6 w-6" />Maintenance Scheduling</h1></div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Schedule</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{maintenanceLogs.length}</div></CardContent></Card>
        <Card className="border-red-500"><CardHeader className="pb-2"><CardTitle className="text-sm text-red-600 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Overdue</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-red-600">{overdueLogs.length}</div></CardContent></Card>
        <Card className="border-amber-500"><CardHeader className="pb-2"><CardTitle className="text-sm text-amber-600 flex items-center gap-2"><Calendar className="h-4 w-4" />Upcoming</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-amber-600">{upcomingLogs.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4 text-green-500" />Spent</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">MWK {totalCost.toLocaleString()}</div></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcomingLogs.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdueLogs.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedLogs.length})</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab}>
          <Card>
            <CardContent className="pt-6">
              {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div> :
              getFiltered().length === 0 ? <div className="text-center py-8 text-muted-foreground">No records</div> :
              <Table>
                <TableHeader><TableRow><TableHead>Bus</TableHead><TableHead>Type</TableHead><TableHead>Cost</TableHead><TableHead>Performed</TableHead><TableHead>Next Due</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {getFiltered().map(log => {
                    const status = getDueStatus(log.next_due_date, log.performed_date);
                    return (
                    <TableRow key={log.id} className={status.color}>
                      <TableCell className="font-medium"><div className="flex items-center gap-2"><Bus className="h-4 w-4 text-muted-foreground" />{getBusPlate(log.bus_id)}</div></TableCell>
                      <TableCell className="capitalize">{MAINTENANCE_TYPES.find(t => t.value === log.maintenance_type)?.label || log.maintenance_type}</TableCell>
                      <TableCell>{log.cost ? `MWK ${log.cost.toLocaleString()}` : "-"}</TableCell>
                      <TableCell>{log.performed_date || "-"}</TableCell>
                      <TableCell><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />{log.next_due_date || "-"}</div></TableCell>
                      <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!log.performed_date && <Button variant="ghost" size="sm" onClick={() => markAsCompleted(log.id)}><CheckCircle className="h-4 w-4" /></Button>}
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMaintenance(log.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>);
                  })}
                </TableBody>
              </Table>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Maintenance</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Bus</Label><Select value={selectedBusId} onValueChange={setSelectedBusId}><SelectTrigger><SelectValue placeholder="Select bus" /></SelectTrigger><SelectContent>{buses.map(b => <SelectItem key={b.id} value={b.id}>{b.plate_number}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Type</Label><Select value={maintForm.maintenance_type} onValueChange={v => setMaintForm({...maintForm, maintenance_type: v})}><SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger><SelectContent>{MAINTENANCE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
            <Input placeholder="Description" value={maintForm.description} onChange={e => setMaintForm({...maintForm, description: e.target.value})} />
            <Input type="number" placeholder="Cost (MWK)" value={maintForm.cost} onChange={e => setMaintForm({...maintForm, cost: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Performed</Label><Input type="date" value={maintForm.performed_date} onChange={e => setMaintForm({...maintForm, performed_date: e.target.value})} /></div>
              <div><Label>Next Due</Label><Input type="date" value={maintForm.next_due_date} onChange={e => setMaintForm({...maintForm, next_due_date: e.target.value})} /></div>
            </div>
            <Button onClick={handleSaveMaintenance} className="w-full" disabled={saving || !selectedBusId || !maintForm.maintenance_type}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Schedule</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaintenanceScheduling;
