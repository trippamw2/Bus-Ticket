// ============================================================
// BusLink USSD Edge Function - SELF-CONTAINED (No External Imports)
// ============================================================

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Simple Supabase REST wrapper
async function sbQuery(table: string, query: string = '') {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  return res.json();
}

async function sbPost(table: string, body: object) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function sbPatch(table: string, query: string, body: object) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function sbDelete(table: string, query: string) {
  await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    method: 'DELETE',
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
}

async function sbRpc(name: string, params: object) {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
    body: JSON.stringify(params)
  });
  return res.json();
}

// ============ HELPERS ============
async function getAgent(phone: string) {
  const data: any = await sbQuery('agents', `phone=eq.${phone}&status=eq.active&select=*`);
  return data?.[0] || null;
}

async function showWalletBalance(sessionId: string, phone: string) {
  const agents: any = await sbQuery('agents', `phone=eq.${phone}&select=wallet_balance,agent_code`);
  const agent = agents?.[0];
  await deleteSession(sessionId);
  return agent ? END(`Wallet\nCode: ${agent.agent_code}\nBal: MWK ${agent.wallet_balance?.toFixed(0) || '0'}\n\nDial *111#`) : END('Agent not found.');
}

async function showAgentBookings(sessionId: string, phone: string) {
  const bookings: any = await sbQuery('agent_bookings', `agent_phone=eq.${phone}&order=created_at.desc&limit=5&select=ticket_code,status,amount,passenger_name`);
  await deleteSession(sessionId);
  if (!bookings?.length) return END('No bookings yet.');
  let msg = 'Customer Bookings:\n';
  bookings.forEach((b: any) => { msg += `${b.ticket_code} | ${b.passenger_name}\n${b.status} | MWK ${b.amount}\n\n`; });
  return END(msg);
}

async function getSession(sessionId: string) {
  const data: any = await sbQuery('ussd_sessions', `session_id=eq.${sessionId}&select=*`);
  return data?.[0] || null;
}

async function setSession(sessionId: string, phone: string, step: string, data: any = {}) {
  await sbPatch('ussd_sessions', `session_id=eq.${sessionId}`, { session_id: sessionId, phone, step, data, updated_at: new Date().toISOString() });
}

async function deleteSession(sessionId: string) {
  await sbDelete('ussd_sessions', `session_id=eq.${sessionId}`);
}

function CON(m: string) { return new Response(m, { headers: { 'Content-Type': 'text/plain', 'Freeflow': 'FC' } }); }
function END(m: string) { return new Response(m, { headers: { 'Content-Type': 'text/plain', 'Freeflow': 'FB' } }); }

// ============ MAIN HANDLER ============
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });
  if (req.method !== 'POST') return END('Method not allowed');

  try {
    let sessionId = '', phoneNumber = '', text = '';
    const ct = req.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const b = await req.json();
      sessionId = b.sessionId || b.SESSIONID || '';
      phoneNumber = b.phoneNumber || b.MSISDN || '';
      text = b.text || b.INPUT || '';
    } else {
      const fd = await req.formData();
      sessionId = (fd.get('sessionId') || fd.get('SESSIONID') || '') as string;
      phoneNumber = (fd.get('phoneNumber') || fd.get('MSISDN') || '') as string;
      text = (fd.get('text') || fd.get('INPUT') || '') as string;
    }
    if (!sessionId || !phoneNumber) return END('Missing params');
    phoneNumber = phoneNumber.replace(/^\+/, '');
    console.log(`[USSD] ${sessionId} ${phoneNumber} "${text}"`);

    // Cleanup old sessions
    try { await sbRpc('cleanup_ussd_sessions', {}); } catch {}

    let session = await getSession(sessionId);
    const input = text.trim();

    // === MAIN MENU ===
    if (!session || input === '') {
      const agent = await getAgent(phoneNumber);
      if (agent) {
        await setSession(sessionId, phoneNumber, 'agent_menu', { is_agent: true, agent_name: agent.name });
        return CON(`Agent ${agent.name}\n1. Book4Customer\n2. Wallet\n3. MyBookings\n4. TopUp\n0. Exit`);
      }
      await setSession(sessionId, phoneNumber, 'main_menu', { is_agent: false });
      return CON('BusLink Malawi\n1. Book Ticket\n2. My Bookings\n3. Change\n4. Cancel\n5. Help');
    }

    const step = session.step;
    const sd = session.data || {};

    // === REGULAR MAIN MENU ===
    if (step === 'main_menu') {
      switch (input) {
        case '1': return await showTripsAllInOne(sessionId, phoneNumber, false);
        case '2': return await showMyBookings(sessionId, phoneNumber);
        case '3': await setSession(sessionId, phoneNumber, 'change_ticket'); return CON('Enter ticket code:');
        case '4': await setSession(sessionId, phoneNumber, 'cancel_ticket'); return CON('Enter ticket code:');
        case '5': await deleteSession(sessionId); return END('Help: Book, check bookings, change/cancel. Call: 0888-BUS-HELP');
        default: return CON('Invalid. 1-5');
      }
    }

    // === AGENT MENU ===
    if (step === 'agent_menu') {
      switch (input) {
        case '1': await setSession(sessionId, phoneNumber, 'agent_name'); return CON('Customer NAME:');
        case '2': return await showWalletBalance(sessionId, phoneNumber);
        case '3': return await showAgentBookings(sessionId, phoneNumber);
        case '4': await setSession(sessionId, phoneNumber, 'agent_topup'); return CON('Topup amount (MWK):');
        case '0': await deleteSession(sessionId); return END('Bye! Dial *111#');
        default: return CON('Invalid. 1-4 or 0');
      }
    }

    // === AGENT: CUSTOMER NAME ===
    if (step === 'agent_name') {
      if (!input || input.length < 2) return CON('Enter valid name:');
      await setSession(sessionId, phoneNumber, 'agent_phone', { is_agent: true, customer_name: input });
      return CON('Customer PHONE:');
    }

    // === AGENT: CUSTOMER PHONE ===
    if (step === 'agent_phone') {
      if (!input || input.length < 9) return CON('Enter valid phone:');
      await setSession(sessionId, phoneNumber, 'agent_trip', { is_agent: true, customer_name: sd.customer_name, customer_phone: input });
      return await showTripsAllInOne(sessionId, phoneNumber, true);
    }

    // === AGENT: TOPUP ===
    if (step === 'agent_topup') {
      const amt = parseFloat(input);
      if (isNaN(amt) || amt <= 0) return CON('Enter valid amount:');
      await sbPost('agent_wallet_transactions', { agent_phone: phoneNumber, amount: amt, type: 'deposit', status: 'pending' });
      await deleteSession(sessionId);
      return END(`Topup requested: MWK ${amt.toLocaleString()}\nPending approval.`);
    }

    // === CHANGE TICKET ===
    if (step === 'change_ticket') {
      const bks: any = await sbQuery('bookings', `ticket_code=eq.${input.toUpperCase()}&phone=eq.${phoneNumber}&status=eq.paid&select=id,ticket_code`);
      const bk = bks?.[0];
      if (!bk) { await deleteSession(sessionId); return END('Ticket not found.'); }
      const trips: any = await sbQuery('trips', `status=eq.active&available_seats=gt.0&travel_date=gte.${new Date().toISOString().split('T')[0]}&order=travel_date&limit=5&select=id,travel_date`);
      if (!trips?.length) { await deleteSession(sessionId); return END('No trips available.'); }
      let menu = 'New date:\n';
      trips.forEach((t: any, i: number) => { menu += `${i + 1}. ${t.travel_date}\n`; });
      await setSession(sessionId, phoneNumber, 'change_date', { booking_id: bk.id, ticket_code: bk.ticket_code, trips });
      return CON(menu);
    }

    if (step === 'change_date') {
      const trips = sd.trips as Array<{ id: string; travel_date: string }>;
      const idx = parseInt(input) - 1;
      if (isNaN(idx) || idx < 0 || idx >= trips.length) return CON('Invalid selection.');
      await sbPatch('bookings', `id=eq.${sd.booking_id}`, { status: 'changed', trip_id: trips[idx].id });
      await deleteSession(sessionId);
      return END(`Ticket changed to ${trips[idx].travel_date}\nFee: MWK 1000`);
    }

    // === CANCEL TICKET ===
    if (step === 'cancel_ticket') {
      const bks: any = await sbQuery('bookings', `ticket_code=eq.${input.toUpperCase()}&phone=eq.${phoneNumber}&status=eq.paid&select=id,ticket_code`);
      const bk = bks?.[0];
      if (!bk) { await deleteSession(sessionId); return END('Ticket not found.'); }
      await setSession(sessionId, phoneNumber, 'cancel_confirm', { booking_id: bk.id, ticket_code: bk.ticket_code });
      return CON(`Cancel ${bk.ticket_code}?\n1. Yes\n2. No`);
    }

    if (step === 'cancel_confirm') {
      if (input !== '1') { await deleteSession(sessionId); return END('Cancelled aborted.'); }
      await sbPatch('bookings', `id=eq.${sd.booking_id}`, { status: 'cancelled' });
      await deleteSession(sessionId);
      return END(`Ticket cancelled.\nFee: MWK 500`);
    }

    // === STEP 2: SELECT TRIP (ALL IN ONE - Route + Operator + Price) ===
    if (step === 'select_trip' || step === 'agent_trip') {
      const options = sd.trip_options as Array<{ id: string; route: string; operator: string; date: string; price: number; time: string }>;
      const idx = parseInt(input) - 1;
      if (isNaN(idx) || idx < 0 || idx >= options.length) return CON('Invalid selection.');
      
      const sel = options[idx];
      const isAgent = step === 'agent_trip';
      
      await setSession(sessionId, phoneNumber, isAgent ? 'agent_confirm' : 'confirm_booking', {
        ...sd,
        trip_id: sel.id,
        route_label: sel.route,
        operator_name: sel.operator,
        travel_date: sel.date,
        departure_time: sel.time,
        amount: sel.price,
        trip_options: undefined
      });
      
      if (isAgent) {
        return CON(`Confirm:\nCust: ${sd.customer_name}\nPhone: ${sd.customer_phone}\n${sel.route}\n${sel.operator} | ${sel.date} | MWK${sel.price}\n\n1. Confirm\n2. Cancel`);
      }
      
      if (!sd.passenger_name) {
        await setSession(sessionId, phoneNumber, 'get_passenger', { ...sd, selected_trip: sel });
        return CON(`Trip: ${sel.route}\n${sel.operator} | ${sel.date} | MWK${sel.price}\n\nEnter passenger NAME:`);
      }
      
      return CON(`Confirm:\n${sel.route}\n${sel.operator} | ${sel.date} | MWK${sel.price}\nPassenger: ${sd.passenger_name}\n\n1. Pay\n2. Cancel`);
    }

    // === GET PASSENGER NAME ===
    if (step === 'get_passenger') {
      if (!input || input.length < 2) return CON('Enter valid name:');
      const sel = sd.selected_trip as { id: string; route: string; operator: string; date: string; price: number; time: string };
      await setSession(sessionId, phoneNumber, 'confirm_booking', {
        ...sd,
        passenger_name: input,
        trip_id: sel.id,
        route_label: sel.route,
        operator_name: sel.operator,
        travel_date: sel.date,
        departure_time: sel.time,
        amount: sel.price,
        selected_trip: undefined
      });
      return CON(`Confirm:\n${sel.route}\n${sel.operator} | ${sel.date} | MWK${sel.price}\nPassenger: ${input}\n\n1. Pay\n2. Cancel`);
    }

    // === STEP 3: CONFIRM BOOKING (REGULAR) ===
    if (step === 'confirm_booking') {
      if (input === '2') { await deleteSession(sessionId); return END('Booking cancelled.'); }
      if (input !== '1') return CON('1. Pay\n2. Cancel');

      try { await sbRpc('expire_stale_locks', {}); } catch {}

      const trips: any = await sbQuery('trips', `id=eq.${sd.trip_id}&select=available_seats,status`);
      const trip = trips?.[0];
      if (!trip || trip.status !== 'active' || trip.available_seats <= 0) { await deleteSession(sessionId); return END('No seats available.'); }

      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = 'TKT-';
      for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];

      const bookingRes = await sbPost('bookings', { 
        phone: phoneNumber, 
        passenger_name: sd.passenger_name, 
        trip_id: sd.trip_id, 
        ticket_type: 'one_way', 
        amount: sd.amount, 
        ticket_code: code, 
        status: 'pending' 
      });
      
      if (!bookingRes?.[0]?.id) { await deleteSession(sessionId); return END('Booking failed.'); }
      
      const bookingId = bookingRes[0].id;
      await sbPost('seat_locks', { trip_id: sd.trip_id, booking_id: bookingId, phone: phoneNumber });
      const txRef = `USSD-${Date.now()}`;
      await sbPost('payments', { booking_id: bookingId, amount: sd.amount, transaction_reference: txRef, status: 'pending' });

      const confirmRes: any = await sbRpc('confirm_booking', { p_booking_id: bookingId });

      if (confirmRes?.success) {
        await sbPatch('payments', `transaction_reference=eq.${txRef}`, { status: 'success' });
        await sbPost('sms_logs', { phone: phoneNumber, message: `Booked! Ticket:${code} Seat:${confirmRes.seat_number} Pax:${sd.passenger_name} Date:${sd.travel_date} Route:${sd.route_label} Op:${sd.operator_name}`, sms_type: 'booking_confirmed', status: 'queued', booking_id: bookingId });
        await deleteSession(sessionId);
        return END(`SUCCESS!\nTicket: ${code}\nSeat: ${confirmRes.seat_number}\nPax: ${sd.passenger_name}\nRoute: ${sd.route_label}\nOp: ${sd.operator_name}\nDate: ${sd.travel_date}\nPaid: MWK${sd.amount}`);
      }
      await deleteSession(sessionId);
      return END('Payment failed.');
    }

    // === STEP 3: AGENT CONFIRM ===
    if (step === 'agent_confirm') {
      if (input === '2') { await deleteSession(sessionId); return END('Cancelled.'); }
      if (input !== '1') return CON('1. Confirm\n2. Cancel');

      const agents: any = await sbQuery('agents', `phone=eq.${phoneNumber}&select=wallet_balance,id`);
      const agent = agents?.[0];
      if (!agent || agent.wallet_balance < sd.amount) { await deleteSession(sessionId); return END('Insufficient wallet.'); }

      try { await sbRpc('expire_stale_locks', {}); } catch {}

      const trips: any = await sbQuery('trips', `id=eq.${sd.trip_id}&select=available_seats,status`);
      const trip = trips?.[0];
      if (!trip || trip.status !== 'active' || trip.available_seats <= 0) { await deleteSession(sessionId); return END('No seats.'); }

      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = 'TKT-';
      for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];

      const bookingRes = await sbPost('bookings', { 
        phone: sd.customer_phone, 
        passenger_name: sd.customer_name, 
        trip_id: sd.trip_id, 
        ticket_type: 'one_way', 
        amount: sd.amount, 
        ticket_code: code, 
        status: 'pending' 
      });
      
      if (!bookingRes?.[0]?.id) { await deleteSession(sessionId); return END('Booking failed.'); }
      
      const bookingId = bookingRes[0].id;
      await sbPost('agent_bookings', { agent_id: agent.id, agent_phone: phoneNumber, booking_id: bookingId, passenger_name: sd.customer_name, passenger_phone: sd.customer_phone, amount: sd.amount, ticket_code: code, status: 'pending' });
      await sbPost('seat_locks', { trip_id: sd.trip_id, booking_id: bookingId, phone: sd.customer_phone });

      const txRef = `AGT-${Date.now()}`;
      await sbPost('payments', { booking_id: bookingId, amount: sd.amount, transaction_reference: txRef, status: 'pending' });
      await sbPatch('agents', `id=eq.${agent.id}`, { wallet_balance: agent.wallet_balance - sd.amount });
      await sbPost('agent_wallet_transactions', { agent_id: agent.id, agent_phone: phoneNumber, amount: -sd.amount, type: 'purchase', description: `Ticket ${code}`, status: 'completed' });

      const confirmRes: any = await sbRpc('confirm_booking', { p_booking_id: bookingId });

      if (confirmRes?.success) {
        await sbPatch('payments', `transaction_reference=eq.${txRef}`, { status: 'success' });
        await sbPatch('agent_bookings', `booking_id=eq.${bookingId}`, { status: 'paid' });
        await sbPost('sms_logs', { phone: sd.customer_phone, message: `Booked! Ticket:${code} Seat:${confirmRes.seat_number} Pax:${sd.customer_name} Date:${sd.travel_date} Route:${sd.route_label}`, sms_type: 'booking_confirmed', status: 'queued', booking_id: bookingId });
        await deleteSession(sessionId);
        return END(`SUCCESS!\nTicket: ${code}\nSeat: ${confirmRes.seat_number}\nPax: ${sd.customer_name}\nRoute: ${sd.route_label}\nDate: ${sd.travel_date}\nPaid: MWK${sd.amount}\nFrom wallet.`);
      }
      await deleteSession(sessionId);
      return END('Failed.');
    }

    await deleteSession(sessionId);
    return END('Session expired. Dial *111# again.');
  } catch (e) {
    console.error('[USSD ERROR]', e);
    return END('Error. Try again.');
  }
});

// ============ HELPER FUNCTIONS ============

// STEP 2: Show all trips with route + operator + price IN ONE MENU
async function showTripsAllInOne(sessionId: string, phone: string, isAgent: boolean) {
  const trips: any = await sbQuery('trips', 
    `status=eq.active&available_seats=gt.0&travel_date=gte.${new Date().toISOString().split('T')[0]}&order=travel_date&limit=10&select=id,travel_date,departure_time,available_seats,route_id,operators(name),routes(origin,destination,one_way_price)`
  );

  if (!trips?.length) { await deleteSession(sessionId); return END('No trips available.'); }

  let menu = 'Select Trip (Route | Operator | Price):\n';
  const options: any[] = [];
  let idx = 1;

  trips.forEach((t: any) => {
    const route = `${t.routes.origin}→${t.routes.destination}`;
    const op = t.operators?.name || 'Bus';
    const price = t.routes.one_way_price;
    menu += `${idx}. ${route}\n   ${op} | ${t.travel_date} ${t.departure_time || ''} | MWK${price}\n`;
    options.push({ id: t.id, route, operator: op, date: t.travel_date, time: t.departure_time, price });
    idx++;
  });

  const nextStep = isAgent ? 'agent_trip' : 'select_trip';
  await setSession(sessionId, phone, nextStep, { is_agent: isAgent, trip_options: options });
  return CON(menu);
}

async function showMyBookings(sessionId: string, phone: string) {
  const bks: any = await sbQuery('bookings', 
    `phone=eq.${phone}&or=(status.eq.paid,status.eq.pending)&order=created_at.desc&limit=5&select=ticket_code,status,amount,passenger_name,trips(travel_date)`
  );
  
  await deleteSession(sessionId);
  if (!bks?.length) return END('No bookings found.');
  
  let msg = 'Your Bookings:\n';
  bks.forEach((b: any) => { msg += `${b.ticket_code} | ${b.passenger_name || '-'} | ${b.status} | MWK${b.amount} | ${b.trips?.travel_date || 'N/A'}\n`; });
  return END(msg);
}
