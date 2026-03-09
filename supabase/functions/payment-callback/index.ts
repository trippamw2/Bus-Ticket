// Payment Callback Edge Function - BusTicket Malawi
// Handles payment confirmations from mobile money providers (Airtel Money, Mpamba)

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Helper fetch wrappers
async function sbQuery(table: string, query: string = "") {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
  });
  return res.json();
}

async function sbPost(table: string, body: object) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function sbPatch(table: string, query: string, body: object) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function sbRpc(name: string, params: object) {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify(params),
  });
  return res.json();
}

// Send SMS helper
async function sendSMS(phone: string, message: string, bookingId: number) {
  await sbPost("sms_logs", {
    phone,
    message,
    sms_type: "booking_confirmed",
    status: "queued",
    booking_id: bookingId,
  });
}

async function sendFailedSMS(phone: string, ticketCode: string) {
  await sbPost("sms_logs", {
    phone,
    message: `BusTicket Malawi

Payment failed for Ticket: ${ticketCode}.
Please try again or contact support: +265982972977`,
    sms_type: "payment_failed",
    status: "queued",
  });
}

// Main edge function
Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    let body: any;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const formData = await req.formData();
      body = Object.fromEntries(formData);
    }

    console.log("Payment callback received:", JSON.stringify(body));

    const paymentRef =
      body.reference || body.transaction_ref || body.transactionReference || body.ref || body.ticket_code;

    const paymentStatus = body.status || body.payment_status || body.statusCode || "";

    const amountPaid = body.amount || body.paid_amount || body.value;

    if (!paymentRef) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing payment reference" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Find booking
    let booking: any = null;
    let payment: any = null;

    const bookingsByCode: any = await sbQuery(`bookings`, `ticket_code=eq.${paymentRef}&select=*`);
    if (bookingsByCode?.length > 0) booking = bookingsByCode[0];

    if (!booking) {
      const paymentsByRef: any = await sbQuery(
        "payments",
        `transaction_reference=eq.${paymentRef}&select=*`
      );
      if (paymentsByRef?.length > 0) {
        payment = paymentsByRef[0];
        const bookingsByPayment: any = await sbQuery(
          "bookings",
          `id=eq.${payment.booking_id}&select=*`
        );
        booking = bookingsByPayment?.[0];
      }
    }

    if (!booking) {
      return new Response(
        JSON.stringify({ success: false, error: "Booking not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Already paid
    if (booking.status === "paid") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Booking already confirmed",
          ticket_code: booking.ticket_code,
          seat_number: booking.seat_number,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Determine success
    const isSuccess =
      paymentStatus.toString().toLowerCase() === "success" ||
      paymentStatus.toString().toLowerCase() === "completed" ||
      paymentStatus.toString().toLowerCase() === "successful" ||
      paymentStatus === "200" ||
      paymentStatus === "0";

    if (!isSuccess) {
      await sbPatch("bookings", `id=eq.${booking.id}`, { status: "failed" });

      if (payment) {
        await sbPatch("payments", `id=eq.${payment.id}`, { status: "failed" });
      } else {
        await sbPost("payments", {
          booking_id: booking.id,
          transaction_reference: paymentRef,
          amount: amountPaid || booking.amount,
          status: "failed",
          payment_method: body.provider || body.network || "airtel_money",
        });
      }

      await sendFailedSMS(booking.phone, booking.ticket_code);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Payment not successful",
          status: paymentStatus,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Ensure payment record exists before confirming booking
    if (!payment) {
      await sbPost("payments", {
        booking_id: booking.id,
        transaction_reference: paymentRef,
        amount: amountPaid || booking.amount,
        status: "pending",
        payment_method: body.provider || body.network || "airtel_money",
      });
    }

    // Confirm booking RPC (assign seat)
    const confirmResult: any = await sbRpc("confirm_booking", {
      p_booking_id: booking.id,
    });

    if (!confirmResult?.success) {
      console.error("Confirm booking failed:", confirmResult?.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: confirmResult?.error || "Failed to confirm booking",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Update payment status to success
    await sbPatch("payments", `transaction_reference=eq.${paymentRef}`, {
      status: "success",
      transaction_id: body.transaction_id || body.transactionId,
    });

    // Update booking status to paid
    await sbPatch("bookings", `id=eq.${booking.id}`, {
      status: "paid",
      seat_number: confirmResult.seat_number,
    });

    // Fetch route & operator info for SMS
    const trips: any = await sbQuery(
      "trips",
      `id=eq.${booking.trip_id}&select=*,routes(origin,destination),operators:operator_id(name)`
    );
    const trip = trips?.[0];
    const routeLabel = trip?.routes
      ? `${trip.routes.origin} → ${trip.routes.destination}`
      : "Route";
    const operatorName = trip?.operators?.name || "Bus Operator";

    // Send confirmation SMS
    const smsMessage = `BusTicket Malawi

Ticket: ${booking.ticket_code}
Passenger: ${booking.passenger_name || "Passenger"}
Route: ${routeLabel}
Operator: ${operatorName}
Date: ${booking.travel_date}
Time: ${booking.departure_time}
Seat: ${confirmResult.seat_number}

Show this SMS when boarding.

Support: +265982972977`;

    await sendSMS(booking.phone, smsMessage, booking.id);

    console.log("Booking confirmed:", booking.ticket_code, "Seat:", confirmResult.seat_number);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment confirmed",
        ticket_code: booking.ticket_code,
        seat_number: confirmResult.seat_number,
        status: "paid",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Payment callback error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
