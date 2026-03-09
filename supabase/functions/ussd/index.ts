// BusLink Malawi USSD Edge Function
// Deployed and synced with frontend

import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey);

const SUPPORT_NUMBER = "+265982972977";

// Freeflow responses
function CON(message: string) {
  return new Response(message, {
    headers: { "Content-Type": "text/plain", "Freeflow": "FC" },
  });
}

function END(message: string) {
  return new Response(message, {
    headers: { "Content-Type": "text/plain", "Freeflow": "FB" },
  });
}

Deno.serve(async (req) => {
  const { sessionId, serviceCode, phoneNumber, text } = await req.json();

  const inputs = text === "" ? [] : text.split("*");
  const level = inputs.length;

  let response = "";

  // =============================
  // CHECK IF AGENT
  // =============================

  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("phone", phoneNumber)
    .maybeSingle();

  const isAgent = !!agent;

  // =============================
  // MAIN MENU
  // =============================

  if (text === "") {
    if (isAgent) {
      response = `CON BusTicket Malawi
1. Book Ticket
2. My Tickets
3. Change Ticket
4. Cancel Ticket
5. My Commissions
6. Help`;
    } else {
      response = `CON BusTicket Malawi
1. Book Ticket
2. My Tickets
3. Change Ticket
4. Cancel Ticket
5. Help`;
    }
  }

  // =============================
  // HELP MENU
  // =============================

  else if ((!isAgent && inputs[0] == "5") || (isAgent && inputs[0] == "6")) {
    response = `END BusTicket Malawi Help

Book Ticket:
Select route and trip then pay via Airtel Money or Mpamba.

Change Ticket:
Enter ticket code and select new trip.

Cancel Ticket:
Enter ticket code to cancel. Admin fee may apply.

Support:
${SUPPORT_NUMBER}`;
  }

  // =============================
  // BOOK TICKET - SELECT ROUTE
  // =============================

  else if (inputs[0] == "1" && level == 1) {
    const { data: routes } = await supabase
      .from("routes")
      .select("id, origin, destination");

    let menu = "CON Select Route\n";

    routes?.forEach((r: any, i: number) => {
      menu += `${i + 1}. ${r.origin} → ${r.destination}\n`;
    });

    response = menu;
  }

  // =============================
  // TICKET TYPE
  // =============================

  else if (inputs[0] == "1" && level == 2) {
    response = `CON Ticket Type
1. One Way
2. Return`;
  }

  // =============================
  // SELECT TRIP
  // =============================

  else if (inputs[0] == "1" && level == 3) {
    const routeIndex = parseInt(inputs[1]) - 1;

    const { data: routes } = await supabase.from("routes").select("*");
    const route = routes?.[routeIndex];

    if (!route) {
      return END("Invalid route selection.");
    }

    const { data: trips } = await supabase
      .from("trips")
      .select("id, travel_date, departure_time, available_seats, routes(one_way_price, return_price)")
      .eq("route_id", route.id)
      .eq("status", "active")
      .gte("travel_date", new Date().toISOString().split("T")[0]);

    if (!trips?.length) {
      return END("No trips available for this route.");
    }

    let menu = "CON Select Trip\n";

    trips?.forEach((t: any, i: number) => {
      const price = inputs[1] == "2" ? t.routes?.return_price : t.routes?.one_way_price;
      menu += `${i + 1}. ${t.travel_date} ${t.departure_time} MWK ${price}\n`;
    });

    response = menu;
  }

  // =============================
  // PASSENGER NAME
  // =============================

  else if (inputs[0] == "1" && level == 4) {
    response = `CON Enter Passenger Name`;
  }

  // =============================
  // CONFIRM BOOKING
  // =============================

  else if (inputs[0] == "1" && level == 5) {
    const passengerName = inputs[4];

    const routeIndex = parseInt(inputs[1]) - 1;
    const tripIndex = parseInt(inputs[3]) - 1;

    const { data: routes } = await supabase.from("routes").select("*");
    const route = routes?.[routeIndex];

    const { data: trips } = await supabase
      .from("trips")
      .select("*, routes(one_way_price, return_price)")
      .eq("route_id", route?.id);

    const trip = trips?.[tripIndex];

    if (!trip) {
      return END("Invalid trip selection.");
    }

    const price = inputs[1] == "2" ? trip.routes?.return_price : trip.routes?.one_way_price;
    const operatorName = trip.operators?.name || "Bus";

    response = `CON Confirm Booking
Passenger: ${passengerName}
Route: ${route?.origin} → ${route?.destination}
Operator: ${operatorName}
Date: ${trip.travel_date}
Time: ${trip.departure_time}
Price: MWK ${price}

1. Confirm
2. Cancel`;

  // =============================
  // FINAL BOOKING - CREATE
  // =============================

  else if (inputs[0] == "1" && level == 6 && inputs[5] == "1") {
    const passengerName = inputs[4];

    const routeIndex = parseInt(inputs[1]) - 1;
    const tripIndex = parseInt(inputs[3]) - 1;

    const { data: routes } = await supabase.from("routes").select("*");
    const route = routes?.[routeIndex];

    const { data: trips } = await supabase
      .from("trips")
      .select("*, routes(one_way_price, return_price, operator_id, operators:operator_id(name, phone))")
      .eq("route_id", route?.id);

    const trip = trips?.[tripIndex];

    if (!trip) {
      return END("Trip not found.");
    }

    // Check available seats
    if (trip.available_seats <= 0) {
      return END("Sorry, no seats available for this trip.");
    }

    const price = inputs[1] == "2" ? trip.routes?.return_price : trip.routes?.one_way_price;
    const operatorPhone = trip.operators?.phone || null;

    const ticketCode =
      "BTM-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create booking with pending_payment status
    const { data: booking, error: bookErr } = await supabase
      .from("bookings")
      .insert({
        ticket_code: ticketCode,
        passenger_name: passengerName,
        phone: phoneNumber,
        route_id: route?.id,
        trip_id: trip.id,
        travel_date: trip.travel_date,
        departure_time: trip.departure_time,
        amount: price,
        operator_phone: operatorPhone,
        booked_by_type: isAgent ? "agent" : "user",
        booked_by_phone: phoneNumber,
        status: "pending_payment",
      })
      .select()
      .single();

    if (bookErr || !booking) {
      console.error("Booking error:", bookErr);
      return END("Booking failed. Please try again.");
    }

    // Record agent commission
    if (isAgent && agent) {
      const commissionRate = agent.commission_rate || 10;
      const commission = price * (commissionRate / 100);

      await supabase.from("commissions").insert({
        agent_id: agent.id,
        agent_phone: phoneNumber,
        booking_id: booking.id,
        ticket_code: ticketCode,
        amount: price,
        commission_rate: commissionRate,
        commission_amount: commission,
        status: "pending",
      });
    }

    // Create payment record
    await supabase.from("payments").insert({
      booking_id: booking.id,
      amount: price,
      transaction_reference: ticketCode,
      status: "pending",
      payment_method: "airtel_money",
    });

    // Create SMS log
    await supabase.from("sms_logs").insert({
      phone: phoneNumber,
      message: `Booking ${ticketCode} created. Amount: MWK ${price}. Pending payment via Airtel Money.`,
      sms_type: "booking_created",
      status: "queued",
      booking_id: booking.id,
    });

    // Trigger Mobile Money Payment (mock - replace with real API)
    const paymentApi = Deno.env.get("PAYMENT_API");
    if (paymentApi) {
      try {
        await fetch(paymentApi, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: phoneNumber,
            amount: price,
            reference: ticketCode,
          }),
        });
      } catch (e) {
        console.log("Payment API not available:", e);
      }
    }

    // Return pending message - WAIT for payment callback to confirm
    // The payment-callback function will call confirm_booking when payment is received
    response = `END Payment Request Sent!

Ticket: ${ticketCode}
Amount: MWK ${price}

Check your phone for payment prompt.
Enter PIN to complete.

You will receive SMS when confirmed.`;
  }

  // =============================
  // VIEW TICKETS
  // =============================

  else if (inputs[0] == "2") {
    const { data: tickets } = await supabase
      .from("bookings")
      .select("*, routes:route_id(origin, destination)")
      .eq("phone", phoneNumber)
      .in("status", ["paid", "pending_payment", "pending"])
      .order("created_at", { ascending: false })
      .limit(5);

    if (!tickets?.length) {
      return END(`No tickets found.\nSupport ${SUPPORT_NUMBER}`);
    }

    let msg = "END Your Tickets\n\n";

    tickets.forEach((t: any) => {
      msg += `Ticket: ${t.ticket_code}\n`;
      msg += `Passenger: ${t.passenger_name}\n`;
      msg += `Route: ${t.routes?.origin} → ${t.routes?.destination}\n`;
      msg += `Date: ${t.travel_date} ${t.departure_time}\n`;
      msg += `Seat: ${t.seat_number || "Pending"}\n`;
      msg += `Status: ${t.status}\n\n`;
    });

    response = msg;
  }

  // =============================
  // CHANGE TICKET
  // =============================

  else if (inputs[0] == "3") {
    response = `END Ticket change request.
Contact support:
${SUPPORT_NUMBER}`;
  }

  // =============================
  // CANCEL TICKET
  // =============================

  else if (inputs[0] == "4") {
    response = `END Ticket cancellation request.
Contact support:
${SUPPORT_NUMBER}`;
  }

  // =============================
  // AGENT COMMISSIONS
  // =============================

  else if (isAgent && inputs[0] == "5") {
    const { data: commissions } = await supabase
      .from("commissions")
      .select("amount, status")
      .eq("agent_phone", phoneNumber);

    const total = commissions?.reduce((a, b) => a + Number(b.commission_amount || 0), 0) || 0;
    const pending = commissions?.filter((c: any) => c.status === "pending").reduce((a, b) => a + Number(b.commission_amount || 0), 0) || 0;

    response = `END Your Commissions
Total: MWK ${total.toFixed(0)}
Pending: MWK ${pending.toFixed(0)}

Contact support: ${SUPPORT_NUMBER}`;
  }

  else {
    response = `END Invalid option.\nSupport: ${SUPPORT_NUMBER}`;
  }

  return new Response(response, {
    headers: { "Content-Type": "text/plain" },
  });
});
