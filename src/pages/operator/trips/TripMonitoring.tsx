import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Users, Eye, Ban, CheckCircle, Clock, Phone, Ticket, MapPin, RefreshCw, Calendar } from "lucide-react";

interface TripRow {
  id: string;
  travel_date: string;
  departure_time: string | null;
  total_seats: number;
  available_seats: number;
  status: string;
  created_at: string;
  routes: { origin: string; destination: string; one_way_price: number } | null;
  buses: { plate_number: string; capacity: number } | null;
}

interface BookingRow {
  id: string;
  phone: string;
  ticket_code: string;
  ticket_type: string;
  seat_number: number | null;
  amount: number;
  status: string;
  created_at: string;
}

const TripMonitoring = () => {
  const { operator } = useAuth();
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TripRow | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsDialogOpen, setBookingsDialogOpen] = useState(false);

  const fetchTrips = async (showRefresh = false) => {
    if (!operator) return;
    if (showRefresh) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("trips")
        .select("*, routes(origin, destination, one_way_price), buses(plate_number, capacity)")
        .eq("operator_id", operator.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Fetch trips error:", error);
        toast.error("Failed to load trips");
        return;
      }
      setTrips((data as unknown as TripRow[]) || []);
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (operator) fetchTrips();
  }, [operator, operator?.id]);

  // Real-time subscription
  useEffect(() => {
    if (!operator) return;
    const channel = supabase
      .channel('operator-trip-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips', filter: `operator_id=eq.${operator.id}` }, () => fetchTrips())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        if (selectedTrip) fetchBookings(selectedTrip.id);
        fetchTrips();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [operator, selectedTrip]);

  const fetchBookings = async (tripId: string) => {
    setBookingsLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Failed to load bookings");
        return;
      }
      setBookings(data || []);
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setBookingsLoading(false);
    }
  };

  const viewBookings = (trip: TripRow) => {
    setSelectedTrip(trip);
    setBookingsDialogOpen(true);
    fetchBookings(trip.id);
  };

  const toggleTripStatus = async (trip: TripRow) => {
    const newStatus = trip.status === "active" ? "cancelled" : "active";
    try {
      const { error } = await supabase.from("trips").update({ status: newStatus }).eq("id", trip.id);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(`Trip ${newStatus === "active" ? "reactivated" : "cancelled"}`);
      }
    } catch (error) {
      toast.error("Failed to update trip");
    }
    fetchTrips();
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "full": return "destructive";
      case "paid": return "default";
      case "pending": return "outline";
      default: return "secondary";
    }
  };

  const activeTrips = trips.filter(t => t.status === "active");
  const totalBooked = trips.reduce((sum, t) => sum + (t.total_seats - t.available_seats), 0);
  const totalRevenue = trips.reduce((sum, t) => {
    const booked = t.total_seats - t.available_seats;
    return sum + booked * (t.routes?.one_way_price || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trip Monitoring</h1>
          <p className="text-sm text-muted-foreground">Track trips, bookings, and passenger details in real-time</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchTrips(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{trips.length}</div>
            <p className="text-xs text-muted-foreground">Total Trips</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{activeTrips.length}</div>
            <p className="text-xs text-muted-foreground">Active Trips</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalBooked}</div>
            <p className="text-xs text-muted-foreground">Total Bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">MWK {totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Est. Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Trips Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            All Trips
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="font-medium text-lg">No trips scheduled</p>
              <p className="text-sm mt-1">Schedule your first trip from the sidebar menu.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Bus</TableHead>
                    <TableHead>Departure</TableHead>
                    <TableHead>Seats</TableHead>
                    <TableHead>Booked</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((trip) => {
                    const booked = trip.total_seats - trip.available_seats;
                    return (
                      <TableRow key={trip.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                            {trip.routes?.origin} → {trip.routes?.destination}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{trip.buses?.plate_number || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {trip.departure_time || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell>{trip.total_seats}</TableCell>
                        <TableCell>
                          <span className="font-semibold">{booked}</span>
                          <span className="text-muted-foreground">/{trip.total_seats}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(trip.status) as any}>{trip.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => viewBookings(trip)} title="View Bookings">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => toggleTripStatus(trip)} title={trip.status === "active" ? "Cancel" : "Reactivate"}>
                              {trip.status === "active" ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bookings Dialog */}
      <Dialog open={bookingsDialogOpen} onOpenChange={setBookingsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Passenger Manifest
              {selectedTrip?.routes && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {selectedTrip.routes.origin} → {selectedTrip.routes.destination}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedTrip && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Bus</p>
                <p className="font-semibold text-sm">{selectedTrip.buses?.plate_number}</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Departure</p>
                <p className="font-semibold text-sm">{selectedTrip.departure_time || "N/A"}</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="font-semibold text-sm">{selectedTrip.available_seats}/{selectedTrip.total_seats}</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={getStatusVariant(selectedTrip.status) as any}>{selectedTrip.status}</Badge>
              </div>
            </div>
          )}

          {bookingsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No bookings for this trip yet</p>
              <p className="text-sm mt-1">Bookings will appear here as passengers book tickets.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seat</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Ticket Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount (MWK)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Booked At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-bold">{b.seat_number ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {b.phone}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{b.ticket_code}</TableCell>
                      <TableCell className="capitalize">{b.ticket_type.replace("_", " ")}</TableCell>
                      <TableCell>MWK {Number(b.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(b.status) as any}>{b.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(b.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TripMonitoring;
