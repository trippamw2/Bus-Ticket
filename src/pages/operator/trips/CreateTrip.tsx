import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Clock, Bus, Route as RouteIcon, Plus, Loader2 } from 'lucide-react';

interface BusRecord { id: string; plate_number: string; capacity: number; }
interface RouteRecord { id: string; origin: string; destination: string; }

const CreateTrip = () => {
  const { operator } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [buses, setBuses] = useState<BusRecord[]>([]);
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [formData, setFormData] = useState({ route_id: '', bus_id: '', departure_time: '' });

  useEffect(() => {
    if (!operator?.id) return;
    const fetchData = async () => {
      try {
        const [busRes, routeRes] = await Promise.all([
          supabase.from('buses').select('id, plate_number, capacity').eq('operator_id', operator.id).eq('status', 'active').order('plate_number'),
          supabase.from('routes').select('id, origin, destination').eq('operator_id', operator.id).eq('status', 'active').order('origin'),
        ]);
        if (busRes.error) console.error('Fetch buses:', busRes.error);
        if (routeRes.error) console.error('Fetch routes:', routeRes.error);
        setBuses(busRes.data || []);
        setRoutes(routeRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load buses and routes');
      }
    };
    fetchData();
  }, [operator?.id]);

  const selectedBus = buses.find(b => b.id === formData.bus_id);
  const selectedRoute = routes.find(r => r.id === formData.route_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operator?.id) return;
    if (!formData.route_id || !formData.bus_id || !formData.departure_time) {
      toast.error('Please fill in all fields');
      return;
    }
    if (!selectedBus) { toast.error('Please select a bus'); return; }

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('trips').insert({
        operator_id: operator.id,
        route_id: formData.route_id,
        bus_id: formData.bus_id,
        travel_date: today,
        departure_time: formData.departure_time,
        total_seats: selectedBus.capacity,
        available_seats: selectedBus.capacity,
        status: 'active',
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Trip scheduled successfully!');
        navigate('/operator/trips');
      }
    } catch (error) {
      console.error('Create trip error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Schedule Trip</h1>
        <p className="text-sm text-muted-foreground">
          Create a daily bus service by selecting a route, bus, and departure time.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Trip Details</CardTitle>
          <CardDescription>Configure the route, bus, and departure schedule</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <RouteIcon className="h-4 w-4" /> Route
              </Label>
              <Select value={formData.route_id} onValueChange={(v) => setFormData({ ...formData, route_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select a route" /></SelectTrigger>
                <SelectContent>
                  {routes.length === 0 ? (
                    <SelectItem value="none" disabled>No active routes — add routes first</SelectItem>
                  ) : routes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.origin} → {r.destination}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Bus className="h-4 w-4" /> Bus
              </Label>
              <Select value={formData.bus_id} onValueChange={(v) => setFormData({ ...formData, bus_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select a bus" /></SelectTrigger>
                <SelectContent>
                  {buses.length === 0 ? (
                    <SelectItem value="none" disabled>No active buses — add buses first</SelectItem>
                  ) : buses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.plate_number} ({b.capacity} seats)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> Departure Time
              </Label>
              <Input
                type="time"
                value={formData.departure_time}
                onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                This service runs daily at the specified time.
              </p>
            </div>

            {selectedBus && selectedRoute && formData.departure_time && (
              <Card className="bg-muted/50 border-dashed">
                <CardContent className="pt-6">
                  <h4 className="text-sm font-semibold mb-3">Trip Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Route:</span>
                      <span className="font-medium">{selectedRoute.origin} → {selectedRoute.destination}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bus:</span>
                      <span className="font-medium">{selectedBus.plate_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Departure:</span>
                      <span className="font-medium">{formData.departure_time} daily</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-muted-foreground">Seats per trip:</span>
                      <span className="font-bold">{selectedBus.capacity}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button type="submit" className="w-full" disabled={loading || !formData.route_id || !formData.bus_id || !formData.departure_time}>
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scheduling...</>
              ) : (
                <><Plus className="h-4 w-4 mr-2" />Schedule Trip</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTrip;
