import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bus, Route as RouteIcon, Calendar, Users, Loader2, Plus, ArrowRight } from 'lucide-react';

const DashboardHome = () => {
  const { operator } = useAuth();
  const [stats, setStats] = useState({ buses: 0, routes: 0, trips: 0, bookings: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!operator) return;
    const fetchStats = async () => {
      try {
        const [busRes, routeRes, tripRes] = await Promise.all([
          supabase.from('buses').select('id', { count: 'exact', head: true }).eq('operator_id', operator.id),
          supabase.from('routes').select('id', { count: 'exact', head: true }).eq('operator_id', operator.id),
          supabase.from('trips').select('id, total_seats, available_seats, routes(one_way_price)').eq('operator_id', operator.id),
        ]);
        const tripData = (tripRes.data as any[]) || [];
        const totalBooked = tripData.reduce((sum, t) => sum + (t.total_seats - t.available_seats), 0);
        const revenue = tripData.reduce((sum, t) => {
          const booked = t.total_seats - t.available_seats;
          return sum + booked * (t.routes?.one_way_price || 0);
        }, 0);
        setStats({
          buses: busRes.count || 0,
          routes: routeRes.count || 0,
          trips: tripRes.count || 0,
          bookings: totalBooked,
          revenue,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [operator]);

  const statCards = [
    { title: 'Fleet', value: stats.buses, icon: Bus, link: '/operator/fleet' },
    { title: 'Routes', value: stats.routes, icon: RouteIcon, link: '/operator/routes' },
    { title: 'Trips', value: stats.trips, icon: Calendar, link: '/operator/trips' },
    { title: 'Bookings', value: stats.bookings, icon: Users, link: '/operator/trips' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{operator?.company_name || operator?.name}</p>
        </div>
        <Link to="/operator/trips/create">
          <Button><Plus className="mr-2 h-4 w-4" />Schedule Trip</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} to={stat.link}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    {loading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <span className="text-3xl font-bold">{stat.value}</span>
                    )}
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Revenue Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Estimated Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <span className="text-3xl font-bold">MWK {stats.revenue.toLocaleString()}</span>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link to="/operator/fleet" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <Bus className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Manage Fleet</p>
                <p className="text-xs text-muted-foreground">Register and manage your buses</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link to="/operator/routes" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <RouteIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Configure Routes</p>
                <p className="text-xs text-muted-foreground">Set routes and pricing in MWK</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link to="/operator/trips/create" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Schedule Trips</p>
                <p className="text-xs text-muted-foreground">Set up daily departure schedules</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link to="/operator/trips" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Monitor Bookings</p>
                <p className="text-xs text-muted-foreground">View passenger details and ticket information</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHome;
