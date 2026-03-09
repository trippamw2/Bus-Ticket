import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Users, Plus, Search, Phone, Bus, Calendar, Shield } from 'lucide-react';

const DriverManagement = () => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', phone: '', license_number: '', operator_id: '', status: 'active'
  });

  useEffect(() => {
    fetchDrivers();
    fetchOperators();
  }, []);

  const fetchDrivers = async () => {
    const { data, error } = await supabase
      .from('drivers')
      .select('*, operators(company_name)')
      .order('created_at', { ascending: false });
    if (!error) setDrivers(data || []);
    setLoading(false);
  };

  const fetchOperators = async () => {
    const { data } = await supabase.from('operators').select('id, company_name').eq('status', 'approved');
    setOperators(data || []);
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.phone) {
      toast.error('Name and phone are required');
      return;
    }
    const { error } = await supabase.from('drivers').insert({
      full_name: formData.name,
      phone: formData.phone,
      license_number: formData.license_number || null,
      operator_id: formData.operator_id || null,
      status: formData.status
    });
    if (error) {
      toast.error('Failed to create driver');
    } else {
      toast.success('Driver created successfully');
      setDialogOpen(false);
      setFormData({ name: '', phone: '', license_number: '', operator_id: '', status: 'active' });
      fetchDrivers();
    }
  };

  const filteredDrivers = drivers.filter(d => 
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.phone?.includes(search) ||
    d.license_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Driver Management
          </h1>
          <p className="text-slate-500">Manage drivers across all operators</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600">
          <Plus className="h-4 w-4 mr-2" /> Add Driver
        </Button>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search drivers..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No drivers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDrivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">{driver.name}</TableCell>
                      <TableCell>{driver.phone}</TableCell>
                      <TableCell>{driver.license_number || '-'}</TableCell>
                      <TableCell>{driver.operators?.company_name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={driver.status === 'active' ? 'default' : 'secondary'}>
                          {driver.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Driver</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full Name *</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter driver name"
              />
            </div>
            <div>
              <Label>Phone Number *</Label>
              <Input 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+265xxxxxxxxx"
              />
            </div>
            <div>
              <Label>License Number</Label>
              <Input 
                value={formData.license_number}
                onChange={(e) => setFormData({...formData, license_number: e.target.value})}
                placeholder="DL-xxxxxxx"
              />
            </div>
            <div>
              <Label>Operator</Label>
              <Select value={formData.operator_id} onValueChange={(v) => setFormData({...formData, operator_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select operator" /></SelectTrigger>
                <SelectContent>
                  {operators.map(op => (
                    <SelectItem key={op.id} value={op.id}>{op.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Driver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverManagement;
