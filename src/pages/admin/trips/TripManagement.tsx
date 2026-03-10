import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Bus, Calendar, Clock, Users, RefreshCw, Filter, XCircle, MapPin } from 'lucide-react';

interface Trip {
  id: string;
  route_id: string;
  bus_id: string;
  travel_date: string;
  departure_time: string;
  total_seats: number;
  available_seats: number;
  status: string;
  operator_id: string | null;
  created_at: string;
  routes?: { origin: string; destination: string; operator_id: string };
  buses?: { plate_number: string; capacity: number };
}

interface Booking {
  id: string;
  phone: string;
  seat_number: number | null;
  amount: number;
  status: string;
  ticket_code: string;
  created_at: string;
}

interface Operator { id: string; company_name: string; name: string; }

const TripManagement = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [manifestDialogOpen, setManifestDialogOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [passengers, setPassengers] = useState<Booking[]>([]);
  const [passengersLoading, setPassengersLoading] = useState(false);

  useEffect(() => { fetchTrips(); fetchOperators(); }, []);

  const fetchTrips = async () => {
    const { data, error } = await supabase
      .from('trips')
      .select('*, routes:route_id (origin, destination, operator_id), buses:bus_id (plate_number, capacity)')
      .order('travel_date', { ascending: false });
    if (!error) setTrips(data || []);
    setLoading(false);
  };

  const fetchOperators = async () => {
    const { data } = await supabase.from('operators').select('id, company_name, name').eq('status', 'approved');
    if (data) setOperators(data);
  };

  const fetchPassengers = async (tripId: string) => {
    setPassengersLoading(true);
    const { data } = await supabase.from('bookings').select('*').eq('trip_id', tripId).order('seat_number', { ascending: true });
    setPassengers(data || []);
    setPassengersLoading(false);
  };

  const getOperatorName = (id: string | null) => {
    if (!id) return 'Unknown';
    const op = operators.find(o => o.id === id);
    return op?.company_name || op?.name || 'Unknown';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = { scheduled: 'bg-blue-500', active: 'bg-green-500', completed: 'bg-gray-500', cancelled: 'bg-red-500', full: 'bg-purple-500' };
    return colors[status] || 'bg-gray-500';
  };

  const handleCancelTrip = async () => {
    if (!selectedTrip) return;
    const { error } = await supabase.from('trips').update({ status: 'cancelled' }).eq('id', selectedTrip.id);
    if (error) { toast.error('Failed to cancel'); } else { toast.success('Trip cancelled'); setCancelDialogOpen(false); fetchTrips(); }
  };

  const filteredTrips = trips.filter(trip => {
    if (statusFilter !== 'all' && trip.status !== statusFilter) return false;
    if (operatorFilter !== 'all' && trip.routes?.operator_id !== operatorFilter) return false;
    if (dateFilter && trip.travel_date !== dateFilter) return false;
    return true;
  });

  const stats = {
    total: trips.length,
    active: trips.filter(t => t.status === 'active').length,
    completed: trips.filter(t => t.status === 'completed').length,
    cancelled: trips.filter(t => t.status === 'cancelled').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Trip Management</h1><p className="text-muted-foreground">Manage all trips</p></div>
        <Button onClick={fetchTrips} variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Active</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{stats.active}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Completed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-gray-600">{stats.completed}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Cancelled</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{stats.cancelled}</div></CardContent></Card>
      </div>

      <div className="flex gap-4 items-center flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem><SelectItem value="full">Full</SelectItem></SelectContent></Select>
        <Select value={operatorFilter} onValueChange={setOperatorFilter}><SelectTrigger className="w-[200px]"><SelectValue placeholder="Operator" /></SelectTrigger><SelectContent><SelectItem value="all">All Operators</SelectItem>{operators.map(op => <SelectItem key={op.id} value={op.id}>{op.company_name || op.name}</SelectItem>)}</SelectContent></Select>
        <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-[150px]" />
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Bus className="h-5 w-5" />All Trips ({filteredTrips.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-8"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div> :
          filteredTrips.length === 0 ? <div className="text-center py-8 text-muted-foreground">No trips found</div> :
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Route</TableHead><TableHead>Departure</TableHead><TableHead>Bus</TableHead><TableHead>Operator</TableHead><TableHead>Seats</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filteredTrips.map(trip => (
                <TableRow key={trip.id}>
                  <TableCell className="font-medium"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />{trip.travel_date}</div></TableCell>
                  <TableCell><div className="flex items-center gap-1"><MapPin className="h-4 w-4 text-muted-foreground" />{trip.routes?.origin} → {trip.routes?.destination}</div></TableCell>
                  <TableCell><div className="flex items-center gap-1"><Clock className="h-4 w-4 text-muted-foreground" />{trip.departure_time || '-'}</div></TableCell>
                  <TableCell><Badge variant="outline">{trip.buses?.plate_number || '-'}</Badge></TableCell>
                  <TableCell className="text-sm">{getOperatorName(trip.routes?.operator_id || null)}</TableCell>
                  <TableCell><div className="flex items-center gap-1"><Users className="h-4 w-4 text-muted-foreground" />{trip.available_seats}/{trip.total_seats}</div></TableCell>
                  <TableCell><Badge className={`${getStatusColor(trip.status)} text-white`}>{trip.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedTrip(trip); fetchPassengers(trip.id); setManifestDialogOpen(true); }} title="View passengers"><Users className="h-4 w-4" /></Button>
                      {trip.status === 'active' && <Button variant="outline" size="sm" onClick={() => { setSelectedTrip(trip); setCancelDialogOpen(true); }} title="Cancel trip"><XCircle className="h-4 w-4 text-red-500" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
        </CardContent>
      </Card>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel Trip</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">Are you sure you want to cancel this trip? This action cannot be undone.</p>
          <DialogFooter><Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Keep Trip</Button><Button variant="destructive" onClick={handleCancelTrip}>Cancel Trip</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manifestDialogOpen} onOpenChange={setManifestDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Passenger Manifest</DialogTitle></DialogHeader>
          {passengersLoading ? <div className="text-center py-4">Loading...</div> :
          passengers.length === 0 ? <div className="text-center py-4 text-muted-foreground">No passengers booked</div> :
          <Table>
            <TableHeader><TableRow><TableHead>Seat</TableHead><TableHead>Phone</TableHead><TableHead>Ticket</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {passengers.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.seat_number || '-'}</TableCell>
                  <TableCell>{p.phone}</TableCell>
                  <TableCell className="font-mono text-sm">{p.ticket_code || '-'}</TableCell>
                  <TableCell>MWK {p.amount?.toLocaleString()}</TableCell>
                  <TableCell><Badge className={p.status === 'paid' ? 'bg-green-500' : 'bg-gray-500'}>{p.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TripManagement;
