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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Users, Check, X, Edit, Percent, Bus, Calendar, DollarSign, 
  Phone, Mail, MapPin, Building2, FileText, Eye, Save
} from 'lucide-react';

interface Operator {
  id: string;
  name: string;
  phone: string;
  company_name: string;
  company_address: string;
  company_reg_number: string;
  contact_email: string;
  commission_percent: number;
  status: string;
  created_at: string;
}

interface Bus {
  id: string;
  plate_number: string;
  capacity: number;
  status: string;
}

interface Trip {
  id: string;
  departure_time: string;
  status: string;
  route_id: string;
}

interface Route {
  id: string;
  origin: string;
  destination: string;
}

interface RevenueData {
  total_bookings: number;
  total_revenue: number;
  commission: number;
}
const OperatorManagement = () => {
  const [operators, setOperators] = useState<Operator[]>([]);

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  
  // Dialogs
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  // Selected operator
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  
  // Forms
  const [commission, setCommission] = useState('');
  const [editForm, setEditForm] = useState({
    company_name: '',
    company_address: '',
    company_reg_number: '',
    contact_email: '',
    phone: '',
    name: ''
  });
  
  // Detail data
  const [operatorBuses, setOperatorBuses] = useState<Bus[]>([]);
  const [operatorTrips, setOperatorTrips] = useState<Trip[]>([]);
  const [operatorRoutes, setOperatorRoutes] = useState<Route[]>([]);
  const [operatorRevenue, setOperatorRevenue] = useState<RevenueData>({
    total_bookings: 0,
    total_revenue: 0,
    commission: 0
  });
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    const { data, error } = await supabase
      .from('operators')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch operators');
    } else {
      setOperators(data || []);
    }
    setLoading(false);
  };

  const updateStatus = async (operatorId: string, newStatus: 'approved' | 'suspended') => {
    const { error } = await supabase
      .from('operators')
      .update({ status: newStatus })
      .eq('id', operatorId);

    if (error) {
      toast.error(`Failed to ${newStatus} operator`);
    } else {
      toast.success(`Operator ${newStatus} successfully`);
      await logAudit('operator_status_change', operatorId, { status: newStatus });
      fetchOperators();
    }
  };

  const updateCommission = async () => {
    if (!selectedOperator || !commission) return;

    const commissionNum = parseFloat(commission);
    if (isNaN(commissionNum) || commissionNum < 0 || commissionNum > 100) {
      toast.error('Invalid commission percentage');
      return;
    }

    const { error } = await supabase
      .from('operators')
      .update({ commission_percent: commissionNum })
      .eq('id', selectedOperator.id);

    if (error) {
      toast.error('Failed to update commission');
    } else {
      toast.success('Commission updated successfully');
      await logAudit('commission_update', selectedOperator.id, { commission: commissionNum });
      setCommissionDialogOpen(false);
      fetchOperators();
    }
  };

  const saveOperatorDetails = async () => {
    if (!selectedOperator) return;

    const { error } = await supabase
      .from('operators')
      .update({
        company_name: editForm.company_name,
        company_address: editForm.company_address,
        company_reg_number: editForm.company_reg_number,
        contact_email: editForm.contact_email,
        phone: editForm.phone,
        name: editForm.name
      })
      .eq('id', selectedOperator.id);

    if (error) {
      toast.error('Failed to update operator');
    } else {
      toast.success('Operator details updated successfully');
      await logAudit('operator_update', selectedOperator.id, editForm);
      setEditDialogOpen(false);
      fetchOperators();
    }
  };

  const openEditDialog = (operator: Operator) => {
    setSelectedOperator(operator);
    setEditForm({
      company_name: operator.company_name || '',
      company_address: operator.company_address || '',
      company_reg_number: operator.company_reg_number || '',
      contact_email: operator.contact_email || '',
      phone: operator.phone || '',
      name: operator.name || ''
    });
    setEditDialogOpen(true);
  };

  const openCommissionDialog = (operator: Operator) => {
    setSelectedOperator(operator);
    setCommission(operator.commission_percent?.toString() || '10');
    setCommissionDialogOpen(true);
  };

  const openDetailDialog = async (operator: Operator) => {
    setSelectedOperator(operator);
    setDetailDialogOpen(true);
    setDetailLoading(true);

    try {
      // Fetch buses
      const { data: buses } = await supabase
        .from('buses')
        .select('id, plate_number, capacity, status')
        .eq('operator_id', operator.id);
      setOperatorBuses(buses || []);

      // Fetch trips
      const { data: trips } = await supabase
        .from('trips')
        .select('id, departure_time, status, route_id')
        .eq('operator_id', operator.id)
        .order('departure_time', { ascending: false })
        .limit(20);
      setOperatorTrips(trips || []);

      // Fetch routes
      const { data: routes } = await supabase
        .from('routes')
        .select('id, origin, destination')
        .eq('operator_id', operator.id);
      setOperatorRoutes(routes || []);

      // Calculate revenue
      const tripIds = trips?.map(t => t.id) || [];
      if (tripIds.length > 0) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('amount, status')
          .in('trip_id', tripIds)
          .eq('status', 'paid');

        const totalRevenue = (bookings || []).reduce((sum, b) => sum + (b.amount || 0), 0);
        const commission = totalRevenue * ((operator.commission_percent || 10) / 100);
        
        setOperatorRevenue({
          total_bookings: (bookings || []).length,
          total_revenue: totalRevenue,
          commission: commission
        });
      } else {
        setOperatorRevenue({ total_bookings: 0, total_revenue: 0, commission: 0 });
      }
    } catch (error) {
      console.error('Error loading operator details:', error);
    }
    setDetailLoading(false);
  };

  const logAudit = async (action: string, resourceId: string, metadata: Record<string, unknown>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('audit_logs').insert({
        action,
        admin_id: user.id,
        entity_type: 'operator',
        entity_id: resourceId,
        details: metadata
      } as any);
    }
  };

  const filteredOperators = operators.filter(op => {
    if (filter === 'all') return true;
    return op.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500">Suspended</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Operator Management</h1>
          <p className="text-gray-500">Approve, suspend, and manage operators</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{operators.length}</p>
              <p className="text-gray-500">Total Operators</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {operators.filter(o => o.status === 'approved').length}
              </p>
              <p className="text-gray-500">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">
                {operators.filter(o => o.status === 'pending').length}
              </p>
              <p className="text-gray-500">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">
                {operators.filter(o => o.status === 'suspended').length}
              </p>
              <p className="text-gray-500">Suspended</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All ({operators.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({operators.filter(o => o.status === 'approved').length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({operators.filter(o => o.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="suspended">Suspended ({operators.filter(o => o.status === 'suspended').length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Operators Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Operators
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOperators.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No operators found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOperators.map((operator) => (
                  <TableRow key={operator.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{operator.company_name || operator.name}</p>
                        {operator.company_reg_number && (
                          <p className="text-sm text-gray-500">{operator.company_reg_number}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{operator.contact_email || '-'}</TableCell>
                    <TableCell>{operator.phone || '-'}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openCommissionDialog(operator)}
                        className="flex items-center gap-1"
                      >
                        <Percent className="h-3 w-3" />
                        {operator.commission_percent || 10}%
                      </Button>
                    </TableCell>
                    <TableCell>{getStatusBadge(operator.status)}</TableCell>
                    <TableCell>{new Date(operator.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDetailDialog(operator)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(operator)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {operator.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-500 hover:text-green-700"
                              onClick={() => updateStatus(operator.id, 'approved')}
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => updateStatus(operator.id, 'suspended')}
                              title="Reject"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {operator.status === 'approved' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => updateStatus(operator.id, 'suspended')}
                            title="Suspend"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {operator.status === 'suspended' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-500 hover:text-green-700"
                            onClick={() => updateStatus(operator.id, 'approved')}
                            title="Reactivate"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Commission Dialog */}
      <Dialog open={commissionDialogOpen} onOpenChange={setCommissionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Commission for {selectedOperator?.company_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Commission Percentage (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
              />
              <p className="text-sm text-gray-500">
                Current: {selectedOperator?.commission_percent || 10}%
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommissionDialogOpen(false)}>Cancel</Button>
            <Button onClick={updateCommission}>Update Commission</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Operator Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={editForm.company_name}
                onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.contact_email}
                onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Registration Number</Label>
              <Input
                value={editForm.company_reg_number}
                onChange={(e) => setEditForm({ ...editForm, company_reg_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={editForm.company_address}
                onChange={(e) => setEditForm({ ...editForm, company_address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveOperatorDetails}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedOperator?.company_name || selectedOperator?.name} - Details
            </DialogTitle>
          </DialogHeader>
          
          {detailLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Revenue Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      Total Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">MWK {operatorRevenue.total_revenue.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      Total Bookings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{operatorRevenue.total_bookings}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Percent className="h-4 w-4 text-purple-500" />
                      Commission ({(selectedOperator?.commission_percent || 10)}%)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">MWK {operatorRevenue.commission.toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>{selectedOperator?.phone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>{selectedOperator?.contact_email || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{selectedOperator?.company_address || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span>{selectedOperator?.company_reg_number || '-'}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(selectedOperator?.status || '')}
                      <span className="text-sm text-gray-500">
                        Joined: {selectedOperator?.created_at ? new Date(selectedOperator.created_at).toLocaleDateString() : '-'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Fleet */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bus className="h-4 w-4" />
                    Fleet ({operatorBuses.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {operatorBuses.length === 0 ? (
                    <p className="text-gray-500 text-sm">No buses registered</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plate</TableHead>
                          <TableHead>Capacity</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {operatorBuses.map(bus => (
                          <TableRow key={bus.id}>
                            <TableCell className="font-mono">{bus.plate_number}</TableCell>
                            <TableCell>{bus.capacity} seats</TableCell>
                            <TableCell>
                              <Badge variant={bus.status === 'active' ? 'default' : 'secondary'}>
                                {bus.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Routes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    Routes ({operatorRoutes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {operatorRoutes.length === 0 ? (
                    <p className="text-gray-500 text-sm">No routes</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {operatorRoutes.map(route => (
                        <Badge key={route.id} variant="outline">
                          {route.origin} → {route.destination}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Trips */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Recent Trips ({operatorTrips.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {operatorTrips.length === 0 ? (
                    <p className="text-gray-500 text-sm">No trips</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date/Time</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {operatorTrips.slice(0, 10).map(trip => (
                          <TableRow key={trip.id}>
                            <TableCell>
                              {new Date(trip.departure_time).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={trip.status === 'active' ? 'default' : 'secondary'}>
                                {trip.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OperatorManagement;
