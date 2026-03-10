import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Ticket, 
  DollarSign, 
  TrendingUp,
  Bus,
  Route,
  ArrowRight,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';

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
    const [operatorsRes, bookingsRes, settingsRes] = await Promise.all([
      supabase.from('operators').select('id, status'),
      supabase.from('bookings').select('amount, status'),
      supabase.from('platform_settings').select('*').limit(1)
    ]);

    const operators = operatorsRes.data || [];
    const bookings = bookingsRes.data || [];

    const [busesRes, routesRes] = await Promise.all([
      supabase.from('buses').select('id', { count: 'exact', head: true }),
      supabase.from('routes').select('id', { count: 'exact', head: true })
    ]);

    const totalRevenue = bookings
      .filter(b => b.status === 'paid')
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    const platformCommission = totalRevenue * 0.1;

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
    { title: 'Total Operators', value: stats.totalOperators, subtitle: `${stats.approvedOperators} active, ${stats.pendingOperators} pending`, icon: Users, gradient: 'from-blue-500 to-blue-600' },
    { title: 'Total Bookings', value: stats.totalBookings, subtitle: 'Paid tickets', icon: Ticket, gradient: 'from-emerald-500 to-emerald-600' },
    { title: 'Total Revenue', value: `MWK ${(stats.totalRevenue / 1000000).toFixed(1)}M`, subtitle: 'From paid bookings', icon: DollarSign, gradient: 'from-purple-500 to-purple-600' },
    { title: 'Commission', value: `MWK ${(stats.platformCommission / 1000).toFixed(0)}K`, subtitle: 'Revenue share', icon: TrendingUp, gradient: 'from-orange-500 to-orange-600' },
    { title: 'Total Buses', value: stats.totalBuses, subtitle: 'Across operators', icon: Bus, gradient: 'from-cyan-500 to-cyan-600' },
    { title: 'Total Routes', value: stats.totalRoutes, subtitle: 'Active routes', icon: Route, gradient: 'from-pink-500 to-pink-600' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Dashboard</h1>
          <p className="text-slate-500">Platform overview and statistics</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Activity className="h-4 w-4 text-emerald-500" />
          <span>Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5`}></div>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    <p className="text-sm text-slate-400 mt-1">{stat.subtitle}</p>
                  </div>
                  <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/admin/operators" className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg">
              <span className="font-medium">Manage Operators</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link to="/admin/settings" className="flex items-center justify-between p-4 rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all">
              <span className="font-medium text-slate-700">Platform Settings</span>
              <ArrowRight className="h-5 w-5 text-slate-400" />
            </Link>
            <Link to="/admin/reports" className="flex items-center justify-between p-4 rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all">
              <span className="font-medium text-slate-700">View Reports</span>
              <ArrowRight className="h-5 w-5 text-slate-400" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="font-medium text-slate-700">Database</span>
              </div>
              <span className="text-emerald-600 text-sm font-medium">Connected</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="font-medium text-slate-700">Auth Service</span>
              </div>
              <span className="text-emerald-600 text-sm font-medium">Active</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="font-medium text-slate-700">SMS Service</span>
              </div>
              <span className="text-amber-600 text-sm font-medium">Mock Mode</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardHome;
