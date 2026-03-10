import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const SUPPORT_NUMBER = "+265982972977";

function CON(msg: string) {
  return new Response(`CON ${msg}`, { headers: { "Content-Type": "text/plain" } });
}
function END(msg: string) {
  return new Response(`END ${msg}`, { headers: { "Content-Type": "text/plain" } });
}

export default async function handler(req: Request) {
  try {
    const { sessionId, serviceCode, phoneNumber, text } = await req.json();
    const inputs = text === "" ? [] : text.split("*");
    const level = inputs.length;

    // MAIN MENU
    if (text === "") {
      return CON(`BusTicket Malawi
1. Book Ticket
2. My Tickets
3. Change Ticket
4. Cancel Ticket
5. Help`);
    }

    // HELP
    if (inputs[0] === "5") {
      return END(`BusTicket Malawi Help

Book Ticket: Select route and trip then pay via Airtel Money.
Change Ticket: Enter ticket code and select new trip.
Cancel Ticket: Enter ticket code to cancel.

Support: ${SUPPORT_NUMBER}`);
    }

    // BOOKING FLOW
    if (inputs[0] === "1") {
      switch (level) {
        case 1: {
          const { data: routes } = await supabase
            .from("routes")
            .select("id, origin, destination")
            .eq("status", "active");
          if (!routes?.length) return END("No routes available.");
          let menu = "Select Route\n";
          routes.forEach((r: any, i: number) => (menu += `${i + 1}. ${r.origin} → ${r.destination}\n`));
          return CON(menu);
        }
        case 2:
          return CON(`Ticket Type
1. One Way
2. Return`);
        case 3: {
          const routeIndex = parseInt(inputs[1]) - 1;
          const { data: routes } = await supabase.from("routes").select("id, origin, destination, one_way_price, return_price").eq("status", "active");
          const route = routes?.[routeIndex];
          if (!route) return END("Invalid route.");

          const { data: trips } = await supabase
            .from("trips")
            .select("id, travel_date, departure_time, available_seats")
            .eq("route_id", route.id)
            .eq("status", "active")
            .gte("travel_date", new Date().toISOString().split("T")[0]);

          if (!trips?.length) return END("No trips available.");
          const ticketType = inputs[2];
          const price = ticketType === "2" ? route.return_price : route.one_way_price;
          let menu = "Select Trip\n";
          trips.forEach((t: any, i: number) => {
            menu += `${i + 1}. ${t.travel_date} ${t.departure_time || ""} (${t.available_seats} seats) MWK ${price}\n`;
          });
          return CON(menu);
        }
        case 4: {
          // Confirm booking
          const routeIndex = parseInt(inputs[1]) - 1;
          const tripIndex = parseInt(inputs[3]) - 1;
          const ticketType = inputs[2];

          const { data: routes } = await supabase.from("routes").select("*").eq("status", "active");
          const route = routes?.[routeIndex];
          if (!route) return END("Invalid route.");

          const { data: trips } = await supabase
            .from("trips")
            .select("*")
            .eq("route_id", route.id)
            .eq("status", "active")
            .gte("travel_date", new Date().toISOString().split("T")[0]);
          const trip = trips?.[tripIndex];
          if (!trip) return END("Invalid trip.");

          const price = ticketType === "2" ? route.return_price : route.one_way_price;

          return CON(`Confirm Booking
Route: ${route.origin} → ${route.destination}
Date: ${trip.travel_date} ${trip.departure_time || ""}
Price: MWK ${price}

1. Confirm & Pay
2. Cancel`);
        }
        case 5: {
          if (inputs[4] !== "1") return END("Booking cancelled.");

          const routeIndex = parseInt(inputs[1]) - 1;
          const tripIndex = parseInt(inputs[3]) - 1;
          const ticketType = inputs[2];

          const { data: routes } = await supabase.from("routes").select("*").eq("status", "active");
          const route = routes?.[routeIndex];
          if (!route) return END("Invalid route.");

          const { data: trips } = await supabase
            .from("trips")
            .select("*")
            .eq("route_id", route.id)
            .eq("status", "active")
            .gte("travel_date", new Date().toISOString().split("T")[0]);
          const trip = trips?.[tripIndex];
          if (!trip) return END("Trip not found.");
          if (trip.available_seats <= 0) return END("No seats available.");

          const price = ticketType === "2" ? route.return_price : route.one_way_price;
          const ticketCode = "BTM-" + Math.random().toString(36).substring(2, 8).toUpperCase();

          // Create booking
          const { data: booking, error: bookingError } = await supabase
            .from("bookings")
            .insert({
              ticket_code: ticketCode,
              phone: phoneNumber,
              trip_id: trip.id,
              amount: price,
              ticket_type: ticketType === "2" ? "return" : "one_way",
              status: "pending",
              operator_phone: route.operator_id,
            })
            .select()
            .single();

          if (bookingError) {
            console.error("Booking error:", bookingError);
            return END("Booking failed. Please try again.");
          }

          // Decrement available seats
          await supabase.from("trips").update({ available_seats: trip.available_seats - 1 }).eq("id", trip.id);

          // Log SMS
          await supabase.from("sms_logs").insert({
            phone: phoneNumber,
            message: `Booking ${ticketCode} created. Amount: MWK ${price}. Pay via Airtel Money.`,
            sms_type: "booking_created",
            status: "queued",
            booking_id: booking.id,
          });

          return END(`Payment Request Sent!
Ticket: ${ticketCode}
Amount: MWK ${price}
Check your phone to complete payment via Airtel Money.
Support: ${SUPPORT_NUMBER}`);
        }
      }
    }

    // VIEW TICKETS
    if (inputs[0] === "2") {
      const { data: tickets } = await supabase
        .from("bookings")
        .select("ticket_code, seat_number, status, amount, created_at")
        .eq("phone", phoneNumber)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!tickets?.length) return END(`No tickets found.\nSupport: ${SUPPORT_NUMBER}`);

      let msg = "Your Tickets\n";
      tickets.forEach((t: any) => {
        msg += `${t.ticket_code} | Seat: ${t.seat_number || "TBA"} | MWK ${t.amount} | ${t.status}\n`;
      });
      return END(msg);
    }

    // CHANGE TICKET
    if (inputs[0] === "3") return END(`Ticket change request.\nContact support: ${SUPPORT_NUMBER}`);

    // CANCEL TICKET
    if (inputs[0] === "4") return END(`Ticket cancellation request.\nContact support: ${SUPPORT_NUMBER}`);

    return END(`Invalid option.\nSupport: ${SUPPORT_NUMBER}`);
  } catch (err) {
    console.error(err);
    return END(`An error occurred.\nSupport: ${SUPPORT_NUMBER}`);
  }
}
