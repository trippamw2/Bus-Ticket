import { Bus, MapPin, Calendar, Search } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");

  return (
    <section className="relative overflow-hidden bg-primary px-4 pb-20 pt-16 sm:px-6 lg:px-8">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-primary-foreground backdrop-blur-sm">
          <Bus className="h-4 w-4" />
          Malawi's Bus Booking Platform
        </div>

        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-primary-foreground sm:text-5xl lg:text-6xl">
          Book Your Bus
          <br />
          <span className="text-white/80">Travel Made Simple</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg text-white/70">
          Search routes, compare prices, and book tickets instantly across all major bus operators in Malawi.
        </p>

        {/* Search Card */}
        <div className="mx-auto max-w-3xl rounded-2xl bg-card p-4 shadow-2xl sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="From (e.g. Lilongwe)"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="To (e.g. Blantyre)"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <Button className="mt-4 w-full gap-2 py-6 text-base font-semibold">
            <Search className="h-5 w-5" />
            Search Buses
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
