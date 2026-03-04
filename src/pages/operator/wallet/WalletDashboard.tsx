import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Wallet, Clock, CheckCircle, AlertCircle, ArrowUpRight, ArrowDownRight, Send, DollarSign, RefreshCw } from 'lucide-react';

interface WalletData {
  id: string;
  balance: number;
  held_funds: number;
  cleared_funds: number;
  total_earned: number;
  total_paid: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

export default function WalletDashboard() {
  const { operator } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalMethod, setWithdrawalMethod] = useState('airtel_money');
  const [withdrawalPhone, setWithdrawalPhone] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);

  useEffect(() => {
    if (operator) {
      fetchWallet();
    }
  }, [operator, operator?.id]);

  const fetchWallet = async () => {
    if (!operator) return;
    setLoading(true);
    try {
      const { data: walletData, error: walletError } = await supabase
        .from('operator_wallets')
        .select('*')
        .eq('operator_id', operator.id)
        .single();

      if (walletError && walletError.code !== 'PGRST116') throw walletError;
      setWallet(walletData);

      if (!walletData) {
        const { data: newWallet } = await supabase
          .from('operator_wallets')
          .insert({ operator_id: operator.id })
          .select()
          .single();
        
        if (newWallet) {
          setWallet(newWallet);
        }
      }

      if (walletData) {
        const { data: txns } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('wallet_id', walletData.id)
          .order('created_at', { ascending: false })
          .limit(50);

        setTransactions(txns || []);

        // Fetch withdrawal requests
        const { data: withdrawals } = await supabase
          .from('wallet_withdrawal_requests')
          .select('*')
          .eq('user_id', operator.id)
          .order('created_at', { ascending: false })
          .limit(20);
        
        setWithdrawalHistory(withdrawals || []);
      }
    } catch (err) {
      console.error('Error fetching wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!operator || !wallet) return;
    
    const amount = Number(withdrawalAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (amount > (wallet.cleared_funds || 0)) {
      toast.error('Insufficient cleared funds');
      return;
    }

    if (!withdrawalPhone) {
      toast.error('Please enter a phone number');
      return;
    }

    setWithdrawing(true);
    try {
      const { error } = await supabase
        .from('wallet_withdrawal_requests')
        .insert({
          user_id: operator.id,
          amount: amount,
          currency: 'MWK',
          payment_method: withdrawalMethod,
          provider: withdrawalMethod === 'airtel_money' ? 'airtel' : 'bank',
          phone_number: withdrawalPhone,
          status: 'pending',
        });

      if (error) throw error;
      
      toast.success('Withdrawal request submitted successfully');
      setWithdrawalDialogOpen(false);
      setWithdrawalAmount('');
      setWithdrawalPhone('');
      fetchWallet();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit withdrawal request');
    } finally {
      setWithdrawing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MW', {
      style: 'currency',
      currency: 'MWK',
    }).format(amount || 0);
  };

  const getTransactionIcon = (type: string) => {
    if (type.includes('credit') || type.includes('earning')) {
      return <ArrowDownRight className="h-4 w-4 text-green-500" />;
    }
    return <ArrowUpRight className="h-4 w-4 text-red-500" />;
  };

  const getTransactionBadge = (type: string) => {
    if (type.includes('credit') || type.includes('earning')) {
      return <Badge variant="default">Credit</Badge>;
    }
    if (type.includes('hold')) {
      return <Badge variant="secondary">Held</Badge>;
    }
    if (type.includes('payout')) {
      return <Badge variant="outline">Payout</Badge>;
    }
    return <Badge variant="secondary">{type}</Badge>;
  };

  const getWithdrawalStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      processing: 'default',
      completed: 'default',
      failed: 'destructive',
      cancelled: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Wallet</h1>
          <p className="text-muted-foreground">Track your earnings and payouts</p>
        </div>
        <Button variant="outline" onClick={fetchWallet}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Available Balance</CardTitle>
            <Wallet className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(wallet?.balance || 0)}</div>
            <p className="text-xs opacity-80">Ready for payout</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Held Funds</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{formatCurrency(wallet?.held_funds || 0)}</div>
            <p className="text-xs text-muted-foreground">In escrow (3h after departure)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cleared Funds</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{formatCurrency(wallet?.cleared_funds || 0)}</div>
            <p className="text-xs text-muted-foreground">Available for withdrawal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(wallet?.total_earned || 0)}</div>
            <p className="text-xs text-muted-foreground">Lifetime earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal Button */}
      <div className="flex justify-end">
        <Button onClick={() => setWithdrawalDialogOpen(true)} disabled={!wallet || (wallet.cleared_funds || 0) <= 0}>
          <Send className="mr-2 h-4 w-4" />
          Request Withdrawal
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Settlement Schedule
          </CardTitle>
          <CardDescription>When your funds become available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-sm">Funds are held for 3 hours after trip departure</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm">After 3 hours, funds move to cleared balance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm">Settlements are processed automatically</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal History */}
      {withdrawalHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal Requests</CardTitle>
            <CardDescription>Your recent withdrawal requests</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawalHistory.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(req.amount)}</TableCell>
                    <TableCell className="capitalize">{req.payment_method?.replace('_', ' ')}</TableCell>
                    <TableCell>{req.phone_number}</TableCell>
                    <TableCell>{getWithdrawalStatusBadge(req.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent wallet activity</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No transactions yet. Complete trips to start earning.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>{new Date(txn.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(txn.type)}
                        <span className="capitalize">{txn.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{txn.description || '-'}</TableCell>
                    <TableCell className={txn.type.includes('credit') ? 'text-green-600' : 'text-red-600'}>
                      {txn.type.includes('credit') ? '+' : '-'}{formatCurrency(txn.amount)}
                    </TableCell>
                    <TableCell>{getTransactionBadge(txn.type)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal Dialog */}
      <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (MWK)</Label>
              <Input 
                type="number" 
                placeholder="Enter amount" 
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Available: {formatCurrency(wallet?.cleared_funds || 0)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={withdrawalMethod} onValueChange={setWithdrawalMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="airtel_money">Airtel Money</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone Number / Account</Label>
              <Input 
                placeholder="e.g., +265999000000" 
                value={withdrawalPhone}
                onChange={(e) => setWithdrawalPhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawalDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleWithdrawal} disabled={withdrawing}>
              {withdrawing ? 'Processing...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
