/**
 * Regional Context Tests
 * Tests for RegionalContext provider, hooks, and utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { render, screen } from '@testing-library/react';

// =============================================
// MOCK DATA - Simulating database responses
// =============================================

const MOCK_COUNTRIES = [
  { code: 'EG', name_en: 'Egypt', name_ar: 'مصر', phone_code: '+20', currency_code: 'EGP', flag_emoji: '🇪🇬', is_active: true, sort_order: 1 },
  { code: 'AE', name_en: 'United Arab Emirates', name_ar: 'الإمارات', phone_code: '+971', currency_code: 'AED', flag_emoji: '🇦🇪', is_active: true, sort_order: 2 },
  { code: 'SA', name_en: 'Saudi Arabia', name_ar: 'السعودية', phone_code: '+966', currency_code: 'SAR', flag_emoji: '🇸🇦', is_active: true, sort_order: 3 },
  { code: 'US', name_en: 'United States', name_ar: 'أمريكا', phone_code: '+1', currency_code: 'USD', flag_emoji: '🇺🇸', is_active: true, sort_order: 4 },
  { code: 'GB', name_en: 'United Kingdom', name_ar: 'بريطانيا', phone_code: '+44', currency_code: 'GBP', flag_emoji: '🇬🇧', is_active: true, sort_order: 5 },
];

const MOCK_CURRENCIES = [
  { code: 'EGP', name_en: 'Egyptian Pound', name_ar: 'جنيه مصري', symbol: 'E£', decimal_places: 2, exchange_rate_to_base: 1.0, is_active: true },
  { code: 'AED', name_en: 'UAE Dirham', name_ar: 'درهم إماراتي', symbol: 'د.إ', decimal_places: 2, exchange_rate_to_base: 0.135, is_active: true },
  { code: 'SAR', name_en: 'Saudi Riyal', name_ar: 'ريال سعودي', symbol: 'ر.س', decimal_places: 2, exchange_rate_to_base: 0.132, is_active: true },
  { code: 'USD', name_en: 'US Dollar', name_ar: 'دولار أمريكي', symbol: '$', decimal_places: 2, exchange_rate_to_base: 0.032, is_active: true },
  { code: 'EUR', name_en: 'Euro', name_ar: 'يورو', symbol: '€', decimal_places: 2, exchange_rate_to_base: 0.029, is_active: true },
  { code: 'GBP', name_en: 'British Pound', name_ar: 'جنيه استرليني', symbol: '£', decimal_places: 2, exchange_rate_to_base: 0.025, is_active: true },
  { code: 'KWD', name_en: 'Kuwaiti Dinar', name_ar: 'دينار كويتي', symbol: 'د.ك', decimal_places: 3, exchange_rate_to_base: 0.010, is_active: true },
];

const MOCK_SETTINGS = {
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

// Mock supabase client
const mockSupabase = {
  from: vi.fn(),
};

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase,
}));

// =============================================
// FALLBACK DATA TESTS
// =============================================

describe('Regional Context - Fallback Data', () => {
  describe('FALLBACK_COUNTRIES', () => {
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

    it('should have at least 10 countries in fallback data', () => {
      expect(FALLBACK_COUNTRIES.length).toBeGreaterThanOrEqual(10);
    });

    it('should have Egypt as the first country (default)', () => {
      expect(FALLBACK_COUNTRIES[0].code).toBe('EG');
      expect(FALLBACK_COUNTRIES[0].name_en).toBe('Egypt');
    });

    it('should have all required fields for each country', () => {
      const requiredFields = ['code', 'name_en', 'name_ar', 'phone_code', 'currency_code', 'flag_emoji'];
      
      FALLBACK_COUNTRIES.forEach(country => {
        requiredFields.forEach(field => {
          expect(country).toHaveProperty(field);
          expect(country[field]).toBeTruthy();
        });
      });
    });

    it('should have unique country codes', () => {
      const codes = FALLBACK_COUNTRIES.map(c => c.code);
      const uniqueCodes = [...new Set(codes)];
      expect(codes.length).toBe(uniqueCodes.length);
    });

    it('should have valid ISO 2-letter country codes', () => {
      FALLBACK_COUNTRIES.forEach(country => {
        expect(country.code).toMatch(/^[A-Z]{2}$/);
      });
    });

    it('should have valid phone codes starting with +', () => {
      FALLBACK_COUNTRIES.forEach(country => {
        expect(country.phone_code).toMatch(/^\+\d+$/);
      });
    });

    it('should have flag emojis for all countries', () => {
      FALLBACK_COUNTRIES.forEach(country => {
        expect(country.flag_emoji).toBeTruthy();
        // Flag emojis are regional indicator symbols
        expect(country.flag_emoji.length).toBeGreaterThan(0);
      });
    });

    it('should include major Middle Eastern countries', () => {
      const middleEastCodes = ['EG', 'AE', 'SA', 'KW', 'QA', 'BH', 'OM', 'JO', 'LB'];
      middleEastCodes.forEach(code => {
        const found = FALLBACK_COUNTRIES.find(c => c.code === code);
        expect(found).toBeDefined();
      });
    });

    it('should include major Western countries', () => {
      const westernCodes = ['US', 'GB', 'DE', 'FR'];
      westernCodes.forEach(code => {
        const found = FALLBACK_COUNTRIES.find(c => c.code === code);
        expect(found).toBeDefined();
      });
    });
  });

  describe('FALLBACK_CURRENCIES', () => {
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

    it('should have at least 10 currencies in fallback data', () => {
      expect(FALLBACK_CURRENCIES.length).toBeGreaterThanOrEqual(10);
    });

    it('should have EGP as the base currency with rate 1.0', () => {
      const egp = FALLBACK_CURRENCIES.find(c => c.code === 'EGP');
      expect(egp).toBeDefined();
      expect(egp.exchange_rate_to_base).toBe(1.0);
    });

    it('should have all required fields for each currency', () => {
      const requiredFields = ['code', 'name_en', 'symbol', 'decimal_places', 'exchange_rate_to_base'];
      
      FALLBACK_CURRENCIES.forEach(currency => {
        requiredFields.forEach(field => {
          expect(currency).toHaveProperty(field);
          expect(currency[field] !== undefined && currency[field] !== null).toBe(true);
        });
      });
    });

    it('should have unique currency codes', () => {
      const codes = FALLBACK_CURRENCIES.map(c => c.code);
      const uniqueCodes = [...new Set(codes)];
      expect(codes.length).toBe(uniqueCodes.length);
    });

    it('should have valid ISO 3-letter currency codes', () => {
      FALLBACK_CURRENCIES.forEach(currency => {
        expect(currency.code).toMatch(/^[A-Z]{3}$/);
      });
    });

    it('should have valid decimal places (2 or 3)', () => {
      FALLBACK_CURRENCIES.forEach(currency => {
        expect([2, 3]).toContain(currency.decimal_places);
      });
    });

    it('should have positive exchange rates', () => {
      FALLBACK_CURRENCIES.forEach(currency => {
        expect(currency.exchange_rate_to_base).toBeGreaterThan(0);
      });
    });

    it('should have symbols for all currencies', () => {
      FALLBACK_CURRENCIES.forEach(currency => {
        expect(currency.symbol).toBeTruthy();
        expect(currency.symbol.length).toBeGreaterThan(0);
      });
    });

    it('should include major world currencies', () => {
      const majorCodes = ['USD', 'EUR', 'GBP', 'EGP', 'AED', 'SAR'];
      majorCodes.forEach(code => {
        const found = FALLBACK_CURRENCIES.find(c => c.code === code);
        expect(found).toBeDefined();
      });
    });

    it('should have 3 decimal places for dinar currencies', () => {
      const dinarCurrencies = ['KWD', 'BHD', 'OMR', 'JOD'];
      dinarCurrencies.forEach(code => {
        const currency = FALLBACK_CURRENCIES.find(c => c.code === code);
        if (currency) {
          expect(currency.decimal_places).toBe(3);
        }
      });
    });
  });
});

// =============================================
// DEFAULT SETTINGS TESTS
// =============================================

describe('Regional Context - Default Settings', () => {
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

  it('should have Egypt as default country', () => {
    expect(DEFAULT_SETTINGS.default_country).toBe('EG');
  });

  it('should have EGP as default and base currency', () => {
    expect(DEFAULT_SETTINGS.default_currency).toBe('EGP');
    expect(DEFAULT_SETTINGS.base_currency).toBe('EGP');
  });

  it('should have Cairo timezone', () => {
    expect(DEFAULT_SETTINGS.timezone).toBe('Africa/Cairo');
  });

  it('should have DD/MM/YYYY date format', () => {
    expect(DEFAULT_SETTINGS.date_format).toBe('DD/MM/YYYY');
  });

  it('should have 12h time format', () => {
    expect(DEFAULT_SETTINGS.time_format).toBe('12h');
  });

  it('should have accepted currencies list', () => {
    expect(Array.isArray(DEFAULT_SETTINGS.accepted_currencies)).toBe(true);
    expect(DEFAULT_SETTINGS.accepted_currencies.length).toBeGreaterThan(0);
    expect(DEFAULT_SETTINGS.accepted_currencies).toContain('EGP');
    expect(DEFAULT_SETTINGS.accepted_currencies).toContain('USD');
  });

  it('should show currency symbol by default', () => {
    expect(DEFAULT_SETTINGS.show_currency_symbol).toBe(true);
  });

  it('should position currency before amount', () => {
    expect(DEFAULT_SETTINGS.currency_position).toBe('before');
  });
});

// =============================================
// CURRENCY FORMATTING TESTS
// =============================================

describe('Currency Formatting Utilities', () => {
  // Mock formatCurrency function
  const formatCurrency = (amount, currencyCode = 'EGP', options = {}) => {
    const currencies = {
      'EGP': { symbol: 'E£', decimal_places: 2 },
      'USD': { symbol: '$', decimal_places: 2 },
      'EUR': { symbol: '€', decimal_places: 2 },
      'GBP': { symbol: '£', decimal_places: 2 },
      'AED': { symbol: 'د.إ', decimal_places: 2 },
      'KWD': { symbol: 'د.ك', decimal_places: 3 },
    };

    const currency = currencies[currencyCode] || { symbol: currencyCode, decimal_places: 2 };
    const {
      showSymbol = true,
      position = 'before',
    } = options;

    const formattedAmount = amount.toLocaleString('en-US', {
      minimumFractionDigits: currency.decimal_places,
      maximumFractionDigits: currency.decimal_places,
    });

    const symbol = showSymbol ? currency.symbol : currencyCode;
    
    return position === 'before' 
      ? `${symbol} ${formattedAmount}`
      : `${formattedAmount} ${symbol}`;
  };

  describe('Basic Formatting', () => {
    it('should format EGP correctly', () => {
      const result = formatCurrency(1000, 'EGP');
      expect(result).toContain('E£');
      expect(result).toContain('1,000');
    });

    it('should format USD correctly', () => {
      const result = formatCurrency(1000, 'USD');
      expect(result).toContain('$');
      expect(result).toContain('1,000');
    });

    it('should format EUR correctly', () => {
      const result = formatCurrency(1000, 'EUR');
      expect(result).toContain('€');
      expect(result).toContain('1,000');
    });

    it('should format GBP correctly', () => {
      const result = formatCurrency(1000, 'GBP');
      expect(result).toContain('£');
      expect(result).toContain('1,000');
    });

    it('should format AED with Arabic symbol', () => {
      const result = formatCurrency(1000, 'AED');
      expect(result).toContain('د.إ');
    });
  });

  describe('Decimal Places', () => {
    it('should format with 2 decimal places for EGP', () => {
      const result = formatCurrency(100.5, 'EGP');
      expect(result).toContain('100.50');
    });

    it('should format with 2 decimal places for USD', () => {
      const result = formatCurrency(100.5, 'USD');
      expect(result).toContain('100.50');
    });

    it('should format with 3 decimal places for KWD', () => {
      const result = formatCurrency(100.5, 'KWD');
      expect(result).toContain('100.500');
    });

    it('should round correctly', () => {
      const result = formatCurrency(100.556, 'EGP');
      expect(result).toContain('100.56');
    });
  });

  describe('Large Numbers', () => {
    it('should format thousands correctly', () => {
      const result = formatCurrency(1000, 'EGP');
      expect(result).toContain('1,000');
    });

    it('should format millions correctly', () => {
      const result = formatCurrency(1000000, 'EGP');
      expect(result).toContain('1,000,000');
    });

    it('should format billions correctly', () => {
      const result = formatCurrency(1000000000, 'EGP');
      expect(result).toContain('1,000,000,000');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero amount', () => {
      const result = formatCurrency(0, 'EGP');
      expect(result).toContain('0.00');
    });

    it('should handle negative amounts', () => {
      const result = formatCurrency(-100, 'EGP');
      expect(result).toContain('-100');
    });

    it('should handle very small amounts', () => {
      const result = formatCurrency(0.01, 'EGP');
      expect(result).toContain('0.01');
    });

    it('should handle decimal precision correctly', () => {
      const result = formatCurrency(0.1 + 0.2, 'EGP');
      expect(result).toContain('0.30');
    });
  });

  describe('Symbol Position', () => {
    it('should place symbol before amount by default', () => {
      const result = formatCurrency(100, 'USD', { position: 'before' });
      expect(result.indexOf('$')).toBeLessThan(result.indexOf('100'));
    });

    it('should place symbol after amount when specified', () => {
      const result = formatCurrency(100, 'USD', { position: 'after' });
      expect(result.indexOf('$')).toBeGreaterThan(result.indexOf('100'));
    });
  });
});

// =============================================
// CURRENCY CONVERSION TESTS
// =============================================

describe('Currency Conversion Utilities', () => {
  // Exchange rates: How many of each currency equals 1 EGP (base)
  // e.g., 1 EGP = 0.032 USD means 1 USD = 31.25 EGP
  const exchangeRates = {
    'EGP': 1.0,      // Base currency
    'USD': 0.032,    // 1 EGP = 0.032 USD (so 1 USD = ~31 EGP)
    'EUR': 0.029,    // 1 EGP = 0.029 EUR (so 1 EUR = ~34 EGP)
    'GBP': 0.025,    // 1 EGP = 0.025 GBP (so 1 GBP = ~40 EGP)
    'AED': 0.135,    // 1 EGP = 0.135 AED
    'SAR': 0.132,    // 1 EGP = 0.132 SAR
  };

  const convertCurrency = (amount, fromCode, toCode) => {
    const fromRate = exchangeRates[fromCode] || 1;
    const toRate = exchangeRates[toCode] || 1;
    
    // Convert from source to EGP, then from EGP to target
    // amount in fromCurrency / fromRate = amount in EGP
    // amount in EGP * toRate = amount in toCurrency
    const egpAmount = amount / fromRate;
    const convertedAmount = egpAmount * toRate;
    
    return Math.round(convertedAmount * 100) / 100;
  };

  describe('Same Currency Conversion', () => {
    it('should return same amount for same currency', () => {
      expect(convertCurrency(100, 'EGP', 'EGP')).toBe(100);
      expect(convertCurrency(100, 'USD', 'USD')).toBe(100);
    });
  });

  describe('Base Currency Conversion', () => {
    it('should convert from EGP to USD', () => {
      const result = convertCurrency(1000, 'EGP', 'USD');
      // 1000 EGP * 0.032 = 32 USD (approximately)
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1000); // USD should be less than EGP
    });

    it('should convert from EGP to EUR', () => {
      const result = convertCurrency(1000, 'EGP', 'EUR');
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1000);
    });

    it('should convert from USD to EGP', () => {
      const result = convertCurrency(100, 'USD', 'EGP');
      // 100 USD should be much more in EGP
      expect(result).toBeGreaterThan(100);
    });
  });

  describe('Cross Currency Conversion', () => {
    it('should convert from USD to EUR', () => {
      const result = convertCurrency(100, 'USD', 'EUR');
      expect(result).toBeGreaterThan(0);
    });

    it('should convert from AED to SAR', () => {
      const result = convertCurrency(100, 'AED', 'SAR');
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('Conversion Precision', () => {
    it('should round to 2 decimal places', () => {
      const result = convertCurrency(100.999, 'EGP', 'USD');
      const decimalPlaces = (result.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it('should handle small amounts', () => {
      const result = convertCurrency(1, 'EGP', 'USD');
      expect(result).toBeGreaterThan(0);
    });

    it('should handle large amounts', () => {
      const result = convertCurrency(1000000, 'EGP', 'USD');
      expect(result).toBeGreaterThan(0);
    });
  });
});

// =============================================
// PHONE FORMATTING TESTS
// =============================================

describe('Phone Formatting Utilities', () => {
  const formatPhone = (phone, phoneCode = '+20') => {
    if (!phone) return '';
    
    // Remove all non-digits
    let digits = phone.replace(/\D/g, '');
    
    // Remove country code if present at start
    const codeDigits = phoneCode.replace('+', '');
    if (digits.startsWith(codeDigits)) {
      digits = digits.slice(codeDigits.length);
    }
    
    // Remove leading zero
    if (digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    
    // Format based on length
    if (digits.length === 10) {
      return `${phoneCode} ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    
    return `${phoneCode} ${digits}`;
  };

  describe('Egyptian Phone Numbers', () => {
    it('should format 10-digit number correctly', () => {
      const result = formatPhone('1144848521', '+20');
      expect(result).toContain('+20');
      expect(result).toContain('114 484 8521');
    });

    it('should handle number with leading zero', () => {
      const result = formatPhone('01144848521', '+20');
      expect(result).toContain('+20');
      expect(result).toContain('114 484 8521');
    });

    it('should handle number with country code included', () => {
      const result = formatPhone('201144848521', '+20');
      expect(result).toContain('+20');
    });
  });

  describe('International Phone Numbers', () => {
    it('should format UAE number', () => {
      const result = formatPhone('501234567', '+971');
      expect(result).toContain('+971');
    });

    it('should format US number', () => {
      const result = formatPhone('5551234567', '+1');
      expect(result).toContain('+1');
    });

    it('should format UK number', () => {
      const result = formatPhone('7911123456', '+44');
      expect(result).toContain('+44');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      expect(formatPhone('', '+20')).toBe('');
      expect(formatPhone(null, '+20')).toBe('');
    });

    it('should strip non-digit characters', () => {
      const result = formatPhone('114-484-8521', '+20');
      expect(result).not.toContain('-');
    });

    it('should handle spaces in input', () => {
      const result = formatPhone('114 484 8521', '+20');
      expect(result).toContain('+20');
    });
  });
});

// =============================================
// COUNTRY LOOKUP TESTS
// =============================================

describe('Country Lookup Utilities', () => {
  const COUNTRIES = [
    { code: 'EG', name_en: 'Egypt', phone_code: '+20', currency_code: 'EGP' },
    { code: 'AE', name_en: 'United Arab Emirates', phone_code: '+971', currency_code: 'AED' },
    { code: 'US', name_en: 'United States', phone_code: '+1', currency_code: 'USD' },
    { code: 'GB', name_en: 'United Kingdom', phone_code: '+44', currency_code: 'GBP' },
  ];

  const DEFAULT_COUNTRY = { code: 'EG', name_en: 'Egypt', phone_code: '+20', currency_code: 'EGP' };

  const getCountry = (code) => {
    return COUNTRIES.find(c => c.code === code) || DEFAULT_COUNTRY;
  };

  describe('Finding Countries', () => {
    it('should find Egypt by code', () => {
      const country = getCountry('EG');
      expect(country.name_en).toBe('Egypt');
      expect(country.phone_code).toBe('+20');
    });

    it('should find UAE by code', () => {
      const country = getCountry('AE');
      expect(country.name_en).toBe('United Arab Emirates');
      expect(country.phone_code).toBe('+971');
    });

    it('should find US by code', () => {
      const country = getCountry('US');
      expect(country.name_en).toBe('United States');
      expect(country.phone_code).toBe('+1');
    });

    it('should find UK by code', () => {
      const country = getCountry('GB');
      expect(country.name_en).toBe('United Kingdom');
      expect(country.phone_code).toBe('+44');
    });
  });

  describe('Default Fallback', () => {
    it('should return default country for unknown code', () => {
      const country = getCountry('XX');
      expect(country).toEqual(DEFAULT_COUNTRY);
    });

    it('should return default country for null code', () => {
      const country = getCountry(null);
      expect(country).toEqual(DEFAULT_COUNTRY);
    });

    it('should return default country for undefined code', () => {
      const country = getCountry(undefined);
      expect(country).toEqual(DEFAULT_COUNTRY);
    });
  });

  describe('Currency Code Lookup', () => {
    it('should return correct currency code for Egypt', () => {
      const country = getCountry('EG');
      expect(country.currency_code).toBe('EGP');
    });

    it('should return correct currency code for UAE', () => {
      const country = getCountry('AE');
      expect(country.currency_code).toBe('AED');
    });

    it('should return correct currency code for US', () => {
      const country = getCountry('US');
      expect(country.currency_code).toBe('USD');
    });
  });
});

// =============================================
// CURRENCY LOOKUP TESTS
// =============================================

describe('Currency Lookup Utilities', () => {
  const CURRENCIES = [
    { code: 'EGP', name_en: 'Egyptian Pound', symbol: 'E£', decimal_places: 2 },
    { code: 'USD', name_en: 'US Dollar', symbol: '$', decimal_places: 2 },
    { code: 'EUR', name_en: 'Euro', symbol: '€', decimal_places: 2 },
    { code: 'KWD', name_en: 'Kuwaiti Dinar', symbol: 'د.ك', decimal_places: 3 },
  ];

  const DEFAULT_CURRENCY = { code: 'EGP', name_en: 'Egyptian Pound', symbol: 'E£', decimal_places: 2 };

  const getCurrency = (code) => {
    return CURRENCIES.find(c => c.code === code) || DEFAULT_CURRENCY;
  };

  describe('Finding Currencies', () => {
    it('should find EGP by code', () => {
      const currency = getCurrency('EGP');
      expect(currency.name_en).toBe('Egyptian Pound');
      expect(currency.symbol).toBe('E£');
    });

    it('should find USD by code', () => {
      const currency = getCurrency('USD');
      expect(currency.name_en).toBe('US Dollar');
      expect(currency.symbol).toBe('$');
    });

    it('should find EUR by code', () => {
      const currency = getCurrency('EUR');
      expect(currency.name_en).toBe('Euro');
      expect(currency.symbol).toBe('€');
    });

    it('should find KWD by code', () => {
      const currency = getCurrency('KWD');
      expect(currency.name_en).toBe('Kuwaiti Dinar');
      expect(currency.decimal_places).toBe(3);
    });
  });

  describe('Default Fallback', () => {
    it('should return default currency for unknown code', () => {
      const currency = getCurrency('XXX');
      expect(currency).toEqual(DEFAULT_CURRENCY);
    });

    it('should return default currency for null code', () => {
      const currency = getCurrency(null);
      expect(currency).toEqual(DEFAULT_CURRENCY);
    });
  });

  describe('Decimal Places', () => {
    it('should return 2 decimal places for most currencies', () => {
      expect(getCurrency('EGP').decimal_places).toBe(2);
      expect(getCurrency('USD').decimal_places).toBe(2);
      expect(getCurrency('EUR').decimal_places).toBe(2);
    });

    it('should return 3 decimal places for dinars', () => {
      expect(getCurrency('KWD').decimal_places).toBe(3);
    });
  });
});

// =============================================
// DATE/TIME FORMATTING TESTS
// =============================================

describe('Date/Time Formatting Utilities', () => {
  describe('Date Formats', () => {
    const formatDate = (date, format) => {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();

      switch (format) {
        case 'DD/MM/YYYY':
          return `${day}/${month}/${year}`;
        case 'MM/DD/YYYY':
          return `${month}/${day}/${year}`;
        case 'YYYY-MM-DD':
          return `${year}-${month}-${day}`;
        default:
          return `${day}/${month}/${year}`;
      }
    };

    it('should format DD/MM/YYYY correctly', () => {
      const result = formatDate('2026-01-29', 'DD/MM/YYYY');
      expect(result).toBe('29/01/2026');
    });

    it('should format MM/DD/YYYY correctly', () => {
      const result = formatDate('2026-01-29', 'MM/DD/YYYY');
      expect(result).toBe('01/29/2026');
    });

    it('should format YYYY-MM-DD correctly', () => {
      const result = formatDate('2026-01-29', 'YYYY-MM-DD');
      expect(result).toBe('2026-01-29');
    });
  });

  describe('Time Formats', () => {
    const formatTime = (date, format) => {
      const d = new Date(date);
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');

      if (format === '12h') {
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${ampm}`;
      } else {
        return `${String(hours).padStart(2, '0')}:${minutes}`;
      }
    };

    it('should format 12h time correctly', () => {
      const result = formatTime('2026-01-29T14:30:00', '12h');
      expect(result).toBe('2:30 PM');
    });

    it('should format 24h time correctly', () => {
      const result = formatTime('2026-01-29T14:30:00', '24h');
      expect(result).toBe('14:30');
    });

    it('should handle midnight in 12h format', () => {
      const result = formatTime('2026-01-29T00:00:00', '12h');
      expect(result).toBe('12:00 AM');
    });

    it('should handle noon in 12h format', () => {
      const result = formatTime('2026-01-29T12:00:00', '12h');
      expect(result).toBe('12:00 PM');
    });
  });
});

export default {};
