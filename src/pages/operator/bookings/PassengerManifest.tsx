import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Users, Phone, Mail, Search, Download, UserCheck, Bus } from 'lucide-react';

interface Booking {
  id: string;
  phone: string;
  seat_number: number;
  status: string;
  amount: number;
  ticket_code: string;
  created_at: string;
}

interface Trip {
  id: string;
  travel_date: string;
  routes: { origin: string; destination: string };
}

export default function PassengerManifest() {
  const { operator } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<string>('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, paid: 0, pending: 0, cancelled: 0 });

  useEffect(() => {
    if (operator) fetchTrips();
  }, [operator]);

  useEffect(() => {
    if (selectedTrip) fetchPassengers();
  }, [selectedTrip]);

  const fetchTrips = async () => {
    if (!operator) return;
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          id, travel_date, status,
          routes:routes(origin, destination)
        `)
        .eq('operator_id', operator.id)
        .order('travel_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTrips(data || []);
    } catch (err) {
      console.error('Error fetching trips:', err);
    }
  };

  const fetchPassengers = async () => {
    if (!selectedTrip) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('trip_id', selectedTrip)
        .order('seat_number', { ascending: true });

      if (error) throw error;
      setBookings(data || []);

      // Calculate stats
      const paid = (data || []).filter(b => b.status === 'paid').length;
      const pending = (data || []).filter(b => b.status === 'pending').length;
      const cancelled = (data || []).filter(b => b.status === 'cancelled').length;
      setStats({
        total: (data || []).length,
        paid,
        pending,
        cancelled,
      });
    } catch (err) {
      console.error('Error fetching passengers:', err);
      toast.error('Failed to load passengers');
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(b => 
    b.phone?.includes(searchTerm) || 
    b.ticket_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportManifest = () => {
    const headers = ['Seat', 'Phone', 'Status', 'Amount', 'Ticket Code', 'Booked At'];
    const rows = filteredBookings.map(b => [
      b.seat_number,
      b.phone,
      b.status,
      b.amount,
      b.ticket_code || '-',
      new Date(b.created_at).toLocaleString(),
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `manifest_${selectedTrip}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Manifest exported');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      paid: 'default',
      pending: 'secondary',
      cancelled: 'destructive',
      changed: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Passenger Manifest</h1>
          <p className="text-muted-foreground">View passengers on each trip</p>
        </div>
      </div>

      {/* Trip Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Trip</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedTrip} onValueChange={setSelectedTrip}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a trip" />
            </SelectTrigger>
            <SelectContent>
              {trips.map(trip => (
                <SelectItem key={trip.id} value={trip.id}>
                  {trip.routes?.origin} → {trip.routes?.destination} | {trip.travel_date}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Stats */}
      {selectedTrip && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Paid</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Cancelled</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Passenger List */}
      {selectedTrip && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Passengers ({filteredBookings.length})
              </CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Search by phone or ticket..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Button variant="outline" onClick={exportManifest}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No passengers found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seat</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Ticket Code</TableHead>
                    <TableHead>Booked At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map(booking => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          Seat {booking.seat_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {booking.phone}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      <TableCell>MWK {booking.amount?.toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-sm">{booking.ticket_code || '-'}</TableCell>
                      <TableCell>{new Date(booking.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
