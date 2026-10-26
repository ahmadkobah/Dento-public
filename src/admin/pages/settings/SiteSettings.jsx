import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, Save, Globe, Palette, Bell, Shield, Building2, Phone, Mail, 
  MapPin, Clock, Facebook, Instagram, Twitter, Youtube, Upload, Image,
  CheckCircle, AlertCircle, Loader2, Eye, RotateCcw, Coins, DollarSign, RefreshCw, ArrowLeft
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useRegionalSettings } from '../../../contexts/RegionalContext';
import { useTenant } from '../../contexts/TenantContext';

// Default settings structure
const defaultSettings = {
  general: {
    site_name_en: 'Dento Clinic',
    site_name_ar: 'عيادة دينتو',
    tagline_en: 'Your Smile, Our Priority',
    tagline_ar: 'ابتسامتك، أولويتنا',
    logo_url: '',
    logo_dark_url: '',
    favicon_url: '',
  },
  contact: {
    email: 'info@dentoclinic.com',
    phone: '+20 123 456 7890',
    phone_secondary: '',
    whatsapp: '+201234567890',
    address_en: '123 Medical Center, Cairo, Egypt',
    address_ar: '123 المركز الطبي، القاهرة، مصر',
    google_maps_url: '',
  },
  social: {
    facebook: '',
    instagram: '',
    twitter: '',
    youtube: '',
    tiktok: '',
    linkedin: '',
  },
  working_hours: {
    sunday: { open: '09:00', close: '21:00', closed: false },
    monday: { open: '09:00', close: '21:00', closed: false },
    tuesday: { open: '09:00', close: '21:00', closed: false },
    wednesday: { open: '09:00', close: '21:00', closed: false },
    thursday: { open: '09:00', close: '21:00', closed: false },
    friday: { open: '14:00', close: '21:00', closed: false },
    saturday: { open: '09:00', close: '21:00', closed: false },
  },
  theme: {
    primary_color: '#14b8a6',
    secondary_color: '#0d9488',
    accent_color: '#f59e0b',
    text_color: '#1f2937',
    background_color: '#ffffff',
    heading_font: 'Poppins',
    body_font: 'Inter',
    arabic_font: 'Cairo',
    border_radius: 'rounded',
  },
  seo: {
    meta_title_en: 'Dento Clinic - Premium Dental Care',
    meta_title_ar: 'عيادة دينتو - رعاية أسنان متميزة',
    meta_description_en: 'Professional dental services in Egypt. Implants, cosmetic dentistry, orthodontics and more.',
    meta_description_ar: 'خدمات طب أسنان احترافية في مصر. زراعة، تجميل، تقويم والمزيد.',
    og_image_url: '',
  },
  features: {
    booking_enabled: true,
    chat_enabled: false,
    reviews_enabled: true,
    multilingual: true,
    maintenance_mode: false,
  }
};

const fontOptions = [
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Lato', label: 'Lato' },
];

const arabicFontOptions = [
  { value: 'Cairo', label: 'Cairo' },
  { value: 'Tajawal', label: 'Tajawal' },
  { value: 'Almarai', label: 'Almarai' },
  { value: 'IBM Plex Sans Arabic', label: 'IBM Plex Arabic' },
];

// Preset color themes for dental clinics
const colorPresets = [
  {
    name: 'Teal Fresh',
    primary: '#14b8a6',
    secondary: '#0d9488',
    accent: '#f59e0b',
    text: '#1f2937',
    background: '#ffffff'
  },
  {
    name: 'Ocean Blue',
    primary: '#3b82f6',
    secondary: '#2563eb',
    accent: '#06b6d4',
    text: '#1e293b',
    background: '#ffffff'
  },
  {
    name: 'Royal Purple',
    primary: '#8b5cf6',
    secondary: '#7c3aed',
    accent: '#ec4899',
    text: '#1e1b4b',
    background: '#ffffff'
  },
  {
    name: 'Forest Green',
    primary: '#22c55e',
    secondary: '#16a34a',
    accent: '#eab308',
    text: '#14532d',
    background: '#ffffff'
  },
  {
    name: 'Coral Warmth',
    primary: '#f97316',
    secondary: '#ea580c',
    accent: '#14b8a6',
    text: '#431407',
    background: '#ffffff'
  },
  {
    name: 'Rose Gold',
    primary: '#f43f5e',
    secondary: '#e11d48',
    accent: '#d97706',
    text: '#1c1917',
    background: '#ffffff'
  },
  {
    name: 'Dark Professional',
    primary: '#6366f1',
    secondary: '#4f46e5',
    accent: '#22d3ee',
    text: '#f8fafc',
    background: '#0f172a'
  },
  {
    name: 'Mint Medical',
    primary: '#10b981',
    secondary: '#059669',
    accent: '#0ea5e9',
    text: '#064e3b',
    background: '#ffffff'
  }
];

const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const dayLabels = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
};

// Timezone options
const timezones = [
  { value: 'Africa/Cairo', label: 'Cairo (Egypt)' },
  { value: 'Asia/Dubai', label: 'Dubai (UAE)' },
  { value: 'Asia/Riyadh', label: 'Riyadh (Saudi Arabia)' },
  { value: 'Asia/Kuwait', label: 'Kuwait' },
  { value: 'Asia/Qatar', label: 'Qatar' },
  { value: 'Asia/Bahrain', label: 'Bahrain' },
  { value: 'Asia/Amman', label: 'Amman (Jordan)' },
  { value: 'Asia/Beirut', label: 'Beirut (Lebanon)' },
  { value: 'Europe/London', label: 'London (UK)' },
  { value: 'Europe/Paris', label: 'Paris (France)' },
  { value: 'Europe/Berlin', label: 'Berlin (Germany)' },
  { value: 'America/New_York', label: 'New York (US)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (US)' },
  { value: 'Australia/Sydney', label: 'Sydney (Australia)' },
];

// Regional Settings Tab Component
const RegionalSettingsTab = () => {
  const { 
    settings: regionalSettings, 
    countries, 
    currencies, 
    updateSettings, 
    updateExchangeRate,
    refreshData,
    loading 
  } = useRegionalSettings();
  
  const [localSettings, setLocalSettings] = useState(regionalSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [editingRate, setEditingRate] = useState(null);
  const [newRate, setNewRate] = useState('');

  useEffect(() => {
    setLocalSettings(regionalSettings);
  }, [regionalSettings]);

  const handleSave = async () => {
    setSaving(true);
    const result = await updateSettings(localSettings);
    if (result.success) {
      setMessage({ type: 'success', text: 'Regional settings saved successfully!' });
    } else {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUpdateRate = async (code) => {
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid rate' });
      return;
    }
    
    const result = await updateExchangeRate(code, rate);
    if (result.success) {
      setMessage({ type: 'success', text: `Exchange rate for ${code} updated` });
      setEditingRate(null);
      setNewRate('');
    } else {
      setMessage({ type: 'error', text: 'Failed to update rate' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const toggleCurrency = (code) => {
    const accepted = localSettings.accepted_currencies || [];
    if (accepted.includes(code)) {
      setLocalSettings(prev => ({
        ...prev,
        accepted_currencies: accepted.filter(c => c !== code)
      }));
    } else {
      setLocalSettings(prev => ({
        ...prev,
        accepted_currencies: [...accepted, code]
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Message */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Default Settings */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Coins className="w-5 h-5 text-primary-500" />
          Default Regional Settings
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          These settings are used as defaults for new patients, invoices, and throughout the system.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Default Country */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Country
            </label>
            <select
              value={localSettings.default_country || 'EG'}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, default_country: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
            >
              {countries.length === 0 && <option value="">Loading countries...</option>}
              {countries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.flag_emoji || ''} {country.name_en}
                </option>
              ))}
            </select>
          </div>

          {/* Default Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Currency
            </label>
            <select
              value={localSettings.default_currency || 'EGP'}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, default_currency: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
            >
              {currencies.length === 0 && <option value="">Loading currencies...</option>}
              {currencies.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.symbol} - {currency.name_en} ({currency.code})
                </option>
              ))}
            </select>
          </div>

          {/* Base Currency (for reporting) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base Currency
              <span className="text-xs text-gray-400 ml-1">(for reports)</span>
            </label>
            <select
              value={localSettings.base_currency || 'EGP'}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, base_currency: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
            >
              {currencies.length === 0 && <option value="">Loading currencies...</option>}
              {currencies.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.symbol} - {currency.name_en} ({currency.code})
                </option>
              ))}
            </select>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select
              value={localSettings.timezone || 'Africa/Cairo'}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
            >
              {timezones.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>

          {/* Date Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Format
            </label>
            <select
              value={localSettings.date_format || 'DD/MM/YYYY'}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, date_format: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY (29/01/2026)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (01/29/2026)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (2026-01-29)</option>
            </select>
          </div>

          {/* Time Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Format
            </label>
            <select
              value={localSettings.time_format || '12h'}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, time_format: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
            >
              <option value="12h">12-hour (2:30 PM)</option>
              <option value="24h">24-hour (14:30)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Accepted Currencies */}
      <div className="border-t pt-8">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-primary-500" />
          Accepted Currencies
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Select which currencies patients can use for payments. Exchange rates are relative to your base currency.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {currencies.map(currency => {
            const isAccepted = (localSettings.accepted_currencies || []).includes(currency.code);
            const isBase = currency.code === localSettings.base_currency;
            
            return (
              <div
                key={currency.code}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  isAccepted 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isAccepted}
                      onChange={() => toggleCurrency(currency.code)}
                      disabled={isBase}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">{currency.symbol}</span>
                        <span className="text-sm font-medium text-gray-900">{currency.code}</span>
                        {isBase && (
                          <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">Base</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{currency.name_en}</p>
                    </div>
                  </div>
                </div>
                
                {/* Exchange Rate */}
                {!isBase && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Rate:</span>
                      {editingRate === currency.code ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={newRate}
                            onChange={(e) => setNewRate(e.target.value)}
                            className="w-20 px-2 py-1 text-xs border rounded"
                            step="0.01"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateRate(currency.code)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setEditingRate(null); setNewRate(''); }}
                            className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { 
                            setEditingRate(currency.code); 
                            setNewRate(currency.exchange_rate_to_base?.toString() || '1'); 
                          }}
                          className="text-sm text-gray-700 hover:text-primary-600"
                        >
                          1 {currency.code} = {currency.exchange_rate_to_base || 1} {localSettings.base_currency}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Currency Display Options */}
      <div className="border-t pt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Display Options</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={localSettings.show_currency_symbol !== false}
                onChange={(e) => setLocalSettings(prev => ({ 
                  ...prev, 
                  show_currency_symbol: e.target.checked 
                }))}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Show currency symbol (e.g., E£ instead of EGP)</span>
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency Position
            </label>
            <select
              value={localSettings.currency_position || 'before'}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, currency_position: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="before">Before amount (E£ 100)</option>
              <option value="after">After amount (100 E£)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="border-t pt-6 flex justify-between items-center">
        <button
          onClick={refreshData}
          className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Data
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Saving...' : 'Save Regional Settings'}
        </button>
      </div>
    </div>
  );
};

const SiteSettings = () => {
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const [settings, setSettings] = useState(defaultSettings);
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load settings from database
  useEffect(() => {
    if (tenantId) loadSettings();
  }, [tenantId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .abortSignal(AbortSignal.timeout(5000));

      if (error) throw error;

      if (data && data.length > 0) {
        const loadedSettings = { ...defaultSettings };
        data.forEach(item => {
          if (loadedSettings[item.category]) {
            loadedSettings[item.category] = {
              ...loadedSettings[item.category],
              ...item.value
            };
          }
        });
        setSettings(loadedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const categories = Object.keys(settings);
      
      for (const category of categories) {
        const { error } = await supabase
          .from('site_settings')
          .upsert({
            key: category,
            value: settings[category],
            category: category,
            tenant_id: tenantId,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'tenant_id,key'
          });
        
        if (error) throw error;
      }
      
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const updateWorkingHours = (day, field, value) => {
    setSettings(prev => ({
      ...prev,
      working_hours: {
        ...prev.working_hours,
        [day]: {
          ...prev.working_hours[day],
          [field]: value
        }
      }
    }));
  };

  const resetToDefaults = () => {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
      setSettings(defaultSettings);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'contact', label: 'Contact', icon: Phone },
    { id: 'regional', label: 'Regional', icon: Coins },
    { id: 'social', label: 'Social Media', icon: Facebook },
    { id: 'working_hours', label: 'Working Hours', icon: Clock },
    { id: 'theme', label: 'Theme', icon: Palette },
    { id: 'seo', label: 'SEO', icon: Globe },
    { id: 'features', label: 'Features', icon: Settings },
  ];

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Please select a tenant first.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Site Settings</h1>
            <p className="text-gray-500 mt-1">Configure global website settings and appearance</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={resetToDefaults}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex flex-wrap gap-2 -mb-px">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary-500" />
              General Settings
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Site Name (English)</label>
                <input
                  type="text"
                  value={settings.general.site_name_en}
                  onChange={(e) => updateSetting('general', 'site_name_en', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Site Name (Arabic)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={settings.general.site_name_ar}
                  onChange={(e) => updateSetting('general', 'site_name_ar', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tagline (English)</label>
                <input
                  type="text"
                  value={settings.general.tagline_en}
                  onChange={(e) => updateSetting('general', 'tagline_en', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tagline (Arabic)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={settings.general.tagline_ar}
                  onChange={(e) => updateSetting('general', 'tagline_ar', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Logo Upload */}
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo (Light)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary-400 transition-colors">
                  {settings.general.logo_url ? (
                    <img src={settings.general.logo_url} alt="Logo" className="h-16 mx-auto mb-2" />
                  ) : (
                    <Image className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  )}
                  <input
                    type="text"
                    placeholder="Enter logo URL"
                    value={settings.general.logo_url}
                    onChange={(e) => updateSetting('general', 'logo_url', e.target.value)}
                    className="w-full px-3 py-1 text-sm border border-gray-200 rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo (Dark)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary-400 transition-colors bg-gray-800">
                  {settings.general.logo_dark_url ? (
                    <img src={settings.general.logo_dark_url} alt="Logo Dark" className="h-16 mx-auto mb-2" />
                  ) : (
                    <Image className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                  )}
                  <input
                    type="text"
                    placeholder="Enter dark logo URL"
                    value={settings.general.logo_dark_url}
                    onChange={(e) => updateSetting('general', 'logo_dark_url', e.target.value)}
                    className="w-full px-3 py-1 text-sm border border-gray-200 rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Favicon</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary-400 transition-colors">
                  {settings.general.favicon_url ? (
                    <img src={settings.general.favicon_url} alt="Favicon" className="h-10 mx-auto mb-2" />
                  ) : (
                    <Image className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  )}
                  <input
                    type="text"
                    placeholder="Enter favicon URL"
                    value={settings.general.favicon_url}
                    onChange={(e) => updateSetting('general', 'favicon_url', e.target.value)}
                    className="w-full px-3 py-1 text-sm border border-gray-200 rounded"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact Settings */}
        {activeTab === 'contact' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary-500" />
              Contact Information
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={settings.contact.email}
                  onChange={(e) => updateSetting('contact', 'email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Primary Phone
                </label>
                <input
                  type="tel"
                  value={settings.contact.phone}
                  onChange={(e) => updateSetting('contact', 'phone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Phone</label>
                <input
                  type="tel"
                  value={settings.contact.phone_secondary}
                  onChange={(e) => updateSetting('contact', 'phone_secondary', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp Number</label>
                <input
                  type="tel"
                  value={settings.contact.whatsapp}
                  onChange={(e) => updateSetting('contact', 'whatsapp', e.target.value)}
                  placeholder="+201234567890"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Address (English)
                </label>
                <textarea
                  value={settings.contact.address_en}
                  onChange={(e) => updateSetting('contact', 'address_en', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Address (Arabic)
                </label>
                <textarea
                  dir="rtl"
                  value={settings.contact.address_ar}
                  onChange={(e) => updateSetting('contact', 'address_ar', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Google Maps Embed URL</label>
                <input
                  type="url"
                  value={settings.contact.google_maps_url}
                  onChange={(e) => updateSetting('contact', 'google_maps_url', e.target.value)}
                  placeholder="https://www.google.com/maps/embed?pb=..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Regional Settings */}
        {activeTab === 'regional' && (
          <RegionalSettingsTab />
        )}

        {/* Social Media */}
        {activeTab === 'social' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Facebook className="w-5 h-5 text-primary-500" />
              Social Media Links
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Facebook className="w-4 h-4 inline mr-1 text-blue-600" />
                  Facebook
                </label>
                <input
                  type="url"
                  value={settings.social.facebook}
                  onChange={(e) => updateSetting('social', 'facebook', e.target.value)}
                  placeholder="https://facebook.com/dentoclinic"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Instagram className="w-4 h-4 inline mr-1 text-pink-600" />
                  Instagram
                </label>
                <input
                  type="url"
                  value={settings.social.instagram}
                  onChange={(e) => updateSetting('social', 'instagram', e.target.value)}
                  placeholder="https://instagram.com/dentoclinic"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Twitter className="w-4 h-4 inline mr-1 text-sky-500" />
                  Twitter / X
                </label>
                <input
                  type="url"
                  value={settings.social.twitter}
                  onChange={(e) => updateSetting('social', 'twitter', e.target.value)}
                  placeholder="https://twitter.com/dentoclinic"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Youtube className="w-4 h-4 inline mr-1 text-red-600" />
                  YouTube
                </label>
                <input
                  type="url"
                  value={settings.social.youtube}
                  onChange={(e) => updateSetting('social', 'youtube', e.target.value)}
                  placeholder="https://youtube.com/@dentoclinic"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">TikTok</label>
                <input
                  type="url"
                  value={settings.social.tiktok}
                  onChange={(e) => updateSetting('social', 'tiktok', e.target.value)}
                  placeholder="https://tiktok.com/@dentoclinic"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn</label>
                <input
                  type="url"
                  value={settings.social.linkedin}
                  onChange={(e) => updateSetting('social', 'linkedin', e.target.value)}
                  placeholder="https://linkedin.com/company/dentoclinic"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Working Hours */}
        {activeTab === 'working_hours' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-500" />
              Working Hours
            </h2>
            
            <div className="space-y-4">
              {days.map(day => (
                <div key={day} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-28 font-medium text-gray-700">{dayLabels[day]}</div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!settings.working_hours[day].closed}
                      onChange={(e) => updateWorkingHours(day, 'closed', !e.target.checked)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-600">Open</span>
                  </label>
                  <div className={`flex items-center gap-2 ${settings.working_hours[day].closed ? 'opacity-50' : ''}`}>
                    <input
                      type="time"
                      value={settings.working_hours[day].open}
                      onChange={(e) => updateWorkingHours(day, 'open', e.target.value)}
                      disabled={settings.working_hours[day].closed}
                      className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="time"
                      value={settings.working_hours[day].close}
                      onChange={(e) => updateWorkingHours(day, 'close', e.target.value)}
                      disabled={settings.working_hours[day].closed}
                      className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  {settings.working_hours[day].closed && (
                    <span className="text-red-500 text-sm font-medium">Closed</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Theme Settings */}
        {activeTab === 'theme' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary-500" />
              Theme & Appearance
            </h2>

            {/* Preset Themes */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-4">Quick Theme Presets</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {colorPresets.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSettings(prev => ({
                        ...prev,
                        theme: {
                          ...prev.theme,
                          primary_color: preset.primary,
                          secondary_color: preset.secondary,
                          accent_color: preset.accent,
                          text_color: preset.text,
                          background_color: preset.background
                        }
                      }));
                    }}
                    className="p-3 border border-gray-200 rounded-xl hover:border-primary-500 hover:shadow-md transition-all group"
                    style={{ backgroundColor: preset.background }}
                  >
                    <div className="flex gap-1 mb-2">
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: preset.primary }}></div>
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: preset.secondary }}></div>
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: preset.accent }}></div>
                    </div>
                    <p className="text-xs font-medium group-hover:text-primary-600" style={{ color: preset.text }}>
                      {preset.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Custom Colors */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-4">Custom Colors</h3>
              <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { key: 'primary_color', label: 'Primary' },
                  { key: 'secondary_color', label: 'Secondary' },
                  { key: 'accent_color', label: 'Accent' },
                  { key: 'text_color', label: 'Text' },
                  { key: 'background_color', label: 'Background' },
                ].map(color => (
                  <div key={color.key}>
                    <label className="block text-xs text-gray-600 mb-1">{color.label}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.theme[color.key]}
                        onChange={(e) => updateSetting('theme', color.key, e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border-0"
                      />
                      <input
                        type="text"
                        value={settings.theme[color.key]}
                        onChange={(e) => updateSetting('theme', color.key, e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fonts */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-4">Typography</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Heading Font</label>
                  <select
                    value={settings.theme.heading_font}
                    onChange={(e) => updateSetting('theme', 'heading_font', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    {fontOptions.map(font => (
                      <option key={font.value} value={font.value}>{font.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Body Font</label>
                  <select
                    value={settings.theme.body_font}
                    onChange={(e) => updateSetting('theme', 'body_font', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    {fontOptions.map(font => (
                      <option key={font.value} value={font.value}>{font.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Arabic Font</label>
                  <select
                    value={settings.theme.arabic_font}
                    onChange={(e) => updateSetting('theme', 'arabic_font', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    {arabicFontOptions.map(font => (
                      <option key={font.value} value={font.value}>{font.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-4">Preview</h3>
              <div className="p-6 rounded-xl border" style={{ backgroundColor: settings.theme.background_color }}>
                <h4 className="text-2xl font-bold mb-2" style={{ color: settings.theme.primary_color, fontFamily: settings.theme.heading_font }}>
                  Heading Preview
                </h4>
                <p className="mb-4" style={{ color: settings.theme.text_color, fontFamily: settings.theme.body_font }}>
                  This is body text preview. Your website content will look like this.
                </p>
                <button className="px-4 py-2 text-white rounded-lg" style={{ backgroundColor: settings.theme.primary_color }}>
                  Primary Button
                </button>
                <button className="px-4 py-2 text-white rounded-lg ml-2" style={{ backgroundColor: settings.theme.accent_color }}>
                  Accent Button
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SEO Settings */}
        {activeTab === 'seo' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary-500" />
              SEO Settings
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meta Title (English)</label>
                <input
                  type="text"
                  value={settings.seo.meta_title_en}
                  onChange={(e) => updateSetting('seo', 'meta_title_en', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">{settings.seo.meta_title_en.length}/60 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meta Title (Arabic)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={settings.seo.meta_title_ar}
                  onChange={(e) => updateSetting('seo', 'meta_title_ar', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description (English)</label>
                <textarea
                  value={settings.seo.meta_description_en}
                  onChange={(e) => updateSetting('seo', 'meta_description_en', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">{settings.seo.meta_description_en.length}/160 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description (Arabic)</label>
                <textarea
                  dir="rtl"
                  value={settings.seo.meta_description_ar}
                  onChange={(e) => updateSetting('seo', 'meta_description_ar', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">OG Image URL</label>
                <input
                  type="url"
                  value={settings.seo.og_image_url}
                  onChange={(e) => updateSetting('seo', 'og_image_url', e.target.value)}
                  placeholder="https://example.com/og-image.jpg"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">Recommended size: 1200x630 pixels</p>
              </div>
            </div>
          </div>
        )}

        {/* Features Toggle */}
        {activeTab === 'features' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary-500" />
              Feature Toggles
            </h2>
            
            <div className="space-y-4">
              {[
                { key: 'booking_enabled', label: 'Online Booking', desc: 'Allow patients to book appointments online' },
                { key: 'chat_enabled', label: 'Live Chat', desc: 'Enable live chat widget on the website' },
                { key: 'reviews_enabled', label: 'Patient Reviews', desc: 'Show testimonials and reviews section' },
                { key: 'multilingual', label: 'Multilingual', desc: 'Enable Arabic/English language switcher' },
                { key: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Show maintenance page to visitors', danger: true },
              ].map(feature => (
                <div key={feature.key} className={`flex items-center justify-between p-4 rounded-lg ${feature.danger ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <div>
                    <h4 className={`font-medium ${feature.danger ? 'text-red-800' : 'text-gray-900'}`}>{feature.label}</h4>
                    <p className={`text-sm ${feature.danger ? 'text-red-600' : 'text-gray-500'}`}>{feature.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.features[feature.key]}
                      onChange={(e) => updateSetting('features', feature.key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${feature.danger ? 'peer-checked:bg-red-600' : 'peer-checked:bg-primary-600'}`}></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteSettings;
