import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { XCircle, RefreshCw, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface Trip {
  id: string;
  travel_date: string;
  status: string;
  routes: { origin: string; destination: string };
  available_seats: number;
}

export default function TripCancellation() {
  const { operator } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(0);

  const reasons = [
    { value: 'operational', label: 'Operational Issues' },
    { value: 'maintenance', label: 'Vehicle Maintenance' },
    { value: 'weather', label: 'Weather Conditions' },
    { value: 'driver_unavailable', label: 'Driver Unavailable' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    if (operator) fetchTrips();
  }, [operator]);

  useEffect(() => {
    if (selectedTrip) calculateRefund();
  }, [selectedTrip]);

  const fetchTrips = async () => {
    if (!operator) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          id, travel_date, status, available_seats, total_seats,
          routes:routes(origin, destination)
        `)
        .eq('operator_id', operator.id)
        .eq('status', 'active')
        .gte('travel_date', new Date().toISOString().split('T')[0])
        .order('travel_date', { ascending: true });

      if (error) throw error;
      setTrips(data || []);
    } catch (err) {
      console.error('Error fetching trips:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateRefund = async () => {
    if (!selectedTrip) return;
    try {
      const { data } = await supabase
        .from('bookings')
        .select('amount')
        .eq('trip_id', selectedTrip)
        .eq('status', 'paid');

      const total = (data || []).reduce((sum, b) => sum + (b.amount || 0), 0);
      setRefundAmount(total);
    } catch (err) {
      console.error('Error calculating refund:', err);
    }
  };

  const handleCancellation = async () => {
    if (!selectedTrip || !selectedReason) {
      toast.error('Please select a reason');
      return;
    }

    setProcessing(true);
    try {
      // Update trip status
      const { error: tripError } = await supabase
        .from('trips')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', selectedTrip);

      if (tripError) throw tripError;

      // Update bookings to cancelled and process refunds
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, phone, amount')
        .eq('trip_id', selectedTrip)
        .eq('status', 'paid');

      if (bookings && bookings.length > 0) {
        // Update bookings to cancelled
        await supabase
          .from('bookings')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('trip_id', selectedTrip)
          .eq('status', 'paid');

        // Record refund transactions (simplified - would integrate with payment provider)
        toast.info(`Would refund ${bookings.length} passengers totaling MWK ${refundAmount.toLocaleString()}`);
      }

      // Log the cancellation
      await supabase.from('operator_audit_logs').insert({
        operator_id: operator?.id,
        action: 'trip_cancelled',
        entity_type: 'trip',
        entity_id: selectedTrip,
        details: { reason: selectedReason, refund_amount: refundAmount },
      });

      toast.success('Trip cancelled successfully');
      setShowDialog(false);
      setSelectedTrip('');
      setSelectedReason('');
      fetchTrips();
    } catch (err) {
      console.error('Error cancelling trip:', err);
      toast.error('Failed to cancel trip');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Trip Cancellation</h1>
          <p className="text-muted-foreground">Cancel trips and process refunds</p>
        </div>
      </div>

      {/* Trip Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Trip to Cancel</CardTitle>
          <CardDescription>Choose an active trip</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedTrip} onValueChange={setSelectedTrip}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a trip" />
            </SelectTrigger>
            <SelectContent>
              {trips.map(trip => (
                <SelectItem key={trip.id} value={trip.id}>
                  <div className="flex items-center gap-2">
                    <span>{trip.routes?.origin} → {trip.routes?.destination}</span>
                    <Badge variant="outline">{trip.travel_date}</Badge>
                    <Badge variant="secondary">{trip.available_seats} seats left</Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Cancellation Preview */}
      {selectedTrip && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Cancellation Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Refund Amount</Label>
                <p className="text-2xl font-bold text-green-600">MWK {refundAmount.toLocaleString()}</p>
              </div>
              <div>
                <Label>Affected Bookings</Label>
                <p className="text-2xl font-bold">-</p>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> Cancelling this trip will automatically cancel all associated bookings 
                and initiate refund processing for paid tickets.
              </p>
            </div>

            <Button variant="destructive" onClick={() => setShowDialog(true)}>
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Trip
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirm Cancellation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cancellation Reason</Label>
              <Select value={selectedReason} onValueChange={setSelectedReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Refund Amount:</span>
                <span className="font-bold">MWK {refundAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Keep Trip</Button>
            <Button variant="destructive" onClick={handleCancellation} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
