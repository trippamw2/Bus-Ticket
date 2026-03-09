// Payment Callback Edge Function
// Handles payment confirmations from mobile money providers (Airtel Money, Mpamba)
// This completes the booking flow: pending_payment → paid

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Simple fetch wrapper
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

// SMS sending function
async function sendSMS(phone: string, message: string, ticketCode: string, seatNumber: number, route: string, date: string, time: string) {
  await sbPost("sms_logs", {
    phone,
    message: `BusTicket Malawi

Ticket: ${ticketCode}
Passenger: (see below)
Route: ${route}
Date: ${date}
Time: ${time}
Seat: ${seatNumber}

Show this SMS when boarding.

Support: +265982972977`,
    sms_type: "booking_confirmed",
    status: "queued",
  });
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Support both webhook formats from different providers
    let body: any;
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const formData = await req.formData();
      body = Object.fromEntries(formData);
    }

    console.log("Payment callback received:", JSON.stringify(body));

    // Extract payment reference (supports multiple formats)
    const paymentRef = body.reference || body.transaction_ref || body.transactionReference || body.ref || body.ticket_code;
    
    // Extract status
    const paymentStatus = body.status || body.payment_status || body.statusCode || "";
    
    // Extract amount (optional)
    const amountPaid = body.amount || body.paid_amount || body.value;

    if (!paymentRef) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing payment reference" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Find the booking by ticket_code or transaction_reference
    let booking: any = null;
    let payment: any = null;

    // Try finding by ticket_code first
    const bookingsByCode: any = await sbQuery(
      "bookings",
      `ticket_code=eq.${paymentRef}&select=*`
    );
    if (bookingsByCode?.length > 0) {
      booking = bookingsByCode[0];
    }

    // If not found by code, try by transaction reference
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

    // Check if already processed
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

    // Determine if payment is successful
    const isSuccess =
      paymentStatus.toLowerCase() === "success" ||
      paymentStatus.toLowerCase() === "completed" ||
      paymentStatus.toLowerCase() === "successful" ||
      paymentStatus === "200" ||
      paymentStatus === "0";

    if (!isSuccess) {
      // Payment failed - update booking status
      await sbPatch("bookings", `id=eq.${booking.id}`, {
        status: "failed",
      });
      
      if (payment) {
        await sbPatch("payments", `id=eq.${payment.id}`, {
          status: "failed",
        });
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: "Payment not successful",
          status: paymentStatus,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Payment successful - call confirm_booking RPC
    console.log("Confirming booking:", booking.id);
    
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
    if (payment) {
      await sbPatch("payments", `id=eq.${payment.id}`, {
        status: "success",
        transaction_id: body.transaction_id || body.transactionId,
      });
    } else {
      // Create payment record if doesn't exist
      await sbPost("payments", {
        booking_id: booking.id,
        transaction_reference: paymentRef,
        amount: amountPaid || booking.amount,
        status: "success",
        payment_method: body.provider || body.network || "airtel_money",
        transaction_id: body.transaction_id || body.transactionId,
      });
    }

    // Get route info for SMS
    const trips: any = await sbQuery(
      "trips",
      `id=eq.${booking.trip_id}&select=*,routes(origin,destination)`
    );
    const trip = trips?.[0];
    const routeLabel = trip?.routes
      ? `${trip.routes.origin} → ${trip.routes.destination}`
      : "Route";

    // Send confirmation SMS
    const smsMessage = `BusTicket Malawi

Ticket: ${booking.ticket_code}
Passenger: ${booking.passenger_name || "Passenger"}
Route: ${routeLabel}
Date: ${booking.travel_date}
Time: ${booking.departure_time}
Seat: ${confirmResult.seat_number}

Show this SMS when boarding.

Support: +265982972977`;

    await sbPost("sms_logs", {
      phone: booking.phone,
      message: smsMessage,
      sms_type: "booking_confirmed",
      status: "queued",
      booking_id: booking.id,
    });

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
