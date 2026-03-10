import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { 
  Ticket, 
  DollarSign, 
  TrendingUp, 
  Users,
  ArrowUpDown
} from 'lucide-react';

interface OperatorStats {
  id: string;
  name: string;
  company_name: string;
  total_bookings: number;
  total_revenue: number;
  commission: number;
}

interface RefundLog {
  id: string;
  ticket_code: string;
  phone: string;
  amount: number;
  fee: number;
  type: string;
  created_at: string;
}

const ReportsDashboard = () => {
  const [operatorStats, setOperatorStats] = useState<OperatorStats[]>([]);
  const [refundLogs, setRefundLogs] = useState<RefundLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStats, setTotalStats] = useState({
    tickets: 0,
    revenue: 0,
    commission: 0,
    refunds: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Get all bookings with operator info
    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        id,
        amount,
        status,
        created_at,
        trips!inner(
          routes!inner(
            operator_id
          )
        )
      `)
      .eq('status', 'paid');

    // Get operators
    const { data: operators } = await supabase
      .from('operators')
      .select('id, name, company_name, commission_percent');

    // Get settings for commission rate
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('default_commission')
      .limit(1)
      .single();

    const defaultCommission = settings?.default_commission || 10;

    // Calculate operator stats
    const operatorMap = new Map<string, OperatorStats>();
    
    bookings?.forEach(booking => {
      const operatorId = booking.trips?.routes?.operator_id;
      if (!operatorId) return;

      const operator = operators?.find(o => o.id === operatorId);
      const commissionRate = operator?.commission_percent || defaultCommission;

      if (!operatorMap.has(operatorId)) {
        operatorMap.set(operatorId, {
          id: operatorId,
          name: operator?.name || 'Unknown',
          company_name: operator?.company_name || operator?.name || 'Unknown',
          total_bookings: 0,
          total_revenue: 0,
          commission: 0
        });
      }

      const stats = operatorMap.get(operatorId)!;
      stats.total_bookings += 1;
      stats.total_revenue += booking.amount || 0;
      stats.commission += (booking.amount || 0) * (commissionRate / 100);
    });

    setOperatorStats(Array.from(operatorMap.values()).sort((a, b) => b.total_revenue - a.total_revenue));

    // Calculate totals
    const totalRevenue = bookings?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;
    const totalCommission = bookings?.reduce((sum, b) => {
      const operatorId = b.trips?.routes?.operator_id;
      const operator = operators?.find(o => o.id === operatorId);
      const commissionRate = operator?.commission_percent || defaultCommission;
      return sum + ((b.amount || 0) * commissionRate / 100);
    }, 0) || 0;

    // Get cancellations/changes for refund logs
    const { data: cancellations } = await supabase
      .from('bookings')
      .select('id, ticket_code, phone, amount, status, created_at')
      .in('status', ['cancelled', 'changed'])
      .order('created_at', { ascending: false })
      .limit(50);

    const refunds = (cancellations || []).map(c => ({
      id: c.id,
      ticket_code: c.ticket_code || '',
      phone: c.phone || '',
      amount: c.amount || 0,
      fee: c.status === 'cancelled' ? 2000 : 1000,
      type: c.status === 'cancelled' ? 'cancellation' : 'change',
      created_at: c.created_at
    }));

    setRefundLogs(refunds);

    setTotalStats({
      tickets: bookings?.length || 0,
      revenue: totalRevenue,
      commission: totalCommission,
      refunds: refunds.reduce((sum, r) => sum + r.fee, 0)
    });

    setLoading(false);
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports Dashboard</h1>
        <p className="text-gray-500">Platform performance and analytics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Tickets Sold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-blue-500" />
              <span className="text-3xl font-bold">{totalStats.tickets}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <span className="text-3xl font-bold">MWK {totalStats.revenue.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Platform Commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <span className="text-3xl font-bold">MWK {totalStats.commission.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Refunds/Fees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5 text-orange-500" />
              <span className="text-3xl font-bold">MWK {totalStats.refunds.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="operators">
        <TabsList>
          <TabsTrigger value="operators">Revenue by Operator</TabsTrigger>
          <TabsTrigger value="refunds">Refund Logs</TabsTrigger>
        </TabsList>

        {/* Revenue by Operator */}
        <TabsContent value="operators">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Revenue by Operator
              </CardTitle>
              <CardDescription>
                Breakdown of tickets sold and revenue per operator
              </CardDescription>
            </CardHeader>
            <CardContent>
              {operatorStats.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No operator data available
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operator</TableHead>
                      <TableHead>Tickets Sold</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Commission (Platform)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operatorStats.map((operator) => (
                      <TableRow key={operator.id}>
                        <TableCell className="font-medium">
                          {operator.company_name}
                        </TableCell>
                        <TableCell>{operator.total_bookings}</TableCell>
                        <TableCell>MWK {operator.total_revenue.toLocaleString()}</TableCell>
                        <TableCell className="text-purple-600">
                          MWK {operator.commission.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Refund Logs */}
        <TabsContent value="refunds">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5" />
                Refund Logs
              </CardTitle>
              <CardDescription>
                Cancellations and changes with applicable fees
              </CardDescription>
            </CardHeader>
            <CardContent>
              {refundLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No refund logs available
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Ticket Code</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Fee Charged</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refundLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{new Date(log.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="font-mono">{log.ticket_code}</TableCell>
                        <TableCell>{log.phone}</TableCell>
                        <TableCell>
                          <Badge variant={log.type === 'cancellation' ? 'destructive' : 'outline'}>
                            {log.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-orange-600">
                          MWK {log.fee.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsDashboard;
