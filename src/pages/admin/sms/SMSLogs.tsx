import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Search, MessageSquare, Clock, CheckCircle, XCircle } from 'lucide-react';

const SMSLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('sms_logs')
      .select('*, bookings(ticket_code)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error) setLogs(data || []);
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  const filteredLogs = logs.filter(l => {
    const matchesSearch = !search || l.phone?.includes(search) || l.message?.toLowerCase().includes(search.toLowerCase()) || l.bookings?.ticket_code?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || l.status === filter;
    return matchesSearch && matchesFilter;
  });

  const stats = { total: logs.length, sent: logs.filter(l => l.status === 'sent').length, pending: logs.filter(l => l.status === 'pending' || l.status === 'queued').length, failed: logs.filter(l => l.status === 'failed').length };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">SMS Logs</h1><p className="text-muted-foreground">Monitor SMS notifications</p></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-muted"><MessageSquare className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-muted"><CheckCircle className="h-5 w-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{stats.sent}</p><p className="text-sm text-muted-foreground">Sent</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-muted"><Clock className="h-5 w-5 text-amber-600" /></div><div><p className="text-2xl font-bold">{stats.pending}</p><p className="text-sm text-muted-foreground">Pending</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-muted"><XCircle className="h-5 w-5 text-red-600" /></div><div><p className="text-2xl font-bold">{stats.failed}</p><p className="text-sm text-muted-foreground">Failed</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by phone, message, or ticket..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
            </div>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="all">All Status</option><option value="sent">Sent</option><option value="pending">Pending</option><option value="queued">Queued</option><option value="failed">Failed</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div> :
          <Table>
            <TableHeader><TableRow><TableHead>Phone</TableHead><TableHead>Message</TableHead><TableHead>Type</TableHead><TableHead>Ticket</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No SMS logs found</TableCell></TableRow> :
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.phone}</TableCell>
                  <TableCell className="max-w-xs truncate">{log.message}</TableCell>
                  <TableCell><Badge variant="outline">{log.sms_type || 'N/A'}</Badge></TableCell>
                  <TableCell>{log.bookings?.ticket_code || '-'}</TableCell>
                  <TableCell><div className="flex items-center gap-2">{getStatusIcon(log.status)}<span className="capitalize">{log.status}</span></div></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
        </CardContent>
      </Card>
    </div>
  );
};

export default SMSLogs;
