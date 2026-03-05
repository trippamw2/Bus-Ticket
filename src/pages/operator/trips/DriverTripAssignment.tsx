import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, User, Bus, Calendar, MapPin, Clock, CheckCircle, XCircle, Plus, Users } from "lucide-react";
import { toast } from "sonner";

interface Driver {
  id: string;
  full_name: string;
  phone: string;
  status: string;
}

interface BusVehicle {
  id: string;
  plate_number: string;
  capacity: number;
}

interface Trip {
  id: string;
  departure_time: string;
  status: string;
  route_id: string;
  bus_id: string;
}

interface Route {
  id: string;
  origin: string;
  destination: string;
}

interface TripAssignment {
  id: string;
  trip_id: string;
  driver_id: string;
  bus_id: string;
  assigned_at: string;
  status: string;
  notes: string | null;
}

const DriverTripAssignment = () => {
  const { operator } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [buses, setBuses] = useState<BusVehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [assignments, setAssignments] = useState<TripAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    trip_id: "",
    driver_id: "",
    bus_id: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (operator) {
      fetchData();
    }
  }, [operator, operator?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch drivers
      const { data: driversData } = await supabase
        .from("drivers")
        .select("id, full_name, phone, status")
        .eq("operator_id", operator?.id)
        .eq("status", "active")
        .order("full_name");
      setDrivers(driversData || []);

      // Fetch buses
      const { data: busesData } = await supabase
        .from("buses")
        .select("id, plate_number, capacity")
        .eq("operator_id", operator?.id)
        .eq("status", "active")
        .order("plate_number");
      setBuses(busesData || []);

      // Fetch routes
      const { data: routesData } = await supabase
        .from("routes")
        .select("id, origin, destination")
        .eq("operator_id", operator?.id);
      setRoutes(routesData || []);

      // Fetch trips
      const { data: tripsData } = await supabase
        .from("trips")
        .select("id, departure_time, status, route_id, bus_id")
        .eq("operator_id", operator?.id)
        .gte("departure_time", new Date().toISOString())
        .order("departure_time")
        .limit(50);
      setTrips(tripsData || []);

      // Fetch trip assignments
      const { data: assignmentsData } = await supabase
        .from("trip_assignments")
        .select("*")
        .order("assigned_at", { ascending: false });
      setAssignments(assignmentsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const handleAssignDriver = async () => {
    if (!assignForm.trip_id || !assignForm.driver_id || !assignForm.bus_id) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      await supabase.from("trip_assignments").insert({
        trip_id: assignForm.trip_id,
        driver_id: assignForm.driver_id,
        bus_id: assignForm.bus_id,
        notes: assignForm.notes || null,
        status: "assigned",
      });

      toast.success("Driver assigned to trip");
      setDialogOpen(false);
      setAssignForm({ trip_id: "", driver_id: "", bus_id: "", notes: "" });
      fetchData();
    } catch (error) {
      toast.error("Failed to assign driver");
    }
    setSaving(false);
  };

  const unassignDriver = async (assignmentId: string) => {
    if (!confirm("Unassign driver from this trip?")) return;
    
    try {
      await supabase
        .from("trip_assignments")
        .update({ status: "cancelled" })
        .eq("id", assignmentId);
      toast.success("Driver unassigned");
      fetchData();
    } catch (error) {
      toast.error("Failed to unassign driver");
    }
  };

  const getRouteName = (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    return route ? `${route.origin} → ${route.destination}` : "Unknown Route";
  };

  const getDriverName = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver?.full_name || "Unknown";
  };

  const getBusPlate = (busId: string) => {
    const bus = buses.find(b => b.id === busId);
    return bus?.plate_number || "Unknown";
  };

  const getTripAssignment = (tripId: string) => {
    return assignments.find(a => a.trip_id === tripId && a.status === "assigned");
  };

  const unassignedTrips = trips.filter(t => !getTripAssignment(t.id));
  const assignedTrips = trips.filter(t => getTripAssignment(t.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Driver Trip Assignment
          </h1>
          <p className="text-sm text-muted-foreground">
            Assign drivers and buses to upcoming trips
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Assign Driver
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Upcoming Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{trips.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{assignedTrips.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Unassigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{unassignedTrips.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Trip Assignments</CardTitle>
          <CardDescription>
            Driver and bus assignments for upcoming trips
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No upcoming trips. Create trips first.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trip Date/Time</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Driver</TableHead>
                  <TableHead>Assigned Bus</TableHead>
                  <TableHead>Assigned At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((trip) => {
                  const assignment = getTripAssignment(trip.id);
                  return (
                    <TableRow key={trip.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {new Date(trip.departure_time).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(trip.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {getRouteName(trip.route_id)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {assignment ? (
                          <Badge className="bg-green-500">Assigned</Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600">Unassigned</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {assignment ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {getDriverName(assignment.driver_id)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {assignment ? (
                          <div className="flex items-center gap-2">
                            <Bus className="h-4 w-4 text-muted-foreground" />
                            {getBusPlate(assignment.bus_id)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {assignment ? (
                          <span className="text-sm text-muted-foreground">
                            {new Date(assignment.assigned_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {assignment ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => unassignDriver(assignment.id)}
                          >
                            Unassign
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAssignForm({ ...assignForm, trip_id: trip.id });
                              setDialogOpen(true);
                            }}
                          >
                            Assign
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assign Driver Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Driver to Trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Trip</label>
              <Select value={assignForm.trip_id} onValueChange={(v) => setAssignForm({ ...assignForm, trip_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select trip" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedTrips.map((trip) => (
                    <SelectItem key={trip.id} value={trip.id}>
                      {getRouteName(trip.route_id)} - {new Date(trip.departure_time).toLocaleDateString()} {new Date(trip.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Driver</label>
              <Select value={assignForm.driver_id} onValueChange={(v) => setAssignForm({ ...assignForm, driver_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.full_name} ({driver.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bus</label>
              <Select value={assignForm.bus_id} onValueChange={(v) => setAssignForm({ ...assignForm, bus_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bus" />
                </SelectTrigger>
                <SelectContent>
                  {buses.map((bus) => (
                    <SelectItem key={bus.id} value={bus.id}>
                      {bus.plate_number} ({bus.capacity} seats)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Input
                placeholder="Any additional notes..."
                value={assignForm.notes}
                onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
              />
            </div>

            <Button
              onClick={handleAssignDriver}
              className="w-full"
              disabled={saving || !assignForm.trip_id || !assignForm.driver_id || !assignForm.bus_id}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Driver
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverTripAssignment;
