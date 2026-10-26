import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  Package, 
  Calendar,
  Filter,
  Download,
  Loader2,
  TrendingDown,
  TrendingUp,
  DollarSign,
  AlertCircle,
  ChevronDown,
  RefreshCcw
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useRegionalSettings } from '../../../contexts/RegionalContext';
import { useTenant } from '../../contexts/TenantContext';

const MaterialUsageReport = () => {
  const { formatCurrency, defaultCurrency } = useRegionalSettings();
  const { tenantId } = useTenant();
  const currencyCode = defaultCurrency?.code || 'EGP';

  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    branch_id: '',
    category_id: '',
    date_from: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of month
    date_to: new Date().toISOString().split('T')[0],
    movement_type: '',
  });

  const [showFilters, setShowFilters] = useState(false);

  // Load filter options
  useEffect(() => {
    if (!tenantId) return;
    const loadOptions = async () => {
      const [branchesRes, categoriesRes] = await Promise.all([
        supabase.from('branches').select('id, name_en, name_ar').eq('is_active', true).eq('tenant_id', tenantId).order('name_en'),
        supabase.from('inventory_categories').select('id, name_en').eq('is_active', true).eq('tenant_id', tenantId).order('name_en'),
      ]);
      setBranches(branchesRes.data || []);
      setCategories(categoriesRes.data || []);
    };
    loadOptions();
  }, [tenantId]);

  // Load usage data
  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      // Build query for material usage
      let query = supabase
        .from('inventory_movements')
        .select(`
          id,
          branch_id,
          item_id,
          movement_type,
          quantity,
          unit_cost,
          total_cost,
          reference_type,
          reference_id,
          notes,
          created_at,
          inventory_items!item_id (
            id, sku, name_en, unit,
            inventory_categories!category_id (name_en)
          ),
          branches!branch_id (name_en, name_ar)
        `)
        .eq('tenant_id', tenantId)
        .in('movement_type', ['sale', 'adjustment', 'expired', 'damaged']) // Focus on usage/consumption movements
        .gte('created_at', `${filters.date_from}T00:00:00`)
        .lte('created_at', `${filters.date_to}T23:59:59`)
        .order('created_at', { ascending: false });

      if (filters.branch_id) {
        query = query.eq('branch_id', filters.branch_id);
      }
      if (filters.movement_type) {
        query = query.eq('movement_type', filters.movement_type);
      }

      const { data: movements, error } = await query.limit(500);
      if (error) throw error;

      // Filter by category if needed (client-side since it's nested)
      let filteredMovements = movements || [];
      if (filters.category_id) {
        filteredMovements = filteredMovements.filter(
          m => m.inventory_items?.inventory_categories?.id === filters.category_id
        );
      }

      setUsageData(filteredMovements);

      // Calculate summary
      const totalCost = filteredMovements.reduce((sum, m) => sum + (m.total_cost || 0), 0);
      const totalQuantity = filteredMovements.reduce((sum, m) => sum + Math.abs(m.quantity || 0), 0);
      const uniqueItems = [...new Set(filteredMovements.map(m => m.inventory_item_id))].length;
      
      // Group by item for top usage
      const itemUsage = {};
      filteredMovements.forEach(m => {
        const itemId = m.item_id;
        if (!itemUsage[itemId]) {
          itemUsage[itemId] = {
            item: m.inventory_items,
            totalQuantity: 0,
            totalCost: 0,
            count: 0,
          };
        }
        itemUsage[itemId].totalQuantity += Math.abs(m.quantity || 0);
        itemUsage[itemId].totalCost += m.total_cost || 0;
        itemUsage[itemId].count += 1;
      });

      const topItems = Object.values(itemUsage)
        .sort((a, b) => b.totalCost - a.totalCost)
        .slice(0, 10);

      // Group by movement type
      const reasonBreakdown = {};
      filteredMovements.forEach(m => {
        const reason = m.movement_type || 'other';
        if (!reasonBreakdown[reason]) {
          reasonBreakdown[reason] = { count: 0, cost: 0 };
        }
        reasonBreakdown[reason].count += 1;
        reasonBreakdown[reason].cost += m.total_cost || 0;
      });

      setSummaryData({
        totalCost,
        totalQuantity,
        uniqueItems,
        totalTransactions: filteredMovements.length,
        topItems,
        reasonBreakdown,
      });

      // Load low stock items
      const { data: lowStock } = await supabase
        .from('v_low_stock_items')
        .select('*')
        .limit(10);
      setLowStockItems(lowStock || []);

    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, tenantId]);

  useEffect(() => {
    if (tenantId) loadData();
  }, [loadData, tenantId]);

  const formatReason = (type) => {
    const labels = {
      'purchase': 'Purchase',
      'sale': 'Sale',
      'adjustment': 'Adjustment',
      'transfer_in': 'Transfer In',
      'transfer_out': 'Transfer Out',
      'expired': 'Expired',
      'damaged': 'Damaged',
      'return': 'Return',
      'other': 'Other',
    };
    return labels[type] || type;
  };

  const getReasonColor = (type) => {
    const colors = {
      'purchase': 'bg-green-100 text-green-700',
      'sale': 'bg-teal-100 text-teal-700',
      'adjustment': 'bg-yellow-100 text-yellow-700',
      'transfer_in': 'bg-blue-100 text-blue-700',
      'transfer_out': 'bg-purple-100 text-purple-700',
      'expired': 'bg-orange-100 text-orange-700',
      'damaged': 'bg-red-100 text-red-700',
      'return': 'bg-indigo-100 text-indigo-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Item', 'SKU', 'Branch', 'Quantity', 'Unit Cost', 'Total Cost', 'Type', 'Notes'];
    const rows = usageData.map(m => [
      new Date(m.created_at).toLocaleDateString(),
      m.inventory_items?.name_en || '',
      m.inventory_items?.sku || '',
      m.branches?.name_en || '',
      Math.abs(m.quantity || 0),
      m.unit_cost?.toFixed(2) || '0',
      m.total_cost?.toFixed(2) || '0',
      formatReason(m.movement_type),
      m.notes || '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `material-usage-${filters.date_from}-to-${filters.date_to}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary-600" />
            Material Usage Report
          </h1>
          <p className="text-gray-500">Track inventory usage across procedures and treatments</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            disabled={usageData.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select
                value={filters.branch_id}
                onChange={(e) => setFilters({ ...filters, branch_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name_en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category_id}
                onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name_en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Movement Type</label>
              <select
                value={filters.movement_type}
                onChange={(e) => setFilters({ ...filters, movement_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Types</option>
                <option value="sale">Sale</option>
                <option value="adjustment">Adjustment</option>
                <option value="expired">Expired</option>
                <option value="damaged">Damaged</option>
                <option value="return">Return</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Cost</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(summaryData?.totalCost || 0, currencyCode)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Units Used</p>
                  <p className="text-xl font-bold text-gray-900">
                    {summaryData?.totalQuantity?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Items Used</p>
                  <p className="text-xl font-bold text-gray-900">
                    {summaryData?.uniqueItems || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Transactions</p>
                  <p className="text-xl font-bold text-gray-900">
                    {summaryData?.totalTransactions || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Used Items */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Used Items</h2>
              {summaryData?.topItems?.length > 0 ? (
                <div className="space-y-3">
                  {summaryData.topItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-sm font-bold text-primary-600">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.item?.name_en}</p>
                        <p className="text-xs text-gray-500">
                          {item.item?.sku && <span className="font-mono">{item.item.sku} • </span>}
                          {item.count} transactions
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{item.totalQuantity} {item.item?.unit}</p>
                        <p className="text-sm text-red-600">{formatCurrency(item.totalCost, currencyCode)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No usage data for selected period</p>
                </div>
              )}
            </div>

            {/* Low Stock Alert */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Low Stock Alert
              </h2>
              {lowStockItems.length > 0 ? (
                <div className="space-y-2">
                  {lowStockItems.map((item, index) => (
                    <div key={index} className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <p className="font-medium text-gray-900 text-sm">{item.name_en}</p>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-gray-500">{item.branch_name}</span>
                        <span className="text-amber-700 font-medium">
                          {item.current_stock} / {item.reorder_level} {item.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <TrendingUp className="w-10 h-10 mx-auto mb-2 text-green-300" />
                  <p className="text-sm">All stock levels OK</p>
                </div>
              )}
            </div>
          </div>

          {/* Usage by Reason */}
          {summaryData?.reasonBreakdown && Object.keys(summaryData.reasonBreakdown).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage by Reason</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Object.entries(summaryData.reasonBreakdown).map(([reason, data]) => (
                  <div key={reason} className={`p-3 rounded-lg ${getReasonColor(reason)}`}>
                    <p className="text-xs font-medium mb-1">{formatReason(reason)}</p>
                    <p className="text-lg font-bold">{data.count}</p>
                    <p className="text-xs opacity-75">{formatCurrency(data.cost, currencyCode)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Usage List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Usage History</h2>
            </div>
            {usageData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Item</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Branch</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Cost</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {usageData.slice(0, 50).map((movement) => (
                      <tr key={movement.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(movement.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 text-sm">{movement.inventory_items?.name_en}</p>
                          <p className="text-xs text-gray-500">{movement.inventory_items?.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {movement.branches?.name_en || '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                          {Math.abs(movement.quantity)} {movement.inventory_items?.unit}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-red-600">
                          {formatCurrency(movement.total_cost || 0, currencyCode)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${getReasonColor(movement.movement_type)}`}>
                            {formatReason(movement.movement_type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                          {movement.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No usage data found for the selected filters</p>
              </div>
            )}
            {usageData.length > 50 && (
              <div className="p-4 border-t border-gray-100 text-center text-sm text-gray-500">
                Showing 50 of {usageData.length} records. Export to CSV for full data.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MaterialUsageReport;
