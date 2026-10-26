import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Loader2,
  User,
  Plus,
  Trash2,
  Calculator,
  FileText,
  Search,
  DollarSign,
  Package
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useRegionalSettings } from '../../../contexts/RegionalContext';
import { useTenant } from '../../contexts/TenantContext';
import { 
  roundCurrency, 
  calculateItemTotal as calcItemTotal, 
  isValidPrice,
  isValidQuantity 
} from '../../../utils/currency';

const InvoiceForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  
  // Regional settings
  const { acceptedCurrencies, defaultCurrency, formatCurrency, getCurrency } = useRegionalSettings();
  const { tenantId } = useTenant();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const [invoice, setInvoice] = useState({
    patient_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    status: 'draft',
    notes: '',
    terms: 'Payment is due within 30 days.',
    discount_percentage: 0,
    tax_percentage: 5,
    currency: '', // Will be set from patient or default
    exchange_rate: 1,
  });

  const [items, setItems] = useState([
    { description: '', quantity: 1, unit_price: 0, discount: 0, service_id: '', inventory_item_id: '', item_type: 'service' }
  ]);

  const [selectedPatient, setSelectedPatient] = useState(null);

  const loadServices = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from('services')
      .select('id, name_en, price_from')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name_en');
    setServices(data || []);
  }, [tenantId]);

  const loadInventoryItems = useCallback(async () => {
    if (!tenantId) return;
    // Load inventory items with their total available stock across all branches
    const { data: items } = await supabase
      .from('inventory_items')
      .select('id, name_en, sku, unit, selling_price')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name_en');
    
    if (items && items.length > 0) {
      // Get stock levels for all items
      const { data: stockData } = await supabase
        .from('inventory_stock')
        .select('item_id, quantity, reserved_quantity');
      
      // Calculate total available stock per item
      const stockByItem = (stockData || []).reduce((acc, stock) => {
        if (!acc[stock.item_id]) acc[stock.item_id] = 0;
        acc[stock.item_id] += (stock.quantity || 0) - (stock.reserved_quantity || 0);
        return acc;
      }, {});
      
      // Merge stock info with items
      const itemsWithStock = items.map(item => ({
        ...item,
        available_stock: stockByItem[item.id] || 0
      }));
      
      setInventoryItems(itemsWithStock);
    } else {
      setInventoryItems([]);
    }
  }, [tenantId]);

  const loadPatients = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from('patients')
      .select('id, first_name, last_name, phone, patient_code')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('first_name');
    setPatients(data || []);
  }, [tenantId]);

  const loadInvoice = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    
    // Load invoice
    const { data: invoiceData, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error || !invoiceData) {
      setMessage({ type: 'error', text: 'Invoice not found' });
      setLoading(false);
      return;
    }

    setInvoice({
      patient_id: invoiceData.patient_id,
      issue_date: invoiceData.issue_date,
      due_date: invoiceData.due_date || '',
      status: invoiceData.status,
      notes: invoiceData.notes || '',
      terms: invoiceData.terms || '',
      discount_percentage: invoiceData.discount_percentage || 0,
      tax_percentage: invoiceData.tax_percentage || 5,
      currency: invoiceData.currency || defaultCurrency?.code || 'EGP',
      exchange_rate: invoiceData.exchange_rate || 1,
    });

    // Load patient
    if (invoiceData.patient_id) {
      const { data: patient } = await supabase
        .from('patients')
        .select('id, first_name, last_name, phone, patient_code')
        .eq('tenant_id', tenantId)
        .eq('id', invoiceData.patient_id)
        .single();
      setSelectedPatient(patient);
    }

    // Load items
    const { data: itemsData } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('invoice_id', id);

    if (itemsData && itemsData.length > 0) {
      setItems(itemsData.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount || 0,
        service_id: item.service_id || '',
        inventory_item_id: item.inventory_item_id || '',
        item_type: item.inventory_item_id ? 'inventory' : 'service',
      })));
    }

    setLoading(false);
  }, [id, defaultCurrency, tenantId]);

  useEffect(() => {
    loadServices();
    loadInventoryItems();
    loadPatients();
    if (isEdit) {
      loadInvoice();
    }
  }, [isEdit, loadServices, loadInventoryItems, loadPatients, loadInvoice]);

  // Set default currency for new invoices (separate effect to avoid re-running on currency change)
  useEffect(() => {
    if (!isEdit && defaultCurrency?.code && !invoice.currency) {
      setInvoice(prev => ({ ...prev, currency: defaultCurrency.code, exchange_rate: 1 }));
    }
  }, [isEdit, defaultCurrency?.code]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredPatients = patients.filter(p => {
    const name = `${p.first_name} ${p.last_name}`.toLowerCase();
    const code = p.patient_code?.toLowerCase() || '';
    const phone = p.phone || '';
    const search = patientSearch.toLowerCase();
    return name.includes(search) || code.includes(search) || phone.includes(search);
  });

  const selectPatient = async (patient) => {
    setSelectedPatient(patient);
    setInvoice(prev => ({ ...prev, patient_id: patient.id }));
    setShowPatientDropdown(false);
    setPatientSearch('');
    
    // Load patient's preferred currency if available
    const { data: patientData } = await supabase
      .from('patients')
      .select('preferred_currency')
      .eq('tenant_id', tenantId)
      .eq('id', patient.id)
      .single();
    
    if (patientData?.preferred_currency) {
      const currency = getCurrency(patientData.preferred_currency);
      setInvoice(prev => ({
        ...prev,
        patient_id: patient.id,
        currency: patientData.preferred_currency,
        exchange_rate: currency?.exchange_rate_to_base || 1,
      }));
    } else if (!invoice.currency) {
      // Set default currency if not already set
      setInvoice(prev => ({
        ...prev,
        currency: defaultCurrency?.code || 'EGP',
        exchange_rate: 1,
      }));
    }
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, discount: 0, service_id: '', inventory_item_id: '', item_type: 'service' }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // Auto-fill from service if service selected
    if (field === 'service_id' && value) {
      const service = services.find(s => s.id === value);
      if (service) {
        newItems[index].description = service.name_en;
        newItems[index].unit_price = service.price_from || 0;
        newItems[index].inventory_item_id = '';
        newItems[index].item_type = 'service';
      }
    }

    // Auto-fill from inventory item if selected
    if (field === 'inventory_item_id' && value) {
      const invItem = inventoryItems.find(i => i.id === value);
      if (invItem) {
        newItems[index].description = `${invItem.name_en}${invItem.sku ? ` (${invItem.sku})` : ''}`;
        newItems[index].unit_price = invItem.selling_price || 0;
        newItems[index].service_id = '';
        newItems[index].item_type = 'inventory';
      }
    }

    // If item type changes, clear the other selector
    if (field === 'item_type') {
      if (value === 'service') {
        newItems[index].inventory_item_id = '';
      } else {
        newItems[index].service_id = '';
      }
    }

    setItems(newItems);
  };

  const calculateItemTotal = (item) => {
    return calcItemTotal(item);
  };

  const calculateSubtotal = () => {
    return roundCurrency(items.reduce((sum, item) => sum + calculateItemTotal(item), 0));
  };

  const calculateDiscount = () => {
    return roundCurrency(calculateSubtotal() * (invoice.discount_percentage / 100));
  };

  const calculateTax = () => {
    return roundCurrency((calculateSubtotal() - calculateDiscount()) * (invoice.tax_percentage / 100));
  };

  const calculateTotal = () => {
    return roundCurrency(calculateSubtotal() - calculateDiscount() + calculateTax());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!invoice.patient_id) {
      setMessage({ type: 'error', text: 'Please select a patient' });
      return;
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.description) {
        setMessage({ type: 'error', text: `Item ${i + 1}: Description is required` });
        return;
      }
      if (!isValidQuantity(item.quantity)) {
        setMessage({ type: 'error', text: `Item ${i + 1}: Quantity must be at least 1` });
        return;
      }
      if (!isValidPrice(item.unit_price)) {
        setMessage({ type: 'error', text: `Item ${i + 1}: Unit price must be greater than 0` });
        return;
      }
      
      // Issue #37: Check stock availability for inventory items
      if (item.item_type === 'inventory' && item.inventory_item_id) {
        const invItem = inventoryItems.find(inv => inv.id === item.inventory_item_id);
        if (invItem && invItem.available_stock < item.quantity) {
          setMessage({ 
            type: 'error', 
            text: `Item ${i + 1}: Insufficient stock for "${invItem.name_en}". Available: ${invItem.available_stock}, Requested: ${item.quantity}` 
          });
          return;
        }
      }
    }

    // Issue #34: Validate discount and tax percentages
    if (invoice.discount_percentage < 0 || invoice.discount_percentage > 100) {
      setMessage({ type: 'error', text: 'Discount must be between 0% and 100%' });
      return;
    }
    if (invoice.tax_percentage < 0 || invoice.tax_percentage > 100) {
      setMessage({ type: 'error', text: 'Tax must be between 0% and 100%' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const totalAmount = calculateTotal();
      const subtotal = calculateSubtotal();
      const discountAmount = calculateDiscount();
      const taxAmount = calculateTax();
      
      // When status is 'paid', amount_paid = total and balance_due = 0
      // Otherwise, balance_due = total (or remaining balance)
      const isPaid = invoice.status === 'paid';
      
      // Base invoice data (columns that always exist)
      const invoiceData = {
        patient_id: invoice.patient_id,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date || null,
        status: invoice.status,
        notes: invoice.notes,
        terms: invoice.terms,
        subtotal: subtotal,
        discount_percentage: invoice.discount_percentage,
        discount_amount: discountAmount,
        tax_percentage: invoice.tax_percentage,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        amount_paid: isPaid ? totalAmount : 0,
        balance_due: isPaid ? 0 : totalAmount,
      };

      // Add currency fields if migration 023 has been applied
      // These columns may not exist in older databases
      const currencyCode = invoice.currency || defaultCurrency?.code || 'EGP';
      const exchangeRate = invoice.exchange_rate || 1;
      
      // Try to include currency fields - they will be ignored if columns don't exist
      const invoiceDataWithCurrency = {
        ...invoiceData,
        currency: currencyCode,
        exchange_rate: exchangeRate,
        base_currency_total: totalAmount * exchangeRate,
      };

      let invoiceId = id;

      if (isEdit) {
        // Try with currency fields first, fall back to without if columns don't exist
        let { error } = await supabase
          .from('invoices')
          .update(invoiceDataWithCurrency)
          .eq('id', id)
          .eq('tenant_id', tenantId);

        // If currency column doesn't exist, try without currency fields
        if (error && error.message?.includes('currency')) {
          const { error: fallbackError } = await supabase
            .from('invoices')
            .update(invoiceData)
            .eq('id', id)
            .eq('tenant_id', tenantId);
          error = fallbackError;
        }

        if (error) throw error;

        // Delete existing items
        await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', id)
          .eq('tenant_id', tenantId);
      } else {
        // Try with currency fields first
        let { data, error } = await supabase
          .from('invoices')
          .insert({ ...invoiceDataWithCurrency, tenant_id: tenantId })
          .select()
          .single();

        // If currency column doesn't exist, try without currency fields
        if (error && error.message?.includes('currency')) {
          const result = await supabase
            .from('invoices')
            .insert({ ...invoiceData, tenant_id: tenantId })
            .select()
            .single();
          data = result.data;
          error = result.error;
        }

        if (error) throw error;
        invoiceId = data.id;
      }

      // Insert items
      const itemsData = items.map(item => ({
        invoice_id: invoiceId,
        tenant_id: tenantId,
        service_id: item.service_id || null,
        inventory_item_id: item.inventory_item_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount || 0,
        total: calculateItemTotal(item),
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsData);

      if (itemsError) throw itemsError;

      setMessage({ type: 'success', text: 'Invoice saved successfully!' });
      setTimeout(() => navigate('/invoices'), 1500);
    } catch (error) {
      console.error('Error saving invoice:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save invoice' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/invoices')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Invoice' : 'Create Invoice'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEdit ? 'Update invoice details' : 'Create a new invoice for a patient'}
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
        {/* Patient Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-500" />
            Patient
          </h2>

          <div className="relative">
            {selectedPatient ? (
              <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg border border-primary-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-600 font-semibold">
                      {selectedPatient.first_name?.[0]}{selectedPatient.last_name?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedPatient.patient_code} • {selectedPatient.phone}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatient(null);
                    setInvoice(prev => ({ ...prev, patient_id: '' }));
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  Change
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search patient by name, phone, or code..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setShowPatientDropdown(true);
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                    className="flex-1 border-none outline-none text-sm"
                  />
                </div>
                
                {showPatientDropdown && filteredPatients.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredPatients.map(patient => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => selectPatient(patient)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-600 text-sm font-semibold">
                            {patient.first_name?.[0]}{patient.last_name?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {patient.first_name} {patient.last_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {patient.patient_code} • {patient.phone}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Invoice Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" />
            Invoice Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Date *
              </label>
              <input
                type="date"
                value={invoice.issue_date}
                onChange={(e) => setInvoice(prev => ({ ...prev, issue_date: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={invoice.due_date}
                onChange={(e) => setInvoice(prev => ({ ...prev, due_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={invoice.status}
                onChange={(e) => setInvoice(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial Payment</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Currency
              </label>
              <select
                value={invoice.currency || defaultCurrency?.code || 'EGP'}
                onChange={(e) => {
                  const currencyCode = e.target.value;
                  const currency = getCurrency(currencyCode);
                  setInvoice(prev => ({ 
                    ...prev, 
                    currency: currencyCode,
                    exchange_rate: currency?.exchange_rate_to_base || 1
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
              >
                {acceptedCurrencies.length === 0 && <option value="">Loading currencies...</option>}
                {acceptedCurrencies.map(curr => (
                  <option key={curr.code} value={curr.code}>
                    {curr.symbol} {curr.code} - {curr.name_en || curr.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="text-primary-500 hover:text-primary-600 text-sm font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-12 gap-3 items-end">
                  {/* Item Type & Selection */}
                  <div className="col-span-12 md:col-span-5">
                    <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-2">
                      {item.item_type === 'inventory' ? (
                        <><Package className="w-3 h-3" /> Inventory Item</>
                      ) : (
                        <><FileText className="w-3 h-3" /> Service</>
                      )}
                      <span className="text-gray-400">(Optional)</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={item.item_type || 'service'}
                        onChange={(e) => updateItem(index, 'item_type', e.target.value)}
                        className="w-24 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 bg-white"
                      >
                        <option value="service">Service</option>
                        <option value="inventory">Product</option>
                      </select>
                      {item.item_type === 'inventory' ? (
                        <select
                          value={item.inventory_item_id || ''}
                          onChange={(e) => updateItem(index, 'inventory_item_id', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Select product...</option>
                          {inventoryItems.map(invItem => (
                            <option key={invItem.id} value={invItem.id}>
                              {invItem.name_en}{invItem.sku ? ` (${invItem.sku})` : ''} - {formatCurrency(invItem.selling_price || 0, invoice.currency || defaultCurrency?.code)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={item.service_id || ''}
                          onChange={(e) => updateItem(index, 'service_id', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Select service...</option>
                          {services.map(service => (
                            <option key={service.id} value={service.id}>
                              {service.name_en} - {formatCurrency(service.price_from || 0, invoice.currency || defaultCurrency?.code)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Description *
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      required
                      placeholder="Item description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Qty
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Price ({getCurrency(invoice.currency || defaultCurrency?.code)?.symbol || '$'})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-1 flex items-center justify-end gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {calculateItemTotal(item).toLocaleString()}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary-500" />
            Summary
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={invoice.discount_percentage}
                  onChange={(e) => setInvoice(prev => ({ ...prev, discount_percentage: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  VAT (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={invoice.tax_percentage}
                  onChange={(e) => setInvoice(prev => ({ ...prev, tax_percentage: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(calculateSubtotal(), invoice.currency || defaultCurrency?.code)}</span>
              </div>
              {invoice.discount_percentage > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount ({invoice.discount_percentage}%)</span>
                  <span className="font-medium text-red-600">-{formatCurrency(calculateDiscount(), invoice.currency || defaultCurrency?.code)}</span>
                </div>
              )}
              {invoice.tax_percentage > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">VAT ({invoice.tax_percentage}%)</span>
                  <span className="font-medium">{formatCurrency(calculateTax(), invoice.currency || defaultCurrency?.code)}</span>
                </div>
              )}
              <hr className="border-gray-200" />
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900">Total</span>
                <span className="text-primary-600">{formatCurrency(calculateTotal(), invoice.currency || defaultCurrency?.code)}</span>
              </div>
              {invoice.currency && invoice.currency !== defaultCurrency?.code && invoice.exchange_rate !== 1 && (
                <div className="flex justify-between text-xs text-gray-500 pt-1">
                  <span>Equivalent in {defaultCurrency?.code}</span>
                  <span>{formatCurrency(calculateTotal() * invoice.exchange_rate, defaultCurrency?.code)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={invoice.notes}
                onChange={(e) => setInvoice(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                placeholder="Notes visible to the patient..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Terms & Conditions
              </label>
              <textarea
                value={invoice.terms}
                onChange={(e) => setInvoice(prev => ({ ...prev, terms: e.target.value }))}
                rows={3}
                placeholder="Payment terms..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
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
                {isEdit ? 'Update Invoice' : 'Create Invoice'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceForm;
