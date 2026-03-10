import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { sessionId, phoneNumber, text } = body;

    if (!sessionId || !phoneNumber) {
      return new Response(
        JSON.stringify({ error: "sessionId and phoneNumber are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const input = text || "";
    const parts = input.split("*").filter(Boolean);

    // Get or create session
    const { data: session } = await supabase
      .from("ussd_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    if (!session) {
      await supabase.from("ussd_sessions").insert({
        session_id: sessionId,
        phone: phoneNumber,
        step: "main_menu",
        data: {},
      });
    }

    const currentStep = session?.step || "main_menu";
    const sessionData: Record<string, unknown> = (session?.data as Record<string, unknown>) || {};

    let response = "";
    let nextStep = currentStep;
    let nextData = { ...sessionData };

    // Main menu
    if (currentStep === "main_menu" && parts.length === 0) {
      response =
        "CON Welcome to BusLink Malawi\n1. Book Ticket\n2. My Bookings\n3. Help";
      nextStep = "main_menu_choice";
    }
    // Main menu selection
    else if (currentStep === "main_menu_choice" || (currentStep === "main_menu" && parts.length > 0)) {
      const choice = parts[parts.length - 1];
      if (choice === "1") {
        // Fetch active routes
        const { data: routes } = await supabase
          .from("routes")
          .select("id, origin, destination, one_way_price")
          .eq("status", "active")
          .limit(5);

        if (!routes || routes.length === 0) {
          response = "END No routes available at the moment. Please try again later.";
        } else {
          let menu = "CON Select route:\n";
          routes.forEach((r, i) => {
            menu += `${i + 1}. ${r.origin} → ${r.destination} (MWK ${r.one_way_price})\n`;
          });
          nextStep = "select_route";
          nextData = { ...nextData, routes: routes.map((r) => r.id) };
          response = menu;
        }
      } else if (choice === "2") {
        // Look up bookings
        const { data: bookings } = await supabase
          .from("bookings")
          .select("ticket_code, status, amount")
          .eq("phone", phoneNumber)
          .order("created_at", { ascending: false })
          .limit(3);

        if (!bookings || bookings.length === 0) {
          response = "END No bookings found for this number.";
        } else {
          let msg = "END Your recent bookings:\n";
          bookings.forEach((b) => {
            msg += `${b.ticket_code} - MWK ${b.amount} (${b.status})\n`;
          });
          response = msg;
        }
      } else if (choice === "3") {
        response =
          "END BusLink Help:\nDial *123# to book\nCall 0888000000 for support\nSMS HELP to 5678";
      } else {
        response = "END Invalid selection. Please dial again.";
      }
    }
    // Route selected -> show trips
    else if (currentStep === "select_route") {
      const choice = parseInt(parts[parts.length - 1]) - 1;
      const routeIds = (sessionData.routes as string[]) || [];
      const selectedRouteId = routeIds[choice];

      if (!selectedRouteId) {
        response = "END Invalid route selection.";
      } else {
        const today = new Date().toISOString().split("T")[0];
        const { data: trips } = await supabase
          .from("trips")
          .select("id, travel_date, departure_time, available_seats")
          .eq("route_id", selectedRouteId)
          .eq("status", "active")
          .gte("travel_date", today)
          .order("travel_date", { ascending: true })
          .limit(5);

        if (!trips || trips.length === 0) {
          response = "END No upcoming trips on this route.";
        } else {
          let menu = "CON Select trip:\n";
          trips.forEach((t, i) => {
            menu += `${i + 1}. ${t.travel_date} ${t.departure_time || ""} (${t.available_seats} seats)\n`;
          });
          nextStep = "select_trip";
          nextData = { ...nextData, route_id: selectedRouteId, trips: trips.map((t) => t.id) };
          response = menu;
        }
      }
    }
    // Trip selected -> confirm booking
    else if (currentStep === "select_trip") {
      const choice = parseInt(parts[parts.length - 1]) - 1;
      const tripIds = (sessionData.trips as string[]) || [];
      const selectedTripId = tripIds[choice];

      if (!selectedTripId) {
        response = "END Invalid trip selection.";
      } else {
        // Get route price
        const routeId = sessionData.route_id as string;
        const { data: priceData } = await supabase.rpc("get_effective_route_price", {
          p_route_id: routeId,
        });

        const price = priceData || 0;

        // Create seat lock
        await supabase.from("seat_locks").insert({
          trip_id: selectedTripId,
          phone: phoneNumber,
        });

        nextStep = "confirm_booking";
        nextData = { ...nextData, trip_id: selectedTripId, price };
        response = `CON Confirm booking:\nPrice: MWK ${price}\n1. Confirm & Pay\n2. Cancel`;
      }
    }
    // Confirm booking
    else if (currentStep === "confirm_booking") {
      const choice = parts[parts.length - 1];
      if (choice === "1") {
        const tripId = sessionData.trip_id as string;
        const price = sessionData.price as number;

        // Generate ticket code
        const ticketCode = "BUS" + Math.floor(Math.random() * 999999).toString().padStart(6, "0");

        // Get operator phone from route
        const { data: trip } = await supabase
          .from("trips")
          .select("route_id")
          .eq("id", tripId)
          .single();

        let operatorPhone: string | null = null;
        if (trip) {
          const { data: route } = await supabase
            .from("routes")
            .select("operator_id")
            .eq("id", trip.route_id)
            .single();
          if (route) {
            const { data: op } = await supabase
              .from("operators")
              .select("phone")
              .eq("id", route.operator_id)
              .single();
            operatorPhone = op?.phone || null;
          }
        }

        // Create booking
        const { error: bookingError } = await supabase.from("bookings").insert({
          trip_id: tripId,
          phone: phoneNumber,
          ticket_code: ticketCode,
          amount: price,
          status: "pending",
          ticket_type: "one_way",
          operator_phone: operatorPhone,
        });

        if (bookingError) {
          response = "END Booking failed. Please try again.";
        } else {
          response = `END Booking confirmed!\nTicket: ${ticketCode}\nAmount: MWK ${price}\nPay via Airtel Money to confirm.`;
        }
      } else {
        // Release seat lock
        await supabase
          .from("seat_locks")
          .update({ released: true })
          .eq("phone", phoneNumber)
          .eq("released", false);
        response = "END Booking cancelled.";
      }
    } else {
      response =
        "CON Welcome to BusLink Malawi\n1. Book Ticket\n2. My Bookings\n3. Help";
      nextStep = "main_menu_choice";
    }

    // Update session
    if (!response.startsWith("END")) {
      await supabase
        .from("ussd_sessions")
        .upsert(
          {
            session_id: sessionId,
            phone: phoneNumber,
            step: nextStep,
            data: nextData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "session_id" }
        );
    } else {
      // Clean up session
      await supabase.from("ussd_sessions").delete().eq("session_id", sessionId);
    }

    return new Response(JSON.stringify({ response }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
