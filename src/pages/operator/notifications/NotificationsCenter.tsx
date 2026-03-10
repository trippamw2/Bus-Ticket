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
import { Send, MessageSquare, Mail, Phone, Loader2, CheckCircle } from 'lucide-react';

interface Booking {
  id: string;
  phone: string;
  seat_number: number;
  status: string;
  trips: { routes: { origin: string; destination: string }; travel_date: string };
}

export default function NotificationsCenter() {
  const { operator } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<string>('');
  const [messageType, setMessageType] = useState<string>('sms');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const messageTemplates = [
    { id: 'reminder', label: 'Trip Reminder', text: 'Reminder: Your bus trip from {origin} to {destination} is scheduled for {date}. Please arrive 30 minutes early.' },
    { id: 'cancelled', label: 'Trip Cancelled', text: 'Your trip from {origin} to {destination} on {date} has been cancelled. Please contact the operator for refunds.' },
    { id: 'delayed', label: 'Trip Delayed', text: 'Your trip from {origin} to {destination} has been delayed. New departure time will be communicated shortly.' },
    { id: 'custom', label: 'Custom Message', text: '' },
  ];

  useEffect(() => {
    if (operator) fetchBookings();
  }, [operator]);

  const fetchBookings = async () => {
    if (!operator) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, phone, seat_number, status,
          trips:trips(routes:routes(origin, destination), travel_date)
        `)
        .eq('trips.operator_id', operator.id)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setBookings(data || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = messageTemplates.find(t => t.id === templateId);
    if (template && templateId !== 'custom') {
      const booking = bookings.find(b => b.id === selectedBooking);
      if (booking) {
        const text = template.text
          .replace('{origin}', booking.trips?.routes?.origin || '')
          .replace('{destination}', booking.trips?.routes?.destination || '')
          .replace('{date}', booking.trips?.travel_date || '');
        setMessage(text);
      }
    }
  };

  const sendNotification = async () => {
    if (!selectedBooking || !message) {
      toast.error('Please select a passenger and enter a message');
      return;
    }

    setSending(true);
    try {
      // Log SMS (simplified - would integrate with SMS provider)
      const { error: smsError } = await supabase
        .from('sms_logs')
        .insert({
          phone: bookings.find(b => b.id === selectedBooking)?.phone,
          message: message,
          status: 'sent',
        });

      if (smsError) throw smsError;

      // Log booking event
      await supabase.from('booking_events').insert({
        booking_id: selectedBooking,
        event_type: 'notification_sent',
        event_description: message,
      });

      toast.success('Notification sent successfully');
      setShowDialog(false);
      setMessage('');
      setSelectedBooking('');
    } catch (err) {
      console.error('Error sending notification:', err);
      toast.error('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Notifications Center</h1>
          <p className="text-muted-foreground">Send SMS and email notifications to passengers</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:bg-gray-50" onClick={() => {/* Bulk SMS */ }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Send Bulk SMS</p>
                <p className="text-sm text-gray-500">Notify all passengers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-gray-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-full">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-gray-500">Send email updates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-gray-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-full">
                <Phone className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Voice Messages</p>
                <p className="text-sm text-gray-500">Automated calls</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Individual Notification */}
      <Card>
        <CardHeader>
          <CardTitle>Send Individual Notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Passenger</Label>
            <Select value={selectedBooking} onValueChange={setSelectedBooking}>
              <SelectTrigger>
                <SelectValue placeholder="Select a booking" />
              </SelectTrigger>
              <SelectContent>
                {bookings.map(booking => (
                  <SelectItem key={booking.id} value={booking.id}>
                    <div className="flex items-center gap-2">
                      <span>Seat {booking.seat_number}</span>
                      <span>-</span>
                      <span>{booking.phone}</span>
                      <Badge variant="outline">{booking.trips?.routes?.origin} → {booking.trips?.routes?.destination}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Message Template</Label>
            <Select onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {messageTemplates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Message</Label>
            <textarea
              className="w-full p-3 border rounded-lg"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message..."
            />
          </div>

          <Button onClick={() => setShowDialog(true)} disabled={!selectedBooking || !message}>
            <Send className="h-4 w-4 mr-2" />
            Send Notification
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Notification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">To: {bookings.find(b => b.id === selectedBooking)?.phone}</p>
              <p className="mt-2">{message}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={sendNotification} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
