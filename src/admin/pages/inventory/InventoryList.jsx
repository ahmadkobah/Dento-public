import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Package, Plus, Search, RefreshCw,
  AlertTriangle, TrendingDown, TrendingUp, Edit
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useRegionalSettings } from '../../../contexts/RegionalContext';
import { useTenant } from '../../contexts/TenantContext';

const InventoryList = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useRegionalSettings();
  const { tenantId } = useTenant();

  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    totalValue: 0,
    expiringSoon: 0,
  });

  const loadCategories = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from('inventory_categories')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name_en');
    setCategories(data || []);
  }, [tenantId]);

  const loadInventory = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('inventory_items')
        .select(`
          *,
          inventory_categories (id, name_en),
          inventory_stock (
            id, quantity, branch_id
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name_en');

      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process data to calculate current stock
      let items = (data || []).map(item => {
        const totalStock = (item.inventory_stock || []).reduce((sum, s) => sum + (s.quantity || 0), 0);
        const totalValue = totalStock * (item.unit_cost || 0);

        return {
          ...item,
          currentStock: totalStock,
          stockValue: totalValue,
          isLowStock: totalStock <= (item.reorder_level || 10),
        };
      });

      // Filter by search
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        items = items.filter(item =>
          item.name_en?.toLowerCase().includes(search) ||
          item.name_ar?.toLowerCase().includes(search) ||
          item.sku?.toLowerCase().includes(search) ||
          item.description?.toLowerCase().includes(search)
        );
      }

      // Filter by low stock
      if (showLowStock) {
        items = items.filter(item => item.isLowStock);
      }

      setInventory(items);

      // Calculate stats
      const allItems = data || [];
      const totalItems = allItems.length;
      const lowStockItems = items.filter(i => i.isLowStock).length;
      const totalValue = items.reduce((sum, i) => sum + i.stockValue, 0);
      const expiringSoon = 0; // Would need expiry tracking

      setStats({ totalItems, lowStockItems, totalValue, expiringSoon });
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, showLowStock, tenantId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const getStockStatusColor = (item) => {
    if (item.currentStock <= 0) return 'text-red-600 bg-red-100';
    if (item.isLowStock) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500 mt-1">Track dental supplies and materials</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadInventory}
            disabled={loading}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/inventory/categories"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            Categories
          </Link>
          <Link
            to="/inventory/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Items</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalItems}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Low Stock</p>
              <p className="text-xl font-bold text-orange-600">{stats.lowStockItems}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Expiring Soon</p>
              <p className="text-xl font-bold text-red-600">{stats.expiringSoon}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Stock Value</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search inventory..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name_en || cat.name}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showLowStock}
              onChange={(e) => setShowLowStock(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Low stock only</span>
          </label>
        </div>
      </div>

      {/* Inventory Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : inventory.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No inventory items found</h3>
          <p className="text-gray-500 mt-1">Add items to track your dental supplies</p>
          <Link
            to="/inventory/new"
            className="inline-flex items-center gap-2 px-4 py-2 mt-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add First Item
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inventory.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{item.name_en}</p>
                      {item.sku && <p className="text-sm text-gray-500">SKU: {item.sku}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {item.inventory_categories && (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                        {item.inventory_categories.name_en || item.inventory_categories.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex px-2 py-1 text-sm font-medium rounded-full ${getStockStatusColor(item)}`}>
                      {item.currentStock} {item.unit}
                    </span>
                    {item.isLowStock && (
                      <p className="text-xs text-orange-600 mt-1">
                        Min: {item.reorder_level}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right text-gray-700">
                    {item.unit_cost ? formatCurrency(item.unit_cost) : '-'}
                  </td>
                  <td className="px-4 py-4 text-right font-medium text-gray-900">
                    {formatCurrency(item.stockValue)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        to={`/inventory/${item.id}`}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InventoryList;
