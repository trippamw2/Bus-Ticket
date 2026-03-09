import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Bus, Edit, CheckCircle, Users, Filter, RefreshCw, AlertTriangle } from 'lucide-react';

interface BusData {
  id: string;
  plate_number: string;
  operator_id: string;
  capacity: number;
  status: string;
  created_at: string;
}

interface Operator {
  id: string;
  company_name: string;
  name: string;
  status: string;
}

const FleetManagement = () => {
  const [buses, setBuses] = useState<BusData[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [selectedBus, setSelectedBus] = useState<BusData | null>(null);
  const [editForm, setEditForm] = useState({ plate_number: '', capacity: '' });
  const [assignForm, setAssignForm] = useState({ operator_id: '' });

  useEffect(() => { fetchBuses(); fetchOperators(); }, []);

  const fetchBuses = async () => {
    const { data, error } = await supabase.from('buses').select('*').order('created_at', { ascending: false });
    if (!error) setBuses(data || []);
    setLoading(false);
  };

  const fetchOperators = async () => {
    const { data } = await supabase.from('operators').select('id, company_name, name, status').eq('status', 'approved');
    if (data) setOperators(data);
  };

  const getOperatorName = (operatorId: string | null) => {
    if (!operatorId) return 'Unassigned';
    const op = operators.find(o => o.id === operatorId);
    return op?.company_name || op?.name || 'Unknown';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-gray-500';
      case 'maintenance': return 'bg-yellow-500';
      case 'unsafe': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const openEditDialog = (bus: BusData) => {
    setSelectedBus(bus);
    setEditForm({ plate_number: bus.plate_number, capacity: bus.capacity?.toString() || '' });
    setEditDialogOpen(true);
  };

  const openAssignDialog = (bus: BusData) => {
    setSelectedBus(bus);
    setAssignForm({ operator_id: bus.operator_id || '' });
    setAssignDialogOpen(true);
  };

  const openDisableDialog = (bus: BusData) => {
    setSelectedBus(bus);
    setDisableDialogOpen(true);
  };

  const handleUpdateBus = async () => {
    if (!selectedBus || !editForm.plate_number.trim()) return;
    const capacity = parseInt(editForm.capacity);
    const { error } = await supabase.from('buses').update({
      plate_number: editForm.plate_number.trim().toUpperCase(),
      capacity: isNaN(capacity) ? 50 : capacity,
    }).eq('id', selectedBus.id);
    if (error) { toast.error('Failed to update bus'); } else { toast.success('Bus updated'); setEditDialogOpen(false); fetchBuses(); }
  };

  const handleAssignOperator = async () => {
    if (!selectedBus) return;
    const { error } = await supabase.from('buses').update({ operator_id: assignForm.operator_id || null }).eq('id', selectedBus.id);
    if (error) { toast.error('Failed to assign operator'); } else { toast.success('Operator assigned'); setAssignDialogOpen(false); fetchBuses(); }
  };

  const handleDisableBus = async () => {
    if (!selectedBus) return;
    const newStatus = selectedBus.status === 'unsafe' ? 'active' : 'unsafe';
    const { error } = await supabase.from('buses').update({ status: newStatus }).eq('id', selectedBus.id);
    if (error) { toast.error('Failed to update status'); } else { toast.success(`Bus marked as ${newStatus}`); setDisableDialogOpen(false); fetchBuses(); }
  };

  const filteredBuses = buses.filter(bus => {
    if (filter !== 'all' && bus.status !== filter) return false;
    if (operatorFilter !== 'all' && bus.operator_id !== operatorFilter) return false;
    return true;
  });

  const stats = {
    total: buses.length,
    active: buses.filter(b => b.status === 'active').length,
    unsafe: buses.filter(b => b.status === 'unsafe').length,
    unassigned: buses.filter(b => !b.operator_id).length,
    totalSeats: buses.reduce((sum, b) => sum + (b.capacity || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Fleet Management</h1><p className="text-muted-foreground">Manage all buses</p></div>
        <Button onClick={fetchBuses} variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Buses</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Active</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{stats.active}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Unsafe</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{stats.unsafe}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Unassigned</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-orange-600">{stats.unassigned}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Seats</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalSeats.toLocaleString()}</div></CardContent></Card>
      </div>

      <div className="flex gap-4 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Filters:</span>
        <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="unsafe">Unsafe</SelectItem></SelectContent></Select>
        <Select value={operatorFilter} onValueChange={setOperatorFilter}><SelectTrigger className="w-[200px]"><SelectValue placeholder="Operator" /></SelectTrigger><SelectContent><SelectItem value="all">All Operators</SelectItem>{operators.map(op => <SelectItem key={op.id} value={op.id}>{op.company_name || op.name}</SelectItem>)}</SelectContent></Select>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Bus className="h-5 w-5" />All Buses ({filteredBuses.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="flex items-center justify-center py-8"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div> :
          filteredBuses.length === 0 ? <div className="text-center py-8 text-muted-foreground">No buses found</div> :
          <Table>
            <TableHeader><TableRow><TableHead>Plate Number</TableHead><TableHead>Capacity</TableHead><TableHead>Operator</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredBuses.map(bus => (
                <TableRow key={bus.id}>
                  <TableCell className="font-medium">{bus.plate_number}</TableCell>
                  <TableCell>{bus.capacity} seats</TableCell>
                  <TableCell>{bus.operator_id ? <span className="text-sm">{getOperatorName(bus.operator_id)}</span> : <span className="text-muted-foreground text-sm">Unassigned</span>}</TableCell>
                  <TableCell><Badge className={`${getStatusColor(bus.status)} text-white`}>{bus.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(bus)} title="Edit"><Edit className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => openAssignDialog(bus)} title="Assign operator"><Users className="h-4 w-4" /></Button>
                      <Button variant={bus.status === 'unsafe' ? 'default' : 'outline'} size="sm" onClick={() => openDisableDialog(bus)} title={bus.status === 'unsafe' ? 'Mark safe' : 'Mark unsafe'} className={bus.status === 'unsafe' ? 'bg-green-600 hover:bg-green-700' : ''}>
                        {bus.status === 'unsafe' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Bus</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Plate Number</Label><Input value={editForm.plate_number} onChange={e => setEditForm({...editForm, plate_number: e.target.value})} /></div>
            <div><Label>Capacity</Label><Input type="number" value={editForm.capacity} onChange={e => setEditForm({...editForm, capacity: e.target.value})} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button><Button onClick={handleUpdateBus}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Operator</DialogTitle></DialogHeader>
          <Select value={assignForm.operator_id} onValueChange={v => setAssignForm({operator_id: v})}><SelectTrigger><SelectValue placeholder="Select operator" /></SelectTrigger><SelectContent>{operators.map(op => <SelectItem key={op.id} value={op.id}>{op.company_name || op.name}</SelectItem>)}</SelectContent></Select>
          <DialogFooter><Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button><Button onClick={handleAssignOperator}>Assign</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedBus?.status === 'unsafe' ? 'Mark Bus as Safe?' : 'Mark Bus as Unsafe?'}</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">{selectedBus?.status === 'unsafe' ? 'This will allow the bus to be used for trips again.' : 'This will prevent the bus from being used for trips.'}</p>
          <DialogFooter><Button variant="outline" onClick={() => setDisableDialogOpen(false)}>Cancel</Button><Button onClick={handleDisableBus} variant={selectedBus?.status === 'unsafe' ? 'default' : 'destructive'}>{selectedBus?.status === 'unsafe' ? 'Mark Safe' : 'Mark Unsafe'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FleetManagement;
