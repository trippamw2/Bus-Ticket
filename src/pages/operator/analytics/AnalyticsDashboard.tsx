import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Users, Bus, Route, Calendar, Download } from 'lucide-react';

interface DashboardStats {
  totalTrips: number;
  totalBookings: number;
  totalRevenue: number;
  avgLoadFactor: number;
  topRoutes: { route: string; revenue: number; bookings: number }[];
  bookingsByDay: { date: string; bookings: number; revenue: number }[];
}

export default function AnalyticsDashboard() {
  const { operator } = useAuth();
  const [period, setPeriod] = useState('30');
  const [stats, setStats] = useState<DashboardStats>({
    totalTrips: 0,
    totalBookings: 0,
    totalRevenue: 0,
    avgLoadFactor: 0,
    topRoutes: [],
    bookingsByDay: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (operator) {
      fetchAnalytics();
    }
  }, [operator, period, operator?.id]);

  const fetchAnalytics = async () => {
    if (!operator) return;
    setLoading(true);
    try {
      const days = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { count: tripCount } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('operator_id', operator.id)
        .gte('travel_date', startDate.toISOString().split('T')[0]);

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*, trips(travel_date, routes(origin, destination))')
        .eq('trips.operator_id', operator.id)
        .gte('trips.travel_date', startDate.toISOString().split('T')[0]);

      const totalBookings = bookingsData?.length || 0;
      const totalRevenue = bookingsData?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;

      // Calculate load factor from trips and bookings directly
      const { data: tripsData } = await supabase
        .from('trips')
        .select('id, total_seats, available_seats')
        .eq('operator_id', operator.id)
        .gte('travel_date', startDate.toISOString().split('T')[0]);

      const totalSeats = tripsData?.reduce((sum, t) => sum + (t.total_seats || 0), 0) || 0;
      const bookedSeats = tripsData?.reduce((sum, t) => sum + ((t.total_seats || 0) - (t.available_seats || 0)), 0) || 0;
      const avgLoadFactor = totalSeats > 0 ? (bookedSeats / totalSeats) * 100 : 0;

      const bookingsByDayMap: Record<string, { bookings: number; revenue: number }> = {};
      bookingsData?.forEach(booking => {
        const date = booking.trips?.travel_date;
        if (date) {
          if (!bookingsByDayMap[date]) {
            bookingsByDayMap[date] = { bookings: 0, revenue: 0 };
          }
          bookingsByDayMap[date].bookings++;
          bookingsByDayMap[date].revenue += booking.amount || 0;
        }
      });

      const bookingsByDay = Object.entries(bookingsByDayMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14);

      const routeRevenue: Record<string, { route: string; revenue: number; bookings: number }> = {};
      bookingsData?.forEach(booking => {
        const route = booking.trips?.routes;
        if (route) {
          const routeKey = `${route.origin} → ${route.destination}`;
          if (!routeRevenue[routeKey]) {
            routeRevenue[routeKey] = { route: routeKey, revenue: 0, bookings: 0 };
          }
          routeRevenue[routeKey].revenue += booking.amount || 0;
          routeRevenue[routeKey].bookings++;
        }
      });

      const topRoutes = Object.values(routeRevenue)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setStats({
        totalTrips: tripCount || 0,
        totalBookings,
        totalRevenue,
        avgLoadFactor: Math.round(avgLoadFactor * 100) / 100,
        topRoutes,
        bookingsByDay,
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MW', {
      style: 'currency',
      currency: 'MWK',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleExport = () => {
    // Export analytics data to CSV
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Trips', stats.totalTrips],
      ['Total Bookings', stats.totalBookings],
      ['Total Revenue', stats.totalRevenue],
      ['Average Load Factor', `${stats.avgLoadFactor}%`],
    ];

    // Add top routes
    stats.topRoutes.forEach((route, i) => {
      rows.push([`Route ${i + 1}: ${route.route}`, `MWK ${route.revenue} (${route.bookings} bookings)`]);
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Business intelligence and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
            <Bus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTrips}</div>
            <p className="text-xs text-muted-foreground">Scheduled trips</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">Tickets sold</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Gross revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Load Factor</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgLoadFactor}%</div>
            <p className="text-xs text-muted-foreground">Seat utilization</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              Top Performing Routes
            </CardTitle>
            <CardDescription>Routes with highest revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : stats.topRoutes.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No data available</div>
            ) : (
              <div className="space-y-4">
                {stats.topRoutes.map((route, index) => (
                  <div key={route.route} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <span className="font-medium">{route.route}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(route.revenue)}</div>
                      <div className="text-xs text-muted-foreground">{route.bookings} bookings</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Bookings Trend
            </CardTitle>
            <CardDescription>Daily bookings and revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : stats.bookingsByDay.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No data available</div>
            ) : (
              <div className="space-y-3">
                {stats.bookingsByDay.slice(-7).map((day) => (
                  <div key={day.date} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">{day.bookings} bookings</span>
                      <span className="font-medium">{formatCurrency(day.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Key indicators for your business</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{stats.totalBookings > 0 ? Math.round(stats.totalRevenue / stats.totalBookings) : 0}</div>
              <div className="text-sm text-muted-foreground">Avg. Ticket Price</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{stats.totalTrips > 0 ? Math.round(stats.totalBookings / stats.totalTrips) : 0}</div>
              <div className="text-sm text-muted-foreground">Avg. Bookings/Trip</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{stats.avgLoadFactor}%</div>
              <div className="text-sm text-muted-foreground">Load Factor</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{stats.topRoutes.length > 0 ? stats.topRoutes[0].route.split('→')[0].trim() : '-'}</div>
              <div className="text-sm text-muted-foreground">Top Origin</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
