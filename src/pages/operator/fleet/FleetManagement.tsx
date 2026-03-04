import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Ban, CheckCircle, Loader2, Bus, Trash2, FileText, Wrench, User, AlertTriangle } from "lucide-react";

interface Bus {
  id: string;
  plate_number: string;
  capacity: number;
  status: string;
}

interface Driver {
  id: string;
  full_name: string;
  phone: string;
  license_number: string | null;
  license_expiry: string | null;
  status: string;
}

interface BusDocument {
  id: string;
  bus_id: string;
  document_type: string;
  document_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  status: string;
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
}

const DOCUMENT_TYPES = [
  { value: 'insurance', label: 'Insurance' },
  { value: 'road_permit', label: 'Road Permit' },
  { value: 'fitness_certificate', label: 'Fitness Certificate' },
  { value: 'registration', label: 'Registration' },
  { value: 'other', label: 'Other' },
];

const MAINTENANCE_TYPES = [
  { value: 'routine', label: 'Routine Service' },
  { value: 'repair', label: 'Repair' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'tire_replacement', label: 'Tire Replacement' },
  { value: 'engine_service', label: 'Engine Service' },
  { value: 'brake_service', label: 'Brake Service' },
  { value: 'other', label: 'Other' },
];

const FleetManagement = () => {
  const { operator } = useAuth();
  const [activeTab, setActiveTab] = useState('buses');
  
  // Buses state
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBus, setEditBus] = useState<Bus | null>(null);
  const [plate, setPlate] = useState("");
  const [capacity, setCapacity] = useState("");
  const [saving, setSaving] = useState(false);

  // Drivers state
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [driverForm, setDriverForm] = useState({ full_name: '', phone: '', license_number: '', license_expiry: '' });

  // Documents state
  const [documents, setDocuments] = useState<BusDocument[]>([]);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [selectedBusForDoc, setSelectedBusForDoc] = useState<string>('');
  const [docForm, setDocForm] = useState({ document_type: '', document_number: '', issue_date: '', expiry_date: '' });

  // Maintenance state
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [selectedBusForMaint, setSelectedBusForMaint] = useState<string>('');
  const [maintForm, setMaintForm] = useState({ maintenance_type: '', description: '', cost: '', performed_date: '', next_due_date: '' });

  useEffect(() => {
    if (operator) {
      fetchBuses();
      fetchDrivers();
      fetchDocuments();
      fetchMaintenanceLogs();
    }
  }, [operator]);

  const fetchBuses = async () => {
    if (!operator) return;
    const { data, error } = await supabase
      .from("buses")
      .select("*")
      .eq("operator_id", operator.id)
      .order("created_at", { ascending: false });
    if (!error) setBuses(data || []);
    setLoading(false);
  };

  const fetchDrivers = async () => {
    if (!operator) return;
    const { data } = await supabase
      .from("drivers")
      .select("*")
      .eq("operator_id", operator.id)
      .order("created_at", { ascending: false });
    setDrivers(data || []);
  };

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from("bus_documents")
      .select("*")
      .order("created_at", { ascending: false });
    setDocuments(data || []);
  };

  const fetchMaintenanceLogs = async () => {
    const { data } = await supabase
      .from("maintenance_logs")
      .select("*")
      .order("performed_date", { ascending: false });
    setMaintenanceLogs(data || []);
  };

  // Bus operations
  const openAddBus = () => { setEditBus(null); setPlate(""); setCapacity(""); setDialogOpen(true); };
  const openEditBus = (bus: Bus) => { setEditBus(bus); setPlate(bus.plate_number); setCapacity(String(bus.capacity)); setDialogOpen(true); };
  
  const handleSaveBus = async () => {
    if (!operator || !plate.trim() || !capacity.trim()) return;
    const cap = Number(capacity);
    setSaving(true);
    try {
      if (editBus) {
        await supabase.from("buses").update({ plate_number: plate.trim().toUpperCase(), capacity: cap }).eq("id", editBus.id);
        toast.success("Bus updated");
      } else {
        await supabase.from("buses").insert({ plate_number: plate.trim().toUpperCase(), capacity: cap, operator_id: operator.id });
        toast.success("Bus added");
      }
    } catch (e) { toast.error("Failed to save bus"); }
    setSaving(false); setDialogOpen(false); fetchBuses();
  };

  const toggleBusStatus = async (bus: Bus) => {
    const newStatus = bus.status === "active" ? "disabled" : "active";
    await supabase.from("buses").update({ status: newStatus }).eq("id", bus.id);
    toast.success(`Bus ${newStatus === "active" ? "activated" : "disabled"}`);
    fetchBuses();
  };

  const deleteBus = async (bus: Bus) => {
    if (!confirm(`Delete bus ${bus.plate_number}?`)) return;
    await supabase.from("buses").delete().eq("id", bus.id);
    toast.success("Bus deleted");
    fetchBuses();
  };

  // Driver operations
  const openAddDriver = () => { setEditDriver(null); setDriverForm({ full_name: '', phone: '', license_number: '', license_expiry: '' }); setDriverDialogOpen(true); };
  const openEditDriver = (driver: Driver) => { setEditDriver(driver); setDriverForm({ full_name: driver.full_name, phone: driver.phone, license_number: driver.license_number || '', license_expiry: driver.license_expiry || '' }); setDriverDialogOpen(true); };
  
  const handleSaveDriver = async () => {
    if (!operator || !driverForm.full_name.trim() || !driverForm.phone.trim()) return;
    try {
      if (editDriver) {
        await supabase.from("drivers").update({ full_name: driverForm.full_name, phone: driverForm.phone, license_number: driverForm.license_number || null, license_expiry: driverForm.license_expiry || null }).eq("id", editDriver.id);
        toast.success("Driver updated");
      } else {
        await supabase.from("drivers").insert({ operator_id: operator.id, full_name: driverForm.full_name, phone: driverForm.phone, license_number: driverForm.license_number || null, license_expiry: driverForm.license_expiry || null });
        toast.success("Driver added");
      }
    } catch (e) { toast.error("Failed to save driver"); }
    setDriverDialogOpen(false); fetchDrivers();
  };

  const toggleDriverStatus = async (driver: Driver) => {
    const newStatus = driver.status === "active" ? "inactive" : "active";
    await supabase.from("drivers").update({ status: newStatus }).eq("id", driver.id);
    fetchDrivers();
  };

  // Document operations
  const openAddDoc = (busId?: string) => { setSelectedBusForDoc(busId || ''); setDocForm({ document_type: '', document_number: '', issue_date: '', expiry_date: '' }); setDocumentDialogOpen(true); };
  
  const handleSaveDoc = async () => {
    if (!selectedBusForDoc || !docForm.document_type) return;
    try {
      await supabase.from("bus_documents").insert({ bus_id: selectedBusForDoc, document_type: docForm.document_type, document_number: docForm.document_number || null, issue_date: docForm.issue_date || null, expiry_date: docForm.expiry_date || null });
      toast.success("Document added");
    } catch (e) { toast.error("Failed to save document"); }
    setDocumentDialogOpen(false); fetchDocuments();
  };

  // Maintenance operations
  const openAddMaint = (busId?: string) => { setSelectedBusForMaint(busId || ''); setMaintForm({ maintenance_type: '', description: '', cost: '', performed_date: '', next_due_date: '' }); setMaintenanceDialogOpen(true); };
  
  const handleSaveMaint = async () => {
    if (!selectedBusForMaint || !maintForm.maintenance_type) return;
    try {
      await supabase.from("maintenance_logs").insert({ bus_id: selectedBusForMaint, maintenance_type: maintForm.maintenance_type, description: maintForm.description || null, cost: maintForm.cost ? Number(maintForm.cost) : null, performed_date: maintForm.performed_date || null, next_due_date: maintForm.next_due_date || null });
      toast.success("Maintenance log added");
    } catch (e) { toast.error("Failed to save log"); }
    setMaintenanceDialogOpen(false); fetchMaintenanceLogs();
  };

  const getStatusBadge = (status: string, type: 'success' | 'warning' | 'destructive' | 'default' = 'default') => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default', inactive: 'secondary', disabled: 'secondary',
      pending: 'secondary', expired: 'destructive', expiring: 'warning' as any,
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const expDate = new Date(date);
    const today = new Date();
    const daysUntil = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fleet Management</h1>
          <p className="text-sm text-muted-foreground">Manage your buses, drivers, documents, and maintenance</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="buses">Buses ({buses.length})</TabsTrigger>
          <TabsTrigger value="drivers">Drivers ({drivers.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        {/* Buses Tab */}
        <TabsContent value="buses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Bus className="h-5 w-5" /> Your Fleet</CardTitle>
              <Button onClick={openAddBus}><Plus className="mr-2 h-4 w-4" />Add Bus</Button>
            </CardHeader>
            <CardContent>
              {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div> :
              buses.length === 0 ? <div className="text-center py-8 text-muted-foreground">No buses registered</div> :
              <Table>
                <TableHeader><TableRow><TableHead>Plate</TableHead><TableHead>Capacity</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {buses.map(bus => (
                    <TableRow key={bus.id}>
                      <TableCell className="font-mono font-medium">{bus.plate_number}</TableCell>
                      <TableCell>{bus.capacity} seats</TableCell>
                      <TableCell>{getStatusBadge(bus.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditBus(bus)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => toggleBusStatus(bus)}>{bus.status === "active" ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}</Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteBus(bus)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drivers Tab */}
        <TabsContent value="drivers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Drivers</CardTitle>
              <Button onClick={openAddDriver}><Plus className="mr-2 h-4 w-4" />Add Driver</Button>
            </CardHeader>
            <CardContent>
              {drivers.length === 0 ? <div className="text-center py-8 text-muted-foreground">No drivers registered</div> :
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>License</TableHead><TableHead>Expiry</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {drivers.map(driver => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">{driver.full_name}</TableCell>
                      <TableCell>{driver.phone}</TableCell>
                      <TableCell>{driver.license_number || '-'}</TableCell>
                      <TableCell>{driver.license_expiry ? (isExpiringSoon(driver.license_expiry) ? <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="h-4 w-4" />{driver.license_expiry}</span> : driver.license_expiry) : '-'}</TableCell>
                      <TableCell>{getStatusBadge(driver.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDriver(driver)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => toggleDriverStatus(driver)}>{driver.status === "active" ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Bus Documents</CardTitle>
              <Select onValueChange={(v) => openAddDoc(v)}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Add document to..." /></SelectTrigger>
                <SelectContent>{buses.map(b => <SelectItem key={b.id} value={b.id}>{b.plate_number}</SelectItem>)}</SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? <div className="text-center py-8 text-muted-foreground">No documents uploaded</div> :
              <Table>
                <TableHeader><TableRow><TableHead>Bus</TableHead><TableHead>Type</TableHead><TableHead>Number</TableHead><TableHead>Expiry</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {documents.map(doc => {
                    const bus = buses.find(b => b.id === doc.bus_id);
                    return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{bus?.plate_number || 'Unknown'}</TableCell>
                      <TableCell className="capitalize">{doc.document_type.replace('_', ' ')}</TableCell>
                      <TableCell>{doc.document_number || '-'}</TableCell>
                      <TableCell>{doc.expiry_date ? (isExpiringSoon(doc.expiry_date) ? <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="h-4 w-4" />{doc.expiry_date}</span> : doc.expiry_date) : '-'}</TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    </TableRow>);
                  })}
                </TableBody>
              </Table>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Maintenance Logs</CardTitle>
              <Select onValueChange={(v) => openAddMaint(v)}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Log for bus..." /></SelectTrigger>
                <SelectContent>{buses.map(b => <SelectItem key={b.id} value={b.id}>{b.plate_number}</SelectItem>)}</SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {maintenanceLogs.length === 0 ? <div className="text-center py-8 text-muted-foreground">No maintenance logs</div> :
              <Table>
                <TableHeader><TableRow><TableHead>Bus</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Cost</TableHead><TableHead>Date</TableHead><TableHead>Next Due</TableHead></TableRow></TableHeader>
                <TableBody>
                  {maintenanceLogs.map(log => {
                    const bus = buses.find(b => b.id === log.bus_id);
                    return (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{bus?.plate_number || 'Unknown'}</TableCell>
                      <TableCell className="capitalize">{log.maintenance_type.replace('_', ' ')}</TableCell>
                      <TableCell>{log.description || '-'}</TableCell>
                      <TableCell>{log.cost ? `MWK ${log.cost}` : '-'}</TableCell>
                      <TableCell>{log.performed_date || '-'}</TableCell>
                      <TableCell>{log.next_due_date || '-'}</TableCell>
                    </TableRow>);
                  })}
                </TableBody>
              </Table>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bus Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editBus ? "Edit Bus" : "Add New Bus"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Plate Number</Label><Input value={plate} onChange={e => setPlate(e.target.value)} placeholder="e.g. MJ 1234" /></div>
            <div className="space-y-2"><Label>Capacity</Label><Input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="e.g. 50" /></div>
            <Button onClick={handleSaveBus} className="w-full" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editBus ? "Update" : "Add"} Bus</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Driver Dialog */}
      <Dialog open={driverDialogOpen} onOpenChange={setDriverDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editDriver ? "Edit Driver" : "Add Driver"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Full Name</Label><Input value={driverForm.full_name} onChange={e => setDriverForm({...driverForm, full_name: e.target.value})} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={driverForm.phone} onChange={e => setDriverForm({...driverForm, phone: e.target.value})} /></div>
            <div className="space-y-2"><Label>License Number</Label><Input value={driverForm.license_number} onChange={e => setDriverForm({...driverForm, license_number: e.target.value})} /></div>
            <div className="space-y-2"><Label>License Expiry</Label><Input type="date" value={driverForm.license_expiry} onChange={e => setDriverForm({...driverForm, license_expiry: e.target.value})} /></div>
            <Button onClick={handleSaveDriver} className="w-full">{editDriver ? "Update" : "Add"} Driver</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Dialog */}
      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={selectedBusForDoc} onValueChange={setSelectedBusForDoc}>
              <SelectTrigger><SelectValue placeholder="Select bus" /></SelectTrigger>
              <SelectContent>{buses.map(b => <SelectItem key={b.id} value={b.id}>{b.plate_number}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={docForm.document_type} onValueChange={(v) => setDocForm({ ...docForm, document_type: v })}>
              <SelectTrigger><SelectValue placeholder="Document type" /></SelectTrigger>
              <SelectContent>{DOCUMENT_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Document number" value={docForm.document_number} onChange={e => setDocForm({...docForm, document_number: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Issue Date</Label><Input type="date" value={docForm.issue_date} onChange={e => setDocForm({...docForm, issue_date: e.target.value})} /></div>
              <div className="space-y-2"><Label>Expiry Date</Label><Input type="date" value={docForm.expiry_date} onChange={e => setDocForm({...docForm, expiry_date: e.target.value})} /></div>
            </div>
            <Button onClick={handleSaveDoc} className="w-full" disabled={!selectedBusForDoc || !docForm.document_type}>Add Document</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Maintenance Dialog */}
      <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Maintenance Log</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={selectedBusForMaint} onValueChange={setSelectedBusForMaint}>
              <SelectTrigger><SelectValue placeholder="Select bus" /></SelectTrigger>
              <SelectContent>{buses.map(b => <SelectItem key={b.id} value={b.id}>{b.plate_number}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={maintForm.maintenance_type} onValueChange={(v) => setMaintForm({ ...maintForm, maintenance_type: v })}>
              <SelectTrigger><SelectValue placeholder="Maintenance type" /></SelectTrigger>
              <SelectContent>{MAINTENANCE_TYPES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Description" value={maintForm.description} onChange={e => setMaintForm({...maintForm, description: e.target.value})} />
            <Input type="number" placeholder="Cost (MWK)" value={maintForm.cost} onChange={e => setMaintForm({...maintForm, cost: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Performed Date</Label><Input type="date" value={maintForm.performed_date} onChange={e => setMaintForm({...maintForm, performed_date: e.target.value})} /></div>
              <div className="space-y-2"><Label>Next Due Date</Label><Input type="date" value={maintForm.next_due_date} onChange={e => setMaintForm({...maintForm, next_due_date: e.target.value})} /></div>
            </div>
            <Button onClick={handleSaveMaint} className="w-full" disabled={!selectedBusForMaint || !maintForm.maintenance_type}>Add Log</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FleetManagement;
