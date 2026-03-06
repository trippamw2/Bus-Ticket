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
  Ticket, Search, XCircle, MessageSquare, RefreshCw, 
  Filter, User, Phone, MapPin, Bus, Calendar
} from 'lucide-react';

interface Booking {
  id: string;
  ticket_code: string;
  phone: string;
  trip_id: string;
  seat_number: number | null;
  amount: number;
  status: string;
  created_at: string;
  ticket_type: string;
  operator_phone: string | null;
  trips?: {
    travel_date: string;
    departure_time: string;
    routes?: {
      origin: string;
      destination: string;
    };
  };
}

interface Trip {
  id: string;
  route_id: string;
  travel_date: string;
  departure_time: string;
  total_seats: number;
  available_seats: number;
  routes?: {
    origin: string;
    destination: string;
  };
}

const BookingManagement = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  
  // Dialogs
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [resendSmsDialogOpen, setResendSmsDialogOpen] = useState(false);
  const [changeSeatDialogOpen, setChangeSeatDialogOpen] = useState(false);
  
  // Selected booking
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [newSeatNumber, setNewSeatNumber] = useState('');

  useEffect(() => {
    fetchBookings();
    fetchTrips();
  }, []);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        trips:trip_id (
          travel_date,
          departure_time,
          routes:route_id (origin, destination)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch bookings');
    } else {
      setBookings(data || []);
    }
    setLoading(false);
  };

  const fetchTrips = async () => {
    const { data } = await supabase
      .from('trips')
      .select(`
        id,
        route_id,
        travel_date,
        departure_time,
        total_seats,
        available_seats,
        routes:route_id (origin, destination)
      `)
      .eq('status', 'scheduled')
      .order('travel_date', { ascending: true });

    if (data) setTrips(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      case 'failed': return 'bg-gray-500';
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

  const formatTime = (time: string) => {
    if (!time) return '-';
    return time.substring(0, 5);
  };

  const formatCurrency = (amount: number) => {
    return `MWK ${amount?.toLocaleString() || 0}`;
  };

  const getTripDetails = (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return { route: '-', date: '-', time: '-' };
    return {
      route: trip.routes ? `${trip.routes.origin} → ${trip.routes.destination}` : '-',
      date: formatDate(trip.travel_date),
      time: formatTime(trip.departure_time),
      totalSeats: trip.total_seats,
      availableSeats: trip.available_seats
    };
  };

  const openCancelDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setCancelDialogOpen(true);
  };

  const openResendSmsDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setResendSmsDialogOpen(true);
  };

  const openChangeSeatDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setNewSeatNumber(booking.seat_number?.toString() || '');
    setChangeSeatDialogOpen(true);
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;

    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', selectedBooking.id);

    if (error) {
      toast.error('Failed to cancel booking');
    } else {
      toast.success('Booking cancelled successfully');
      await logAudit('booking_cancelled', selectedBooking.id, { ticket_code: selectedBooking.ticket_code });
      setCancelDialogOpen(false);
      fetchBookings();
    }
  };

  const handleResendSms = async () => {
    if (!selectedBooking) return;

    // Simulate SMS resend - in production this would call an API
    toast.success(`SMS ticket sent to ${selectedBooking.phone}`);
    await logAudit('sms_resent', selectedBooking.id, { phone: selectedBooking.phone });
    setResendSmsDialogOpen(false);
  };

  const handleChangeSeat = async () => {
    if (!selectedBooking) return;

    const newSeat = parseInt(newSeatNumber);
    if (isNaN(newSeat) || newSeat < 1) {
      toast.error('Invalid seat number');
      return;
    }

    const { error } = await supabase
      .from('bookings')
      .update({ seat_number: newSeat })
      .eq('id', selectedBooking.id);

    if (error) {
      toast.error('Failed to change seat');
    } else {
      toast.success(`Seat changed to ${newSeat}`);
      await logAudit('seat_changed', selectedBooking.id, { 
        old_seat: selectedBooking.seat_number, 
        new_seat: newSeat 
      });
      setChangeSeatDialogOpen(false);
      fetchBookings();
    }
  };

  const logAudit = async (action: string, bookingId: string, details: any) => {
    await supabase.from('audit_logs').insert({
      action,
      target_type: 'booking',
      target_id: bookingId,
      details,
      created_at: new Date().toISOString(),
    });
  };

  const filteredBookings = bookings.filter(booking => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchPhone = booking.phone?.toLowerCase().includes(query);
      const matchName = booking.passenger_name?.toLowerCase().includes(query);
      const matchCode = booking.ticket_code?.toLowerCase().includes(query);
      if (!matchPhone && !matchName && !matchCode) return false;
    }
    // Status filter
    if (statusFilter !== 'all' && booking.status !== statusFilter) return false;
    // Date filter
    if (dateFilter && booking.created_at?.split('T')[0] !== dateFilter) return false;
    return true;
  });

  const stats = {
    total: bookings.length,
    paid: bookings.filter(b => b.status === 'paid').length,
    pending: bookings.filter(b => b.status === 'pending').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    failed: bookings.filter(b => b.status === 'failed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Booking Management</h1>
          <p className="text-muted-foreground">Search and manage all bookings</p>
        </div>
        <Button onClick={fetchBookings} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
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
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by phone, name, or reference..."
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
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Input 
          type="date" 
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="w-[150px]"
        />
      </div>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            All Bookings ({filteredBookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No bookings found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Passenger</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Seat</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map(booking => {
                  const tripDetails = getTripDetails(booking.trip_id);
                  return (
                    <TableRow key={booking.id}>
                      <TableCell className="font-mono text-sm">
                        {booking.ticket_code || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {booking.passenger_name || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {booking.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {tripDetails.route}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {tripDetails.date}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {booking.seat_number || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(booking.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(booking.status)} text-white`}>
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openResendSmsDialog(booking)}
                            title="Resend SMS ticket"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openChangeSeatDialog(booking)}
                            title="Change seat"
                          >
                            <Bus className="h-4 w-4" />
                          </Button>
                          {booking.status !== 'cancelled' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openCancelDialog(booking)}
                              title="Cancel booking"
                              className="text-red-500 hover:text-red-600"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cancel Booking Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Warning: Cancelling this booking</p>
                <p className="text-sm text-red-600">
                  The passenger will be notified of the cancellation.
                </p>
              </div>
            </div>
            {selectedBooking && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Reference:</strong> {selectedBooking.ticket_code}</p>
                <p className="text-sm"><strong>Passenger:</strong> {selectedBooking.passenger_name || '-'}</p>
                <p className="text-sm"><strong>Phone:</strong> {selectedBooking.phone}</p>
                <p className="text-sm"><strong>Seat:</strong> {selectedBooking.seat_number}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Booking
            </Button>
            <Button variant="destructive" onClick={handleCancelBooking}>
              Cancel Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resend SMS Dialog */}
      <Dialog open={resendSmsDialogOpen} onOpenChange={setResendSmsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resend SMS Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Send ticket details via SMS to the passenger.</p>
            {selectedBooking && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Reference:</strong> {selectedBooking.ticket_code}</p>
                <p className="text-sm"><strong>Phone:</strong> {selectedBooking.phone}</p>
                <p className="text-sm"><strong>Seat:</strong> {selectedBooking.seat_number}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResendSmsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResendSms}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Send SMS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Seat Dialog */}
      <Dialog open={changeSeatDialogOpen} onOpenChange={setChangeSeatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Seat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="seat_number">New Seat Number</Label>
              <Input
                id="seat_number"
                type="number"
                min="1"
                value={newSeatNumber}
                onChange={e => setNewSeatNumber(e.target.value)}
                placeholder="Enter seat number"
              />
            </div>
            {selectedBooking && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Current Seat:</strong> {selectedBooking.seat_number}</p>
                <p className="text-sm"><strong>Reference:</strong> {selectedBooking.ticket_code}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeSeatDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeSeat}>
              Change Seat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingManagement;
