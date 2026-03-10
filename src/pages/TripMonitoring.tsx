import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Eye } from "lucide-react";

interface TripRow {
  id: string;
  travel_date: string;
  departure_time: string | null;
  total_seats: number;
  available_seats: number;
  status: string | null;
  route: { origin: string; destination: string } | null;
  bus: { plate_number: string } | null;
}

interface Passenger {
  id: string;
  phone: string;
  seat_number: number | null;
  ticket_type: string;
  status: string | null;
  ticket_code: string | null;
}

const TripMonitoring = () => {
  const { operator } = useAuth();
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [passLoading, setPassLoading] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null);

  useEffect(() => {
    if (!operator) return;
    const fetchTrips = async () => {
      // Get buses for this operator first
      const { data: busesData } = await supabase
        .from("buses")
        .select("id")
        .eq("operator_id", operator.id);
      const busIds = (busesData || []).map((b) => b.id);
      if (busIds.length === 0) { setLoading(false); return; }

      const { data } = await supabase
        .from("trips")
        .select("id, travel_date, departure_time, total_seats, available_seats, status, route:routes(origin, destination), bus:buses(plate_number)")
        .in("bus_id", busIds)
        .order("travel_date", { ascending: false });
      setTrips((data as unknown as TripRow[]) || []);
      setLoading(false);
    };
    fetchTrips();
  }, [operator]);

  const viewPassengers = async (tripId: string) => {
    setSelectedTrip(tripId);
    setPassLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select("id, phone, seat_number, ticket_type, status, ticket_code")
      .eq("trip_id", tripId)
      .eq("status", "paid")
      .order("seat_number", { ascending: true });
    setPassengers((data as Passenger[]) || []);
    setPassLoading(false);
  };

  const statusColor = (s: string | null) => {
    if (s === "active") return "default";
    if (s === "full") return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Trip Monitoring</h1>

      <Card>
        <CardHeader><CardTitle>All Trips</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : trips.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No trips found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Bus</TableHead>
                  <TableHead>Sold</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Passengers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((t) => {
                  const sold = t.total_seats - t.available_seats;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        {t.route ? `${t.route.origin} → ${t.route.destination}` : "—"}
                      </TableCell>
                      <TableCell>{t.travel_date}</TableCell>
                      <TableCell>{t.departure_time || "—"}</TableCell>
                      <TableCell>{t.bus?.plate_number || "—"}</TableCell>
                      <TableCell>{sold}</TableCell>
                      <TableCell>{t.available_seats}</TableCell>
                      <TableCell><Badge variant={statusColor(t.status)}>{t.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => viewPassengers(t.id)}>
                              <Eye className="mr-1 h-4 w-4" />{sold}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" /> Passenger List
                              </DialogTitle>
                            </DialogHeader>
                            {passLoading ? (
                              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                            ) : passengers.length === 0 ? (
                              <p className="text-center text-muted-foreground py-6">No passengers yet.</p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Seat</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Ticket</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {passengers.map((p) => (
                                    <TableRow key={p.id}>
                                      <TableCell>{p.seat_number ?? "—"}</TableCell>
                                      <TableCell>{p.phone}</TableCell>
                                      <TableCell>{p.ticket_type}</TableCell>
                                      <TableCell className="font-mono text-xs">{p.ticket_code || "—"}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TripMonitoring;
