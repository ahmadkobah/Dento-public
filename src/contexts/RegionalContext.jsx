import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

// =====================================================
// REGIONAL SETTINGS CONTEXT
// Provides country, currency, and formatting utilities
// =====================================================

const RegionalContext = createContext(null);

// Default settings (fallback if not loaded from DB)
const DEFAULT_SETTINGS = {
  default_country: 'EG',
  default_currency: 'EGP',
  base_currency: 'EGP',
  timezone: 'Africa/Cairo',
  date_format: 'DD/MM/YYYY',
  time_format: '12h',
  accepted_currencies: ['EGP', 'USD', 'EUR', 'GBP', 'AED', 'SAR'],
  show_currency_symbol: true,
  currency_position: 'before',
};

// Default country data
const DEFAULT_COUNTRY = {
  code: 'EG',
  name_en: 'Egypt',
  name_ar: 'مصر',
  phone_code: '+20',
  currency_code: 'EGP',
  currency_symbol: 'E£',
  locale: 'en-EG',
  flag_emoji: '🇪🇬',
};

// Default currency data
const DEFAULT_CURRENCY = {
  code: 'EGP',
  name_en: 'Egyptian Pound',
  name_ar: 'جنيه مصري',
  symbol: 'E£',
  decimal_places: 2,
  exchange_rate_to_base: 1.0,
};

// Fallback countries list (used when DB not available)
const FALLBACK_COUNTRIES = [
  { code: 'EG', name_en: 'Egypt', name_ar: 'مصر', phone_code: '+20', currency_code: 'EGP', flag_emoji: '🇪🇬' },
  { code: 'AE', name_en: 'United Arab Emirates', name_ar: 'الإمارات', phone_code: '+971', currency_code: 'AED', flag_emoji: '🇦🇪' },
  { code: 'SA', name_en: 'Saudi Arabia', name_ar: 'السعودية', phone_code: '+966', currency_code: 'SAR', flag_emoji: '🇸🇦' },
  { code: 'KW', name_en: 'Kuwait', name_ar: 'الكويت', phone_code: '+965', currency_code: 'KWD', flag_emoji: '🇰🇼' },
  { code: 'QA', name_en: 'Qatar', name_ar: 'قطر', phone_code: '+974', currency_code: 'QAR', flag_emoji: '🇶🇦' },
  { code: 'BH', name_en: 'Bahrain', name_ar: 'البحرين', phone_code: '+973', currency_code: 'BHD', flag_emoji: '🇧🇭' },
  { code: 'OM', name_en: 'Oman', name_ar: 'عمان', phone_code: '+968', currency_code: 'OMR', flag_emoji: '🇴🇲' },
  { code: 'JO', name_en: 'Jordan', name_ar: 'الأردن', phone_code: '+962', currency_code: 'JOD', flag_emoji: '🇯🇴' },
  { code: 'LB', name_en: 'Lebanon', name_ar: 'لبنان', phone_code: '+961', currency_code: 'LBP', flag_emoji: '🇱🇧' },
  { code: 'US', name_en: 'United States', name_ar: 'أمريكا', phone_code: '+1', currency_code: 'USD', flag_emoji: '🇺🇸' },
  { code: 'GB', name_en: 'United Kingdom', name_ar: 'بريطانيا', phone_code: '+44', currency_code: 'GBP', flag_emoji: '🇬🇧' },
  { code: 'DE', name_en: 'Germany', name_ar: 'ألمانيا', phone_code: '+49', currency_code: 'EUR', flag_emoji: '🇩🇪' },
  { code: 'FR', name_en: 'France', name_ar: 'فرنسا', phone_code: '+33', currency_code: 'EUR', flag_emoji: '🇫🇷' },
  { code: 'IN', name_en: 'India', name_ar: 'الهند', phone_code: '+91', currency_code: 'INR', flag_emoji: '🇮🇳' },
  { code: 'PK', name_en: 'Pakistan', name_ar: 'باكستان', phone_code: '+92', currency_code: 'PKR', flag_emoji: '🇵🇰' },
];

// Fallback currencies list (used when DB not available)
const FALLBACK_CURRENCIES = [
  { code: 'EGP', name_en: 'Egyptian Pound', symbol: 'E£', decimal_places: 2, exchange_rate_to_base: 1.0 },
  { code: 'AED', name_en: 'UAE Dirham', symbol: 'د.إ', decimal_places: 2, exchange_rate_to_base: 0.135 },
  { code: 'SAR', name_en: 'Saudi Riyal', symbol: 'ر.س', decimal_places: 2, exchange_rate_to_base: 0.132 },
  { code: 'USD', name_en: 'US Dollar', symbol: '$', decimal_places: 2, exchange_rate_to_base: 0.032 },
  { code: 'EUR', name_en: 'Euro', symbol: '€', decimal_places: 2, exchange_rate_to_base: 0.029 },
  { code: 'GBP', name_en: 'British Pound', symbol: '£', decimal_places: 2, exchange_rate_to_base: 0.025 },
  { code: 'KWD', name_en: 'Kuwaiti Dinar', symbol: 'د.ك', decimal_places: 3, exchange_rate_to_base: 0.010 },
  { code: 'QAR', name_en: 'Qatari Riyal', symbol: 'ر.ق', decimal_places: 2, exchange_rate_to_base: 0.118 },
  { code: 'BHD', name_en: 'Bahraini Dinar', symbol: 'د.ب', decimal_places: 3, exchange_rate_to_base: 0.012 },
  { code: 'OMR', name_en: 'Omani Rial', symbol: 'ر.ع', decimal_places: 3, exchange_rate_to_base: 0.012 },
  { code: 'JOD', name_en: 'Jordanian Dinar', symbol: 'د.أ', decimal_places: 3, exchange_rate_to_base: 0.022 },
  { code: 'INR', name_en: 'Indian Rupee', symbol: '₹', decimal_places: 2, exchange_rate_to_base: 2.7 },
];

export const RegionalProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  // Initialize with fallback data so dropdowns work immediately
  const [countries, setCountries] = useState(FALLBACK_COUNTRIES);
  const [currencies, setCurrencies] = useState(FALLBACK_CURRENCIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load regional settings and reference data
  useEffect(() => {
    loadRegionalData();
  }, []);

  const loadRegionalData = async () => {
    setLoading(true);
    try {
      // Load settings, countries, and currencies in parallel
      // Using separate try-catch for each to handle missing tables gracefully
      let settingsData = null;
      let countriesData = [];
      let currenciesData = [];

      try {
        const settingsRes = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'regional')
          .maybeSingle();
        if (settingsRes.data?.value) {
          settingsData = settingsRes.data.value;
        }
      } catch {
        // Regional settings not found in DB, will use defaults
      }

      try {
        const countriesRes = await supabase
          .from('countries')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');
        if (countriesRes.data && countriesRes.data.length > 0) {
          countriesData = countriesRes.data;
        }
      } catch {
        // Countries table not found, will use fallback data
      }

      try {
        const currenciesRes = await supabase
          .from('currencies')
          .select('*')
          .eq('is_active', true)
          .order('code');
        if (currenciesRes.data && currenciesRes.data.length > 0) {
          currenciesData = currenciesRes.data;
        }
      } catch {
        // Currencies table not found, will use fallback data
      }

      // Update state with loaded data or keep fallback
      if (settingsData) {
        setSettings({ ...DEFAULT_SETTINGS, ...settingsData });
      }
      
      if (countriesData.length > 0) {
        setCountries(countriesData);
      }
      // else keep FALLBACK_COUNTRIES from initial state
      
      if (currenciesData.length > 0) {
        setCurrencies(currenciesData);
      }
      // else keep FALLBACK_CURRENCIES from initial state

    } catch (err) {
      console.error('Error loading regional data:', err);
      setError(err);
      // Fallback data is already set from initial state
    } finally {
      setLoading(false);
    }
  };

  // Get country by code - also check fallback
  const getCountry = useCallback((code) => {
    const found = countries.find(c => c.code === code);
    if (found) return found;
    return FALLBACK_COUNTRIES.find(c => c.code === code) || DEFAULT_COUNTRY;
  }, [countries]);

  // Get currency by code - also check fallback
  const getCurrency = useCallback((code) => {
    const found = currencies.find(c => c.code === code);
    if (found) return found;
    return FALLBACK_CURRENCIES.find(c => c.code === code) || DEFAULT_CURRENCY;
  }, [currencies]);

  // Get default country
  const defaultCountry = useMemo(() => {
    return getCountry(settings.default_country) || DEFAULT_COUNTRY;
  }, [settings.default_country, getCountry]);

  // Get default currency
  const defaultCurrency = useMemo(() => {
    return getCurrency(settings.default_currency) || DEFAULT_CURRENCY;
  }, [settings.default_currency, getCurrency]);

  // Format currency amount
  const formatCurrency = useCallback((amount, currencyCode = null, options = {}) => {
    const code = currencyCode || settings.default_currency;
    const currency = getCurrency(code);
    
    if (!currency) {
      return `${code} ${amount?.toLocaleString() || '0'}`;
    }

    const {
      showSymbol = settings.show_currency_symbol,
      position = settings.currency_position,
      locale = defaultCountry.locale || 'en-US',
    } = options;

    try {
      // Use Intl.NumberFormat for proper locale formatting
      const formatted = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: currency.decimal_places,
        maximumFractionDigits: currency.decimal_places,
      }).format(amount || 0);

      return formatted;
    } catch {
      // Fallback formatting
      const symbol = showSymbol ? currency.symbol : code;
      const formattedAmount = (amount || 0).toLocaleString(locale, {
        minimumFractionDigits: currency.decimal_places,
        maximumFractionDigits: currency.decimal_places,
      });

      return position === 'before' 
        ? `${symbol} ${formattedAmount}`
        : `${formattedAmount} ${symbol}`;
    }
  }, [settings, getCurrency, defaultCountry]);

  // Format currency with simple symbol (for inline display)
  const formatCurrencySimple = useCallback((amount, currencyCode = null) => {
    const code = currencyCode || settings.default_currency;
    const currency = getCurrency(code);
    const symbol = currency?.symbol || code;
    const formattedAmount = (amount || 0).toLocaleString();
    return `${symbol}${formattedAmount}`;
  }, [settings.default_currency, getCurrency]);

  // Convert between currencies
  const convertCurrency = useCallback((amount, fromCode, toCode) => {
    const fromCurrency = getCurrency(fromCode);
    const toCurrency = getCurrency(toCode);

    if (!fromCurrency || !toCurrency) {
      return amount;
    }

    // Convert to base currency first, then to target
    const baseAmount = amount * fromCurrency.exchange_rate_to_base;
    const convertedAmount = baseAmount / toCurrency.exchange_rate_to_base;

    return Math.round(convertedAmount * 100) / 100;
  }, [getCurrency]);

  // Format phone number with country code
  const formatPhone = useCallback((phone, countryCode = null) => {
    if (!phone) return '';
    
    const country = countryCode ? getCountry(countryCode) : defaultCountry;
    const phoneCode = country?.phone_code || '+20';
    
    // Remove all non-digits
    let digits = phone.replace(/\D/g, '');
    
    // If starts with country code digits, format accordingly
    if (digits.startsWith(phoneCode.replace('+', ''))) {
      digits = digits.slice(phoneCode.replace('+', '').length);
    }
    
    // Remove leading zero if present
    if (digits.startsWith('0')) {
      digits = digits.slice(1);
    }

    // Format based on length (Egyptian format: xxx xxx xxxx)
    if (digits.length === 10) {
      return `${phoneCode} ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    
    return `${phoneCode} ${digits}`;
  }, [getCountry, defaultCountry]);

  // Format date according to settings
  const formatDate = useCallback((date, options = {}) => {
    if (!date) return '-';
    
    const {
      locale = defaultCountry.locale || 'en-US',
      format = 'short', // 'short', 'medium', 'long', 'full'
    } = options;

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    const formatOptions = {
      short: { day: '2-digit', month: '2-digit', year: 'numeric' },
      medium: { day: 'numeric', month: 'short', year: 'numeric' },
      long: { day: 'numeric', month: 'long', year: 'numeric' },
      full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
    };

    return dateObj.toLocaleDateString(locale, formatOptions[format] || formatOptions.medium);
  }, [defaultCountry]);

  // Format datetime
  const formatDateTime = useCallback((date, options = {}) => {
    if (!date) return '-';
    
    const {
      locale = defaultCountry.locale || 'en-US',
      includeSeconds = false,
    } = options;

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    return dateObj.toLocaleString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: settings.time_format === '12h',
    });
  }, [defaultCountry, settings.time_format]);

  // Get accepted currencies for dropdowns
  const acceptedCurrencies = useMemo(() => {
    return currencies.filter(c => 
      settings.accepted_currencies.includes(c.code)
    );
  }, [currencies, settings.accepted_currencies]);

  // Update regional settings
  const updateSettings = useCallback(async (newSettings) => {
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          key: 'regional',
          value: { ...settings, ...newSettings },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      if (error) throw error;

      setSettings(prev => ({ ...prev, ...newSettings }));
      return { success: true };
    } catch (err) {
      console.error('Error updating regional settings:', err);
      return { success: false, error: err };
    }
  }, [settings]);

  // Update exchange rate for a currency
  const updateExchangeRate = useCallback(async (currencyCode, newRate) => {
    try {
      const { error } = await supabase
        .from('currencies')
        .update({ 
          exchange_rate_to_base: newRate,
          last_rate_update: new Date().toISOString(),
        })
        .eq('code', currencyCode);

      if (error) throw error;

      // Update local state
      setCurrencies(prev => prev.map(c => 
        c.code === currencyCode 
          ? { ...c, exchange_rate_to_base: newRate }
          : c
      ));

      return { success: true };
    } catch (err) {
      console.error('Error updating exchange rate:', err);
      return { success: false, error: err };
    }
  }, []);

  const value = {
    // State
    settings,
    countries,
    currencies,
    acceptedCurrencies,
    loading,
    error,
    
    // Defaults
    defaultCountry,
    defaultCurrency,
    
    // Getters
    getCountry,
    getCurrency,
    
    // Formatters
    formatCurrency,
    formatCurrencySimple,
    formatPhone,
    formatDate,
    formatDateTime,
    
    // Converters
    convertCurrency,
    
    // Actions
    updateSettings,
    updateExchangeRate,
    refreshData: loadRegionalData,
  };

  return (
    <RegionalContext.Provider value={value}>
      {children}
    </RegionalContext.Provider>
  );
};

// =====================================================
// HOOKS
// =====================================================

// Main hook - use this for most cases
export const useRegionalSettings = () => {
  const context = useContext(RegionalContext);
  if (!context) {
    throw new Error('useRegionalSettings must be used within a RegionalProvider');
  }
  return context;
};

// Hook for patient-specific regional settings
export const usePatientRegional = (patient) => {
  const regional = useRegionalSettings();
  
  const patientCountry = useMemo(() => {
    if (patient?.country_code) {
      return regional.getCountry(patient.country_code);
    }
    return regional.defaultCountry;
  }, [patient?.country_code, regional]);

  const patientCurrency = useMemo(() => {
    if (patient?.preferred_currency) {
      return regional.getCurrency(patient.preferred_currency);
    }
    return regional.defaultCurrency;
  }, [patient?.preferred_currency, regional]);

  const formatPatientCurrency = useCallback((amount) => {
    return regional.formatCurrency(amount, patientCurrency?.code);
  }, [regional, patientCurrency]);

  const formatPatientPhone = useCallback((phone) => {
    return regional.formatPhone(phone, patient?.phone_country_code?.replace('+', '') ? 
      patient.country_code : null);
  }, [regional, patient]);

  return {
    ...regional,
    patientCountry,
    patientCurrency,
    formatPatientCurrency,
    formatPatientPhone,
  };
};

// Hook for invoice-specific regional settings
export const useInvoiceRegional = (invoice) => {
  const regional = useRegionalSettings();

  const invoiceCurrency = useMemo(() => {
    if (invoice?.currency) {
      return regional.getCurrency(invoice.currency);
    }
    return regional.defaultCurrency;
  }, [invoice?.currency, regional]);

  const formatInvoiceCurrency = useCallback((amount) => {
    return regional.formatCurrency(amount, invoiceCurrency?.code);
  }, [regional, invoiceCurrency]);

  // Show amount in both invoice currency and base currency
  const formatWithConversion = useCallback((amount) => {
    const invoiceAmount = regional.formatCurrency(amount, invoiceCurrency?.code);
    
    if (invoiceCurrency?.code !== regional.settings.base_currency) {
      const baseAmount = regional.convertCurrency(
        amount, 
        invoiceCurrency?.code, 
        regional.settings.base_currency
      );
      const baseFormatted = regional.formatCurrency(baseAmount, regional.settings.base_currency);
      return `${invoiceAmount} (≈ ${baseFormatted})`;
    }
    
    return invoiceAmount;
  }, [regional, invoiceCurrency]);

  return {
    ...regional,
    invoiceCurrency,
    formatInvoiceCurrency,
    formatWithConversion,
    exchangeRate: invoice?.exchange_rate || 1,
  };
};

export default RegionalContext;
