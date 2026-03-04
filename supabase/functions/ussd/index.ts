import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';
import { log } from '../_shared/logger.ts';

const supabase = getSupabaseAdmin();

// ─── Session helpers (DB-backed) ───
async function getSession(sessionId: string) {
  const { data } = await supabase
    .from('ussd_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .single();
  return data;
}

async function setSession(sessionId: string, phone: string, step: string, data: Record<string, unknown> = {}) {
  const { error } = await supabase
    .from('ussd_sessions')
    .upsert({
      session_id: sessionId,
      phone,
      step,
      data,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'session_id' });
  if (error) log('ussd', 'session-error', { error: error.message });
}

async function deleteSession(sessionId: string) {
  await supabase.from('ussd_sessions').delete().eq('session_id', sessionId);
}

// ─── USSD Response helpers ───
function CON(message: string) {
  return new Response(message, {
    headers: { 'Content-Type': 'text/plain', 'Freeflow': 'FC' },
  });
}

function END(message: string) {
  return new Response(message, {
    headers: { 'Content-Type': 'text/plain', 'Freeflow': 'FB' },
  });
}

// ─── Main handler ───
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    let sessionId: string, phoneNumber: string, text: string;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await req.json();
      sessionId = body.sessionId || body.SESSIONID || '';
      phoneNumber = body.phoneNumber || body.MSISDN || '';
      text = body.text || body.INPUT || '';
    } else {
      const formData = await req.formData();
      sessionId = (formData.get('sessionId') || formData.get('SESSIONID') || '') as string;
      phoneNumber = (formData.get('phoneNumber') || formData.get('MSISDN') || '') as string;
      text = (formData.get('text') || formData.get('INPUT') || '') as string;
    }

    if (!sessionId || !phoneNumber) {
      return errorResponse('Missing sessionId or phoneNumber');
    }

    phoneNumber = phoneNumber.replace(/^\+/, '');
    log('ussd', 'request', { sessionId, phoneNumber, text });

    await supabase.rpc('cleanup_ussd_sessions').catch(() => {});

    let session = await getSession(sessionId);
    const input = text.trim();

    // ─── No session or empty text = Main Menu ───
    if (!session || input === '') {
      await setSession(sessionId, phoneNumber, 'main_menu');
      return CON(
        'Welcome to BusLink Malawi\n' +
        '1. Book Ticket\n' +
        '2. My Bookings\n' +
        '3. Change Ticket\n' +
        '4. Cancel Ticket\n' +
        '5. Help'
      );
    }

    const step = session.step;
    const sessionData = (session.data || {}) as Record<string, unknown>;

    // ─── MAIN MENU ───
    if (step === 'main_menu') {
      switch (input) {
        case '1':
          return await showRoutes(sessionId, phoneNumber);
        case '2':
          return await showMyBookings(sessionId, phoneNumber);
        case '3':
          return await startChangeTicket(sessionId, phoneNumber);
        case '4':
          return await startCancelTicket(sessionId, phoneNumber);
        case '5':
          await deleteSession(sessionId);
          return END(
            'BusLink Malawi Help\n' +
            'Book bus tickets via USSD.\n' +
            'Pay with Airtel Money.\n' +
            'For support: 0888-BUS-HELP'
          );
        default:
          return CON('Invalid choice.\n1. Book Ticket\n2. My Bookings\n3. Change Ticket\n4. Cancel Ticket\n5. Help');
      }
    }

    // ─── BOOK TICKET FLOW ───

    // Step 1: Select route
    if (step === 'select_route') {
      const routes = sessionData.routes as Array<{ id: string; origin: string; destination: string }>;
      const idx = parseInt(input) - 1;
      if (isNaN(idx) || idx < 0 || idx >= routes.length) {
        return CON('Invalid selection. Please pick a number from the list.');
      }
      const selectedRoute = routes[idx];
      
      const { data: route } = await supabase
        .from('routes')
        .select('one_way_price, return_price')
        .eq('id', selectedRoute.id)
        .single();

      await setSession(sessionId, phoneNumber, 'select_ticket_type', {
        route_id: selectedRoute.id,
        route_label: `${selectedRoute.origin} → ${selectedRoute.destination}`,
      });

      return CON(
        `Route: ${selectedRoute.origin} → ${selectedRoute.destination}\n` +
        `Select ticket type:\n` +
        `1. One Way - MWK ${route?.one_way_price?.toLocaleString() || 'N/A'}\n` +
        `2. Return - MWK ${route?.return_price?.toLocaleString() || 'N/A'}`
      );
    }

    // Step 2: Select ticket type
    if (step === 'select_ticket_type') {
      if (input !== '1' && input !== '2') {
        return CON('Invalid choice.\n1. One Way\n2. Return');
      }
      const ticketType = input === '1' ? 'one_way' : 'return';

      // Fetch available trips for this route
      const { data: trips } = await supabase
        .from('trips')
        .select('id, travel_date, departure_time, available_seats')
        .eq('route_id', sessionData.route_id as string)
        .eq('status', 'active')
        .gt('available_seats', 0)
        .gte('travel_date', new Date().toISOString().split('T')[0])
        .order('travel_date', { ascending: true })
        .limit(5);

      if (!trips || trips.length === 0) {
        await deleteSession(sessionId);
        return END('No available trips for this route. Please try again later.');
      }

      let menu = 'Available trips:\n';
      trips.forEach((t, i) => {
        menu += `${i + 1}. ${t.travel_date} ${t.departure_time || ''} (${t.available_seats} seats)\n`;
      });

      await setSession(sessionId, phoneNumber, 'select_date', {
        ...sessionData,
        ticket_type: ticketType,
        trips: trips.map(t => ({ id: t.id, date: t.travel_date, time: t.departure_time, seats: t.available_seats })),
      });

      return CON(menu);
    }

    // Step 3: Select travel date/trip
    if (step === 'select_date') {
      const trips = sessionData.trips as Array<{ id: string; date: string; time: string; seats: number }>;
      const idx = parseInt(input) - 1;
      if (isNaN(idx) || idx < 0 || idx >= trips.length) {
        return CON('Invalid selection. Please pick a number.');
      }

      const selectedTrip = trips[idx];

      const { data: route } = await supabase
        .from('routes')
        .select('one_way_price, return_price')
        .eq('id', sessionData.route_id as string)
        .single();

      const amount = sessionData.ticket_type === 'return' ? route?.return_price : route?.one_way_price;

      await setSession(sessionId, phoneNumber, 'confirm_booking', {
        ...sessionData,
        trip_id: selectedTrip.id,
        travel_date: selectedTrip.date,
        departure_time: selectedTrip.time,
        amount,
        trips: undefined,
      });

      return CON(
        `Confirm booking:\n` +
        `Route: ${sessionData.route_label}\n` +
        `Date: ${selectedTrip.date} ${selectedTrip.time || ''}\n` +
        `Type: ${sessionData.ticket_type === 'return' ? 'Return' : 'One Way'}\n` +
        `Amount: MWK ${amount?.toLocaleString()}\n\n` +
        `1. Pay with Airtel Money\n` +
        `2. Cancel`
      );
    }

    // Step 4: Confirm booking
    if (step === 'confirm_booking') {
      if (input === '2') {
        await deleteSession(sessionId);
        return END('Booking cancelled.');
      }
      if (input !== '1') {
        return CON('1. Pay with Airtel Money\n2. Cancel');
      }

      await supabase.rpc('expire_stale_locks');

      const { data: trip } = await supabase
        .from('trips')
        .select('*, routes(one_way_price, return_price)')
        .eq('id', sessionData.trip_id as string)
        .single();

      if (!trip || trip.status !== 'active' || trip.available_seats <= 0) {
        await deleteSession(sessionId);
        return END('Sorry, no seats available for this trip.');
      }

      const { count: activeLocks } = await supabase
        .from('seat_locks')
        .select('*', { count: 'exact', head: true })
        .eq('trip_id', sessionData.trip_id as string)
        .eq('released', false)
        .gt('expires_at', new Date().toISOString());

      if (trip.available_seats - (activeLocks || 0) <= 0) {
        await deleteSession(sessionId);
        return END('All seats are currently locked. Try again shortly.');
      }

      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let ticketCode = 'TKT-';
      for (let i = 0; i < 8; i++) ticketCode += chars[Math.floor(Math.random() * chars.length)];

      const amount = sessionData.amount as number;

      const { data: booking, error: bookErr } = await supabase.from('bookings').insert({
        phone: phoneNumber,
        trip_id: sessionData.trip_id as string,
        ticket_type: sessionData.ticket_type as string,
        amount,
        ticket_code: ticketCode,
        status: 'pending',
      }).select().single();

      if (bookErr || !booking) {
        await deleteSession(sessionId);
        return END('Booking failed. Please try again.');
      }

      await supabase.from('seat_locks').insert({
        trip_id: sessionData.trip_id as string,
        booking_id: booking.id,
        phone: phoneNumber,
      });

      const txRef = `USSD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await supabase.from('payments').insert({
        booking_id: booking.id,
        amount,
        transaction_reference: txRef,
        status: 'pending',
      });

      await supabase.from('sms_logs').insert({
        phone: phoneNumber,
        message: `Booking ${ticketCode} created. Amount: MWK ${amount?.toLocaleString()}. Payment pending via Airtel Money.`,
        sms_type: 'booking_created',
        status: 'queued',
        booking_id: booking.id,
      });

      // Auto-confirm for demo (replace with Airtel Money STK push in production)
      const { data: confirmResult } = await supabase.rpc('confirm_booking', { p_booking_id: booking.id });

      if (confirmResult?.success) {
        await supabase.from('payments').update({ status: 'success' }).eq('transaction_reference', txRef);

        await supabase.from('sms_logs').insert({
          phone: phoneNumber,
          message: `Booking confirmed! Ticket: ${ticketCode}, Seat: ${confirmResult.seat_number}, Date: ${sessionData.travel_date} ${sessionData.departure_time || ''}, Route: ${sessionData.route_label}`,
          sms_type: 'booking_confirmed',
          status: 'queued',
          booking_id: booking.id,
        });

        await deleteSession(sessionId);
        log('ussd', 'booking-confirmed', { booking_id: booking.id, ticket_code: ticketCode });
        return END(
          `Booking Successful!\n` +
          `Ticket: ${ticketCode}\n` +
          `Seat: ${confirmResult.seat_number}\n` +
          `Date: ${sessionData.travel_date} ${sessionData.departure_time || ''}\n` +
          `Route: ${sessionData.route_label}\n` +
          `Amount: MWK ${amount?.toLocaleString()}\n` +
          `Paid via Airtel Money`
        );
      } else {
        await deleteSession(sessionId);
        return END('Payment processing failed. Please try again.');
      }
    }

    // ─── MY BOOKINGS FLOW ───
    if (step === 'my_bookings') {
      await deleteSession(sessionId);
      return END('Returning to main menu. Dial again to continue.');
    }

    // ─── CHANGE TICKET FLOW ───
    if (step === 'change_ticket_input') {
      const ticketCode = input.toUpperCase();
      const { data: booking } = await supabase
        .from('bookings')
        .select('*, trips(travel_date, routes(origin, destination))')
        .eq('ticket_code', ticketCode)
        .eq('phone', phoneNumber)
        .eq('status', 'paid')
        .single();

      if (!booking) {
        await deleteSession(sessionId);
        return END('Ticket not found or not eligible for change.');
      }

      const { data: altTrips } = await supabase
        .from('trips')
        .select('id, travel_date, departure_time, available_seats, route_id')
        .eq('status', 'active')
        .gt('available_seats', 0)
        .gte('travel_date', new Date().toISOString().split('T')[0])
        .order('travel_date', { ascending: true })
        .limit(5);

      if (!altTrips || altTrips.length === 0) {
        await deleteSession(sessionId);
        return END('No alternative trips available.');
      }

      let menu = 'Select new travel date:\n';
      altTrips.forEach((t, i) => {
        menu += `${i + 1}. ${t.travel_date} ${t.departure_time || ''} (${t.available_seats} seats)\n`;
      });

      await setSession(sessionId, phoneNumber, 'change_ticket_select', {
        booking_id: booking.id,
        ticket_code: ticketCode,
        alt_trips: altTrips.map(t => ({ id: t.id, date: t.travel_date, time: t.departure_time })),
      });

      return CON(menu);
    }

    if (step === 'change_ticket_select') {
      const altTrips = sessionData.alt_trips as Array<{ id: string; date: string; time: string }>;
      const idx = parseInt(input) - 1;
      if (isNaN(idx) || idx < 0 || idx >= altTrips.length) {
        return CON('Invalid selection.');
      }

      const newTrip = altTrips[idx];
      await supabase.from('bookings').update({
        status: 'changed',
        trip_id: newTrip.id,
      }).eq('id', sessionData.booking_id as string);

      const { data: settings } = await supabase.from('platform_settings').select('change_fee').limit(1).single();

      await supabase.from('sms_logs').insert({
        phone: phoneNumber,
        message: `Ticket ${sessionData.ticket_code} changed to ${newTrip.date} ${newTrip.time || ''}. Change fee: MWK ${(settings?.change_fee || 1000).toLocaleString()}`,
        sms_type: 'booking_changed',
        status: 'queued',
        booking_id: sessionData.booking_id as string,
      });

      await deleteSession(sessionId);
      log('ussd', 'ticket-changed', { booking_id: sessionData.booking_id });
      return END(`Ticket changed to ${newTrip.date} ${newTrip.time || ''}.\nChange fee: MWK ${(settings?.change_fee || 1000).toLocaleString()}\nCharged via Airtel Money.`);
    }

    // ─── CANCEL TICKET FLOW ───
    if (step === 'cancel_ticket_input') {
      const ticketCode = input.toUpperCase();
      const { data: booking } = await supabase
        .from('bookings')
        .select('id, ticket_code, amount, trip_id')
        .eq('ticket_code', ticketCode)
        .eq('phone', phoneNumber)
        .eq('status', 'paid')
        .single();

      if (!booking) {
        await deleteSession(sessionId);
        return END('Ticket not found or not eligible for cancellation.');
      }

      await setSession(sessionId, phoneNumber, 'cancel_ticket_confirm', {
        booking_id: booking.id,
        ticket_code: ticketCode,
        trip_id: booking.trip_id,
      });

      return CON(`Cancel ticket ${ticketCode}?\n1. Yes, cancel\n2. No, go back`);
    }

    if (step === 'cancel_ticket_confirm') {
      if (input === '2') {
        await deleteSession(sessionId);
        return END('Cancellation aborted.');
      }
      if (input !== '1') return CON('1. Yes, cancel\n2. No, go back');

      await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', sessionData.booking_id as string);

      const { data: trip } = await supabase.from('trips').select('available_seats').eq('id', sessionData.trip_id as string).single();
      if (trip) {
        await supabase.from('trips').update({
          available_seats: trip.available_seats + 1,
          status: 'active',
        }).eq('id', sessionData.trip_id as string);
      }

      const { data: settings } = await supabase.from('platform_settings').select('cancellation_fee').limit(1).single();

      await supabase.from('sms_logs').insert({
        phone: phoneNumber,
        message: `Ticket ${sessionData.ticket_code} cancelled. Cancellation fee: MWK ${(settings?.cancellation_fee || 2000).toLocaleString()}. Refund via Airtel Money.`,
        sms_type: 'booking_cancelled',
        status: 'queued',
        booking_id: sessionData.booking_id as string,
      });

      await deleteSession(sessionId);
      log('ussd', 'ticket-cancelled', { booking_id: sessionData.booking_id });
      return END(`Ticket ${sessionData.ticket_code} cancelled.\nFee: MWK ${(settings?.cancellation_fee || 2000).toLocaleString()}\nRefund sent via Airtel Money.`);
    }

    // Fallback
    await deleteSession(sessionId);
    return END('Session expired. Please dial again.');

  } catch (e) {
    log('ussd', 'error', { message: String(e) });
    return END('An error occurred. Please try again.');
  }
});

// ─── Helper flows ───

async function showRoutes(sessionId: string, phone: string) {
  const { data: routes } = await supabase
    .from('routes')
    .select('id, origin, destination')
    .eq('status', 'active')
    .limit(8);

  if (!routes || routes.length === 0) {
    await deleteSession(sessionId);
    return END('No routes available at this time.');
  }

  let menu = 'Select route:\n';
  routes.forEach((r, i) => {
    menu += `${i + 1}. ${r.origin} → ${r.destination}\n`;
  });

  await setSession(sessionId, phone, 'select_route', {
    routes: routes.map(r => ({ id: r.id, origin: r.origin, destination: r.destination })),
  });

  return CON(menu);
}

async function showMyBookings(sessionId: string, phone: string) {
  const { data: bookings } = await supabase
    .from('bookings')
    .select('ticket_code, status, amount, trips(travel_date, departure_time)')
    .eq('phone', phone)
    .in('status', ['paid', 'pending'])
    .order('created_at', { ascending: false })
    .limit(5);

  await deleteSession(sessionId);

  if (!bookings || bookings.length === 0) {
    return END('No active bookings found.');
  }

  let msg = 'Your bookings:\n';
  bookings.forEach((b: any) => {
    msg += `${b.ticket_code} | ${b.status} | MWK ${b.amount?.toLocaleString()} | ${b.trips?.travel_date || 'N/A'} ${b.trips?.departure_time || ''}\n`;
  });

  return END(msg);
}

async function startChangeTicket(sessionId: string, phone: string) {
  await setSession(sessionId, phone, 'change_ticket_input');
  return CON('Enter your ticket code (e.g. TKT-ABCD1234):');
}

async function startCancelTicket(sessionId: string, phone: string) {
  await setSession(sessionId, phone, 'cancel_ticket_input');
  return CON('Enter ticket code to cancel:');
}
