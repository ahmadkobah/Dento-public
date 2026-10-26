import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Eye,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Building2,
  TrendingUp,
  TrendingDown,
  Filter,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import clsx from 'clsx';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { useRegionalSettings } from '../../../contexts/RegionalContext';

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  closed: { label: 'Closed', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
};

const DailyReconciliationList = () => {
  const _navigate = useNavigate();
  const { formatCurrency } = useRegionalSettings();
  const { tenantId } = useTenant();
  const [reconciliations, setReconciliations] = useState([]);
  const [branches, setBranches] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [stats, setStats] = useState({
    totalReceived: 0,
    totalExpenses: 0,
    totalDiscrepancy: 0,
    openCount: 0
  });

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      // Load branches first
      const { data: branchData } = await supabase
        .from('branches')
        .select('id, name_en, name_ar')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      const branchMap = {};
      branchData?.forEach(b => {
        branchMap[b.id] = b;
      });
      setBranches(branchMap);

      // Load reconciliations
      let query = supabase
        .from('daily_reconciliation')
        .select('*')
        .gte('reconciliation_date', dateRange.start)
        .lte('reconciliation_date', dateRange.end)
        .order('reconciliation_date', { ascending: false });

      if (branchFilter !== 'all') {
        query = query.eq('branch_id', branchFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setReconciliations(data || []);

      // Calculate stats
      const totalReceived = data?.reduce((sum, r) => sum + (parseFloat(r.total_received) || 0), 0) || 0;
      const totalExpenses = data?.reduce((sum, r) => sum + (parseFloat(r.expenses) || 0), 0) || 0;
      const totalDiscrepancy = data?.reduce((sum, r) => sum + (parseFloat(r.discrepancy) || 0), 0) || 0;
      const openCount = data?.filter(r => r.status === 'open').length || 0;

      setStats({ totalReceived, totalExpenses, totalDiscrepancy, openCount });
    } catch (error) {
      console.error('Error loading reconciliations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, branchFilter, statusFilter, tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredReconciliations = reconciliations.filter(rec => {
    const branch = branches[rec.branch_id];
    const branchName = branch?.name_en?.toLowerCase() || '';
    return branchName.includes(searchTerm.toLowerCase()) ||
      rec.reconciliation_date?.includes(searchTerm);
  });

  const getDiscrepancyClass = (discrepancy) => {
    if (!discrepancy || discrepancy === 0) return 'text-gray-500';
    return discrepancy > 0 ? 'text-green-600' : 'text-red-600';
  };

  const branchList = Object.values(branches);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Reconciliation</h1>
          <p className="text-gray-500">End-of-day cash balancing and financial tracking</p>
        </div>
        <Link
          to="/reconciliation/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          <Plus className="w-5 h-5" />
          <span>New Reconciliation</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Received</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalReceived)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Expenses</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Net Discrepancy</p>
              <p className={clsx('text-xl font-bold', getDiscrepancyClass(stats.totalDiscrepancy))}>
                {stats.totalDiscrepancy >= 0 ? '+' : ''}{formatCurrency(stats.totalDiscrepancy)}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Open Records</p>
              <p className="text-xl font-bold text-blue-600">{stats.openCount}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Date Range */}
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Branches</option>
            {branchList.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name_en}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="approved">Approved</option>
          </select>

          {/* Refresh */}
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            <RefreshCw className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : filteredReconciliations.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No reconciliation records found</p>
            <Link
              to="/reconciliation/new"
              className="inline-flex items-center gap-2 mt-4 text-primary-600 hover:underline"
            >
              <Plus className="w-4 h-4" />
              Create first reconciliation
            </Link>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Received
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expenses
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expected
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actual
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Discrepancy
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReconciliations.map((rec) => {
                const branch = branches[rec.branch_id];
                const statusConfig = STATUS_CONFIG[rec.status] || STATUS_CONFIG.open;
                const StatusIcon = statusConfig.icon;
                
                return (
                  <tr key={rec.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">
                          {format(parseISO(rec.reconciliation_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span>{branch?.name_en || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={clsx('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium', statusConfig.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-green-600">
                      {formatCurrency(rec.total_received || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-red-600">
                      {formatCurrency(rec.expenses || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {formatCurrency(rec.expected_balance || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {formatCurrency(rec.actual_balance || 0)}
                    </td>
                    <td className={clsx('px-6 py-4 whitespace-nowrap text-right font-medium', getDiscrepancyClass(rec.discrepancy))}>
                      {rec.discrepancy > 0 ? '+' : ''}{formatCurrency(rec.discrepancy || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Link
                        to={`/reconciliation/${rec.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DailyReconciliationList;
