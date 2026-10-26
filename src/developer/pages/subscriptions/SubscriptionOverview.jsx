import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  BarChart3,
  FileText,
  Search,
  Filter,
  ChevronDown,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useSubscriptionStats, useRevenue, useUpcomingRenewals, useTransactions } from '../../hooks/useDevApi';

// Map API data to expected format
const mapStats = (stats) => ({
  mrr: stats?.mrr || 0,
  mrrGrowth: stats?.mrr_growth || 0,
  arr: stats?.arr || (stats?.mrr || 0) * 12,
  activeSubscriptions: stats?.active_subscriptions || stats?.active || 0,
  trialSubscriptions: stats?.trial_subscriptions || stats?.trials || 0,
  churnRate: stats?.churn_rate || 0,
  averageRevenue: stats?.average_revenue || stats?.arpu || 0,
  totalModuleLicenses: stats?.total_module_licenses || 0,
});

// Safely ensure data is an array before mapping
const ensureArray = (data) => Array.isArray(data) ? data : data?.data || [];

const mapRevenueByPlan = (data) => ensureArray(data).map(item => ({
  plan: item.plan || item.plan_name,
  count: item.count || item.tenant_count,
  revenue: item.revenue || item.mrr,
  percentage: item.percentage || 0,
}));

const mapRenewals = (data) => ensureArray(data).map(item => ({
  id: item.id,
  tenant: item.tenant_name || item.tenant?.name,
  plan: item.plan || item.plan_name,
  amount: item.amount,
  dueDate: item.due_date || item.renewal_date,
  status: item.status || 'pending',
  notes: item.notes,
}));

const mapTransactions = (data) => ensureArray(data).map(item => ({
  id: item.id,
  tenant: item.tenant_name || item.tenant?.name,
  type: item.type || 'subscription',
  amount: item.amount,
  status: item.status,
  date: item.date || item.created_at,
  description: item.description,
  failureReason: item.failure_reason,
}));

const statusConfig = {
  completed: { label: 'Completed', color: 'bg-emerald-500/20 text-emerald-400' },
  pending: { label: 'Pending', color: 'bg-amber-500/20 text-amber-400' },
  failed: { label: 'Failed', color: 'bg-red-500/20 text-red-400' },
  at_risk: { label: 'At Risk', color: 'bg-red-500/20 text-red-400' },
  refunded: { label: 'Refunded', color: 'bg-gray-500/20 text-gray-400' },
};

const planColors = {
  Starter: 'bg-gray-500/20 text-gray-400',
  Professional: 'bg-blue-500/20 text-blue-400',
  Enterprise: 'bg-purple-500/20 text-purple-400',
};

export default function SubscriptionOverview() {
  const [timeRange, setTimeRange] = useState('30d');
  
  // Fetch real data from API
  const { data: statsData, loading: _statsLoading, refetch: _refetchStats } = useSubscriptionStats();
  const { data: revenueByPlanData } = useRevenue('plan');
  const { data: revenueByModuleData } = useRevenue('module');
  const { data: renewalsData } = useUpcomingRenewals(30);
  const { data: transactionsData } = useTransactions({ limit: 5 });

  // Map data to expected formats
  const stats = mapStats(statsData);
  const revenueByPlan = mapRevenueByPlan(revenueByPlanData?.byPlan || revenueByPlanData);
  
  // Safely extract revenueByModule array from various response formats
  const revenueByModuleArray = Array.isArray(revenueByModuleData) 
    ? revenueByModuleData 
    : revenueByModuleData?.byModule || revenueByModuleData?.data || [];
  const revenueByModule = revenueByModuleArray.map(item => ({
    module: item.module || item.module_name,
    licenses: item.licenses || item.license_count || 0,
    revenue: item.revenue || 0,
    price: item.price || item.unit_price || 0,
    included: item.included || false,
  }));
  const upcomingRenewals = mapRenewals(renewalsData?.renewals || renewalsData);
  const recentTransactions = mapTransactions(transactionsData?.transactions || transactionsData);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const daysUntil = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Subscriptions & Billing</h1>
          <p className="mt-1 text-sm text-gray-400">
            Monitor revenue, subscriptions, and billing across all tenants
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="appearance-none rounded-lg border border-gray-600 bg-gray-800 py-2 pl-4 pr-10 text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="12m">Last 12 months</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors">
            <FileText className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Monthly Recurring Revenue</p>
            <DollarSign className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {formatCurrency(stats.mrr)}
          </p>
          <div className="mt-1 flex items-center gap-1 text-sm">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-emerald-400">+{stats.mrrGrowth}%</span>
            <span className="text-gray-500">vs last month</span>
          </div>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Active Subscriptions</p>
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {stats.activeSubscriptions}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            +{stats.trialSubscriptions} in trial
          </p>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Avg. Revenue per Tenant</p>
            <BarChart3 className="h-5 w-5 text-purple-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {formatCurrency(stats.averageRevenue)}
          </p>
          <p className="mt-1 text-sm text-gray-500">/month</p>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Churn Rate</p>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {stats.churnRate}%
          </p>
          <p className="mt-1 text-sm text-emerald-400">Below industry average</p>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-2 gap-6">
        {/* Revenue by Plan */}
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue by Plan</h3>
          <div className="space-y-4">
            {revenueByPlan.map((plan) => (
              <div key={plan.plan}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${planColors[plan.plan]}`}>
                      {plan.plan}
                    </span>
                    <span className="text-sm text-gray-400">{plan.count} tenants</span>
                  </div>
                  <span className="text-sm font-medium text-white">
                    {formatCurrency(plan.revenue)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      plan.plan === 'Enterprise'
                        ? 'bg-purple-500'
                        : plan.plan === 'Professional'
                        ? 'bg-blue-500'
                        : 'bg-gray-500'
                    }`}
                    style={{ width: `${plan.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Total MRR</span>
              <span className="font-semibold text-white">
                {formatCurrency(stats.mrr)}
              </span>
            </div>
          </div>
        </div>

        {/* Revenue by Module */}
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Module Licenses</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {revenueByModule.map((module, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-white">{module.module}</p>
                    <p className="text-xs text-gray-500">{module.licenses} licenses</p>
                  </div>
                </div>
                <div className="text-right">
                  {module.included ? (
                    <span className="text-xs text-emerald-400">Included</span>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-white">
                        {formatCurrency(module.revenue)}
                      </p>
                      <p className="text-xs text-gray-500">{formatCurrency(module.price)}/mo each</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Total Module Revenue</span>
              <span className="font-semibold text-white">
                {formatCurrency(
                  revenueByModule.reduce((acc, m) => acc + (m.revenue || 0), 0)
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Renewals */}
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Upcoming Renewals</h3>
          <Link
            to="/developer/subscriptions/renewals"
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left">
                <th className="pb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Tenant
                </th>
                <th className="pb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Plan
                </th>
                <th className="pb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Amount
                </th>
                <th className="pb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Due Date
                </th>
                <th className="pb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="pb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {upcomingRenewals.map((renewal) => {
                const days = daysUntil(renewal.dueDate);
                return (
                  <tr key={renewal.id} className="group">
                    <td className="py-3">
                      <Link
                        to={`/tenants/${renewal.id}`}
                        className="text-white hover:text-emerald-400"
                      >
                        {renewal.tenant}
                      </Link>
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${planColors[renewal.plan]}`}>
                        {renewal.plan}
                      </span>
                    </td>
                    <td className="py-3 text-white">{formatCurrency(renewal.amount)}</td>
                    <td className="py-3">
                      <div>
                        <p className="text-white">{formatDate(renewal.dueDate)}</p>
                        <p className={`text-xs ${days <= 7 ? 'text-amber-400' : 'text-gray-500'}`}>
                          {days} days
                        </p>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusConfig[renewal.status].color}`}>
                        {statusConfig[renewal.status].label}
                      </span>
                      {renewal.notes && (
                        <p className="text-xs text-red-400 mt-1">{renewal.notes}</p>
                      )}
                    </td>
                    <td className="py-3">
                      <button className="text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
          <Link
            to="/developer/subscriptions/transactions"
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            View all →
          </Link>
        </div>
        <div className="space-y-3">
          {recentTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 hover:bg-gray-900 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`rounded-full p-2 ${
                    transaction.status === 'completed'
                      ? 'bg-emerald-500/20'
                      : transaction.status === 'failed'
                      ? 'bg-red-500/20'
                      : 'bg-gray-500/20'
                  }`}
                >
                  <CreditCard
                    className={`h-5 w-5 ${
                      transaction.status === 'completed'
                        ? 'text-emerald-400'
                        : transaction.status === 'failed'
                        ? 'text-red-400'
                        : 'text-gray-400'
                    }`}
                  />
                </div>
                <div>
                  <p className="text-sm text-white">{transaction.description}</p>
                  <p className="text-xs text-gray-500">
                    {transaction.tenant} • {new Date(transaction.date).toLocaleString()}
                  </p>
                  {transaction.failureReason && (
                    <p className="text-xs text-red-400 mt-1">{transaction.failureReason}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`font-medium ${
                    transaction.status === 'completed'
                      ? 'text-emerald-400'
                      : transaction.status === 'failed'
                      ? 'text-red-400'
                      : 'text-white'
                  }`}
                >
                  {transaction.status === 'failed' ? '—' : `+${formatCurrency(transaction.amount)}`}
                </p>
                <span
                  className={`text-xs rounded-full px-2 py-0.5 ${
                    statusConfig[transaction.status].color
                  }`}
                >
                  {statusConfig[transaction.status].label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
