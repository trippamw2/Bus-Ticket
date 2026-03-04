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
  DialogTrigger,
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
import { Users, Check, X, Edit, Percent } from 'lucide-react';

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

const OperatorManagement = () => {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [commission, setCommission] = useState('');
  const [filter, setFilter] = useState<string>('all');

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
      // Log to audit
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
      setDialogOpen(false);
      fetchOperators();
    }
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

  const openCommissionDialog = (operator: Operator) => {
    setSelectedOperator(operator);
    setCommission(operator.commission_percent?.toString() || '10');
    setDialogOpen(true);
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
      <div className="grid grid-cols-3 gap-4">
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
            <div className="text-center py-8 text-gray-500">
              No operators found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
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
                    <TableCell>
                      <div className="flex gap-2">
                        {operator.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-500 hover:text-green-700"
                              onClick={() => updateStatus(operator.id, 'approved')}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => updateStatus(operator.id, 'suspended')}
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Commission for {selectedOperator?.company_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="commission">Commission Percentage (%)</Label>
              <Input
                id="commission"
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={updateCommission}>Update Commission</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OperatorManagement;
