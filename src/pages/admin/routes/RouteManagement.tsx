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
import { Plus, Edit, Ban, CheckCircle, RefreshCw, Filter, MapPin } from 'lucide-react';

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
}

const MALAWI_CITIES = ["Blantyre", "Lilongwe", "Mzuzu", "Karonga", "Zomba", "Mangochi", "Salima", "Nkhotakota", "Dedza", "Kasungu"];

const RouteManagement = () => {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null);
  const [createForm, setCreateForm] = useState({ origin: '', destination: '', one_way_price: '', return_price: '', operator_id: '' });
  const [editForm, setEditForm] = useState({ origin: '', destination: '', one_way_price: '', return_price: '' });

  useEffect(() => { fetchRoutes(); fetchOperators(); }, []);

  const fetchRoutes = async () => {
    const { data, error } = await supabase.from('routes').select('*').order('created_at', { ascending: false });
    if (!error) setRoutes(data || []);
    setLoading(false);
  };

  const fetchOperators = async () => {
    const { data } = await supabase.from('operators').select('id, company_name, name').eq('status', 'approved');
    if (data) setOperators(data);
  };

  const getOperatorName = (operatorId: string | null) => {
    if (!operatorId) return 'Unassigned';
    const op = operators.find(o => o.id === operatorId);
    return op?.company_name || op?.name || 'Unknown';
  };

  const formatCurrency = (amount: number | null) => amount != null ? `MWK ${Number(amount).toLocaleString()}` : '-';

  const openCreateDialog = () => { setCreateForm({ origin: '', destination: '', one_way_price: '', return_price: '', operator_id: '' }); setCreateDialogOpen(true); };

  const openEditDialog = (route: RouteData) => {
    setSelectedRoute(route);
    setEditForm({ origin: route.origin, destination: route.destination, one_way_price: route.one_way_price?.toString() || '', return_price: route.return_price?.toString() || '' });
    setEditDialogOpen(true);
  };

  const handleCreateRoute = async () => {
    if (!createForm.origin || !createForm.destination || !createForm.operator_id) { toast.error('Origin, destination and operator required'); return; }
    const { error } = await supabase.from('routes').insert({
      origin: createForm.origin, destination: createForm.destination,
      one_way_price: parseFloat(createForm.one_way_price) || 0, return_price: parseFloat(createForm.return_price) || 0,
      operator_id: createForm.operator_id, status: 'active',
    });
    if (error) { toast.error('Failed to create route'); } else { toast.success('Route created'); setCreateDialogOpen(false); fetchRoutes(); }
  };

  const handleUpdateRoute = async () => {
    if (!selectedRoute) return;
    const { error } = await supabase.from('routes').update({
      origin: editForm.origin, destination: editForm.destination,
      one_way_price: parseFloat(editForm.one_way_price) || 0, return_price: parseFloat(editForm.return_price) || 0,
    }).eq('id', selectedRoute.id);
    if (error) { toast.error('Failed to update route'); } else { toast.success('Route updated'); setEditDialogOpen(false); fetchRoutes(); }
  };

  const handleStatusChange = async (route: RouteData) => {
    const newStatus = route.status === 'active' ? 'inactive' : 'active';
    await supabase.from('routes').update({ status: newStatus }).eq('id', route.id);
    toast.success(`Route ${newStatus}`);
    fetchRoutes();
  };

  const filteredRoutes = routes.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (operatorFilter !== 'all' && r.operator_id !== operatorFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Route Management</h1><p className="text-muted-foreground">Manage all routes</p></div>
        <div className="flex gap-2">
          <Button onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" />Create Route</Button>
          <Button onClick={fetchRoutes} variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Routes</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{routes.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Active</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{routes.filter(r => r.status === 'active').length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Inactive</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-gray-600">{routes.filter(r => r.status !== 'active').length}</div></CardContent></Card>
      </div>

      <div className="flex gap-4 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
        <Select value={operatorFilter} onValueChange={setOperatorFilter}><SelectTrigger className="w-[200px]"><SelectValue placeholder="Operator" /></SelectTrigger><SelectContent><SelectItem value="all">All Operators</SelectItem>{operators.map(op => <SelectItem key={op.id} value={op.id}>{op.company_name || op.name}</SelectItem>)}</SelectContent></Select>
      </div>

      <Card>
        <CardHeader><CardTitle>All Routes ({filteredRoutes.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-8"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div> :
          filteredRoutes.length === 0 ? <div className="text-center py-8 text-muted-foreground">No routes found</div> :
          <Table>
            <TableHeader><TableRow><TableHead>Origin</TableHead><TableHead>Destination</TableHead><TableHead>One Way</TableHead><TableHead>Return</TableHead><TableHead>Operator</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredRoutes.map(route => (
                <TableRow key={route.id}>
                  <TableCell className="font-medium"><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{route.origin}</div></TableCell>
                  <TableCell><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{route.destination}</div></TableCell>
                  <TableCell>{formatCurrency(route.one_way_price)}</TableCell>
                  <TableCell>{formatCurrency(route.return_price)}</TableCell>
                  <TableCell className="text-sm">{getOperatorName(route.operator_id)}</TableCell>
                  <TableCell><Badge variant={route.status === 'active' ? 'default' : 'secondary'}>{route.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(route)}><Edit className="h-4 w-4" /></Button>
                      <Button variant={route.status === 'active' ? 'destructive' : 'default'} size="sm" onClick={() => handleStatusChange(route)}>
                        {route.status === 'active' ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Route</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Origin</Label><Select value={createForm.origin} onValueChange={v => setCreateForm({...createForm, origin: v})}><SelectTrigger><SelectValue placeholder="Select origin" /></SelectTrigger><SelectContent>{MALAWI_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Destination</Label><Select value={createForm.destination} onValueChange={v => setCreateForm({...createForm, destination: v})}><SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger><SelectContent>{MALAWI_CITIES.filter(c => c !== createForm.origin).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>One-Way (MWK)</Label><Input type="number" value={createForm.one_way_price} onChange={e => setCreateForm({...createForm, one_way_price: e.target.value})} /></div>
              <div><Label>Return (MWK)</Label><Input type="number" value={createForm.return_price} onChange={e => setCreateForm({...createForm, return_price: e.target.value})} /></div>
            </div>
            <div><Label>Operator</Label><Select value={createForm.operator_id} onValueChange={v => setCreateForm({...createForm, operator_id: v})}><SelectTrigger><SelectValue placeholder="Select operator" /></SelectTrigger><SelectContent>{operators.map(op => <SelectItem key={op.id} value={op.id}>{op.company_name || op.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button><Button onClick={handleCreateRoute}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Route</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Origin</Label><Select value={editForm.origin} onValueChange={v => setEditForm({...editForm, origin: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MALAWI_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Destination</Label><Select value={editForm.destination} onValueChange={v => setEditForm({...editForm, destination: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MALAWI_CITIES.filter(c => c !== editForm.origin).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>One-Way (MWK)</Label><Input type="number" value={editForm.one_way_price} onChange={e => setEditForm({...editForm, one_way_price: e.target.value})} /></div>
              <div><Label>Return (MWK)</Label><Input type="number" value={editForm.return_price} onChange={e => setEditForm({...editForm, return_price: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button><Button onClick={handleUpdateRoute}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RouteManagement;
