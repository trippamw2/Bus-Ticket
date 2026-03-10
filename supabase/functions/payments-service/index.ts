import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';
import { log } from '../_shared/logger.ts';
import { rateLimit } from '../_shared/rate-limit.ts';

const BOOKINGS_URL = Deno.env.get('SUPABASE_URL') 
  ? `${Deno.env.get('SUPABASE_URL')}/functions/v1/bookings-service`
  : 'http://localhost:54321/functions/v1/bookings-service';
const BOOKINGS_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

function generateTransactionRef(bookingId: string): string {
  return `BL-${bookingId.substring(0, 8).toUpperCase()}-${Date.now()}`;
}

async function initiateAirtelPayment(phone: string, amount: number, transactionRef: string) {
  log('payments-service', 'airtel-initiate', { phone, amount, transactionRef });
  return { success: true, transaction_id: `AIRTEL-${Date.now()}` };
}

async function processAirtelRefund(phone: string, amount: number, originalRef: string) {
  log('payments-service', 'airtel-refund', { phone, amount, originalRef });
  return { success: true, transaction_id: `REF-${Date.now()}` };
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const supabase = getSupabaseAdmin();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (rateLimit(`payments:${ip}`, 20)) return errorResponse('Rate limit exceeded', 429);

  try {
    // POST: initiate payment
    if (req.method === 'POST') {
      const body = await req.json();
      const { booking_id, amount } = body;
      if (!booking_id || !amount) return errorResponse('Missing required fields: booking_id, amount');

      const { data: booking, error: bErr } = await supabase
        .from('bookings').select('id, status, phone, ticket_code').eq('id', booking_id).single();
      if (bErr || !booking) return errorResponse('Booking not found', 404);
      if (booking.status !== 'pending') return errorResponse('Booking is not pending', 400);

      const transaction_reference = generateTransactionRef(booking_id);

      const { data: payment, error: payErr } = await supabase.from('payments').insert({
        booking_id,
        transaction_reference,
        amount,
        status: 'pending',
      }).select().single();
      if (payErr) return errorResponse(payErr.message, 500);

      const airtelResult = await initiateAirtelPayment(booking.phone, Number(amount), transaction_reference);

      log('payments-service', 'initiate', { id: payment.id, booking_id, transaction_reference, airtel_success: airtelResult.success });

      return jsonResponse({
        ...payment,
        message: airtelResult.success 
          ? 'Payment initiated. Check your phone for USSD prompt.'
          : 'Payment initiation failed. Please try again.',
      }, 201);
    }

    // PUT: payment callback
    if (req.method === 'PUT') {
      const body = await req.json();
      const { transaction_reference, status } = body;
      if (!transaction_reference || !status) return errorResponse('Missing required fields: transaction_reference, status');

      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id, status, booking_id, amount')
        .eq('transaction_reference', transaction_reference)
        .single();

      if (existingPayment && existingPayment.status !== 'pending') {
        return jsonResponse({ success: true, message: 'Callback already processed', payment_id: existingPayment.id, booking_id: existingPayment.booking_id });
      }

      const { data: payment, error: pErr } = await supabase
        .from('payments')
        .update({ status, amount: body.amount || existingPayment?.amount })
        .eq('transaction_reference', transaction_reference)
        .select('*')
        .single();
      if (pErr || !payment) return errorResponse(pErr?.message || 'Payment not found', 500);

      if (status === 'success') {
        const { data: result, error: confirmErr } = await supabase.rpc('confirm_booking', { p_booking_id: payment.booking_id });
        if (confirmErr) return errorResponse(confirmErr.message, 500);

        try {
          await fetch(`${BOOKINGS_URL}?action=confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${BOOKINGS_KEY}` },
            body: JSON.stringify({ booking_id: payment.booking_id }),
          });
        } catch (e) {
          log('payments-service', 'notify-error', { error: String(e) });
        }

        return jsonResponse({ success: true, payment, booking_result: result, message: 'Payment confirmed and booking updated' });
      }

      if (status === 'failed') {
        const { data: result, error: failErr } = await supabase.rpc('fail_booking', { p_booking_id: payment.booking_id, p_reason: 'payment_failed' });
        if (failErr) return errorResponse(failErr.message, 500);
        await supabase.from('seat_locks').update({ released: true }).eq('booking_id', payment.booking_id);
        return jsonResponse({ success: true, payment, booking_result: result, message: 'Payment failed and booking updated' });
      }

      return jsonResponse({ success: true, payment, message: 'Payment status updated' });
    }

    // PATCH: refund
    if (req.method === 'PATCH') {
      const body = await req.json();
      const { booking_id, amount, reason } = body;
      if (!booking_id) return errorResponse('Missing booking_id');

      const { data: payment, error: pErr } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', booking_id)
        .eq('status', 'success')
        .single();
      if (pErr || !payment) return errorResponse('Successful payment not found for this booking', 404);

      const refundAmount = amount || Number(payment.amount);

      const { data: booking } = await supabase.from('bookings').select('phone').eq('id', booking_id).single();
      const phone = booking?.phone;
      if (!phone) return errorResponse('Customer phone not found', 400);

      const refundResult = await processAirtelRefund(phone, refundAmount, payment.transaction_reference);

      await supabase.from('payments').insert({
        booking_id,
        transaction_reference: `REF-${payment.transaction_reference}`,
        amount: refundAmount,
        status: refundResult.success ? 'refunded' : 'refund_failed',
      });

      return jsonResponse({ 
        success: refundResult.success, 
        refund_amount: refundAmount,
        transaction_ref: refundResult.transaction_id,
        message: refundResult.success ? 'Refund processed successfully' : 'Refund failed. Please contact support.'
      });
    }

    // GET: check payment status
    if (req.method === 'GET') {
      const ref = url.searchParams.get('reference');
      const bookingId = url.searchParams.get('booking_id');
      let query = supabase.from('payments').select('*');
      if (ref) query = query.eq('transaction_reference', ref);
      if (bookingId) query = query.eq('booking_id', bookingId);
      const { data, error } = await query;
      if (error) return errorResponse(error.message, 500);
      return jsonResponse(data);
    }

    return errorResponse('Method not allowed', 405);
  } catch (e) {
    log('payments-service', 'error', { message: String(e) });
    return errorResponse('Internal server error', 500);
  }
});
