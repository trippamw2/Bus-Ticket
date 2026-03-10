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
import { CreditCard, Search, CheckCircle, RefreshCw, Calendar, Eye, Undo2 } from 'lucide-react';

interface Payment {
  id: string;
  booking_id: string;
  transaction_reference: string;
  amount: number;
  status: string;
  created_at: string;
  bookings?: {
    ticket_code: string;
    phone: string;
  };
}

const PaymentMonitoring = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [refundReason, setRefundReason] = useState('');

  useEffect(() => { fetchPayments(); }, []);

  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('*, bookings:booking_id (ticket_code, phone)')
      .order('created_at', { ascending: false });
    if (!error) setPayments(data || []);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = { completed: 'bg-green-500', pending: 'bg-yellow-500', failed: 'bg-red-500', refunded: 'bg-gray-500', verified: 'bg-blue-500' };
    return colors[status] || 'bg-gray-500';
  };

  const formatCurrency = (amount: number) => `MWK ${amount?.toLocaleString() || 0}`;
  const formatDateTime = (date: string) => date ? new Date(date).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  const handleVerifyPayment = async () => {
    if (!selectedPayment) return;
    const { error } = await supabase.from('payments').update({ status: 'verified' }).eq('id', selectedPayment.id);
    if (error) { toast.error('Failed to verify'); } else { toast.success('Payment verified'); setVerifyDialogOpen(false); fetchPayments(); }
  };

  const handleRefundPayment = async () => {
    if (!selectedPayment) return;
    const { error } = await supabase.from('payments').update({ status: 'refunded' }).eq('id', selectedPayment.id);
    if (!error) await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', selectedPayment.booking_id);
    if (error) { toast.error('Failed to refund'); } else { toast.success('Refund processed'); setRefundDialogOpen(false); fetchPayments(); }
  };

  const filteredPayments = payments.filter(p => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.transaction_reference?.toLowerCase().includes(q) && !p.bookings?.phone?.toLowerCase().includes(q) && !p.bookings?.ticket_code?.toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (dateFilter && p.created_at?.split('T')[0] !== dateFilter) return false;
    return true;
  });

  const stats = {
    total: payments.length,
    completed: payments.filter(p => p.status === 'completed' || p.status === 'verified').length,
    pending: payments.filter(p => p.status === 'pending').length,
    failed: payments.filter(p => p.status === 'failed').length,
    totalRevenue: payments.filter(p => p.status === 'completed' || p.status === 'verified').reduce((s, p) => s + (p.amount || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Payment Monitoring</h1><p className="text-muted-foreground">Monitor all payments</p></div>
        <Button onClick={fetchPayments} variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Completed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{stats.completed}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pending</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-600">{stats.pending}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Failed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{stats.failed}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Revenue</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</div></CardContent></Card>
      </div>

      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by reference or phone..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="failed">Failed</SelectItem><SelectItem value="refunded">Refunded</SelectItem></SelectContent></Select>
        <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-[150px]" />
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Payments ({filteredPayments.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-8"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div> :
          filteredPayments.length === 0 ? <div className="text-center py-8 text-muted-foreground">No payments found</div> :
          <Table>
            <TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Booking</TableHead><TableHead>Phone</TableHead><TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredPayments.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.transaction_reference || '-'}</TableCell>
                  <TableCell className="font-mono text-sm">{p.bookings?.ticket_code || '-'}</TableCell>
                  <TableCell>{p.bookings?.phone || '-'}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(p.amount)}</TableCell>
                  <TableCell><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />{formatDateTime(p.created_at)}</div></TableCell>
                  <TableCell><Badge className={`${getStatusColor(p.status)} text-white`}>{p.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {(p.status === 'pending' || p.status === 'failed') && <Button variant="outline" size="sm" onClick={() => { setSelectedPayment(p); setVerifyDialogOpen(true); }}><CheckCircle className="h-4 w-4 text-green-500" /></Button>}
                      {p.status === 'completed' && <Button variant="outline" size="sm" onClick={() => { setSelectedPayment(p); setRefundDialogOpen(true); }}><Undo2 className="h-4 w-4 text-red-500" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
        </CardContent>
      </Card>

      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Verify Payment</DialogTitle></DialogHeader>
          <p>Confirm this payment as verified? Reference: {selectedPayment?.transaction_reference}</p>
          <DialogFooter><Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>Cancel</Button><Button onClick={handleVerifyPayment} className="bg-green-600 hover:bg-green-700">Verify</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue Refund</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p>Refund {formatCurrency(selectedPayment?.amount || 0)} to {selectedPayment?.bookings?.phone}?</p>
            <div><Label>Reason</Label><Input value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="Reason for refund" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setRefundDialogOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleRefundPayment}>Process Refund</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentMonitoring;
