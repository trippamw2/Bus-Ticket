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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Bus, Calendar, Clock, Users, RefreshCw, Filter, 
  XCircle, AlertTriangle, ArrowRight, MapPin, DollarSign
} from 'lucide-react';

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
  routes?: {
    origin: string;
    destination: string;
    operator_id: string;
  };
  buses?: {
    plate_number: string;
    capacity: number;
  };
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

interface Route {
  id: string;
  origin: string;
  destination: string;
  operator_id: string;
}

interface BusData {
  id: string;
  plate_number: string;
  capacity: number;
  operator_id: string;
}

interface Operator {
  id: string;
  company_name: string;
  name: string;
}

const TripManagement = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<BusData[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  
  // Dialogs
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [delayDialogOpen, setDelayDialogOpen] = useState(false);
  const [changeBusDialogOpen, setChangeBusDialogOpen] = useState(false);
  const [manifestDialogOpen, setManifestDialogOpen] = useState(false);
  
  // Selected trip
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [passengers, setPassengers] = useState<Booking[]>([]);
  const [passengersLoading, setPassengersLoading] = useState(false);
  
  // Forms
  const [delayMinutes, setDelayMinutes] = useState('');
  const [selectedBusId, setSelectedBusId] = useState('');

  useEffect(() => {
    fetchTrips();
    fetchRoutes();
    fetchBuses();
    fetchOperators();
  }, []);

  const fetchTrips = async () => {
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        routes:route_id (origin, destination, operator_id),
        buses:bus_id (plate_number, capacity)
      `)
      .order('travel_date', { ascending: false })
      .order('departure_time', { ascending: false });

    if (error) {
      toast.error('Failed to fetch trips');
    } else {
      setTrips(data || []);
    }
    setLoading(false);
  };

  const fetchRoutes = async () => {
    const { data } = await supabase
      .from('routes')
      .select('id, origin, destination, operator_id')
      .eq('status', 'active');
    if (data) setRoutes(data);
  };

  const fetchBuses = async () => {
    const { data } = await supabase
      .from('buses')
      .select('id, plate_number, capacity, operator_id')
      .eq('status', 'active');
    if (data) setBuses(data);
  };

  const fetchOperators = async () => {
    const { data } = await supabase
      .from('operators')
      .select('id, company_name, name')
      .eq('status', 'approved');
    if (data) setOperators(data);
  };

  const fetchPassengers = async (tripId: string) => {
    setPassengersLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('trip_id', tripId)
      .order('seat_number', { ascending: true });

    if (!error) {
      setPassengers(data || []);
    }
    setPassengersLoading(false);
  };

  const getOperatorName = (operatorId: string | null) => {
    if (!operatorId) return 'Unknown';
    const op = operators.find(o => o.id === operatorId);
    return op?.company_name || op?.name || 'Unknown';
  };

  const getRouteName = (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    return route ? `${route.origin} → ${route.destination}` : 'Unknown';
  };

  const getBusPlate = (busId: string) => {
    const bus = buses.find(b => b.id === busId);
    return bus?.plate_number || 'Unknown';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500';
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      case 'delayed': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '-';
    return time.substring(0, 5);
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const openCancelDialog = (trip: Trip) => {
    setSelectedTrip(trip);
    setCancelDialogOpen(true);
  };

  const openDelayDialog = (trip: Trip) => {
    setSelectedTrip(trip);
    setDelayMinutes(trip.delay_minutes?.toString() || '0');
    setDelayDialogOpen(true);
  };

  const openChangeBusDialog = (trip: Trip) => {
    setSelectedTrip(trip);
    setSelectedBusId(trip.bus_id || '');
    setChangeBusDialogOpen(true);
  };

  const openManifestDialog = (trip: Trip) => {
    setSelectedTrip(trip);
    fetchPassengers(trip.id);
    setManifestDialogOpen(true);
  };

  const handleCancelTrip = async () => {
    if (!selectedTrip) return;

    const { error } = await supabase
      .from('trips')
      .update({ status: 'cancelled' })
      .eq('id', selectedTrip.id);

    if (error) {
      toast.error('Failed to cancel trip');
    } else {
      toast.success('Trip cancelled successfully');
      await logAudit('trip_cancelled', selectedTrip.id, { reason: 'admin_cancelled' });
      setCancelDialogOpen(false);
      fetchTrips();
    }
  };

  const handleDelayTrip = async () => {
    if (!selectedTrip) return;

    const delay = parseInt(delayMinutes) || 0;
    const newStatus = delay > 0 ? 'delayed' : 'scheduled';

    const { error } = await supabase
      .from('trips')
      .update({ 
        delay_minutes: delay,
        status: newStatus
      })
      .eq('id', selectedTrip.id);

    if (error) {
      toast.error('Failed to update trip delay');
    } else {
      toast.success(delay > 0 ? `Trip delayed by ${delay} minutes` : 'Trip delay cleared');
      await logAudit('trip_delayed', selectedTrip.id, { delay_minutes: delay });
      setDelayDialogOpen(false);
      fetchTrips();
    }
  };

  const handleChangeBus = async () => {
    if (!selectedTrip || !selectedBusId) return;

    const bus = buses.find(b => b.id === selectedBusId);
    const oldBusId = selectedTrip.bus_id;

    const { error } = await supabase
      .from('trips')
      .update({ bus_id: selectedBusId })
      .eq('id', selectedTrip.id);

    if (error) {
      toast.error('Failed to change bus');
    } else {
      toast.success('Bus changed successfully');
      await logAudit('trip_bus_changed', selectedTrip.id, { 
        old_bus_id: oldBusId, 
        new_bus_id: selectedBusId,
        new_plate: bus?.plate_number
      });
      setChangeBusDialogOpen(false);
      fetchTrips();
    }
  };

  const logAudit = async (action: string, tripId: string, details: any) => {
    await supabase.from('audit_logs').insert({
      action,
      target_type: 'trip',
      target_id: tripId,
      details,
      created_at: new Date().toISOString(),
    });
  };

  const filteredTrips = trips.filter(trip => {
    // Status filter
    if (statusFilter !== 'all' && trip.status !== statusFilter) return false;
    // Operator filter
    if (operatorFilter !== 'all' && trip.routes?.operator_id !== operatorFilter) return false;
    // Date filter
    if (dateFilter && trip.travel_date !== dateFilter) return false;
    return true;
  });

  // Get available buses for the selected trip's route
  const getAvailableBuses = () => {
    if (!selectedTrip || !selectedTrip.routes?.operator_id) return buses;
    return buses.filter(b => b.operator_id === selectedTrip.routes?.operator_id);
  };

  const stats = {
    total: trips.length,
    scheduled: trips.filter(t => t.status === 'scheduled').length,
    active: trips.filter(t => t.status === 'active').length,
    delayed: trips.filter(t => t.status === 'delayed' || (t.delay_minutes && t.delay_minutes > 0)).length,
    cancelled: trips.filter(t => t.status === 'cancelled').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trip Management</h1>
          <p className="text-muted-foreground">Manage all trips in the system</p>
        </div>
        <Button onClick={fetchTrips} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Delayed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.delayed}</div>
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
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="delayed">Delayed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={operatorFilter} onValueChange={setOperatorFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Operator" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Operators</SelectItem>
            {operators.map(op => (
              <SelectItem key={op.id} value={op.id}>
                {op.company_name || op.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input 
          type="date" 
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="w-[150px]"
          placeholder="Filter by date"
        />
      </div>

      {/* Trips Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bus className="h-5 w-5" />
            All Trips ({filteredTrips.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No trips found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead>Bus</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Delay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrips.map(trip => (
                  <TableRow key={trip.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(trip.travel_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {getRouteName(trip.route_id)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {formatTime(trip.departure_time)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getBusPlate(trip.bus_id)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{getOperatorName(trip.routes?.operator_id || null)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {trip.available_seats}/{trip.total_seats}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(trip.delay_minutes && trip.delay_minutes > 0) ? (
                        <Badge className="bg-yellow-500 text-white">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {trip.delay_minutes}m
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(trip.status)} text-white`}>
                        {trip.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openManifestDialog(trip)}
                          title="View passenger manifest"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDelayDialog(trip)}
                          title="Delay trip"
                          className={trip.delay_minutes > 0 ? 'bg-yellow-50' : ''}
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openChangeBusDialog(trip)}
                          title="Change bus"
                        >
                          <Bus className="h-4 w-4" />
                        </Button>
                        {trip.status !== 'cancelled' && trip.status !== 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCancelDialog(trip)}
                            title="Cancel trip"
                            className="text-red-500 hover:text-red-600"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cancel Trip Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Warning: Cancelling this trip</p>
                <p className="text-sm text-red-600">
                  All associated bookings will be cancelled and passengers will be notified.
                </p>
              </div>
            </div>
            {selectedTrip && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Route:</strong> {getRouteName(selectedTrip.route_id)}</p>
                <p className="text-sm"><strong>Date:</strong> {formatDate(selectedTrip.travel_date)}</p>
                <p className="text-sm"><strong>Time:</strong> {formatTime(selectedTrip.departure_time)}</p>
                <p className="text-sm"><strong>Passengers:</strong> {selectedTrip.total_seats - selectedTrip.available_seats}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Trip
            </Button>
            <Button variant="destructive" onClick={handleCancelTrip}>
              Cancel Trip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delay Trip Dialog */}
      <Dialog open={delayDialogOpen} onOpenChange={setDelayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delay Trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="delay_minutes">Delay in minutes</Label>
              <Input
                id="delay_minutes"
                type="number"
                min="0"
                value={delayMinutes}
                onChange={e => setDelayMinutes(e.target.value)}
                placeholder="Enter delay in minutes"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Set to 0 to clear delay
              </p>
            </div>
            {selectedTrip && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Route:</strong> {getRouteName(selectedTrip.route_id)}</p>
                <p className="text-sm"><strong>Original Time:</strong> {formatTime(selectedTrip.departure_time)}</p>
                {parseInt(delayMinutes) > 0 && (
                  <p className="text-sm text-yellow-600">
                    <strong>New Time:</strong> {formatTime(selectedTrip.departure_time)} + {delayMinutes} min
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelayDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDelayTrip}>
              Update Delay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Bus Dialog */}
      <Dialog open={changeBusDialogOpen} onOpenChange={setChangeBusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Bus</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bus">Select Bus</Label>
              <Select value={selectedBusId} onValueChange={setSelectedBusId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a bus" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableBuses().map(bus => (
                    <SelectItem key={bus.id} value={bus.id}>
                      {bus.plate_number} (Capacity: {bus.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedTrip && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Current Bus:</strong> {getBusPlate(selectedTrip.bus_id)}</p>
                <p className="text-sm"><strong>Route:</strong> {getRouteName(selectedTrip.route_id)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeBusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeBus} disabled={!selectedBusId}>
              Change Bus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Passenger Manifest Dialog */}
      <Dialog open={manifestDialogOpen} onOpenChange={setManifestDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Passenger Manifest</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTrip && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Route:</strong> {getRouteName(selectedTrip.route_id)}</p>
                <p className="text-sm"><strong>Date:</strong> {formatDate(selectedTrip.travel_date)}</p>
                <p className="text-sm"><strong>Time:</strong> {formatTime(selectedTrip.departure_time)}</p>
                <p className="text-sm"><strong>Bus:</strong> {getBusPlate(selectedTrip.bus_id)}</p>
              </div>
            )}
            
            {passengersLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : passengers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No passengers booked for this trip
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seat</TableHead>
                    <TableHead>Passenger</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Ticket Code</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {passengers.map(passenger => (
                    <TableRow key={passenger.id}>
                      <TableCell className="font-medium">{passenger.seat_number}</TableCell>
                      <TableCell>{passenger.passenger_name || '-'}</TableCell>
                      <TableCell>{passenger.phone}</TableCell>
                      <TableCell className="font-mono text-sm">{passenger.ticket_code || '-'}</TableCell>
                      <TableCell>MWK {passenger.amount?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={passenger.status === 'paid' ? 'bg-green-500' : 'bg-gray-500'}>
                          {passenger.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {passengers.length > 0 && (
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="font-medium">Total Passengers: {passengers.length}</span>
                <span className="font-medium">
                  Total Revenue: MWK {passengers.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManifestDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TripManagement;
