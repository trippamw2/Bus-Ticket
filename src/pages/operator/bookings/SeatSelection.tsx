import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Bus, Loader2 } from 'lucide-react';

interface Seat {
  number: number;
  status: 'available' | 'booked' | 'selected';
}

export default function SeatSelection() {
  const { operator } = useAuth();
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedTrip, setSelectedTrip] = useState('');
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [passengerDetails, setPassengerDetails] = useState<{ phone: string; name: string }[]>([]);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (operator) fetchTrips();
  }, [operator]);

  useEffect(() => {
    if (selectedTrip) fetchSeats();
  }, [selectedTrip]);

  const fetchTrips = async () => {
    if (!operator) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('id, travel_date, status, departure_time, routes(origin, destination), buses(plate_number)')
        .eq('operator_id', operator.id)
        .eq('status', 'active')
        .gte('travel_date', new Date().toISOString().split('T')[0])
        .order('travel_date', { ascending: true })
        .limit(20);
      if (error) throw error;
      setTrips(data || []);
    } catch (err) {
      console.error('Error fetching trips:', err);
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const fetchSeats = async () => {
    if (!selectedTrip) return;
    setLoading(true);
    try {
      const { data: tripData } = await supabase
        .from('trips')
        .select('total_seats, buses(capacity)')
        .eq('id', selectedTrip)
        .single();
      
      const capacity = tripData?.total_seats || (tripData?.buses as any)?.capacity || 50;

      const { data: bookings } = await supabase
        .from('bookings')
        .select('seat_number')
        .eq('trip_id', selectedTrip)
        .eq('status', 'paid');

      const bookedSeats = (bookings || []).map(b => b.seat_number).filter(Boolean);

      const seatMap: Seat[] = [];
      for (let i = 1; i <= capacity; i++) {
        seatMap.push({
          number: i,
          status: bookedSeats.includes(i) ? 'booked' : 'available',
        });
      }
      setSeats(seatMap);
    } catch (err) {
      console.error('Error fetching seats:', err);
      toast.error('Failed to load seats');
    } finally {
      setLoading(false);
    }
  };

  const toggleSeat = (seatNumber: number) => {
    const seat = seats.find(s => s.number === seatNumber);
    if (!seat || seat.status === 'booked') return;

    if (selectedSeats.includes(seatNumber)) {
      const idx = selectedSeats.indexOf(seatNumber);
      setSelectedSeats(selectedSeats.filter(s => s !== seatNumber));
      setPassengerDetails(passengerDetails.filter((_, i) => i !== idx));
    } else {
      if (selectedSeats.length >= 5) {
        toast.warning('Maximum 5 seats per booking');
        return;
      }
      setSelectedSeats([...selectedSeats, seatNumber]);
      setPassengerDetails([...passengerDetails, { phone: '', name: '' }]);
    }
  };

  const handleBooking = async () => {
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat');
      return;
    }
    const invalidPassengers = passengerDetails.some(p => !p.phone);
    if (invalidPassengers) {
      toast.error('Please fill in phone number for each passenger');
      return;
    }

    setBookingLoading(true);
    try {
      const ticketChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      for (let i = 0; i < selectedSeats.length; i++) {
        let ticketCode = 'TKT-';
        for (let j = 0; j < 8; j++) ticketCode += ticketChars[Math.floor(Math.random() * ticketChars.length)];

        const { error: bookingError } = await supabase
          .from('bookings')
          .insert({
            trip_id: selectedTrip,
            phone: passengerDetails[i].phone,
            seat_number: selectedSeats[i],
            status: 'paid',
            ticket_type: 'one_way',
            ticket_code: ticketCode,
            amount: 0,
          });
        if (bookingError) throw bookingError;
      }

      toast.success(`Booked ${selectedSeats.length} seat(s) successfully`);
      setShowBookingDialog(false);
      setSelectedSeats([]);
      setPassengerDetails([]);
      fetchSeats();
    } catch (err) {
      console.error('Error creating booking:', err);
      toast.error('Failed to create booking');
    } finally {
      setBookingLoading(false);
    }
  };

  const getSeatColor = (seat: Seat) => {
    if (selectedSeats.includes(seat.number)) return 'bg-green-500 hover:bg-green-600 text-white';
    if (seat.status === 'booked') return 'bg-destructive/30 cursor-not-allowed';
    return 'bg-background border-2 border-border hover:border-primary';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Seat Selection</h1>
        <p className="text-muted-foreground">Visual seat booking for trips</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Select Trip</CardTitle></CardHeader>
        <CardContent>
          <Select value={selectedTrip} onValueChange={setSelectedTrip}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a trip" />
            </SelectTrigger>
            <SelectContent>
              {trips.map((trip: any) => (
                <SelectItem key={trip.id} value={trip.id}>
                  {trip.routes?.origin} → {trip.routes?.destination} | {trip.travel_date} | {trip.buses?.plate_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedTrip && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Seat Map</CardTitle>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1"><div className="w-4 h-4 bg-background border-2 border-border rounded" /> Available</span>
                <span className="flex items-center gap-1"><div className="w-4 h-4 bg-destructive/30 rounded" /> Booked</span>
                <span className="flex items-center gap-1"><div className="w-4 h-4 bg-green-500 rounded" /> Selected</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
              <>
                <div className="mb-8 flex justify-center">
                  <div className="bg-muted px-4 py-2 rounded text-sm text-muted-foreground">
                    <Bus className="h-4 w-4 inline mr-2" />Driver
                  </div>
                </div>
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, minmax(50px, 1fr))' }}>
                  {seats.map(seat => (
                    <button
                      key={seat.number}
                      onClick={() => toggleSeat(seat.number)}
                      disabled={seat.status === 'booked'}
                      className={`h-12 rounded-lg font-medium transition-all flex items-center justify-center ${getSeatColor(seat)}`}
                    >
                      {seat.number}
                    </button>
                  ))}
                </div>
                {selectedSeats.length > 0 && (
                  <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Selected: {selectedSeats.sort((a, b) => a - b).join(', ')}</p>
                        <p className="text-sm text-muted-foreground">{selectedSeats.length} seat(s)</p>
                      </div>
                      <Button onClick={() => setShowBookingDialog(true)}>Continue Booking</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Passenger Details</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {selectedSeats.sort((a, b) => a - b).map((seatNum, index) => (
              <div key={seatNum} className="p-4 border rounded-lg">
                <Badge className="mb-3">Seat {seatNum}</Badge>
                <div className="grid gap-3">
                  <div>
                    <Label>Passenger Name</Label>
                    <Input
                      value={passengerDetails[index]?.name || ''}
                      onChange={(e) => {
                        const updated = [...passengerDetails];
                        updated[index] = { ...updated[index], name: e.target.value };
                        setPassengerDetails(updated);
                      }}
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      value={passengerDetails[index]?.phone || ''}
                      onChange={(e) => {
                        const updated = [...passengerDetails];
                        updated[index] = { ...updated[index], phone: e.target.value };
                        setPassengerDetails(updated);
                      }}
                      placeholder="+265..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookingDialog(false)}>Cancel</Button>
            <Button onClick={handleBooking} disabled={bookingLoading}>
              {bookingLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
