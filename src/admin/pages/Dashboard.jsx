import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGetIdentity } from '@refinedev/core';
import { 
  Calendar, 
  Users, 
  Stethoscope, 
  TrendingUp,
  Clock,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  DollarSign,
  FileText,
  Package,
  AlertTriangle
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useRegionalSettings } from '../../contexts/RegionalContext';
import { useTenant } from '../contexts/TenantContext';

const StatCard = ({ title, value, icon: IconComp, color, change }) => {
  const Icon = IconComp;
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change > 0 ? '+' : ''}{change}% from last month
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

const AppointmentStatusBadge = ({ status }) => {
  const styles = {
    booked: 'bg-yellow-100 text-yellow-700',
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    no_show: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };

  const labels = {
    booked: 'Booked',
    pending: 'Pending',
    confirmed: 'Confirmed',
    in_progress: 'In Progress',
    completed: 'Completed',
    no_show: 'No Show',
    cancelled: 'Cancelled',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.booked}`}>
      {labels[status] || status}
    </span>
  );
};

const Dashboard = () => {
  const { data: identity } = useGetIdentity();
  const { formatCurrency, defaultCurrency } = useRegionalSettings();
  const { tenantId } = useTenant();
  const [stats, setStats] = useState({
    todayAppointments: 0,
    totalPatients: 0,
    activeDoctors: 0,
    monthAppointments: 0,
    monthRevenue: 0,
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const fetchDashboardData = async () => {
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const monthStart = startOfMonth(new Date()).toISOString();
        const monthEnd = endOfMonth(new Date()).toISOString();

        // Use Promise.allSettled to handle missing tables gracefully
        const results = await Promise.allSettled([
          // Today's appointments count
          supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .gte('datetime_start', todayStart.toISOString())
            .lte('datetime_start', todayEnd.toISOString())
            .abortSignal(AbortSignal.timeout(3000)),
          // Total active patients count
          supabase
            .from('patients')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .abortSignal(AbortSignal.timeout(3000)),
          // Active doctors count
          supabase
            .from('doctors')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .abortSignal(AbortSignal.timeout(3000)),
          // This month's appointments count
          supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .gte('datetime_start', monthStart)
            .lte('datetime_start', monthEnd)
            .abortSignal(AbortSignal.timeout(3000)),
          // Upcoming appointments (today and future, pending/confirmed)
          supabase
            .from('appointments')
            .select(`
              *,
              patients (id, name, phone),
              doctors (id, name_en, name_ar),
              branches (id, name_en, name_ar)
            `)
            .eq('tenant_id', tenantId)
            .gte('datetime_start', todayStart.toISOString())
            .in('status', ['booked', 'confirmed'])
            .order('datetime_start', { ascending: true })
            .limit(5)
            .abortSignal(AbortSignal.timeout(3000)),
          // Recent patients
          supabase
            .from('patients')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(5)
            .abortSignal(AbortSignal.timeout(3000)),
          // This month's revenue
          supabase
            .from('invoices')
            .select('total_amount')
            .eq('tenant_id', tenantId)
            .gte('created_at', monthStart)
            .lte('created_at', monthEnd)
            .eq('status', 'paid')
            .abortSignal(AbortSignal.timeout(3000)),
          // Low stock items (view has no tenant_id column - it joins inventory_items which is already tenant-scoped via RLS)
          supabase
            .from('v_low_stock_items')
            .select('*')
            .limit(5)
            .abortSignal(AbortSignal.timeout(3000)),
        ]);

        // Extract values, defaulting to 0/empty if failed
        const getValue = (result, prop = 'count') => {
          if (result.status === 'fulfilled' && result.value) {
            return prop === 'data' ? (result.value.data || []) : (result.value[prop] || 0);
          }
          return prop === 'data' ? [] : 0;
        };

        // Calculate revenue from invoices
        const invoices = getValue(results[6], 'data');
        const totalRevenue = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);

        setStats({
          todayAppointments: getValue(results[0]),
          totalPatients: getValue(results[1]),
          activeDoctors: getValue(results[2]),
          monthAppointments: getValue(results[3]),
          monthRevenue: totalRevenue,
        });

        setUpcomingAppointments(getValue(results[4], 'data'));
        setRecentPatients(getValue(results[5], 'data'));
        setLowStockItems(getValue(results[7], 'data'));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {identity?.name?.split(' ')[0] || 'Admin'}!
          </h1>
          <p className="text-gray-500 mt-1">
            Here's what's happening at your clinic today.
          </p>
        </div>
        <Link 
          to="/appointments/create"
          className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Calendar className="w-4 h-4" />
          New Appointment
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard 
          title="Today's Appointments" 
          value={stats.todayAppointments}
          icon={Calendar}
          color="bg-blue-500"
        />
        <StatCard 
          title="Total Patients" 
          value={stats.totalPatients}
          icon={Users}
          color="bg-green-500"
        />
        <StatCard 
          title="Active Doctors" 
          value={stats.activeDoctors}
          icon={Stethoscope}
          color="bg-purple-500"
        />
        <StatCard 
          title="Month Appointments" 
          value={stats.monthAppointments}
          icon={TrendingUp}
          color="bg-orange-500"
        />
        <StatCard 
          title="Month Revenue" 
          value={formatCurrency(stats.monthRevenue, defaultCurrency?.code)}
          icon={DollarSign}
          color="bg-emerald-500"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Appointments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
              <Link 
                to="/appointments"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {upcomingAppointments.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>No upcoming appointments</p>
              </div>
            ) : (
              upcomingAppointments.map((appointment) => {
                const startDate = appointment.datetime_start ? new Date(appointment.datetime_start) : new Date();
                return (
                  <div key={appointment.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-semibold">
                            {appointment.patients?.name?.[0]?.toUpperCase() || 'P'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {appointment.patients?.name || 'Unknown Patient'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {appointment.doctors?.name_en || 'No doctor assigned'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {format(startDate, 'MMM d')} at {format(startDate, 'HH:mm')}
                        </p>
                        <AppointmentStatusBadge status={appointment.status} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Patients */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Patients</h2>
              <Link 
                to="/patients"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {recentPatients.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>No patients yet</p>
              </div>
            ) : (
              recentPatients.map((patient) => (
                <div key={patient.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-semibold">
                          {patient.first_name?.[0]?.toUpperCase() || 'P'}{patient.last_name?.[0]?.toUpperCase() || ''}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {patient.first_name} {patient.last_name}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {patient.phone || 'No phone'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {patient.created_at ? format(parseISO(patient.created_at), 'MMM d, yyyy') : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Low Stock Alert
              </h2>
              <Link 
                to="/inventory"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
              >
                Inventory <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {lowStockItems.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto text-green-300 mb-2" />
                <p className="text-green-600 font-medium">All stock levels OK</p>
              </div>
            ) : (
              lowStockItems.map((item, index) => (
                <div key={item.id || `${item.inventory_item_id || index}-${item.branch_id || index}`} className="p-4 hover:bg-amber-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.name_en}</p>
                        <p className="text-sm text-gray-500">{item.branch_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-600">
                        {item.current_stock} / {item.reorder_level}
                      </p>
                      <p className="text-xs text-gray-500">{item.unit}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link 
            to="/appointments/create"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <Calendar className="w-8 h-8 text-primary-500" />
            <span className="text-sm font-medium text-gray-700">New Appointment</span>
          </Link>
          <Link 
            to="/patients/create"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <Users className="w-8 h-8 text-primary-500" />
            <span className="text-sm font-medium text-gray-700">Add Patient</span>
          </Link>
          <Link 
            to="/doctors/create"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <Stethoscope className="w-8 h-8 text-primary-500" />
            <span className="text-sm font-medium text-gray-700">Add Doctor</span>
          </Link>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
