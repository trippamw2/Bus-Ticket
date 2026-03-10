import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { FileText, User, Settings, DollarSign, AlertCircle } from 'lucide-react';

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: any;
  created_at: string;
  // aliases for template usage
  resource_type?: string;
  metadata?: any;
}

const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Failed to fetch audit logs:', error);
    } else {
      setLogs((data || []).map((d: any) => ({ ...d, resource_type: d.entity_type, metadata: d.details })));
    }
    setLoading(false);
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.resource_type === filter;
  });

  const getActionIcon = (action: string) => {
    if (action.includes('operator') || action.includes('suspend') || action.includes('approve')) {
      return <User className="h-4 w-4" />;
    }
    if (action.includes('price') || action.includes('commission')) {
      return <DollarSign className="h-4 w-4" />;
    }
    if (action.includes('settings')) {
      return <Settings className="h-4 w-4" />;
    }
    return <AlertCircle className="h-4 w-4" />;
  };

  const getActionBadge = (action: string) => {
    if (action.includes('approve')) {
      return <Badge className="bg-green-500">Approved</Badge>;
    }
    if (action.includes('suspend')) {
      return <Badge className="bg-red-500">Suspended</Badge>;
    }
    if (action.includes('commission')) {
      return <Badge className="bg-purple-500">Commission Updated</Badge>;
    }
    if (action.includes('settings')) {
      return <Badge className="bg-blue-500">Settings Changed</Badge>;
    }
    return <Badge>{action}</Badge>;
  };

  const formatMetadata = (metadata: Record<string, unknown>) => {
    if (!metadata) return '-';
    return Object.entries(metadata)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-gray-500">Track admin actions and platform changes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{logs.length}</p>
              <p className="text-gray-500">Total Actions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {logs.filter(l => l.action.includes('approve')).length}
              </p>
              <p className="text-gray-500">Approvals</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">
                {logs.filter(l => l.action.includes('suspend')).length}
              </p>
              <p className="text-gray-500">Suspensions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">
                {logs.filter(l => l.action.includes('commission')).length}
              </p>
              <p className="text-gray-500">Commission Changes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All ({logs.length})</TabsTrigger>
          <TabsTrigger value="operator">Operator ({logs.filter(l => l.resource_type === 'operator').length})</TabsTrigger>
          <TabsTrigger value="platform_settings">Settings ({logs.filter(l => l.resource_type === 'platform_settings').length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No audit logs found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource Type</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        {getActionBadge(log.action)}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {log.resource_type.replace('_', ' ')}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatMetadata(log.metadata)}
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

export default AuditLogs;
