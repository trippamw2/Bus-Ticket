import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bus, LogOut, MapPin, Truck, Users, BarChart3, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Operator = Tables<"operators">;
type Route = Tables<"routes">;
type BusRecord = Tables<"buses">;
type Trip = Tables<"trips">;

const Dashboard = () => {
  const navigate = useNavigate();
  const [operator, setOperator] = useState<Operator | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<BusRecord[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const userId = session.user.id;

      const [opRes, routeRes, busRes, tripRes] = await Promise.all([
        supabase.from("operators").select("*").eq("id", userId).single(),
        supabase.from("routes").select("*").eq("operator_id", userId),
        supabase.from("buses").select("*").eq("operator_id", userId),
        supabase.from("trips").select("*").eq("operator_id", userId).order("travel_date", { ascending: false }).limit(10),
      ]);

      if (opRes.data) setOperator(opRes.data);
      if (routeRes.data) setRoutes(routeRes.data);
      if (busRes.data) setBuses(busRes.data);
      if (tripRes.data) setTrips(tripRes.data);
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/login");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  const stats = [
    { icon: MapPin, label: "Routes", value: routes.length },
    { icon: Truck, label: "Buses", value: buses.length },
    { icon: BarChart3, label: "Recent Trips", value: trips.length },
    { icon: Wallet, label: "Status", value: operator?.status || "N/A" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Bus className="h-5 w-5 text-primary" />
            BusLink
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{operator?.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1">
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold text-foreground">Operator Dashboard</h1>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-5">
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <s.icon className="h-4 w-4" />
                <span className="text-sm">{s.label}</span>
              </div>
              <div className="text-2xl font-bold text-card-foreground">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Routes */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Your Routes</h2>
          {routes.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              No routes yet. Add your first route to start selling tickets via USSD.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Origin</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Destination</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">One-way Price</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Return Price</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-foreground">{r.origin}</td>
                      <td className="px-4 py-3 text-foreground">{r.destination}</td>
                      <td className="px-4 py-3 text-right text-foreground">MWK {r.one_way_price.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-foreground">MWK {r.return_price.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.status === "active"
                            ? "bg-accent/10 text-accent"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Buses */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Your Buses</h2>
          {buses.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              No buses registered yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {buses.map((b) => (
                <div key={b.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="mb-1 font-semibold text-card-foreground">{b.plate_number}</div>
                  <div className="text-sm text-muted-foreground">Capacity: {b.capacity} seats</div>
                  <div className="mt-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      b.status === "active"
                        ? "bg-accent/10 text-accent"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Trips */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Recent Trips</h2>
          {trips.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              No trips scheduled yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Departure</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Seats</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((t) => (
                    <tr key={t.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-foreground">{t.travel_date}</td>
                      <td className="px-4 py-3 text-foreground">{t.departure_time || "—"}</td>
                      <td className="px-4 py-3 text-right text-foreground">
                        {t.available_seats}/{t.total_seats}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.status === "active"
                            ? "bg-accent/10 text-accent"
                            : t.status === "full"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
