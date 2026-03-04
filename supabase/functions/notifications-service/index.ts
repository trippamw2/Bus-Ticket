import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';
import { log } from '../_shared/logger.ts';

const supabase = getSupabaseAdmin();

// Airtel SMS API (stub - enable when credentials are ready)
async function sendAirtelSMS(phone: string, message: string): Promise<{ success: boolean; response?: unknown }> {
  log('notifications-service', 'sms-sent', { phone, message: message.substring(0, 50) });
  return { success: true, response: { mock: true } };
}

async function sendUserTicketSMS(phone: string, ticketDetails: Record<string, unknown>) {
  const message = `Booking Confirmed!
Ticket: ${ticketDetails.ticket_code}
Seat: ${ticketDetails.seat_number}
Route: ${ticketDetails.route}
Date: ${ticketDetails.travel_date}
Time: ${ticketDetails.departure_time || 'N/A'}
Amount: MWK ${ticketDetails.amount}
Paid via Airtel Money`;
  const result = await sendAirtelSMS(phone, message);

  await supabase.from('sms_logs').insert({
    phone,
    message,
    sms_type: 'user_ticket',
    status: result.success ? 'sent' : 'failed',
    provider_response: result.response,
    booking_id: ticketDetails.booking_id as string || null,
  });

  return result;
}

async function sendVendorSMS(phone: string, bookingDetails: Record<string, unknown>) {
  const message = `New booking: ${bookingDetails.ticket_code}
Passenger: ${bookingDetails.passenger_phone}
Route: ${bookingDetails.route}
Date: ${bookingDetails.travel_date}
Time: ${bookingDetails.departure_time || 'N/A'}
Seat: ${bookingDetails.seat_number}`;
  const result = await sendAirtelSMS(phone, message);

  await supabase.from('sms_logs').insert({
    phone,
    message,
    sms_type: 'vendor_notification',
    status: result.success ? 'sent' : 'failed',
    provider_response: result.response,
    booking_id: bookingDetails.booking_id as string || null,
  });

  return result;
}

async function sendBookingCancelledSMS(phone: string, payload: Record<string, unknown>) {
  const message = `Booking Cancelled
Ticket: ${payload.ticket_code}
Route: ${payload.route || 'N/A'}
Date: ${payload.travel_date || 'N/A'}
Time: ${payload.departure_time || 'N/A'}
Original: MWK ${payload.original_amount || 0}
Cancel Fee: MWK ${payload.cancellation_fee || 0}
Refund: MWK ${payload.refund_amount || 0}
${payload.refund_status === 'processed' ? `Ref: ${payload.transaction_ref}` : 'Refund via Airtel Money pending'}`;
  
  const result = await sendAirtelSMS(phone, message);

  await supabase.from('sms_logs').insert({
    phone,
    message,
    sms_type: 'booking_cancelled',
    status: result.success ? 'sent' : 'failed',
    provider_response: result.response,
    booking_id: payload.booking_id as string || null,
  });

  return result;
}

async function sendBookingChangedSMS(phone: string, payload: Record<string, unknown>) {
  const message = `Booking Changed
Ticket: ${payload.ticket_code}
Old Trip: ${payload.old_date || 'N/A'} ${payload.old_departure_time || ''}
       ${payload.old_route || ''}
New Trip: ${payload.new_date || 'N/A'} ${payload.new_departure_time || ''}
       ${payload.new_route || ''}
Change Fee: MWK ${payload.fee || 0}
${payload.charge_status === 'processed' ? 'Paid via Airtel Money' : 'Payment pending'}`;
  
  const result = await sendAirtelSMS(phone, message);

  await supabase.from('sms_logs').insert({
    phone,
    message,
    sms_type: 'booking_changed',
    status: result.success ? 'sent' : 'failed',
    provider_response: result.response,
    booking_id: payload.booking_id as string || null,
  });

  return result;
}

async function sendRefundProcessedSMS(phone: string, payload: Record<string, unknown>) {
  const message = `Refund Processed
Ticket: ${payload.ticket_code}
Amount Refunded: MWK ${payload.refund_amount}
Transaction Ref: ${payload.transaction_ref || 'N/A'}
Refunded to Airtel Money.
Thank you for using BusLink!`;
  
  const result = await sendAirtelSMS(phone, message);

  await supabase.from('sms_logs').insert({
    phone,
    message,
    sms_type: 'refund_processed',
    status: result.success ? 'sent' : 'failed',
    provider_response: result.response,
    booking_id: payload.booking_id as string || null,
  });

  return result;
}

async function processQueue() {
  const { data: queued } = await supabase
    .from('sms_logs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(10);

  if (!queued || queued.length === 0) return { processed: 0 };

  let sent = 0;
  for (const sms of queued) {
    const result = await sendAirtelSMS(sms.phone, sms.message);
    await supabase.from('sms_logs').update({
      status: result.success ? 'sent' : 'failed',
      provider_response: result.response,
    }).eq('id', sms.id);
    if (result.success) sent++;
  }

  return { processed: queued.length, sent };
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method === 'POST') {
      const body = await req.json();
      const { type, phone, data: payload } = body;
      if (!type || !phone) return errorResponse('Missing type or phone');

      let result;

      switch (type) {
        case 'booking_confirmed':
          result = await sendUserTicketSMS(phone, payload || {});
          break;
        case 'vendor_notification':
          result = await sendVendorSMS(phone, payload || {});
          break;
        case 'booking_cancelled':
          result = await sendBookingCancelledSMS(phone, payload || {});
          break;
        case 'booking_changed':
          result = await sendBookingChangedSMS(phone, payload || {});
          break;
        case 'refund_processed':
          result = await sendRefundProcessedSMS(phone, payload || {});
          break;
        case 'process_queue':
          result = await processQueue();
          log('notifications-service', 'queue-processed', result);
          return jsonResponse(result);
        default:
          return errorResponse('Unknown notification type');
      }

      log('notifications-service', type, { phone, success: result.success });
      return jsonResponse({ success: result.success, type });
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const phone = url.searchParams.get('phone');
      const status = url.searchParams.get('status');

      let query = supabase.from('sms_logs').select('*').order('created_at', { ascending: false }).limit(50);
      if (phone) query = query.eq('phone', phone);
      if (status) query = query.eq('status', status);

      const { data, error } = await query;
      if (error) return errorResponse(error.message, 500);
      return jsonResponse(data);
    }

    return errorResponse('Method not allowed', 405);
  } catch (e) {
    log('notifications-service', 'error', { message: String(e) });
    return errorResponse('Internal server error', 500);
  }
});
