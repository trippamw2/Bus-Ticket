import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { toast } from 'sonner';
import { DollarSign, Calendar, CheckCircle, Clock, TrendingUp, Wallet } from 'lucide-react';

const SettlementManagement = () => {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [settlementsRes, operatorsRes] = await Promise.all([
      supabase.from('settlements').select('*, operators(company_name)').order('created_at', { ascending: false }).limit(50),
      supabase.from('operators').select('id, company_name, wallet_balance').eq('status', 'approved')
    ]);
    setSettlements(settlementsRes.data || []);
    setOperators(operatorsRes.data || []);
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-emerald-500">Completed</Badge>;
      case 'pending': return <Badge className="bg-amber-500">Pending</Badge>;
      case 'processing': return <Badge className="bg-blue-500">Processing</Badge>;
      case 'failed': return <Badge className="bg-red-500">Failed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const stats = {
    total: settlements.length,
    completed: settlements.filter(s => s.status === 'completed').length,
    pending: settlements.filter(s => s.status === 'pending').length,
    totalAmount: settlements.filter(s => s.status === 'completed').reduce((sum, s) => sum + (s.amount || 0), 0)
  };

  const totalWalletBalance = operators.reduce((sum, op) => sum + (op.wallet_balance || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Settlement Management
          </h1>
          <p className="text-slate-500">Manage operator payouts and settlements</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100"><Wallet className="h-5 w-5 text-slate-600" /></div>
              <div>
                <p className="text-2xl font-bold">MWK {(totalWalletBalance / 1000000).toFixed(1)}M</p>
                <p className="text-sm text-slate-500">Total Wallet</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100"><CheckCircle className="h-5 w-5 text-emerald-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-slate-500">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100"><Clock className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-slate-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100"><DollarSign className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold">MWK {(stats.totalAmount / 1000000).toFixed(1)}M</p>
                <p className="text-sm text-slate-500">Paid Out</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operator Wallets */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Operator Wallets</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operator</TableHead>
                <TableHead>Wallet Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operators.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                    No operators found
                  </TableCell>
                </TableRow>
              ) : (
                operators.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell className="font-medium">{op.company_name}</TableCell>
                    <TableCell>MWK {op.wallet_balance?.toLocaleString() || 0}</TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-500">Active</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Settlements History */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Settlement History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : settlements.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No settlements found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operator</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map((settlement) => (
                  <TableRow key={settlement.id}>
                    <TableCell className="font-medium">{settlement.operators?.company_name || '-'}</TableCell>
                    <TableCell>MWK {settlement.amount?.toLocaleString()}</TableCell>
                    <TableCell className="capitalize">{settlement.settlement_type || 'payout'}</TableCell>
                    <TableCell>{getStatusBadge(settlement.status)}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(settlement.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettlementManagement;
