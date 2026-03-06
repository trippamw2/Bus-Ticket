import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Bus, Check, X, Edit, Ban, CheckCircle, 
  Users, Filter, RefreshCw, AlertTriangle
} from 'lucide-react';

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

const BUS_TYPES = [
  { value: 'standard', label: 'Standard' },
  { value: 'mini', label: 'Mini Bus' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'coach', label: 'Coach' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'bg-green-500' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-500' },
  { value: 'maintenance', label: 'Maintenance', color: 'bg-yellow-500' },
  { value: 'unsafe', label: 'Unsafe', color: 'bg-red-500' },
];

const FleetManagement = () => {
  const [buses, setBuses] = useState<BusData[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  
  // Dialogs
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  
  // Selected bus
  const [selectedBus, setSelectedBus] = useState<BusData | null>(null);
  
  // Forms
  const [editForm, setEditForm] = useState({
    plate_number: '',
    bus_type: 'standard',
    seat_count: '',
    capacity: '',
  });
  
  const [assignForm, setAssignForm] = useState({
    operator_id: '',
  });

  useEffect(() => {
    fetchBuses();
    fetchOperators();
  }, []);

  const fetchBuses = async () => {
    const { data, error } = await supabase
      .from('buses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch buses');
    } else {
      setBuses(data || []);
    }
    setLoading(false);
  };

  const fetchOperators = async () => {
    const { data, error } = await supabase
      .from('operators')
      .select('id, company_name, name, status')
      .eq('status', 'approved')
      .order('company_name', { ascending: true });

    if (!error) {
      setOperators(data || []);
    }
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'maintenance': return 'Maintenance';
      case 'unsafe': return 'Unsafe';
      default: return status;
    }
  };

  const openEditDialog = (bus: Bus) => {
    setSelectedBus(bus);
    setEditForm({
      plate_number: bus.plate_number,
      bus_type: bus.bus_type || 'standard',
      seat_count: bus.seat_count?.toString() || bus.capacity?.toString() || '',
      capacity: bus.capacity?.toString() || '',
    });
    setEditDialogOpen(true);
  };

  const openAssignDialog = (bus: Bus) => {
    setSelectedBus(bus);
    setAssignForm({
      operator_id: bus.operator_id || '',
    });
    setAssignDialogOpen(true);
  };

  const openDisableDialog = (bus: Bus) => {
    setSelectedBus(bus);
    setDisableDialogOpen(true);
  };

  const handleUpdateBus = async () => {
    if (!selectedBus) return;
    
    const seatCount = parseInt(editForm.seat_count);
    const capacity = parseInt(editForm.capacity);
    
    if (!editForm.plate_number.trim()) {
      toast.error('Plate number is required');
      return;
    }
    
    if (isNaN(seatCount) || seatCount < 1) {
      toast.error('Invalid seat count');
      return;
    }

    const { error } = await supabase
      .from('buses')
      .update({
        plate_number: editForm.plate_number.trim().toUpperCase(),
        bus_type: editForm.bus_type,
        seat_count: seatCount,
        capacity: isNaN(capacity) ? seatCount : capacity,
      })
      .eq('id', selectedBus.id);

    if (error) {
      toast.error('Failed to update bus');
    } else {
      toast.success('Bus updated successfully');
      await logAudit('bus_updated', selectedBus.id, { plate_number: editForm.plate_number });
      setEditDialogOpen(false);
      fetchBuses();
    }
  };

  const handleAssignOperator = async () => {
    if (!selectedBus) return;

    const { error } = await supabase
      .from('buses')
      .update({
        operator_id: assignForm.operator_id || null,
      })
      .eq('id', selectedBus.id);

    if (error) {
      toast.error('Failed to assign operator');
    } else {
      toast.success('Operator assigned successfully');
      await logAudit('bus_operator_assigned', selectedBus.id, { operator_id: assignForm.operator_id });
      setAssignDialogOpen(false);
      fetchBuses();
    }
  };

  const handleDisableBus = async () => {
    if (!selectedBus) return;

    const newStatus = selectedBus.status === 'unsafe' ? 'active' : 'unsafe';
    
    const { error } = await supabase
      .from('buses')
      .update({ status: newStatus })
      .eq('id', selectedBus.id);

    if (error) {
      toast.error('Failed to update bus status');
    } else {
      toast.success(newStatus === 'unsafe' ? 'Bus marked as unsafe' : 'Bus marked as safe');
      await logAudit('bus_status_changed', selectedBus.id, { status: newStatus });
      setDisableDialogOpen(false);
      fetchBuses();
    }
  };

  const logAudit = async (action: string, targetId: string, details: any) => {
    await supabase.from('audit_logs').insert({
      action,
      target_type: 'bus',
      target_id: targetId,
      details,
      created_at: new Date().toISOString(),
    });
  };

  const filteredBuses = buses.filter(bus => {
    // Status filter
    if (filter !== 'all' && bus.status !== filter) return false;
    // Operator filter
    if (operatorFilter !== 'all' && bus.operator_id !== operatorFilter) return false;
    return true;
  });

  const stats = {
    total: buses.length,
    active: buses.filter(b => b.status === 'active').length,
    unsafe: buses.filter(b => b.status === 'unsafe').length,
    unassigned: buses.filter(b => !b.operator_id).length,
    totalSeats: buses.reduce((sum, b) => sum + (b.seat_count || b.capacity || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fleet Management</h1>
          <p className="text-muted-foreground">Manage all buses in the system</p>
        </div>
        <Button onClick={fetchBuses} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Buses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unsafe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.unsafe}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.unassigned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Seats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSeats.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="unsafe">Unsafe</SelectItem>
          </SelectContent>
        </Select>
        <Select value={operatorFilter} onValueChange={setOperatorFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Operator" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Operators</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {operators.map(op => (
              <SelectItem key={op.id} value={op.id}>
                {op.company_name || op.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Buses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bus className="h-5 w-5" />
            All Buses ({filteredBuses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBuses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No buses found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plate Number</TableHead>
                  <TableHead>Bus Type</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBuses.map(bus => (
                  <TableRow key={bus.id}>
                    <TableCell className="font-medium">{bus.plate_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {bus.bus_type || 'Standard'}
                      </Badge>
                    </TableCell>
                    <TableCell>{bus.seat_count || bus.capacity || '-'}</TableCell>
                    <TableCell>
                      {bus.operator_id ? (
                        <span className="text-sm">{getOperatorName(bus.operator_id)}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(bus.status)} text-white`}>
                        {getStatusLabel(bus.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(bus)}
                          title="Edit bus details"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAssignDialog(bus)}
                          title="Assign to operator"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={bus.status === 'unsafe' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => openDisableDialog(bus)}
                          title={bus.status === 'unsafe' ? 'Mark as safe' : 'Mark as unsafe'}
                          className={bus.status === 'unsafe' ? 'bg-green-600 hover:bg-green-700' : ''}
                        >
                          {bus.status === 'unsafe' ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <AlertTriangle className="h-4 w-4" />
                          )}
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

      {/* Edit Bus Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bus Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="plate_number">Plate Number</Label>
              <Input
                id="plate_number"
                value={editForm.plate_number}
                onChange={e => setEditForm({ ...editForm, plate_number: e.target.value })}
                placeholder="e.g., KB-1234"
              />
            </div>
            <div>
              <Label htmlFor="bus_type">Bus Type</Label>
              <Select 
                value={editForm.bus_type} 
                onValueChange={value => setEditForm({ ...editForm, bus_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUS_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="seat_count">Seat Count</Label>
              <Input
                id="seat_count"
                type="number"
                value={editForm.seat_count}
                onChange={e => setEditForm({ ...editForm, seat_count: e.target.value })}
                placeholder="Number of seats"
                min="1"
              />
            </div>
            <div>
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                value={editForm.capacity}
                onChange={e => setEditForm({ ...editForm, capacity: e.target.value })}
                placeholder="Physical capacity"
                min="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBus}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Operator Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Bus to Operator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="operator">Select Operator</Label>
              <Select 
                value={assignForm.operator_id} 
                onValueChange={value => setAssignForm({ ...assignForm, operator_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an operator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {operators.map(op => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.company_name || op.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedBus && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Bus:</strong> {selectedBus.plate_number}</p>
                <p className="text-sm"><strong>Current:</strong> {getOperatorName(selectedBus.operator_id)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignOperator}>
              Assign Operator
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable/Enable Bus Dialog */}
      <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedBus?.status === 'unsafe' ? 'Mark Bus as Safe' : 'Mark Bus as Unsafe'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedBus?.status === 'unsafe' ? (
              <p>This bus will be marked as safe and allowed to operate.</p>
            ) : (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Warning: Marking bus as unsafe</p>
                  <p className="text-sm text-red-600">
                    This will prevent the bus from being used for trips until it's marked as safe again.
                  </p>
                </div>
              </div>
            )}
            {selectedBus && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Bus:</strong> {selectedBus.plate_number}</p>
                <p className="text-sm"><strong>Current Status:</strong> {getStatusLabel(selectedBus.status)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDisableBus}
              variant={selectedBus?.status === 'unsafe' ? 'default' : 'destructive'}
            >
              {selectedBus?.status === 'unsafe' ? 'Mark as Safe' : 'Mark as Unsafe'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FleetManagement;
