import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  X, 
  Package, 
  AlertTriangle,
  Check,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../contexts/TenantContext';
import { escapeSearchTerm } from '../../utils/validation';

/**
 * MaterialSelector - Reusable component for selecting inventory items with quantities
 * 
 * @param {Object} props
 * @param {Array} props.selectedMaterials - Array of {inventory_item_id, quantity, item_name, unit, unit_cost, stock_available}
 * @param {Function} props.onChange - Callback when materials change
 * @param {string} props.branchId - Branch ID for stock checking
 * @param {boolean} props.showCosts - Whether to show cost information
 * @param {boolean} props.showStock - Whether to show stock levels
 * @param {boolean} props.disabled - Whether the selector is disabled
 * @param {string} props.className - Additional CSS classes
 */
const MaterialSelector = ({
  selectedMaterials = [],
  onChange,
  branchId,
  showCosts = true,
  showStock = true,
  disabled = false,
  className = ''
}) => {
  const { tenantId } = useTenant();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      if (!tenantId) return;
      const { data } = await supabase
        .from('inventory_categories')
        .select('id, name_en')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name_en');
      setCategories(data || []);
    };
    loadCategories();
  }, [tenantId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search inventory items
  const searchInventory = useCallback(async () => {
    if (!tenantId) return;
    if (!searchTerm && selectedCategory === 'all') {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      let query = supabase
        .from('inventory_items')
        .select(`
          id,
          sku,
          name_en,
          name_ar,
          unit,
          unit_cost,
          selling_price,
          category_id,
          categories:category_id (name_en),
          inventory_stock!left (
            quantity,
            branch_id
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name_en')
        .limit(20);

      if (searchTerm) {
        const safeSearch = escapeSearchTerm(searchTerm);
        query = query.or(`name_en.ilike.%${safeSearch}%,name_ar.ilike.%${safeSearch}%,sku.ilike.%${safeSearch}%`);
      }

      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process results to include stock for selected branch
      const processedResults = (data || []).map(item => {
        const branchStock = item.inventory_stock?.find(s => s.branch_id === branchId);
        return {
          ...item,
          stock_available: branchStock?.quantity || 0,
          category_name: item.categories?.name_en || 'Uncategorized'
        };
      });

      // Filter out already selected items
      const selectedIds = selectedMaterials.map(m => m.inventory_item_id);
      const filteredResults = processedResults.filter(item => !selectedIds.includes(item.id));

      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching inventory:', error);
    } finally {
      setSearching(false);
    }
  }, [searchTerm, selectedCategory, branchId, selectedMaterials, tenantId]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showDropdown) {
        searchInventory();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedCategory, showDropdown, searchInventory]);

  // Add material to selection
  const addMaterial = (item) => {
    const newMaterial = {
      inventory_item_id: item.id,
      item_name: item.name_en,
      item_name_ar: item.name_ar,
      sku: item.sku,
      unit: item.unit,
      unit_cost: item.unit_cost || 0,
      selling_price: item.selling_price || 0,
      stock_available: item.stock_available,
      quantity: 1
    };
    onChange([...selectedMaterials, newMaterial]);
    setSearchTerm('');
    setShowDropdown(false);
  };

  // Update material quantity
  const updateQuantity = (index, newQuantity) => {
    if (newQuantity <= 0) {
      removeMaterial(index);
      return;
    }
    const updated = [...selectedMaterials];
    updated[index] = { ...updated[index], quantity: newQuantity };
    onChange(updated);
  };

  // Remove material
  const removeMaterial = (index) => {
    const updated = selectedMaterials.filter((_, i) => i !== index);
    onChange(updated);
  };

  // Calculate total cost
  const totalCost = selectedMaterials.reduce((sum, m) => sum + (m.quantity * (m.unit_cost || 0)), 0);

  // Get stock status
  const getStockStatus = (material) => {
    if (material.stock_available <= 0) return 'out';
    if (material.quantity > material.stock_available) return 'insufficient';
    if (material.stock_available <= 5) return 'low';
    return 'ok';
  };

  const stockStatusColors = {
    out: 'text-red-600 bg-red-50',
    insufficient: 'text-orange-600 bg-orange-50',
    low: 'text-yellow-600 bg-yellow-50',
    ok: 'text-green-600 bg-green-50'
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="relative" ref={searchRef}>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search materials by name or SKU..."
              disabled={disabled}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            disabled={disabled}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name_en}</option>
            ))}
          </select>
        </div>

        {/* Search Dropdown */}
        {showDropdown && (searchTerm || selectedCategory !== 'all') && (
          <div 
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
          >
            {searching ? (
              <div className="p-4 text-center text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                Searching...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No materials found
              </div>
            ) : (
              searchResults.map(item => (
                <button
                  key={item.id}
                  onClick={() => addMaterial(item)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between gap-4 border-b last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.name_en}</p>
                      <p className="text-xs text-gray-500">
                        {item.sku && <span className="font-mono">{item.sku} • </span>}
                        {item.category_name} • {item.unit}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {showStock && (
                      <p className={`text-sm font-medium ${
                        item.stock_available <= 0 ? 'text-red-600' :
                        item.stock_available <= 5 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {item.stock_available} in stock
                      </p>
                    )}
                    {showCosts && item.unit_cost > 0 && (
                      <p className="text-xs text-gray-500">${item.unit_cost?.toFixed(2)} each</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected Materials */}
      {selectedMaterials.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Material</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase w-32">Quantity</th>
                {showStock && (
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase w-24">Stock</th>
                )}
                {showCosts && (
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-24">Cost</th>
                )}
                <th className="px-4 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {selectedMaterials.map((material, index) => {
                const stockStatus = getStockStatus(material);
                return (
                  <tr key={material.inventory_item_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{material.item_name}</p>
                          <p className="text-xs text-gray-500">
                            {material.sku && <span className="font-mono">{material.sku} • </span>}
                            {material.unit}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(index, material.quantity - 1)}
                          disabled={disabled}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          value={material.quantity}
                          onChange={(e) => updateQuantity(index, parseFloat(e.target.value) || 0)}
                          disabled={disabled}
                          min="0.1"
                          step="0.1"
                          className="w-16 text-center border border-gray-200 rounded py-1 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => updateQuantity(index, material.quantity + 1)}
                          disabled={disabled}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    {showStock && (
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${stockStatusColors[stockStatus]}`}>
                          {stockStatus === 'out' && <AlertTriangle className="w-3 h-3" />}
                          {stockStatus === 'insufficient' && <AlertTriangle className="w-3 h-3" />}
                          {stockStatus === 'ok' && <Check className="w-3 h-3" />}
                          {material.stock_available}
                        </span>
                      </td>
                    )}
                    {showCosts && (
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm font-medium text-gray-900">
                          ${(material.quantity * (material.unit_cost || 0)).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          ${material.unit_cost?.toFixed(2)} × {material.quantity}
                        </p>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => removeMaterial(index)}
                        disabled={disabled}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {showCosts && (
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={showStock ? 3 : 2} className="px-4 py-2 text-right font-semibold text-gray-700">
                    Total Cost:
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-primary-600">
                    ${totalCost.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Empty State */}
      {selectedMaterials.length === 0 && (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
          <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No materials selected</p>
          <p className="text-xs text-gray-400 mt-1">Search and add materials used in this procedure</p>
        </div>
      )}

      {/* Stock Warnings */}
      {selectedMaterials.some(m => getStockStatus(m) !== 'ok') && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Stock Warning</p>
              <ul className="mt-1 text-yellow-700 space-y-1">
                {selectedMaterials.map((m, i) => {
                  const status = getStockStatus(m);
                  if (status === 'out') {
                    return <li key={i}>• <strong>{m.item_name}</strong> is out of stock</li>;
                  }
                  if (status === 'insufficient') {
                    return <li key={i}>• <strong>{m.item_name}</strong>: only {m.stock_available} available (need {m.quantity})</li>;
                  }
                  if (status === 'low') {
                    return <li key={i}>• <strong>{m.item_name}</strong> is running low ({m.stock_available} left)</li>;
                  }
                  return null;
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialSelector;
