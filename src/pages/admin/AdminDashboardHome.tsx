import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Ticket, 
  DollarSign, 
  TrendingUp,
  Bus,
  Route
} from 'lucide-react';

const AdminDashboardHome = () => {
  const [stats, setStats] = useState({
    totalOperators: 0,
    approvedOperators: 0,
    pendingOperators: 0,
    totalBookings: 0,
    totalRevenue: 0,
    platformCommission: 0,
    totalBuses: 0,
    totalRoutes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // Get operators count
    const [operatorsRes, bookingsRes, settingsRes] = await Promise.all([
      supabase.from('operators').select('id, status'),
      supabase.from('bookings').select('amount, status'),
      supabase.from('platform_settings').select('*').limit(1)
    ]);

    const operators = operatorsRes.data || [];
    const bookings = bookingsRes.data || [];
    const settings = settingsRes.data?.[0];

    // Get buses and routes count
    const [busesRes, routesRes] = await Promise.all([
      supabase.from('buses').select('id', { count: 'exact', head: true }),
      supabase.from('routes').select('id', { count: 'exact', head: true })
    ]);

    const totalRevenue = bookings
      .filter(b => b.status === 'paid')
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    const defaultCommission = settings?.default_commission || 10;
    const platformCommission = totalRevenue * (defaultCommission / 100);

    setStats({
      totalOperators: operators.length,
      approvedOperators: operators.filter(o => o.status === 'approved').length,
      pendingOperators: operators.filter(o => o.status === 'pending').length,
      totalBookings: bookings.filter(b => b.status === 'paid').length,
      totalRevenue,
      platformCommission,
      totalBuses: busesRes.count || 0,
      totalRoutes: routesRes.count || 0
    });
    setLoading(false);
  };

  const statCards = [
    {
      title: 'Total Operators',
      value: stats.totalOperators,
      subtitle: `${stats.approvedOperators} approved, ${stats.pendingOperators} pending`,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      subtitle: 'Paid tickets',
      icon: Ticket,
      color: 'bg-green-500'
    },
    {
      title: 'Total Revenue',
      value: `MWK ${stats.totalRevenue.toLocaleString()}`,
      subtitle: 'From paid bookings',
      icon: DollarSign,
      color: 'bg-purple-500'
    },
    {
      title: 'Platform Commission',
      value: `MWK ${stats.platformCommission.toLocaleString()}`,
      subtitle: `Based on ${stats.platformCommission > 0 ? '10' : '10'}% rate`,
      icon: TrendingUp,
      color: 'bg-orange-500'
    },
    {
      title: 'Total Buses',
      value: stats.totalBuses,
      subtitle: 'Across all operators',
      icon: Bus,
      color: 'bg-cyan-500'
    },
    {
      title: 'Total Routes',
      value: stats.totalRoutes,
      subtitle: 'Active routes',
      icon: Route,
      color: 'bg-pink-500'
    }
  ];

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Platform overview and statistics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {stat.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold">{stat.value}</span>
                  <div className={`p-3 rounded-full ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">{stat.subtitle}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/admin/operators"
              className="block p-3 rounded-lg bg-primary text-white text-center hover:opacity-90"
            >
              Manage Operators
            </a>
            <a
              href="/admin/settings"
              className="block p-3 rounded-lg border text-center hover:bg-gray-50"
            >
              Platform Settings
            </a>
            <a
              href="/admin/reports"
              className="block p-3 rounded-lg border text-center hover:bg-gray-50"
            >
              View Reports
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Database</span>
                <span className="text-green-600 font-medium">● Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Auth Service</span>
                <span className="text-green-600 font-medium">● Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">SMS Service</span>
                <span className="text-yellow-600 font-medium">● Mock Mode</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardHome;
