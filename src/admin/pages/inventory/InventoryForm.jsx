import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Package, Plus, Save, Trash2, Building2, Loader2, DollarSign, Settings
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';

const InventoryForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { tenantId } = useTenant();

  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    sku: '',
    description: '',
    category_id: '',
    unit: 'piece',
    unit_cost: '',
    selling_price: '',
    reorder_level: 10,
    reorder_quantity: 50,
    is_consumable: true,
    is_active: true,
  });
  
  // Initial stock for new items
  const [initialStock, setInitialStock] = useState([
    { branch_id: '', quantity: '' }
  ]);

  const loadCategories = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from('inventory_categories')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name_en');
    setCategories(data || []);
  }, [tenantId]);

  const loadBranches = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from('branches')
      .select('id, name_en')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name_en');
    setBranches(data || []);
    
    // Set first branch as default for initial stock
    if (data && data.length > 0 && !isEdit) {
      setInitialStock([{ branch_id: data[0].id, quantity: '' }]);
    }
  }, [isEdit, tenantId]);

  const loadItem = useCallback(async () => {
    if (!id || !tenantId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          name_en: data.name_en || '',
          name_ar: data.name_ar || '',
          sku: data.sku || '',
          description: data.description || '',
          category_id: data.category_id || '',
          unit: data.unit || 'piece',
          unit_cost: data.unit_cost || '',
          selling_price: data.selling_price || '',
          reorder_level: data.reorder_level || 10,
          reorder_quantity: data.reorder_quantity || 50,
          is_consumable: data.is_consumable ?? true,
          is_active: data.is_active ?? true,
        });
      }
    } catch (error) {
      console.error('Error loading item:', error);
      setMessage({ type: 'error', text: 'Failed to load inventory item' });
    } finally {
      setLoading(false);
    }
  }, [id, tenantId]);

  useEffect(() => {
    loadCategories();
    loadBranches();
    loadItem();
  }, [loadCategories, loadBranches, loadItem]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!formData.name_en) {
      setMessage({ type: 'error', text: 'Item name (English) is required' });
      return;
    }

    // Validate numeric fields are not negative
    if (formData.reorder_level < 0 || formData.reorder_quantity < 0) {
      setMessage({ type: 'error', text: 'Reorder level and quantity must not be negative' });
      return;
    }

    if (formData.unit_cost && parseFloat(formData.unit_cost) < 0) {
      setMessage({ type: 'error', text: 'Unit cost must not be negative' });
      return;
    }

    if (formData.selling_price && parseFloat(formData.selling_price) < 0) {
      setMessage({ type: 'error', text: 'Selling price must not be negative' });
      return;
    }

    // Validate initial stock quantities are not negative (for new items)
    if (!isEdit) {
      const hasNegativeStock = initialStock.some(s => s.quantity && parseInt(s.quantity) < 0);
      if (hasNegativeStock) {
        setMessage({ type: 'error', text: 'Initial stock quantities cannot be negative' });
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        name_en: formData.name_en,
        name_ar: formData.name_ar || null,
        sku: formData.sku || null,
        description: formData.description || null,
        category_id: formData.category_id || null,
        unit: formData.unit,
        unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
        selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
        reorder_level: parseInt(formData.reorder_level) || 10,
        reorder_quantity: parseInt(formData.reorder_quantity) || 50,
        is_consumable: formData.is_consumable,
        is_active: formData.is_active,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('inventory_items')
          .update(payload)
          .eq('id', id)
          .eq('tenant_id', tenantId);

        if (error) throw error;
      } else {
        // Create the inventory item first
        const { data: newItem, error: itemError } = await supabase
          .from('inventory_items')
          .insert(payload)
          .select()
          .single();

        if (itemError) throw itemError;

        // Create initial stock records for each branch with quantity
        const stockEntries = initialStock
          .filter(s => s.branch_id && s.quantity && parseInt(s.quantity) > 0)
          .map(s => ({
            item_id: newItem.id,
            branch_id: s.branch_id,
            quantity: parseInt(s.quantity),
            reserved_quantity: 0
          }));

        if (stockEntries.length > 0) {
          const { error: stockError } = await supabase
            .from('inventory_stock')
            .insert(stockEntries);

          if (stockError) throw stockError;

          // Create movement records for initial stock
          const movements = stockEntries.map(s => ({
            tenant_id: tenantId,
            item_id: newItem.id,
            branch_id: s.branch_id,
            movement_type: 'purchase',
            quantity: s.quantity,
            unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
            notes: 'Initial stock entry'
          }));

          const { error: movementError } = await supabase
            .from('inventory_movements')
            .insert(movements);

          if (movementError) console.error('Warning: Failed to create movement records:', movementError);
        }
      }

      setMessage({ type: 'success', text: `Item ${isEdit ? 'updated' : 'created'} successfully!` });
      setTimeout(() => navigate('/inventory'), 1500);
    } catch (error) {
      console.error('Error saving item:', error);
      setMessage({ type: 'error', text: 'Failed to save inventory item' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      navigate('/inventory');
    } catch (error) {
      console.error('Error deleting item:', error);
      setMessage({ type: 'error', text: 'Failed to delete inventory item' });
    }
  };

  // Initial stock handlers
  const handleStockChange = (index, field, value) => {
    setInitialStock(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addStockEntry = () => {
    const selectedBranches = initialStock.map(s => s.branch_id);
    const availableBranch = branches.find(b => !selectedBranches.includes(b.id));
    
    setInitialStock(prev => [
      ...prev,
      { branch_id: availableBranch?.id || '', quantity: '' }
    ]);
  };

  const removeStockEntry = (index) => {
    if (initialStock.length <= 1) return;
    setInitialStock(prev => prev.filter((_, i) => i !== index));
  };

  const unitOptions = [
    { value: 'piece', label: 'Piece' },
    { value: 'box', label: 'Box' },
    { value: 'pack', label: 'Pack' },
    { value: 'bottle', label: 'Bottle' },
    { value: 'tube', label: 'Tube' },
    { value: 'ml', label: 'Milliliters (ml)' },
    { value: 'liter', label: 'Liter' },
    { value: 'gram', label: 'Gram' },
    { value: 'kg', label: 'Kilogram' },
    { value: 'unit', label: 'Unit' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/inventory')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Inventory Item' : 'New Inventory Item'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEdit ? 'Update item details' : 'Add a new item to inventory'}
          </p>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-500" />
            Basic Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Name (English) *
              </label>
              <input
                type="text"
                name="name_en"
                value={formData.name_en}
                onChange={handleChange}
                placeholder="e.g., Dental Gloves"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Name (Arabic)
              </label>
              <input
                type="text"
                name="name_ar"
                value={formData.name_ar}
                onChange={handleChange}
                placeholder="مثال: قفازات طبية"
                dir="rtl"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SKU
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                placeholder="e.g., DG-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name_en || cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit of Measurement
              </label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {unitOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Optional description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Pricing & Stock Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary-500" />
            Pricing & Stock Settings
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Cost
              </label>
              <input
                type="number"
                name="unit_cost"
                value={formData.unit_cost}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Cost per unit for inventory valuation</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selling Price
              </label>
              <input
                type="number"
                name="selling_price"
                value={formData.selling_price}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Price when sold to patients</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reorder Level
              </label>
              <input
                type="number"
                name="reorder_level"
                value={formData.reorder_level}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Alert when stock falls below this level</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reorder Quantity
              </label>
              <input
                type="number"
                name="reorder_quantity"
                value={formData.reorder_quantity}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Recommended quantity to reorder</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_consumable"
                checked={formData.is_consumable}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Consumable item</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Item is active</span>
            </label>
          </div>
        </div>

        {/* Initial Stock Section - Only for new items */}
        {!isEdit && branches.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary-500" />
                  Initial Stock
                </h2>
                <p className="text-sm text-gray-500 mt-1">Add stock quantities for each branch (optional)</p>
              </div>
              {initialStock.length < branches.length && (
                <button
                  type="button"
                  onClick={addStockEntry}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50"
                >
                  <Plus className="w-4 h-4" />
                  Add Branch
                </button>
              )}
            </div>

            <div className="space-y-4">
              {initialStock.map((stock, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Branch
                      </label>
                      <select
                        value={stock.branch_id}
                        onChange={(e) => handleStockChange(index, 'branch_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select branch</option>
                        {branches.map(branch => (
                          <option 
                            key={branch.id} 
                            value={branch.id}
                            disabled={initialStock.some((s, i) => i !== index && s.branch_id === branch.id)}
                          >
                            {branch.name_en}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={stock.quantity}
                        onChange={(e) => handleStockChange(index, 'quantity', e.target.value)}
                        min="0"
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  {initialStock.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStockEntry(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-gray-500">
              💡 Tip: You can also add or adjust stock later through the inventory management page.
            </p>
          </div>
        )}

        {/* Delete Button for Edit Mode */}
        {isEdit && (
          <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6">
            <h2 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h2>
            <p className="text-sm text-gray-500 mb-4">Once deleted, this item will be deactivated from inventory.</p>
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete Item
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/inventory')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEdit ? 'Update Item' : 'Create Item'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InventoryForm;
