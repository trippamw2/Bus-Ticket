import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarPlus } from "lucide-react";

interface RouteOption { id: string; origin: string; destination: string; }
interface BusOption { id: string; plate_number: string; capacity: number; }

const TripCreation = () => {
  const { operator } = useAuth();
  const { toast } = useToast();
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [buses, setBuses] = useState<BusOption[]>([]);
  const [routeId, setRouteId] = useState("");
  const [busId, setBusId] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!operator) return;
    supabase.from("routes").select("id, origin, destination").eq("operator_id", operator.id).eq("status", "active")
      .then(({ data }) => setRoutes(data || []));
    supabase.from("buses").select("id, plate_number, capacity").eq("operator_id", operator.id).eq("status", "active")
      .then(({ data }) => setBuses(data || []));
  }, [operator]);

  const selectedBus = buses.find((b) => b.id === busId);

  const handleCreate = async () => {
    if (!selectedBus) return;
    setSaving(true);
    const { error } = await supabase.from("trips").insert({
      route_id: routeId,
      bus_id: busId,
      travel_date: travelDate,
      departure_time: departureTime || null,
      total_seats: selectedBus.capacity,
      available_seats: selectedBus.capacity,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Trip created successfully!" });
      setRouteId(""); setBusId(""); setTravelDate(""); setDepartureTime("");
    }
    setSaving(false);
  };

  const selectedRoute = routes.find((r) => r.id === routeId);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Create Trip</h1>
      <Card>
        <CardHeader><CardTitle>Trip Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Route</Label>
            <Select value={routeId} onValueChange={setRouteId}>
              <SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger>
              <SelectContent>
                {routes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.origin} → {r.destination}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Bus</Label>
            <Select value={busId} onValueChange={setBusId}>
              <SelectTrigger><SelectValue placeholder="Select bus" /></SelectTrigger>
              <SelectContent>
                {buses.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.plate_number} ({b.capacity} seats)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Travel Date</Label>
              <Input type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Departure Time</Label>
              <Input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
            </div>
          </div>

          {selectedBus && (
            <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
              <p>Total Seats: <span className="font-semibold">{selectedBus.capacity}</span></p>
              <p>Available Seats: <span className="font-semibold">{selectedBus.capacity}</span></p>
              {selectedRoute && <p>Route: {selectedRoute.origin} → {selectedRoute.destination}</p>}
            </div>
          )}

          <Button onClick={handleCreate} className="w-full" disabled={saving || !routeId || !busId || !travelDate}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />}
            Create Trip
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TripCreation;
