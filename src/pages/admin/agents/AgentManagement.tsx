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
import { toast } from 'sonner';
import { 
  Users, Plus, Edit, Ban, CheckCircle, Search, RefreshCw, 
  Wallet, Phone, MapPin, Mail, DollarSign, User
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  phone: string;
  email: string;
  agent_code: string;
  location: string;
  network: string;
  wallet_balance: number;
  status: string;
  verified_at: string;
  created_at: string;
}

interface AgentTransaction {
  id: string;
  type: string;
  amount: number;
  reference: string;
  description: string;
  balance_before: number;
  balance_after: number;
  status: string;
  created_at: string;
}

const AgentManagement = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [transactions, setTransactions] = useState<AgentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [networkFilter, setNetworkFilter] = useState<string>('all');
  
  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [topupDialogOpen, setTopupDialogOpen] = useState(false);
  const [transactionsDialogOpen, setTransactionsDialogOpen] = useState(false);
  
  // Selected agent
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  
  // Forms
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    location: '',
    network: 'airtel',
  });
  
  const [topupAmount, setTopupAmount] = useState('');

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setAgents(data || []);
    }
    setLoading(false);
  };

  const fetchAgentTransactions = async (agentId: string) => {
    const { data } = await supabase
      .from('agent_wallet_transactions')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) setTransactions(data);
  };

  const generateAgentCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'AGT';
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'suspended': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit': return 'text-green-600';
      case 'payment': return 'text-blue-600';
      case 'withdrawal': return 'text-red-600';
      case 'refund': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const formatCurrency = (amount: number) => {
    return `MWK ${amount?.toLocaleString() || 0}`;
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const openCreateDialog = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      location: '',
      network: 'airtel',
    });
    setCreateDialogOpen(true);
  };

  const openEditDialog = (agent: Agent) => {
    setSelectedAgent(agent);
    setFormData({
      name: agent.name,
      phone: agent.phone,
      email: agent.email || '',
      location: agent.location || '',
      network: agent.network || 'airtel',
    });
    setEditDialogOpen(true);
  };

  const openTopupDialog = (agent: Agent) => {
    setSelectedAgent(agent);
    setTopupAmount('');
    setTopupDialogOpen(true);
  };

  const openTransactionsDialog = (agent: Agent) => {
    setSelectedAgent(agent);
    fetchAgentTransactions(agent.id);
    setTransactionsDialogOpen(true);
  };

  const handleCreateAgent = async () => {
    if (!formData.name || !formData.phone) {
      toast.error('Name and phone are required');
      return;
    }

    const agentCode = generateAgentCode();
    
    const { error } = await supabase
      .from('agents')
      .insert({
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        location: formData.location || null,
        network: formData.network,
        agent_code: agentCode,
        status: 'active',
        verified_at: new Date().toISOString(),
      });

    if (error) {
      toast.error('Failed to create agent');
    } else {
      toast.success('Agent created successfully');
      await logAudit('agent_created', { name: formData.name, phone: formData.phone });
      setCreateDialogOpen(false);
      fetchAgents();
    }
  };

  const handleUpdateAgent = async () => {
    if (!selectedAgent) return;

    const { error } = await supabase
      .from('agents')
      .update({
        name: formData.name,
        email: formData.email || null,
        location: formData.location || null,
        network: formData.network,
      })
      .eq('id', selectedAgent.id);

    if (error) {
      toast.error('Failed to update agent');
    } else {
      toast.success('Agent updated successfully');
      setEditDialogOpen(false);
      fetchAgents();
    }
  };

  const handleUpdateStatus = async (agent: Agent, newStatus: string) => {
    const { error } = await supabase
      .from('agents')
      .update({ status: newStatus })
      .eq('id', agent.id);

    if (error) {
      toast.error(`Failed to ${newStatus} agent`);
    } else {
      toast.success(`Agent ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
      await logAudit('agent_status_changed', { agent_id: agent.id, status: newStatus });
      fetchAgents();
    }
  };

  const handleTopup = async () => {
    if (!selectedAgent || !topupAmount) return;

    const amount = parseFloat(topupAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid amount');
      return;
    }

    const newBalance = selectedAgent.wallet_balance + amount;
    
    // Update wallet balance
    const { error: updateError } = await supabase
      .from('agents')
      .update({ wallet_balance: newBalance })
      .eq('id', selectedAgent.id);

    if (updateError) {
      toast.error('Failed to add funds');
      return;
    }

    // Record transaction
    const { error: txError } = await supabase
      .from('agent_wallet_transactions')
      .insert({
        agent_id: selectedAgent.id,
        type: 'deposit',
        amount: amount,
        reference: `TOPUP-${Date.now()}`,
        description: 'Wallet topup',
        balance_before: selectedAgent.wallet_balance,
        balance_after: newBalance,
        status: 'completed',
      });

    if (txError) {
      toast.error('Failed to record transaction');
    } else {
      toast.success(`MWK ${amount.toLocaleString()} added to agent wallet`);
      await logAudit('agent_topup', { agent_id: selectedAgent.id, amount });
      setTopupDialogOpen(false);
      fetchAgents();
    }
  };

  const logAudit = async (action: string, details: any) => {
    await supabase.from('audit_logs').insert({
      action,
      target_type: 'agent',
      details,
      created_at: new Date().toISOString(),
    });
  };

  const filteredAgents = agents.filter(agent => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchName = agent.name?.toLowerCase().includes(query);
      const matchPhone = agent.phone?.toLowerCase().includes(query);
      const matchCode = agent.agent_code?.toLowerCase().includes(query);
      if (!matchName && !matchPhone && !matchCode) return false;
    }
    // Status filter
    if (statusFilter !== 'all' && agent.status !== statusFilter) return false;
    // Network filter
    if (networkFilter !== 'all' && agent.network !== networkFilter) return false;
    return true;
  });

  const stats = {
    total: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    suspended: agents.filter(a => a.status === 'suspended').length,
    totalBalance: agents.reduce((sum, a) => sum + (a.wallet_balance || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Management</h1>
          <p className="text-muted-foreground">Manage mobile money agents for ticket sales</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Agent
          </Button>
          <Button onClick={fetchAgents} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.suspended}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Wallet Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalBalance)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or code..."
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
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={networkFilter} onValueChange={setNetworkFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Network" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Networks</SelectItem>
            <SelectItem value="airtel">Airtel</SelectItem>
            <SelectItem value="tnm">TNM</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Agents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Agents ({filteredAgents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No agents found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Wallet Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.map(agent => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-mono text-sm">
                      {agent.agent_code || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {agent.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {agent.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {agent.network?.toUpperCase() || 'AIRTEL'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {agent.location || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <Wallet className="h-4 w-4 text-green-500" />
                        {formatCurrency(agent.wallet_balance)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(agent.status)} text-white`}>
                        {agent.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(agent)}
                          title="Edit agent"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openTopupDialog(agent)}
                          title="Top up wallet"
                        >
                          <DollarSign className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openTransactionsDialog(agent)}
                          title="View transactions"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        {agent.status === 'active' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(agent, 'suspended')}
                            title="Suspend agent"
                            className="text-red-500"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(agent, 'active')}
                            title="Activate agent"
                            className="text-green-500"
                          >
                            <CheckCircle className="h-4 w-4" />
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

      {/* Create Agent Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Agent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Agent's full name"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g., 265991234567"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="agent@example.com"
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Blantyre"
              />
            </div>
            <div>
              <Label htmlFor="network">Network</Label>
              <Select 
                value={formData.network} 
                onValueChange={value => setFormData({ ...formData, network: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="airtel">Airtel</SelectItem>
                  <SelectItem value="tnm">TNM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAgent}>
              Create Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Agent Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Agent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_name">Full Name *</Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_phone">Phone Number</Label>
              <Input
                id="edit_phone"
                value={formData.phone}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_location">Location</Label>
              <Input
                id="edit_location"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_network">Network</Label>
              <Select 
                value={formData.network} 
                onValueChange={value => setFormData({ ...formData, network: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="airtel">Airtel</SelectItem>
                  <SelectItem value="tnm">TNM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAgent}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Topup Dialog */}
      <Dialog open={topupDialogOpen} onOpenChange={setTopupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Top Up Agent Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAgent && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Agent:</strong> {selectedAgent.name}</p>
                <p className="text-sm"><strong>Phone:</strong> {selectedAgent.phone}</p>
                <p className="text-sm"><strong>Current Balance:</strong> {formatCurrency(selectedAgent.wallet_balance)}</p>
              </div>
            )}
            <div>
              <Label htmlFor="topup_amount">Amount (MWK)</Label>
              <Input
                id="topup_amount"
                type="number"
                value={topupAmount}
                onChange={e => setTopupAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopupDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTopup} className="bg-green-600 hover:bg-green-700">
              <DollarSign className="h-4 w-4 mr-2" />
              Add Funds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transactions Dialog */}
      <Dialog open={transactionsDialogOpen} onOpenChange={setTransactionsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agent Transactions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAgent && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Agent:</strong> {selectedAgent.name}</p>
                <p className="text-sm"><strong>Phone:</strong> {selectedAgent.phone}</p>
              </div>
            )}
            
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Balance After</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell>{formatDate(tx.created_at)}</TableCell>
                      <TableCell>
                        <span className={getTransactionColor(tx.type)}>
                          {tx.type}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {tx.type === 'payment' ? '-' : '+'}{formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{tx.reference}</TableCell>
                      <TableCell>{formatCurrency(tx.balance_after)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransactionsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentManagement;
