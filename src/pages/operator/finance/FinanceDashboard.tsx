import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  payment_reference: string | null;
  created_at: string;
}

interface PlatformSettings {
  default_commission: number;
  cancellation_fee: number;
  change_fee: number;
}

export default function FinanceDashboard() {
  const { operator } = useAuth();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    default_commission: 10,
    cancellation_fee: 0,
    change_fee: 0,
  });
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    totalAirtelFees: 0,
    totalVat: 0,
    netPayable: 0,
    pendingSettlements: 0,
  });

  useEffect(() => {
    if (operator) {
      fetchSettlements();
      fetchPlatformSettings();
    }
  }, [operator]);

  const fetchPlatformSettings = async () => {
    try {
      const { data } = await supabase
        .from('platform_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (data) {
        setPlatformSettings({
          default_commission: data.default_commission || 10,
          cancellation_fee: data.cancellation_fee || 0,
          change_fee: data.change_fee || 0,
        });
      }
    } catch (err) {
      console.error('Error fetching platform settings:', err);
    }
  };

  const fetchSettlements = async () => {
    if (!operator) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .eq('operator_id', operator.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSettlements(data || []);

      const totals = (data || []).reduce((acc, s) => ({
        totalRevenue: acc.totalRevenue + s.gross_amount,
        totalCommission: acc.totalCommission + s.commission_amount,
        totalAirtelFees: acc.totalAirtelFees + s.airtel_fee,
        totalVat: acc.totalVat + s.vat_amount,
        netPayable: acc.netPayable + s.net_amount,
        pendingSettlements: acc.pendingSettlements + (s.status === 'pending' ? 1 : 0),
      }), {
        totalRevenue: 0,
        totalCommission: 0,
        totalAirtelFees: 0,
        totalVat: 0,
        netPayable: 0,
        pendingSettlements: 0,
      });
      setStats(totals);
    } catch (err) {
      console.error('Error fetching settlements:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MW', {
      style: 'currency',
      currency: 'MWK',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      processing: 'default',
      paid: 'default',
      frozen: 'destructive',
      disputed: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const commissionPercent = operator?.commission_percent || platformSettings.default_commission;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Financial Dashboard</h1>
          <p className="text-muted-foreground">Track revenue, fees, and settlements</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Statement
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gross Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Total bookings value</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Platform Commission</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalCommission)}</div>
            <p className="text-xs text-muted-foreground">{commissionPercent}% platform fee</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Airtel Fees & VAT</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAirtelFees + stats.totalVat)}</div>
            <p className="text-xs text-muted-foreground">2% + 800 MWK VAT</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Payable</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.netPayable)}</div>
            <p className="text-xs text-muted-foreground">{stats.pendingSettlements} pending</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fee Breakdown</CardTitle>
          <CardDescription>How your revenue is calculated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Gross Revenue</span>
              <span className="font-medium">{formatCurrency(stats.totalRevenue)}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>- Platform Commission ({commissionPercent}%)</span>
              <span>- {formatCurrency(stats.totalCommission)}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>- Airtel Processing (2%)</span>
              <span>- {formatCurrency(stats.totalAirtelFees)}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>- VAT (800 MWK per transaction)</span>
              <span>- {formatCurrency(stats.totalVat)}</span>
            </div>
            <div className="border-t pt-4 flex justify-between items-center">
              <span className="font-bold">Net Payable</span>
              <span className="font-bold text-green-600">{formatCurrency(stats.netPayable)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Settlement History</CardTitle>
          <CardDescription>Your past settlements</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : settlements.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No settlements yet. Complete trips to start earning.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Fees</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map((settlement) => (
                  <TableRow key={settlement.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(settlement.settlement_period_start).toLocaleDateString()} - 
                        {new Date(settlement.settlement_period_end).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(settlement.gross_amount)}</TableCell>
                    <TableCell className="text-muted-foreground">-{formatCurrency(settlement.commission_amount)}</TableCell>
                    <TableCell className="text-muted-foreground">-{formatCurrency(settlement.airtel_fee + settlement.vat_amount)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(settlement.net_amount)}</TableCell>
                    <TableCell>{getStatusBadge(settlement.status)}</TableCell>
                    <TableCell>
                      {settlement.paid_at 
                        ? new Date(settlement.paid_at).toLocaleDateString() 
                        : '-'}
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
}
