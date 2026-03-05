import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Ticket, 
  DollarSign, 
  Bus, 
  Users,
  AlertCircle,
  TrendingUp,
  Route,
  Activity,
  Clock,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface DashboardStats {
  totalBookingsToday: number;
  totalRevenueToday: number;
  activeTrips: number;
  seatsSold: number;
  failedPayments: number;
  operatorsActive: number;
}

interface ActivityItem {
  id: string;
  type: 'booking' | 'delay' | 'approval';
  message: string;
  timestamp: string;
  details?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const EnterpriseDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalBookingsToday: 0,
    totalRevenueToday: 0,
    activeTrips: 0,
    seatsSold: 0,
    failedPayments: 0,
    operatorsActive: 0
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  
  // Chart data
  const [bookingsPerHour, setBookingsPerHour] = useState<{hour: string, bookings: number, revenue: number}[]>([]);
  const [revenuePerOperator, setRevenuePerOperator] = useState<{name: string, revenue: number}[]>([]);
  const [topRoutes, setTopRoutes] = useState<{name: string, bookings: number, revenue: number}[]>([]);
  const [tripOccupancy, setTripOccupancy] = useState<{name: string, occupancy: number}[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      // Fetch today's bookings
      const bookingsRes = await supabase
        .from('bookings')
        .select('id, amount, status, created_at, trip_id')
        .gte('created_at', todayStr);
      
      const bookings = bookingsRes.data || [];
      
      // Calculate today's stats
      const paidBookings = bookings.filter(b => b.status === 'paid');
      const failedBookings = bookings.filter(b => b.status === 'failed');
      
      const totalBookingsToday = paidBookings.length;
      const totalRevenueToday = paidBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
      const failedPayments = failedBookings.length;

      // Fetch active trips
      const tripsRes = await supabase
        .from('trips')
        .select('id, status, departure_time')
        .eq('status', 'active')
        .gte('departure_time', new Date().toISOString());
      
      const activeTrips = tripsRes.data?.length || 0;

      // Calculate seats sold
      const seatsSold = totalBookingsToday;

      // Fetch active operators
      const operatorsRes = await supabase
        .from('operators')
        .select('id, status')
        .eq('status', 'approved');
      
      const operatorsActive = operatorsRes.data?.length || 0;

      setStats({
        totalBookingsToday,
        totalRevenueToday,
        activeTrips,
        seatsSold,
        failedPayments,
        operatorsActive
      });

      // Fetch bookings per hour
      const hourlyData: Record<number, {bookings: number, revenue: number}> = {};
      for (let i = 0; i < 24; i++) {
        hourlyData[i] = { bookings: 0, revenue: 0 };
      }
      bookings.forEach(b => {
        const hour = new Date(b.created_at).getHours();
        if (hourlyData[hour]) {
          hourlyData[hour].bookings++;
          if (b.status === 'paid') {
            hourlyData[hour].revenue += b.amount || 0;
          }
        }
      });
      setBookingsPerHour(
        Object.entries(hourlyData).map(([hour, data]) => ({
          hour: `${hour}:00`,
          bookings: data.bookings,
          revenue: data.revenue
        }))
      );

      // Fetch revenue per operator
      const operatorBookings = await supabase
        .from('bookings')
        .select('amount, status, trips!inner(operator_id)')
        .gte('created_at', todayStr)
        .eq('status', 'paid');
      
      const operatorRevenue: Record<string, number> = {};
      if (operatorBookings.data) {
        for (const booking of operatorBookings.data) {
          // @ts-ignore - trips relation
          const opId = booking.trips?.operator_id;
          if (opId) {
            operatorRevenue[opId] = (operatorRevenue[opId] || 0) + (booking.amount || 0);
          }
        }
      }
      
      // Get operator names
      const opIds = Object.keys(operatorRevenue);
      if (opIds.length > 0) {
        const { data: opsData } = await supabase
          .from('operators')
          .select('id, company_name')
          .in('id', opIds);
        
        const opsMap = new Map((opsData || []).map(o => [o.id, o.company_name || 'Unknown']));
        setRevenuePerOperator(
          Object.entries(operatorRevenue)
            .map(([id, revenue]) => ({
              name: opsMap.get(id) || 'Unknown',
              revenue
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)
        );
      } else {
        setRevenuePerOperator([]);
      }

      // Fetch top routes
      const routeBookings = await supabase
        .from('bookings')
        .select('amount, status, trips!inner(route_id)')
        .gte('created_at', todayStr);
      
      const routeData: Record<string, {bookings: number, revenue: number}> = {};
      if (routeBookings.data) {
        for (const booking of routeBookings.data) {
          // @ts-ignore - trips relation
          const routeId = booking.trips?.route_id;
          if (routeId) {
            if (!routeData[routeId]) {
              routeData[routeId] = { bookings: 0, revenue: 0 };
            }
            routeData[routeId].bookings++;
            if (booking.status === 'paid') {
              routeData[routeId].revenue += booking.amount || 0;
            }
          }
        }
      }
      
      const routeIds = Object.keys(routeData);
      if (routeIds.length > 0) {
        const { data: routesData } = await supabase
          .from('routes')
          .select('id, origin, destination')
          .in('id', routeIds);
        
        const routesMap = new Map((routesData || []).map(r => [r.id, `${r.origin} → ${r.destination}`]));
        setTopRoutes(
          Object.entries(routeData)
            .map(([id, data]) => ({
              name: routesMap.get(id) || 'Unknown',
              bookings: data.bookings,
              revenue: data.revenue
            }))
            .sort((a, b) => b.bookings - a.bookings)
            .slice(0, 10)
        );
      } else {
        setTopRoutes([]);
      }

      // Fetch trip occupancy
      const allTrips = await supabase
        .from('trips')
        .select('id, route_id, departure_time, status')
        .gte('departure_time', todayStr)
        .limit(50);
      
      if (allTrips.data) {
        const tripOccupancyData: {name: string, occupancy: number}[] = [];
        
        for (const trip of allTrips.data.slice(0, 10)) {
          const { count } = await supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('trip_id', trip.id)
            .eq('status', 'paid');
          
          const routeRes = await supabase
            .from('routes')
            .select('origin, destination')
            .eq('id', trip.route_id)
            .single();
          
          const routeName = routeRes.data ? `${routeRes.data.origin} → ${routeRes.data.destination}` : 'Unknown';
          // Assume max capacity of 50 for calculation
          const occupancy = Math.min(100, Math.round(((count || 0) / 50) * 100));
          
          tripOccupancyData.push({ name: routeName, occupancy });
        }
        
        setTripOccupancy(tripOccupancyData);
      }

      // Fetch recent activities
      await fetchRecentActivities();

      setLastUpdated(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  }, []);

  const fetchRecentActivities = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const newActivities: ActivityItem[] = [];

    // Get recent bookings
    const recentBookings = await supabase
      .from('bookings')
      .select('id, passenger_name, status, created_at, amount')
      .gte('created_at', todayStr)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentBookings.data) {
      recentBookings.data.forEach(b => {
        newActivities.push({
          id: `booking-${b.id}`,
          type: 'booking',
          message: b.status === 'paid' 
            ? `New booking: ${b.passenger_name || 'Passenger'} - MWK ${b.amount?.toLocaleString()}`
            : `Booking failed: ${b.passenger_name || 'Passenger'}`,
          timestamp: b.created_at,
          details: b.status
        });
      });
    }

    // Get trip delays
    const delayedTrips = await supabase
      .from('trips')
      .select('id, departure_time, delay_minutes, route_id')
      .gte('departure_time', todayStr)
      .gt('delay_minutes', 0)
      .order('departure_time', { ascending: false })
      .limit(5);

    if (delayedTrips.data) {
      for (const trip of delayedTrips.data) {
        const routeRes = await supabase
          .from('routes')
          .select('origin, destination')
          .eq('id', trip.route_id)
          .single();
        
        const routeName = routeRes.data ? `${routeRes.data.origin} → ${routeRes.data.destination}` : 'Unknown';
        
        newActivities.push({
          id: `delay-${trip.id}`,
          type: 'delay',
          message: `Trip delayed by ${trip.delay_minutes} minutes`,
          timestamp: trip.departure_time,
          details: routeName
        });
      }
    }

    // Get operator approvals
    const recentOperators = await supabase
      .from('operators')
      .select('id, company_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentOperators.data) {
      recentOperators.data.forEach(op => {
        newActivities.push({
          id: `operator-${op.id}`,
          type: 'approval',
          message: `Operator ${op.status}: ${op.company_name}`,
          timestamp: op.created_at,
          details: op.status
        });
      });
    }

    // Sort by timestamp and take latest 15
    newActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setActivities(newActivities.slice(0, 15));
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchDashboardData, 10000);
    
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const statCards = [
    {
      title: 'Bookings Today',
      value: stats.totalBookingsToday,
      subtitle: 'Total tickets sold',
      icon: Ticket,
      color: 'bg-blue-500',
      trend: '+12%'
    },
    {
      title: 'Revenue Today',
      value: `MWK ${stats.totalRevenueToday.toLocaleString()}`,
      subtitle: 'From paid bookings',
      icon: DollarSign,
      color: 'bg-green-500',
      trend: '+8%'
    },
    {
      title: 'Active Trips',
      value: stats.activeTrips,
      subtitle: 'Currently running',
      icon: Bus,
      color: 'bg-purple-500',
      trend: '+3'
    },
    {
      title: 'Seats Sold',
      value: stats.seatsSold,
      subtitle: 'Today',
      icon: Users,
      color: 'bg-cyan-500',
      trend: '+15%'
    },
    {
      title: 'Failed Payments',
      value: stats.failedPayments,
      subtitle: 'Requires attention',
      icon: AlertCircle,
      color: 'bg-red-500',
      trend: stats.failedPayments > 0 ? 'Needs review' : 'No issues'
    },
    {
      title: 'Active Operators',
      value: stats.operatorsActive,
      subtitle: 'Approved operators',
      icon: Activity,
      color: 'bg-orange-500',
      trend: '+2'
    }
  ];

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'booking': return <Ticket className="h-4 w-4 text-blue-500" />;
      case 'delay': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'approval': return <Users className="h-4 w-4 text-green-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  if (loading && stats.totalBookingsToday === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Enterprise Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Real-time platform analytics
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4" />
          Last updated: {lastUpdated.toLocaleTimeString()}
          <Badge variant="outline" className="ml-2">Auto-refresh: 10s</Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{stat.subtitle}</div>
                  </div>
                  <div className={`p-2 rounded-full ${stat.color}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs">
                  {stat.trend.startsWith('+') ? (
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                  ) : stat.trend.includes('review') || stat.trend.includes('No') ? (
                    <Activity className="h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                  )}
                  <span className={stat.trend.startsWith('+') ? 'text-green-500' : 'text-muted-foreground'}>
                    {stat.trend}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings Per Hour */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bookings Per Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bookingsPerHour}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="bookings" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                    name="Bookings"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Per Operator */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue Per Operator</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenuePerOperator} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => [`MWK ${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Routes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Routes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topRoutes}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                  />
                  <Legend />
                  <Bar dataKey="bookings" fill="#f59e0b" name="Bookings" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Trip Occupancy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trip Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tripOccupancy}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="occupancy"
                    nameKey="name"
                    label={({ name, occupancy }) => `${name.substring(0, 15)}: ${occupancy}%`}
                    labelLine={false}
                  >
                    {tripOccupancy.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => [`${value}%`, 'Occupancy']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity
              </div>
            ) : (
              activities.map((activity) => (
                <div 
                  key={activity.id} 
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{activity.message}</p>
                      <Badge 
                        variant={activity.type === 'booking' ? 'default' : activity.type === 'delay' ? 'destructive' : 'secondary'}
                        className="text-xs shrink-0"
                      >
                        {activity.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(activity.timestamp)}
                      {activity.details && (
                        <>
                          <span>•</span>
                          <span>{activity.details}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnterpriseDashboard;
