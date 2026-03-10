import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';
import { log } from '../_shared/logger.ts';
import { rateLimit } from '../_shared/rate-limit.ts';

const NOTIFICATIONS_URL = Deno.env.get('SUPABASE_URL') 
  ? `${Deno.env.get('SUPABASE_URL')}/functions/v1/notifications-service`
  : 'http://localhost:54321/functions/v1/notifications-service';
const NOTIFICATIONS_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

async function sendNotification(type: string, phone: string, payload: Record<string, unknown>) {
  try {
    const res = await fetch(NOTIFICATIONS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${NOTIFICATIONS_KEY}` },
      body: JSON.stringify({ type, phone, data: payload }),
    });
    return await res.json();
  } catch (err) {
    log('bookings-service', 'notification-error', { type, phone, error: String(err) });
    return { success: false };
  }
}

async function processRefund(phone: string, amount: number) {
  log('bookings-service', 'refund-mock', { phone, amount });
  return { success: true, transaction_ref: `REF-${Date.now()}` };
}

async function chargeChangeFee(phone: string, amount: number) {
  log('bookings-service', 'charge-mock', { phone, amount });
  return { success: true, transaction_ref: `CHG-${Date.now()}` };
}

function generateTicketCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TKT-';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const supabase = getSupabaseAdmin();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (rateLimit(`bookings:${ip}`, 30)) return errorResponse('Rate limit exceeded', 429);

  const action = url.searchParams.get('action');

  try {
    // GET: lookup bookings
    if (req.method === 'GET') {
      await supabase.rpc('expire_stale_locks');
      const phone = url.searchParams.get('phone');
      const ticketCode = url.searchParams.get('ticket_code');
      if (!phone && !ticketCode) return errorResponse('Provide phone or ticket_code');

      let query = supabase.from('bookings').select('*, trips(travel_date, departure_time, routes(origin, destination))');
      if (phone) query = query.eq('phone', phone);
      if (ticketCode) query = query.eq('ticket_code', ticketCode);

      const { data, error } = await query;
      if (error) return errorResponse(error.message, 500);
      return jsonResponse(data);
    }

    // POST: Create pending booking
    if (req.method === 'POST' && action !== 'confirm' && action !== 'fail') {
      const body = await req.json();
      const { phone, trip_id, ticket_type } = body;
      if (!phone || !trip_id || !ticket_type) return errorResponse('Missing required fields: phone, trip_id, ticket_type');

      await supabase.rpc('expire_stale_locks');

      const { data: trip, error: tripErr } = await supabase
        .from('trips')
        .select('*, routes(origin, destination, one_way_price, return_price, operator_id, operators:operator_id(phone))')
        .eq('id', trip_id)
        .single();

      if (tripErr || !trip) return errorResponse('Trip not found', 404);
      if (trip.status !== 'active') return errorResponse('Trip is not available');

      const { count: activeLocks } = await supabase
        .from('seat_locks')
        .select('*', { count: 'exact', head: true })
        .eq('trip_id', trip_id)
        .eq('released', false)
        .gt('expires_at', new Date().toISOString());

      const effectiveAvailable = trip.available_seats - (activeLocks || 0);
      if (effectiveAvailable <= 0) return errorResponse('No seats available');

      const amount = ticket_type === 'return' ? trip.routes.return_price : trip.routes.one_way_price;
      const operatorPhone = (trip.routes as any)?.operators?.phone || null;

      const ticketCode = generateTicketCode();
      const { data: booking, error: bookErr } = await supabase.from('bookings').insert({
        phone,
        operator_phone: operatorPhone,
        trip_id,
        ticket_type,
        amount,
        ticket_code: ticketCode,
        status: 'pending',
      }).select().single();

      if (bookErr) return errorResponse(bookErr.message, 500);

      await supabase.from('seat_locks').insert({ trip_id, booking_id: booking.id, phone });

      log('bookings-service', 'create-pending', { id: booking.id, ticket_code: ticketCode });
      return jsonResponse({
        ...booking,
        lock_expires_at: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
        message: 'Booking created. Complete payment within 3 minutes.',
      }, 201);
    }

    // POST ?action=confirm
    if (req.method === 'POST' && action === 'confirm') {
      const body = await req.json();
      const { booking_id } = body;
      if (!booking_id) return errorResponse('Missing booking_id');

      const { data: bookingBefore } = await supabase
        .from('bookings')
        .select('*, trips(travel_date, departure_time, routes(origin, destination))')
        .eq('id', booking_id)
        .single();

      const { data, error } = await supabase.rpc('confirm_booking', { p_booking_id: booking_id });
      if (error) return errorResponse(error.message, 500);
      if (!data?.success) return errorResponse(data?.error || 'Confirmation failed', 409);

      if (bookingBefore && data.phone) {
        await sendNotification('booking_confirmed', data.phone, {
          booking_id,
          ticket_code: bookingBefore.ticket_code,
          seat_number: data.seat_number,
          route: bookingBefore.trips?.routes ? `${bookingBefore.trips.routes.origin} → ${bookingBefore.trips.routes.destination}` : '',
          travel_date: bookingBefore.trips?.travel_date,
          departure_time: bookingBefore.trips?.departure_time || 'N/A',
          amount: bookingBefore.amount,
        });
      }

      if (data.operator_phone) {
        await sendNotification('vendor_notification', data.operator_phone, {
          booking_id,
          ticket_code: bookingBefore?.ticket_code,
          passenger_phone: data.phone,
          route: bookingBefore?.trips?.routes ? `${bookingBefore.trips.routes.origin} → ${bookingBefore.trips.routes.destination}` : '',
          travel_date: bookingBefore?.trips?.travel_date,
          seat_number: data.seat_number,
        });
      }

      return jsonResponse(data);
    }

    // POST ?action=fail
    if (req.method === 'POST' && action === 'fail') {
      const body = await req.json();
      const { booking_id, reason } = body;
      if (!booking_id) return errorResponse('Missing booking_id');

      const { data, error } = await supabase.rpc('fail_booking', { p_booking_id: booking_id, p_reason: reason || 'failed' });
      if (error) return errorResponse(error.message, 500);
      if (!data?.success) return errorResponse(data?.error || 'Failed to update booking', 409);
      return jsonResponse(data);
    }

    // PUT: Customer cancel or change
    if (req.method === 'PUT') {
      const body = await req.json();
      const { ticket_code, phone, action: bookingAction } = body;
      if (!ticket_code || !phone || !bookingAction) return errorResponse('Missing required fields: ticket_code, phone, action');

      const { data: booking, error: bErr } = await supabase
        .from('bookings')
        .select('*, trips(travel_date, departure_time, available_seats, routes(origin, destination))')
        .eq('ticket_code', ticket_code)
        .eq('phone', phone)
        .single();
      if (bErr || !booking) return errorResponse('Booking not found or phone does not match', 404);

      const { data: settings } = await supabase.from('platform_settings').select('*').limit(1).single();
      const cancellationFee = settings?.cancellation_fee || 2000;
      const changeFee = settings?.change_fee || 1000;

      if (bookingAction === 'cancel') {
        if (booking.status !== 'paid') return errorResponse('Only paid bookings can be cancelled');
        const refund = booking.amount - cancellationFee;

        await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);

        const { data: trip } = await supabase.from('trips').select('available_seats').eq('id', booking.trip_id).single();
        if (trip) {
          await supabase.from('trips').update({ available_seats: trip.available_seats + 1, status: 'active' }).eq('id', booking.trip_id);
        }

        const refundResult = await processRefund(phone, refund);

        await sendNotification('booking_cancelled', phone, {
          booking_id: booking.id, ticket_code: booking.ticket_code,
          cancellation_fee: cancellationFee, refund_amount: refund,
        });

        return jsonResponse({ success: true, cancellation_fee: cancellationFee, refund_amount: refund, refund_status: refundResult.success ? 'processed' : 'failed' });
      }

      if (bookingAction === 'change') {
        if (booking.status !== 'paid') return errorResponse('Only paid bookings can be changed');
        const { new_trip_id } = body;
        if (!new_trip_id) return errorResponse('Missing new_trip_id');

        const { data: newTrip, error: ntErr } = await supabase.from('trips').select('*, routes(origin, destination)').eq('id', new_trip_id).single();
        if (ntErr || !newTrip) return errorResponse('New trip not found', 404);
        if (newTrip.available_seats < 1) return errorResponse('No seats available on new trip');

        const chargeResult = await chargeChangeFee(phone, changeFee);
        if (!chargeResult.success) return errorResponse('Payment failed', 400);

        // Release old seat
        const { data: oldTrip } = await supabase.from('trips').select('available_seats').eq('id', booking.trip_id).single();
        if (oldTrip) {
          await supabase.from('trips').update({ available_seats: oldTrip.available_seats + 1, status: 'active' }).eq('id', booking.trip_id);
        }

        // Assign new seat
        const { data: maxSeat } = await supabase
          .from('bookings').select('seat_number')
          .eq('trip_id', new_trip_id).eq('status', 'paid')
          .order('seat_number', { ascending: false }).limit(1).single();

        const newSeatNumber = (maxSeat?.seat_number || 0) + 1;
        await supabase.from('bookings').update({ trip_id: new_trip_id, seat_number: newSeatNumber }).eq('id', booking.id);
        await supabase.from('trips').update({ available_seats: newTrip.available_seats - 1, status: newTrip.available_seats - 1 <= 0 ? 'full' : 'active' }).eq('id', new_trip_id);

        await sendNotification('booking_changed', phone, { booking_id: booking.id, ticket_code: booking.ticket_code, change_fee: changeFee });

        return jsonResponse({ success: true, change_fee: changeFee, new_trip: { id: new_trip_id, date: newTrip.travel_date } });
      }

      return errorResponse('Invalid action. Use "cancel" or "change"');
    }

    // PATCH: Admin cancel or change
    if (req.method === 'PATCH') {
      const body = await req.json();
      const { id, action: bookingAction } = body;
      if (!id || !bookingAction) return errorResponse('Missing id or action');

      const { data: booking, error: bErr } = await supabase.from('bookings').select('*').eq('id', id).single();
      if (bErr || !booking) return errorResponse('Booking not found', 404);

      const { data: settings } = await supabase.from('platform_settings').select('*').limit(1).single();

      if (bookingAction === 'cancel') {
        if (booking.status !== 'paid') return errorResponse('Only paid bookings can be cancelled');
        await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);

        const { data: trip } = await supabase.from('trips').select('available_seats').eq('id', booking.trip_id).single();
        if (trip) {
          await supabase.from('trips').update({ available_seats: trip.available_seats + 1, status: 'active' }).eq('id', booking.trip_id);
        }

        await sendNotification('booking_cancelled', booking.phone, { booking_id: id, ticket_code: booking.ticket_code, fee: settings?.cancellation_fee || 2000 });
        return jsonResponse({ success: true, cancellation_fee: settings?.cancellation_fee || 2000 });
      }

      if (bookingAction === 'change') {
        if (booking.status !== 'paid') return errorResponse('Only paid bookings can be changed');
        const { new_trip_id } = body;
        if (!new_trip_id) return errorResponse('Missing new_trip_id');

        await supabase.from('bookings').update({ trip_id: new_trip_id }).eq('id', id);
        await sendNotification('booking_changed', booking.phone, { booking_id: id, ticket_code: booking.ticket_code, fee: settings?.change_fee || 1000 });
        return jsonResponse({ success: true, change_fee: settings?.change_fee || 1000 });
      }

      return errorResponse('Invalid action. Use "cancel" or "change"');
    }

    return errorResponse('Method not allowed', 405);
  } catch (e) {
    log('bookings-service', 'error', { message: String(e) });
    return errorResponse('Internal server error', 500);
  }
});
