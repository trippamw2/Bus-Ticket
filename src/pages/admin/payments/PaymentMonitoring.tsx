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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  CreditCard, Search, CheckCircle, XCircle, AlertTriangle, 
  RefreshCw, Filter, DollarSign, Calendar, Eye, Undo2
} from 'lucide-react';

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
    trips?: {
      travel_date: string;
      routes?: {
        origin: string;
        destination: string;
      };
    };
  };
}

const PaymentMonitoring = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  
  // Dialogs
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [investigateDialogOpen, setInvestigateDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  
  // Selected payment
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [investigationNotes, setInvestigationNotes] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        bookings:booking_id (
          ticket_code,
          phone,
          trips:trip_id (
            travel_date,
            routes:route_id (origin, destination)
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch payments');
    } else {
      setPayments(data || []);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      case 'refunded': return 'bg-gray-500';
      case 'verified': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return `MWK ${amount?.toLocaleString() || 0}`;
  };

  const openVerifyDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setVerifyDialogOpen(true);
  };

  const openInvestigateDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setInvestigationNotes('');
    setInvestigateDialogOpen(true);
  };

  const openRefundDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setRefundReason('');
    setRefundDialogOpen(true);
  };

  const handleVerifyPayment = async () => {
    if (!selectedPayment) return;

    const { error } = await supabase
      .from('payments')
      .update({ status: 'verified' })
      .eq('id', selectedPayment.id);

    if (error) {
      toast.error('Failed to verify payment');
    } else {
      toast.success('Payment verified successfully');
      await logAudit('payment_verified', selectedPayment.id, { 
        transaction_reference: selectedPayment.transaction_reference 
      });
      setVerifyDialogOpen(false);
      fetchPayments();
    }
  };

  const handleInvestigatePayment = async () => {
    if (!selectedPayment) return;

    // Log investigation notes
    await logAudit('payment_investigated', selectedPayment.id, { 
      notes: investigationNotes,
      transaction_reference: selectedPayment.transaction_reference
    });
    
    toast.success('Investigation notes saved');
    setInvestigateDialogOpen(false);
  };

  const handleRefundPayment = async () => {
    if (!selectedPayment) return;

    const { error } = await supabase
      .from('payments')
      .update({ status: 'refunded' })
      .eq('id', selectedPayment.id);

    if (error) {
      toast.error('Failed to process refund');
    } else {
      // Also update the associated booking
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', selectedPayment.booking_id);

      toast.success('Refund processed successfully');
      await logAudit('payment_refunded', selectedPayment.id, { 
        reason: refundReason,
        amount: selectedPayment.amount
      });
      setRefundDialogOpen(false);
      fetchPayments();
    }
  };

  const logAudit = async (action: string, paymentId: string, details: any) => {
    await supabase.from('audit_logs').insert({
      action,
      target_type: 'payment',
      target_id: paymentId,
      details,
      created_at: new Date().toISOString(),
    });
  };

  const filteredPayments = payments.filter(payment => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchRef = payment.transaction_reference?.toLowerCase().includes(query);
      const matchTransId = payment.transaction_id?.toLowerCase().includes(query);
      const matchPhone = payment.bookings?.phone?.toLowerCase().includes(query);
      const matchCode = payment.bookings?.ticket_code?.toLowerCase().includes(query);
      if (!matchRef && !matchTransId && !matchPhone && !matchCode) return false;
    }
    // Status filter
    if (statusFilter !== 'all' && payment.status !== statusFilter) return false;
    // Date filter
    if (dateFilter && payment.created_at?.split('T')[0] !== dateFilter) return false;
    return true;
  });

  const stats = {
    total: payments.length,
    completed: payments.filter(p => p.status === 'completed' || p.status === 'verified').length,
    pending: payments.filter(p => p.status === 'pending').length,
    failed: payments.filter(p => p.status === 'failed').length,
    refunded: payments.filter(p => p.status === 'refunded').length,
    totalRevenue: payments
      .filter(p => p.status === 'completed' || p.status === 'verified')
      .reduce((sum, p) => sum + (p.amount || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payment Monitoring</h1>
          <p className="text-muted-foreground">Monitor and manage all payments</p>
        </div>
        <Button onClick={fetchPayments} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Refunded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.refunded}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalRevenue)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by reference, transaction ID, or phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Input 
          type="date" 
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="w-[150px]"
        />
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            All Payments ({filteredPayments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payments found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map(payment => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-sm">
                      {payment.transaction_reference || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {payment.transaction_id || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {payment.bookings?.ticket_code || '-'}
                    </TableCell>
                    <TableCell>
                      {payment.bookings?.phone || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {payment.payment_method || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDateTime(payment.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(payment.status)} text-white`}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(payment.status === 'pending' || payment.status === 'failed') && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openVerifyDialog(payment)}
                              title="Verify payment"
                            >
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openInvestigateDialog(payment)}
                              title="Investigate payment"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {payment.status === 'completed' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRefundDialog(payment)}
                              title="Issue refund"
                              className="text-red-500 hover:text-red-600"
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          </>
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

      {/* Verify Payment Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">Confirm payment verification</p>
                <p className="text-sm text-green-600">
                  This will mark the payment as verified and confirm the booking.
                </p>
              </div>
            </div>
            {selectedPayment && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Reference:</strong> {selectedPayment.transaction_reference}</p>
                <p className="text-sm"><strong>Transaction ID:</strong> {selectedPayment.transaction_id || 'N/A'}</p>
                <p className="text-sm"><strong>Amount:</strong> {formatCurrency(selectedPayment.amount)}</p>
                <p className="text-sm"><strong>Phone:</strong> {selectedPayment.bookings?.phone}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleVerifyPayment} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Verify Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Investigate Payment Dialog */}
      <Dialog open={investigateDialogOpen} onOpenChange={setInvestigateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Investigate Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="investigation_notes">Investigation Notes</Label>
              <textarea
                id="investigation_notes"
                className="w-full h-32 p-3 border rounded-lg resize-none"
                placeholder="Enter investigation details, findings, or actions taken..."
                value={investigationNotes}
                onChange={e => setInvestigationNotes(e.target.value)}
              />
            </div>
            {selectedPayment && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Reference:</strong> {selectedPayment.transaction_reference}</p>
                <p className="text-sm"><strong>Status:</strong> {selectedPayment.status}</p>
                <p className="text-sm"><strong>Amount:</strong> {formatCurrency(selectedPayment.amount)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvestigateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvestigatePayment}>
              <Eye className="h-4 w-4 mr-2" />
              Save Investigation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Payment Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Warning: Issuing a refund</p>
                <p className="text-sm text-red-600">
                  This will reverse the payment and cancel the associated booking.
                </p>
              </div>
            </div>
            <div>
              <Label htmlFor="refund_reason">Refund Reason</Label>
              <textarea
                id="refund_reason"
                className="w-full h-24 p-3 border rounded-lg resize-none"
                placeholder="Enter reason for refund..."
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
              />
            </div>
            {selectedPayment && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Reference:</strong> {selectedPayment.transaction_reference}</p>
                <p className="text-sm"><strong>Amount:</strong> {formatCurrency(selectedPayment.amount)}</p>
                <p className="text-sm"><strong>Booking:</strong> {selectedPayment.bookings?.ticket_code}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRefundPayment}>
              <Undo2 className="h-4 w-4 mr-2" />
              Issue Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentMonitoring;
