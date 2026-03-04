import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet, Clock, CheckCircle, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

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

  useEffect(() => {
    if (operator) {
      fetchWallet();
    }
  }, [operator]);

  const fetchWallet = async () => {
    if (!operator) return;
    setLoading(true);
    try {
      // Fetch wallet
      const { data: walletData, error: walletError } = await supabase
        .from('operator_wallets')
        .select('*')
        .eq('operator_id', operator.id)
        .single();

      if (walletError && walletError.code !== 'PGRST116') throw walletError;
      setWallet(walletData);

      // If no wallet, create one
      if (!walletData) {
        const { data: newWallet, error: createError } = await supabase
          .from('operator_wallets')
          .insert({ operator_id: operator.id })
          .select()
          .single();
        
        if (!createError && newWallet) {
          setWallet(newWallet);
        }
      }

      // Fetch transactions if wallet exists
      if (walletData) {
        const { data: txns, error: txnError } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('wallet_id', walletData.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!txnError) {
          setTransactions(txns || []);
        }
      }
    } catch (err) {
      console.error('Error fetching wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Wallet</h1>
        <p className="text-muted-foreground">Track your earnings and payouts</p>
      </div>

      {/* Wallet Cards */}
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

      {/* Settlement Schedule Info */}
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
                    <TableCell>
                      {new Date(txn.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(txn.type)}
                        <span className="capitalize">{txn.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {txn.description || '-'}
                    </TableCell>
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
    </div>
  );
}
