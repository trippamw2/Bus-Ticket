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
  Route, Plus, Edit, Ban, CheckCircle, 
  RefreshCw, Filter, MapPin, Clock, DollarSign, Gauge
} from 'lucide-react';

interface RouteData {
  id: string;
  operator_id: string;
  origin: string;
  destination: string;
  one_way_price: number;
  return_price: number;
  status: string;
  created_at: string;
}

interface Operator {
  id: string;
  company_name: string;
  name: string;
  status: string;
}

const MALAWI_CITIES = [
  "Blantyre", "Lilongwe", "Mzuzu", "Karonga", "Zomba", 
  "Mangochi", "Salima", "Nkhotakota", "Dedza", "Kasungu",
  "Mzomba", "Likuni", "Mzuzu", "Chitipa", "Rumphi",
  "Mzuzu", "Nkhata Bay", "Mchinji", "Dowa", "Ntcheu"
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'bg-green-500' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-500' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500' },
];

const RouteManagement = () => {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  
  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  
  // Selected route
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null);
  
  // Forms
  const [createForm, setCreateForm] = useState({
    origin: '',
    destination: '',
    distance_km: '',
    estimated_duration: '',
    base_price: '',
    one_way_price: '',
    return_price: '',
    operator_id: '',
  });
  
  const [editForm, setEditForm] = useState({
    origin: '',
    destination: '',
    distance_km: '',
    estimated_duration: '',
    base_price: '',
    one_way_price: '',
    return_price: '',
  });

  useEffect(() => {
    fetchRoutes();
    fetchOperators();
  }, []);

  const fetchRoutes = async () => {
    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch routes');
    } else {
      setRoutes(data || []);
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
    if (!operatorId) return 'All Operators';
    const op = operators.find(o => o.id === operatorId);
    return op?.company_name || op?.name || 'Unknown';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-gray-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-';
    return `MWK ${Number(amount).toLocaleString()}`;
  };

  const openCreateDialog = () => {
    setCreateForm({
      origin: '',
      destination: '',
      distance_km: '',
      estimated_duration: '',
      base_price: '',
      one_way_price: '',
      return_price: '',
      operator_id: '',
    });
    setCreateDialogOpen(true);
  };

  const openEditDialog = (route: RouteData) => {
    setSelectedRoute(route);
    setEditForm({
      origin: route.origin,
      destination: route.destination,
      distance_km: route.distance_km?.toString() || '',
      estimated_duration: route.estimated_duration || '',
      base_price: route.base_price?.toString() || '',
      one_way_price: route.one_way_price?.toString() || '',
      return_price: route.return_price?.toString() || '',
    });
    setEditDialogOpen(true);
  };

  const openStatusDialog = (route: RouteData) => {
    setSelectedRoute(route);
    setStatusDialogOpen(true);
  };

  const handleCreateRoute = async () => {
    if (!createForm.origin || !createForm.destination) {
      toast.error('Origin and destination are required');
      return;
    }

    const routeData = {
      origin: createForm.origin,
      destination: createForm.destination,
      distance_km: createForm.distance_km ? parseFloat(createForm.distance_km) : null,
      estimated_duration: createForm.estimated_duration || null,
      base_price: createForm.base_price ? parseFloat(createForm.base_price) : null,
      one_way_price: createForm.one_way_price ? parseFloat(createForm.one_way_price) : 0,
      return_price: createForm.return_price ? parseFloat(createForm.return_price) : 0,
      operator_id: createForm.operator_id || null,
      status: 'active',
    };

    const { error } = await supabase
      .from('routes')
      .insert(routeData);

    if (error) {
      toast.error('Failed to create route');
    } else {
      toast.success('Route created successfully');
      await logAudit('route_created', routeData, { origin: createForm.origin, destination: createForm.destination });
      setCreateDialogOpen(false);
      fetchRoutes();
    }
  };

  const handleUpdateRoute = async () => {
    if (!selectedRoute) return;
    
    if (!editForm.origin || !editForm.destination) {
      toast.error('Origin and destination are required');
      return;
    }

    const { error } = await supabase
      .from('routes')
      .update({
        origin: editForm.origin,
        destination: editForm.destination,
        distance_km: editForm.distance_km ? parseFloat(editForm.distance_km) : null,
        estimated_duration: editForm.estimated_duration || null,
        base_price: editForm.base_price ? parseFloat(editForm.base_price) : null,
        one_way_price: editForm.one_way_price ? parseFloat(editForm.one_way_price) : 0,
        return_price: editForm.return_price ? parseFloat(editForm.return_price) : 0,
      })
      .eq('id', selectedRoute.id);

    if (error) {
      toast.error('Failed to update route');
    } else {
      toast.success('Route updated successfully');
      await logAudit('route_updated', { id: selectedRoute.id }, { origin: editForm.origin });
      setEditDialogOpen(false);
      fetchRoutes();
    }
  };

  const handleStatusChange = async () => {
    if (!selectedRoute) return;

    const newStatus = selectedRoute.status === 'active' ? 'inactive' : 'active';
    
    const { error } = await supabase
      .from('routes')
      .update({ status: newStatus })
      .eq('id', selectedRoute.id);

    if (error) {
      toast.error('Failed to update route status');
    } else {
      toast.success(`Route ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      await logAudit('route_status_changed', { id: selectedRoute.id }, { status: newStatus });
      setStatusDialogOpen(false);
      fetchRoutes();
    }
  };

  const logAudit = async (action: string, target: any, details: any) => {
    const targetId = typeof target === 'string' ? target : target?.id;
    await supabase.from('audit_logs').insert({
      action,
      target_type: 'route',
      target_id: targetId,
      details,
      created_at: new Date().toISOString(),
    });
  };

  const filteredRoutes = routes.filter(route => {
    if (filter !== 'all' && route.status !== filter) return false;
    if (operatorFilter !== 'all' && route.operator_id !== operatorFilter) return false;
    return true;
  });

  const stats = {
    total: routes.length,
    active: routes.filter(r => r.status === 'active').length,
    inactive: routes.filter(r => r.status === 'inactive').length,
    pending: routes.filter(r => r.status === 'pending').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Route Management</h1>
          <p className="text-muted-foreground">Manage all routes in the system</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Create Route
          </Button>
          <Button onClick={fetchRoutes} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Routes</CardTitle>
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
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
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
            <SelectItem value="pending">Pending</SelectItem>
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

      {/* Routes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            All Routes ({filteredRoutes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRoutes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No routes found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origin</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Base Price</TableHead>
                  <TableHead>One Way</TableHead>
                  <TableHead>Return</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoutes.map(route => (
                  <TableRow key={route.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {route.origin}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {route.destination}
                      </div>
                    </TableCell>
                    <TableCell>
                      {route.distance_km ? (
                        <div className="flex items-center gap-1">
                          <Gauge className="h-4 w-4 text-muted-foreground" />
                          {route.distance_km} km
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {route.estimated_duration ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {route.estimated_duration}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {route.base_price ? (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          {formatCurrency(route.base_price)}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{formatCurrency(route.one_way_price)}</TableCell>
                    <TableCell>{formatCurrency(route.return_price)}</TableCell>
                    <TableCell>
                      {route.operator_id ? (
                        <span className="text-sm">{getOperatorName(route.operator_id)}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(route.status)} text-white`}>
                        {route.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(route)}
                          title="Edit route"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={route.status === 'active' ? 'destructive' : 'default'}
                          size="sm"
                          onClick={() => openStatusDialog(route)}
                          title={route.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          {route.status === 'active' ? (
                            <Ban className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
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

      {/* Create Route Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Route</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="origin">Origin *</Label>
              <Select 
                value={createForm.origin} 
                onValueChange={value => setCreateForm({ ...createForm, origin: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select origin city" />
                </SelectTrigger>
                <SelectContent>
                  {MALAWI_CITIES.map(city => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="destination">Destination *</Label>
              <Select 
                value={createForm.destination} 
                onValueChange={value => setCreateForm({ ...createForm, destination: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination city" />
                </SelectTrigger>
                <SelectContent>
                  {MALAWI_CITIES.map(city => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="distance_km">Distance (km)</Label>
                <Input
                  id="distance_km"
                  type="number"
                  value={createForm.distance_km}
                  onChange={e => setCreateForm({ ...createForm, distance_km: e.target.value })}
                  placeholder="e.g., 150"
                />
              </div>
              <div>
                <Label htmlFor="estimated_duration">Duration</Label>
                <Input
                  id="estimated_duration"
                  value={createForm.estimated_duration}
                  onChange={e => setCreateForm({ ...createForm, estimated_duration: e.target.value })}
                  placeholder="e.g., 2h 30m"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="base_price">Base Price (MWK)</Label>
              <Input
                id="base_price"
                type="number"
                value={createForm.base_price}
                onChange={e => setCreateForm({ ...createForm, base_price: e.target.value })}
                placeholder="e.g., 5000"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="one_way_price">One Way Price (MWK) *</Label>
                <Input
                  id="one_way_price"
                  type="number"
                  value={createForm.one_way_price}
                  onChange={e => setCreateForm({ ...createForm, one_way_price: e.target.value })}
                  placeholder="e.g., 5000"
                />
              </div>
              <div>
                <Label htmlFor="return_price">Return Price (MWK)</Label>
                <Input
                  id="return_price"
                  type="number"
                  value={createForm.return_price}
                  onChange={e => setCreateForm({ ...createForm, return_price: e.target.value })}
                  placeholder="e.g., 9000"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="operator">Assign Operator</Label>
              <Select 
                value={createForm.operator_id} 
                onValueChange={value => setCreateForm({ ...createForm, operator_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select operator (optional)" />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRoute}>
              Create Route
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Route Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Route</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_origin">Origin *</Label>
              <Select 
                value={editForm.origin} 
                onValueChange={value => setEditForm({ ...editForm, origin: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select origin city" />
                </SelectTrigger>
                <SelectContent>
                  {MALAWI_CITIES.map(city => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_destination">Destination *</Label>
              <Select 
                value={editForm.destination} 
                onValueChange={value => setEditForm({ ...editForm, destination: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination city" />
                </SelectTrigger>
                <SelectContent>
                  {MALAWI_CITIES.map(city => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_distance_km">Distance (km)</Label>
                <Input
                  id="edit_distance_km"
                  type="number"
                  value={editForm.distance_km}
                  onChange={e => setEditForm({ ...editForm, distance_km: e.target.value })}
                  placeholder="e.g., 150"
                />
              </div>
              <div>
                <Label htmlFor="edit_estimated_duration">Duration</Label>
                <Input
                  id="edit_estimated_duration"
                  value={editForm.estimated_duration}
                  onChange={e => setEditForm({ ...editForm, estimated_duration: e.target.value })}
                  placeholder="e.g., 2h 30m"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit_base_price">Base Price (MWK)</Label>
              <Input
                id="edit_base_price"
                type="number"
                value={editForm.base_price}
                onChange={e => setEditForm({ ...editForm, base_price: e.target.value })}
                placeholder="e.g., 5000"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_one_way_price">One Way Price (MWK) *</Label>
                <Input
                  id="edit_one_way_price"
                  type="number"
                  value={editForm.one_way_price}
                  onChange={e => setEditForm({ ...editForm, one_way_price: e.target.value })}
                  placeholder="e.g., 5000"
                />
              </div>
              <div>
                <Label htmlFor="edit_return_price">Return Price (MWK)</Label>
                <Input
                  id="edit_return_price"
                  type="number"
                  value={editForm.return_price}
                  onChange={e => setEditForm({ ...editForm, return_price: e.target.value })}
                  placeholder="e.g., 9000"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRoute}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedRoute?.status === 'active' ? 'Deactivate Route' : 'Activate Route'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRoute?.status === 'active' ? (
              <p>Are you sure you want to deactivate this route? It will no longer be available for booking.</p>
            ) : (
              <p>Are you sure you want to activate this route? It will be available for booking.</p>
            )}
            {selectedRoute && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Route:</strong> {selectedRoute.origin} → {selectedRoute.destination}</p>
                <p className="text-sm"><strong>Current Status:</strong> {selectedRoute.status}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleStatusChange}
              variant={selectedRoute?.status === 'active' ? 'destructive' : 'default'}
            >
              {selectedRoute?.status === 'active' ? 'Deactivate' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RouteManagement;
