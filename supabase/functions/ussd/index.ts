import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const SUPPORT_NUMBER = "+265982972977";

// ----------------------------
// USSD Response Helpers
// ----------------------------
function CON(msg: string) {
  return new Response(`CON ${msg}`, { headers: { "Content-Type": "text/plain" } });
}
function END(msg: string) {
  return new Response(`END ${msg}`, { headers: { "Content-Type": "text/plain" } });
}

// ----------------------------
// Supabase Edge Function Export
// ----------------------------
export default async function handler(req: Request) {
  try {
    const { sessionId, serviceCode, phoneNumber, text } = await req.json();
    const inputs = text === "" ? [] : text.split("*");
    const level = inputs.length;

    // ----------------------------
    // Check agent
    // ----------------------------
    const { data: agent } = await supabase
      .from("agents")
      .select("*")
      .eq("phone", phoneNumber)
      .single()
      .catch(() => ({ data: null }));
    const isAgent = !!agent;

    // ----------------------------
    // MAIN MENU
    // ----------------------------
    if (text === "") {
      const menu = isAgent
        ? `BusTicket Malawi
1. Book Ticket
2. My Tickets
3. Change Ticket
4. Cancel Ticket
5. My Commissions
6. Help`
        : `BusTicket Malawi
1. Book Ticket
2. My Tickets
3. Change Ticket
4. Cancel Ticket
5. Help`;
      return CON(menu);
    }

    // ----------------------------
    // HELP MENU
    // ----------------------------
    if ((!isAgent && inputs[0] === "5") || (isAgent && inputs[0] === "6")) {
      return END(`BusTicket Malawi Help

Book Ticket:
Select route and trip then pay via Airtel Money or Mpamba.

Change Ticket:
Enter ticket code and select new trip.

Cancel Ticket:
Enter ticket code to cancel. Admin fee may apply.

Support: ${SUPPORT_NUMBER}`);
    }

    // ----------------------------
    // BOOKING FLOW
    // ----------------------------
    if (inputs[0] === "1") {
      switch (level) {
        case 1: {
          // Step 1: Select Route
          const { data: routes } = await supabase
            .from("routes")
            .select("id, origin, destination")
            .eq("status", "active");
          if (!routes?.length) return END("No routes available.");
          let menu = "Select Route\n";
          routes.forEach((r, i) => (menu += `${i + 1}. ${r.origin} → ${r.destination}\n`));
          return CON(menu);
        }
        case 2:
          // Step 2: Ticket Type
          return CON(`Ticket Type
1. One Way
2. Return`);
        case 3: {
          // Step 3: Select Trip
          const routeIndex = parseInt(inputs[1]) - 1;
          const { data: routes } = await supabase.from("routes").select("*");
          const route = routes?.[routeIndex];
          if (!route) return END("Invalid route.");

          const { data: trips } = await supabase
            .from("trips")
            .select(
              "id, travel_date, departure_time, available_seats, one_way_price, return_price"
            )
            .eq("route_id", route.id)
            .eq("status", "active");

          if (!trips?.length) return END("No trips available.");
          let menu = "Select Trip\n";
          trips.forEach((t, i) => {
            const price = inputs[1] === "2" ? t.return_price : t.one_way_price;
            menu += `${i + 1}. ${t.travel_date} ${t.departure_time} MWK ${price}\n`;
          });
          return CON(menu);
        }
        case 4:
          return CON("Enter Passenger Name");
        case 5: {
          // Confirm Booking
          const routeIndex = parseInt(inputs[1]) - 1;
          const tripIndex = parseInt(inputs[3]) - 1;
          const passengerName = inputs[4];

          const { data: routes } = await supabase.from("routes").select("*");
          const route = routes?.[routeIndex];
          const { data: trips } = await supabase
            .from("trips")
            .select("*")
            .eq("route_id", route?.id);
          const trip = trips?.[tripIndex];
          if (!trip) return END("Invalid trip selection.");

          const price = inputs[1] === "2" ? trip.return_price : trip.one_way_price;
          const operatorName = "Bus";

          let menu = `Confirm Booking
Passenger: ${passengerName}
Route: ${route?.origin} → ${route?.destination}
Operator: ${operatorName}
Date: ${trip.travel_date}
Time: ${trip.departure_time}
Price: MWK ${price}

1. Confirm
2. Cancel`;

          return CON(menu);
        }
        case 6: {
          // Final booking
          if (inputs[5] !== "1") return END("Booking cancelled.");

          const routeIndex = parseInt(inputs[1]) - 1;
          const tripIndex = parseInt(inputs[3]) - 1;
          const passengerName = inputs[4];

          const { data: routes } = await supabase.from("routes").select("*");
          const route = routes?.[routeIndex];

          const { data: trips } = await supabase
            .from("trips")
            .select("*")
            .eq("route_id", route?.id);
          const trip = trips?.[tripIndex];
          if (!trip) return END("Trip not found.");
          if (trip.available_seats <= 0) return END("No seats available.");

          const price = inputs[1] === "2" ? trip.return_price : trip.one_way_price;
          const ticketCode = "BTM-" + Math.random().toString(36).substring(2, 8).toUpperCase();

          // Lock seat
          await supabase.from("trips").update({ available_seats: trip.available_seats - 1 }).eq("id", trip.id);

          // Insert booking
          const { data: booking } = await supabase
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
              booked_by_type: isAgent ? "agent" : "user",
              booked_by_phone: phoneNumber,
              status: "pending_payment",
            })
            .select()
            .single();

          // Agent commission
          if (isAgent && agent) {
            const commission = price * ((agent.commission_rate || 10) / 100);
            await supabase.from("commissions").insert({
              agent_id: agent.id,
              agent_phone: phoneNumber,
              booking_id: booking.id,
              ticket_code: ticketCode,
              amount: price,
              commission_rate: agent.commission_rate || 10,
              commission_amount: commission,
              status: "pending",
            });
          }
else if (inputs[0] == "1" && level == 6 && inputs[5] == "1") {
  const passengerName = inputs[4];
  const routeIndex = parseInt(inputs[1]) - 1;
  const tripIndex = parseInt(inputs[3]) - 1;

  const { data: routes } = await supabase.from("routes").select("*");
  const route = routes?.[routeIndex];

  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .eq("route_id", route?.id);
  const trip = trips?.[tripIndex];
  if (!trip) return END("Trip not found.");
  if (trip.available_seats <= 0) return END("No seats available.");

  const price = inputs[1] == "2" ? trip.return_price : trip.one_way_price;
  const ticketCode = "BTM-" + Math.random().toString(36).substring(2, 8).toUpperCase();

  // Lock seat
  await supabase.from("trips").update({ available_seats: trip.available_seats - 1 }).eq("id", trip.id);

  // Insert booking
  const { data: booking } = await supabase
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
      booked_by_type: isAgent ? "agent" : "user",
      booked_by_phone: phoneNumber,
      status: "pending_payment",
    })
    .select()
    .single();

  // Agent commission
  if (isAgent && agent) {
    const commission = price * ((agent.commission_rate || 10) / 100);
    await supabase.from("commissions").insert({
      agent_id: agent.id,
      agent_phone: phoneNumber,
      booking_id: booking.id,
      ticket_code: ticketCode,
      amount: price,
      commission_rate: agent.commission_rate || 10,
      commission_amount: commission,
      status: "pending",
    });
  }

  // SMS log
  await supabase.from("sms_logs").insert({
    phone: phoneNumber,
    message: `Booking ${ticketCode} created. Amount: MWK ${price}. Payment request sent.`,
    sms_type: "booking_created",
    status: "queued",
    booking_id: booking.id,
  });

  // ----------------------------
  // Live Mobile Money Payment
  // ----------------------------
  const paymentApi = Deno.env.get("PAYMENT_API"); // Airtel/Mpamba endpoint
  if (paymentApi) {
    try {
      const paymentResp = await fetch(paymentApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneNumber,
          amount: price,
          reference: ticketCode,
          description: `BusTicket ${ticketCode}`,
        }),
      });

      const paymentResult = await paymentResp.json();

      // Update booking if immediately paid
      if (paymentResult.status === "success") {
        await supabase.from("bookings").update({ status: "paid" }).eq("id", booking.id);

        // SMS confirmation
        await supabase.from("sms_logs").insert({
          phone: phoneNumber,
          message: `Booking ${ticketCode} confirmed! Amount MWK ${price} received.`,
          sms_type: "payment_confirmed",
          status: "queued",
          booking_id: booking.id,
        });

        return END(`Booking Confirmed!\nTicket: ${ticketCode}\nAmount MWK ${price}`);
      }

    } catch (err) {
      console.error("Payment API error:", err);
    }
  }

  // Fallback: pending payment
  return END(`Payment Request Sent!\nTicket: ${ticketCode}\nAmount: MWK ${price}\nCheck your phone to complete payment.`);
}
          // SMS log
          await supabase.from("sms_logs").insert({
            phone: phoneNumber,
            message: `Booking ${ticketCode} created. Amount: MWK ${price}. Pending payment.`,
            sms_type: "booking_created",
            status: "queued",
            booking_id: booking.id,
          });

          return END(`Payment request sent!
Ticket: ${ticketCode}
Amount: MWK ${price}
Check your phone for payment.`);
        }
      }
    }

    // ----------------------------
    // VIEW TICKETS
    // ----------------------------
    if (inputs[0] === "2") {
      const { data: tickets } = await supabase
        .from("bookings")
        .select("ticket_code, passenger_name, travel_date, departure_time, seat_number, status")
        .eq("phone", phoneNumber)
        .order("created_at", { ascending: false });

      if (!tickets?.length) return END(`No tickets found.\nSupport ${SUPPORT_NUMBER}`);

      let msg = "Your Tickets\n";
      tickets.forEach((t: any) => {
        msg += `Ticket: ${t.ticket_code}\nPassenger: ${t.passenger_name}\nDate: ${t.travel_date} ${t.departure_time}\nSeat: ${t.seat_number || "Pending"}\nStatus: ${t.status}\n\n`;
      });
      return END(msg);
    }

    // ----------------------------
    // CHANGE TICKET
    // ----------------------------
    if (inputs[0] === "3") return END(`Ticket change request.\nContact support: ${SUPPORT_NUMBER}`);

    // ----------------------------
    // CANCEL TICKET
    // ----------------------------
    if (inputs[0] === "4") return END(`Ticket cancellation request.\nContact support: ${SUPPORT_NUMBER}`);

    // ----------------------------
    // AGENT COMMISSIONS
    // ----------------------------
    if (isAgent && inputs[0] === "5") {
      const { data: commissions } = await supabase.from("commissions").select("*").eq("agent_phone", phoneNumber);
      const total = commissions?.reduce((a, b) => a + Number(b.commission_amount || 0), 0) || 0;
      return END(`Your Commissions\nMWK ${total}\nSupport: ${SUPPORT_NUMBER}`);
    }

    return END(`Invalid option.\nSupport: ${SUPPORT_NUMBER}`);
  } catch (err) {
    console.error(err);
    return END(`An error occurred.\nSupport: ${SUPPORT_NUMBER}`);
  }
}
