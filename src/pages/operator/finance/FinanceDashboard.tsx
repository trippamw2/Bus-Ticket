import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { DollarSign, TrendingUp, TrendingDown, Download, Calendar } from 'lucide-react';

interface Settlement {
  id: string;
  settlement_period_start: string;
  settlement_period_end: string;
  gross_amount: number;
  commission_amount: number;
  airtel_fee: number;
  vat_amount: number;
  net_amount: number;
  status: string;
  paid_at: string | null;
}

export default function FinanceDashboard() {
  const { operator } = useAuth();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalRevenue: 0, totalCommission: 0, totalAirtelFees: 0, totalVat: 0, netPayable: 0, pendingSettlements: 0 });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  useEffect(() => { if (operator) { fetchSettlements(); fetchRevenueData(); } }, [operator, operator?.id]);

  const fetchSettlements = async () => {
    if (!operator) return;
    setLoading(true);
    const { data } = await supabase.from('settlements').select('*').eq('operator_id', operator.id).order('created_at', { ascending: false }).limit(50);
    setSettlements(data || []);
    const totals = (data || []).reduce((acc, s) => ({
      totalRevenue: acc.totalRevenue + (s.gross_amount || 0),
      totalCommission: acc.totalCommission + (s.commission_amount || 0),
      totalAirtelFees: acc.totalAirtelFees + (s.airtel_fee || 0),
      totalVat: acc.totalVat + (s.vat_amount || 0),
      netPayable: acc.netPayable + (s.net_amount || 0),
      pendingSettlements: acc.pendingSettlements + (s.status === 'pending' ? 1 : 0),
    }), { totalRevenue: 0, totalCommission: 0, totalAirtelFees: 0, totalVat: 0, netPayable: 0, pendingSettlements: 0 });
    setStats(totals);
    setLoading(false);
  };

  const fetchRevenueData = async () => {
    if (!operator) return;
    const { data } = await supabase.from('bookings').select('id, amount, status, created_at').eq('status', 'paid').order('created_at', { ascending: false }).limit(10);
    setRecentBookings(data || []);
  };

  const handleExport = () => {
    const headers = ['Period Start', 'Period End', 'Gross', 'Commission', 'Airtel Fee', 'VAT', 'Net', 'Status'];
    const rows = settlements.map(s => [s.settlement_period_start, s.settlement_period_end, s.gross_amount, s.commission_amount, s.airtel_fee, s.vat_amount, s.net_amount, s.status]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `settlements_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Statement exported');
  };

  const fmt = (amount: number) => new Intl.NumberFormat('en-MW', { style: 'currency', currency: 'MWK' }).format(amount);
  const commissionPercent = operator?.commission_percent || 10;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Financial Dashboard</h1><p className="text-muted-foreground">Track revenue, fees, and settlements</p></div>
        <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" />Export</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Gross Revenue</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{fmt(stats.totalRevenue)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Commission</CardTitle><TrendingDown className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{fmt(stats.totalCommission)}</div><p className="text-xs text-muted-foreground">{commissionPercent}% platform fee</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Fees & VAT</CardTitle><TrendingDown className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{fmt(stats.totalAirtelFees + stats.totalVat)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Net Payable</CardTitle><TrendingUp className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{fmt(stats.netPayable)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Settlement History</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-center py-4">Loading...</div> :
          settlements.length === 0 ? <div className="text-center py-4 text-muted-foreground">No settlements yet</div> :
          <Table>
            <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Gross</TableHead><TableHead>Commission</TableHead><TableHead>Fees</TableHead><TableHead>Net</TableHead><TableHead>Status</TableHead><TableHead>Paid</TableHead></TableRow></TableHeader>
            <TableBody>
              {settlements.map(s => (
                <TableRow key={s.id}>
                  <TableCell><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />{new Date(s.settlement_period_start).toLocaleDateString()} - {new Date(s.settlement_period_end).toLocaleDateString()}</div></TableCell>
                  <TableCell>{fmt(s.gross_amount)}</TableCell>
                  <TableCell className="text-muted-foreground">-{fmt(s.commission_amount)}</TableCell>
                  <TableCell className="text-muted-foreground">-{fmt((s.airtel_fee || 0) + (s.vat_amount || 0))}</TableCell>
                  <TableCell className="font-medium">{fmt(s.net_amount)}</TableCell>
                  <TableCell><Badge variant={s.status === 'paid' ? 'default' : 'secondary'}>{s.status}</Badge></TableCell>
                  <TableCell>{s.paid_at ? new Date(s.paid_at).toLocaleDateString() : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Revenue</CardTitle></CardHeader>
        <CardContent>
          {recentBookings.length === 0 ? <div className="text-center py-4 text-muted-foreground">No recent revenue</div> :
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {recentBookings.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell>{new Date(b.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{fmt(b.amount)}</TableCell>
                  <TableCell><Badge variant="default">Paid</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
        </CardContent>
      </Card>
    </div>
  );
}
