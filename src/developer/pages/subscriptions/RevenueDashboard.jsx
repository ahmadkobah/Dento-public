import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  CreditCard,
  Users,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const currencySymbols = { USD: '$', EGP: 'E£', EUR: '€', GBP: '£', SAR: 'SAR ', AED: 'AED ', TRY: '₺', KWD: 'KD ' };

function formatCurrency(amount, currency = 'USD') {
  const sym = currencySymbols[currency] || '$';
  return `${sym}${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(d) {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function RevenueDashboard() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState({
    totalRevenue: 0,
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    invoiceCount: 0,
    paidCount: 0,
    mrr: 0,
    arr: 0,
    avgInvoice: 0,
    collectionRate: 0,
    revenueByMonth: [],
    revenueByPlan: [],
    revenueByModule: [],
    revenueByCurrency: [],
    topTenants: [],
    recentInvoices: [],
    overdueInvoices: [],
  });

  const fetchRevenue = useCallback(async () => {
    setLoading(true);
    try {
      // Calculate date range
      const now = new Date();
      let startDate;
      if (period === '7d') startDate = new Date(now - 7 * 86400000);
      else if (period === '30d') startDate = new Date(now - 30 * 86400000);
      else if (period === '90d') startDate = new Date(now - 90 * 86400000);
      else startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);

      const startStr = startDate.toISOString().split('T')[0];

      // Fetch all invoices
      const { data: invoices } = await supabase
        .from('saas_invoices')
        .select('id, tenant_id, invoice_number, status, subtotal, tax_amount, total, currency, issue_date, due_date, paid_at, billing_period_start, billing_period_end, created_at, tenants(id, name, slug)')
        .gte('created_at', startStr)
        .order('created_at', { ascending: false });

      // Fetch all payments
      const { data: payments } = await supabase
        .from('saas_payments')
        .select('id, tenant_id, amount, currency, status, payment_method, processed_at, created_at')
        .gte('created_at', startStr)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      // Fetch active tenant modules for MRR
      const { data: tenantModules } = await supabase
        .from('tenant_modules')
        .select('tenant_id, price_override, license_type, status, modules(name_en, base_price_monthly, is_free)')
        .eq('status', 'active');

      // Fetch tenants with plans
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name, slug, subscription_status, currency_code, billing_cycle, subscription_plans(name_en, price_monthly_usd, price_monthly_egp)')
        .in('subscription_status', ['active', 'trial']);

      const allInvoices = invoices || [];
      const _allPayments = payments || [];

      // Calculate totals
      const totalRevenue = allInvoices.reduce((s, i) => s + parseFloat(i.total || 0), 0);
      const paidInvoices = allInvoices.filter(i => i.status === 'paid');
      const totalPaid = paidInvoices.reduce((s, i) => s + parseFloat(i.total || 0), 0);
      const pendingInvoices = allInvoices.filter(i => i.status === 'pending');
      const totalPending = pendingInvoices.reduce((s, i) => s + parseFloat(i.total || 0), 0);
      const overdueInvoices = allInvoices.filter(i => i.status === 'overdue');
      const totalOverdue = overdueInvoices.reduce((s, i) => s + parseFloat(i.total || 0), 0);

      // MRR calculation
      let mrr = 0;
      (tenants || []).forEach(t => {
        if (t.subscription_plans) {
          const planPrice = t.currency_code === 'EGP'
            ? (t.subscription_plans.price_monthly_egp || 0)
            : (t.subscription_plans.price_monthly_usd || 0);
          mrr += planPrice;
        }
      });
      (tenantModules || []).forEach(tm => {
        if (tm.modules?.is_free || ['included', 'lifetime'].includes(tm.license_type)) return;
        const price = tm.price_override != null ? parseFloat(tm.price_override) : (tm.modules?.base_price_monthly || 0);
        mrr += price;
      });

      // Revenue by month
      const monthMap = {};
      allInvoices.forEach(inv => {
        const month = (inv.issue_date || inv.created_at || '').substring(0, 7);
        if (!month) return;
        if (!monthMap[month]) monthMap[month] = { month, invoiced: 0, collected: 0, count: 0 };
        monthMap[month].invoiced += parseFloat(inv.total || 0);
        monthMap[month].count++;
        if (inv.status === 'paid') monthMap[month].collected += parseFloat(inv.total || 0);
      });
      const revenueByMonth = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

      // Revenue by plan
      const planMap = {};
      (tenants || []).forEach(t => {
        const planName = t.subscription_plans?.name_en || 'No Plan';
        if (!planMap[planName]) planMap[planName] = { plan: planName, count: 0, revenue: 0 };
        planMap[planName].count++;
        const price = t.currency_code === 'EGP'
          ? (t.subscription_plans?.price_monthly_egp || 0)
          : (t.subscription_plans?.price_monthly_usd || 0);
        planMap[planName].revenue += price;
      });
      const revenueByPlan = Object.values(planMap).sort((a, b) => b.revenue - a.revenue);

      // Revenue by module
      const modMap = {};
      (tenantModules || []).forEach(tm => {
        if (!tm.modules) return;
        const name = tm.modules.name_en;
        if (!modMap[name]) modMap[name] = { module: name, licenses: 0, revenue: 0, isFree: tm.modules.is_free };
        modMap[name].licenses++;
        if (!tm.modules.is_free && !['included', 'lifetime'].includes(tm.license_type)) {
          const price = tm.price_override != null ? parseFloat(tm.price_override) : (tm.modules.base_price_monthly || 0);
          modMap[name].revenue += price;
        }
      });
      const revenueByModule = Object.values(modMap).sort((a, b) => b.revenue - a.revenue);

      // Revenue by currency
      const currMap = {};
      allInvoices.forEach(inv => {
        const c = inv.currency || 'USD';
        if (!currMap[c]) currMap[c] = { currency: c, total: 0, count: 0 };
        currMap[c].total += parseFloat(inv.total || 0);
        currMap[c].count++;
      });
      const revenueByCurrency = Object.values(currMap).sort((a, b) => b.total - a.total);

      // Top tenants by revenue
      const tenantMap = {};
      paidInvoices.forEach(inv => {
        const tid = inv.tenant_id;
        if (!tenantMap[tid]) tenantMap[tid] = { id: tid, name: inv.tenants?.name || 'Unknown', slug: inv.tenants?.slug || '', revenue: 0, invoiceCount: 0 };
        tenantMap[tid].revenue += parseFloat(inv.total || 0);
        tenantMap[tid].invoiceCount++;
      });
      const topTenants = Object.values(tenantMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

      const collectionRate = totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0;

      setData({
        totalRevenue,
        totalPaid,
        totalPending,
        totalOverdue,
        invoiceCount: allInvoices.length,
        paidCount: paidInvoices.length,
        mrr,
        arr: mrr * 12,
        avgInvoice: allInvoices.length > 0 ? totalRevenue / allInvoices.length : 0,
        collectionRate,
        revenueByMonth,
        revenueByPlan,
        revenueByModule,
        revenueByCurrency,
        topTenants,
        recentInvoices: allInvoices.slice(0, 10),
        overdueInvoices,
      });
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchRevenue(); }, [fetchRevenue]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const maxMonthRevenue = Math.max(...data.revenueByMonth.map(m => m.invoiced), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Revenue Dashboard</h1>
          <p className="mt-1 text-sm text-gray-400">Comprehensive revenue analytics and billing insights</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="appearance-none rounded-lg border border-gray-600 bg-gray-800 py-2 pl-4 pr-10 text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="12m">Last 12 months</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
          <button onClick={fetchRevenue} className="p-2 rounded-lg border border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-5 gap-4">
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-gray-400">MRR</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(data.mrr)}</p>
          <p className="text-xs text-gray-500 mt-1">ARR: {formatCurrency(data.arr)}</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-gray-400">Total Invoiced</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(data.totalRevenue)}</p>
          <p className="text-xs text-gray-500 mt-1">{data.invoiceCount} invoices</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-gray-400">Collected</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(data.totalPaid)}</p>
          <p className="text-xs text-gray-500 mt-1">{data.collectionRate}% collection rate</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-gray-400">Pending</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(data.totalPending)}</p>
          <p className="text-xs text-gray-500 mt-1">Awaiting payment</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-xs text-gray-400">Overdue</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(data.totalOverdue)}</p>
          <p className="text-xs text-gray-500 mt-1">{data.overdueInvoices.length} invoices</p>
        </div>
      </div>

      {/* Revenue Chart (Bar) + Revenue by Plan */}
      <div className="grid grid-cols-3 gap-6">
        {/* Monthly Revenue Bar Chart */}
        <div className="col-span-2 rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Monthly Revenue</h3>
          {data.revenueByMonth.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No invoice data for this period</div>
          ) : (
            <div className="flex items-end gap-2 h-48">
              {data.revenueByMonth.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-400">{formatCurrency(m.invoiced)}</span>
                  <div className="w-full flex flex-col items-stretch">
                    <div
                      className="bg-emerald-500/30 border border-emerald-500/50 rounded-t"
                      style={{ height: `${Math.max((m.invoiced / maxMonthRevenue) * 140, 4)}px` }}
                    />
                    <div
                      className="bg-emerald-500 rounded-b"
                      style={{ height: `${Math.max((m.collected / maxMonthRevenue) * 140, 2)}px` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{m.month.substring(5)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-6 mt-4 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
              Invoiced
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              Collected
            </div>
          </div>
        </div>

        {/* Revenue by Plan */}
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue by Plan</h3>
          <div className="space-y-4">
            {data.revenueByPlan.map((p) => {
              const totalPlanRev = data.revenueByPlan.reduce((s, x) => s + x.revenue, 0);
              const pct = totalPlanRev > 0 ? Math.round((p.revenue / totalPlanRev) * 100) : 0;
              return (
                <div key={p.plan}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{p.plan}</span>
                    <span className="text-white font-medium">{formatCurrency(p.revenue)}/mo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-10 text-right">{p.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {data.revenueByPlan.length === 0 && (
            <p className="text-center text-gray-500 py-8">No plan data</p>
          )}
        </div>
      </div>

      {/* Module Revenue + Currency Breakdown */}
      <div className="grid grid-cols-2 gap-6">
        {/* Module Revenue */}
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Module Revenue</h3>
          <div className="space-y-3">
            {data.revenueByModule.map((m) => (
              <div key={m.module} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-white">{m.module}</p>
                    <p className="text-xs text-gray-500">{m.licenses} license{m.licenses !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  {m.isFree ? (
                    <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">Free</span>
                  ) : (
                    <span className="text-sm font-medium text-white">{formatCurrency(m.revenue)}/mo</span>
                  )}
                </div>
              </div>
            ))}
            {data.revenueByModule.length === 0 && (
              <p className="text-center text-gray-500 py-6">No module data</p>
            )}
          </div>
        </div>

        {/* Currency Breakdown */}
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue by Currency</h3>
          <div className="space-y-4">
            {data.revenueByCurrency.map((c) => (
              <div key={c.currency} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-600/50">
                    <DollarSign className="h-4 w-4 text-gray-300" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{c.currency}</p>
                    <p className="text-xs text-gray-500">{c.count} invoice{c.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-white">{formatCurrency(c.total, c.currency)}</p>
              </div>
            ))}
            {data.revenueByCurrency.length === 0 && (
              <p className="text-center text-gray-500 py-6">No currency data</p>
            )}
          </div>
        </div>
      </div>

      {/* Top Tenants + Overdue Invoices */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Tenants */}
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Tenants by Revenue</h3>
          <div className="space-y-2">
            {data.topTenants.map((t, i) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs text-gray-300 font-medium">
                    {i + 1}
                  </span>
                  <div>
                    <Link to={`/developer/tenants/${t.id}`} className="text-white text-sm font-medium hover:text-emerald-400 transition-colors">
                      {t.name}
                    </Link>
                    <p className="text-xs text-gray-500">{t.invoiceCount} paid invoice{t.invoiceCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <span className="text-emerald-400 font-medium">{formatCurrency(t.revenue)}</span>
              </div>
            ))}
            {data.topTenants.length === 0 && (
              <p className="text-center text-gray-500 py-6">No paid invoices yet</p>
            )}
          </div>
        </div>

        {/* Overdue Invoices */}
        <div className="rounded-lg border border-red-900/30 bg-gray-800/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h3 className="text-lg font-semibold text-white">Overdue Invoices</h3>
          </div>
          {data.overdueInvoices.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
              <p className="text-emerald-400 font-medium">No overdue invoices!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.overdueInvoices.map((inv) => {
                const daysOverdue = Math.ceil((new Date() - new Date(inv.due_date)) / 86400000);
                return (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-red-900/10 border border-red-900/20">
                    <div>
                      <p className="text-white text-sm font-medium">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-500">{inv.tenants?.name} • {daysOverdue} days overdue</p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-400 font-medium">{formatCurrency(inv.total, inv.currency)}</p>
                      <p className="text-xs text-gray-500">Due: {formatDate(inv.due_date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Recent Invoices</h3>
          <Link to="/developer/subscriptions" className="text-sm text-emerald-400 hover:text-emerald-300">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-2 text-xs font-medium uppercase text-gray-500">Invoice</th>
                <th className="text-left py-3 px-2 text-xs font-medium uppercase text-gray-500">Tenant</th>
                <th className="text-left py-3 px-2 text-xs font-medium uppercase text-gray-500">Period</th>
                <th className="text-left py-3 px-2 text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="text-right py-3 px-2 text-xs font-medium uppercase text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {data.recentInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-700/30 transition-colors">
                  <td className="py-3 px-2">
                    <p className="text-white font-medium">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-500">{formatDate(inv.issue_date)}</p>
                  </td>
                  <td className="py-3 px-2">
                    <Link to={`/developer/tenants/${inv.tenant_id}`} className="text-gray-300 hover:text-emerald-400">
                      {inv.tenants?.name || 'Unknown'}
                    </Link>
                  </td>
                  <td className="py-3 px-2 text-gray-400">
                    {inv.billing_period_start && inv.billing_period_end
                      ? `${formatDate(inv.billing_period_start)} – ${formatDate(inv.billing_period_end)}`
                      : '—'}
                  </td>
                  <td className="py-3 px-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      inv.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                      inv.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                      inv.status === 'overdue' ? 'bg-red-500/20 text-red-400' :
                      inv.status === 'draft' ? 'bg-gray-500/20 text-gray-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-white font-medium">{formatCurrency(inv.total, inv.currency)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.recentInvoices.length === 0 && (
            <p className="text-center text-gray-500 py-8">No invoices in this period</p>
          )}
        </div>
      </div>
    </div>
  );
}
