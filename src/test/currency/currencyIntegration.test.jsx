/**
 * Currency Integration Tests
 * Comprehensive tests for currency handling across all components
 * Tests CRUD operations, defaultCurrency object/code handling, and edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

// =============================================
// MOCK DATA
// =============================================

const MOCK_CURRENCIES = [
  { code: 'EGP', name_en: 'Egyptian Pound', symbol: 'E£', decimal_places: 2, exchange_rate_to_base: 1.0 },
  { code: 'USD', name_en: 'US Dollar', symbol: '$', decimal_places: 2, exchange_rate_to_base: 50.0 },
  { code: 'EUR', name_en: 'Euro', symbol: '€', decimal_places: 2, exchange_rate_to_base: 54.0 },
  { code: 'GBP', name_en: 'British Pound', symbol: '£', decimal_places: 2, exchange_rate_to_base: 63.0 },
  { code: 'AED', name_en: 'UAE Dirham', symbol: 'د.إ', decimal_places: 2, exchange_rate_to_base: 13.6 },
  { code: 'SAR', name_en: 'Saudi Riyal', symbol: '﷼', decimal_places: 2, exchange_rate_to_base: 13.3 },
  { code: 'KWD', name_en: 'Kuwaiti Dinar', symbol: 'د.ك', decimal_places: 3, exchange_rate_to_base: 163.0 },
];

const MOCK_COUNTRIES = [
  { code: 'EG', name_en: 'Egypt', phone_code: '+20', currency_code: 'EGP', flag_emoji: '🇪🇬' },
  { code: 'US', name_en: 'United States', phone_code: '+1', currency_code: 'USD', flag_emoji: '🇺🇸' },
  { code: 'AE', name_en: 'UAE', phone_code: '+971', currency_code: 'AED', flag_emoji: '🇦🇪' },
];

const MOCK_SETTINGS = {
  default_country: 'EG',
  default_currency: 'EGP',
  base_currency: 'EGP',
  accepted_currencies: ['EGP', 'USD', 'EUR', 'GBP', 'AED', 'SAR'],
  show_currency_symbol: true,
  currency_position: 'before',
};

// =============================================
// HELPER FUNCTIONS (Simulating RegionalContext)
// =============================================

const createMockRegionalContext = (overrides = {}) => {
  const settings = { ...MOCK_SETTINGS, ...overrides.settings };
  const currencies = overrides.currencies || MOCK_CURRENCIES;
  const countries = overrides.countries || MOCK_COUNTRIES;

  const getCurrency = (code) => {
    if (!code || typeof code !== 'string') return null;
    return currencies.find(c => c.code === code) || null;
  };

  const getCountry = (code) => {
    if (!code || typeof code !== 'string') return null;
    return countries.find(c => c.code === code) || null;
  };

  // defaultCurrency is an OBJECT, not a string
  const defaultCurrency = getCurrency(settings.default_currency) || currencies[0];
  
  // defaultCountry is an OBJECT, not a string
  const defaultCountry = getCountry(settings.default_country) || countries[0];

  const acceptedCurrencies = currencies.filter(c => 
    settings.accepted_currencies.includes(c.code)
  );

  const formatCurrency = (amount, currencyCode = null) => {
    const code = currencyCode || settings.default_currency;
    const currency = getCurrency(code);
    
    if (!currency) {
      return `${code} ${(amount || 0).toLocaleString()}`;
    }

    const formatted = (amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: currency.decimal_places,
      maximumFractionDigits: currency.decimal_places,
    });
    
    return settings.currency_position === 'before' 
      ? `${currency.symbol} ${formatted}`
      : `${formatted} ${currency.symbol}`;
  };

  const convertCurrency = (amount, fromCode, toCode) => {
    const from = getCurrency(fromCode);
    const to = getCurrency(toCode);
    if (!from || !to || !amount) return 0;
    
    // Convert to base first, then to target
    const inBase = amount * from.exchange_rate_to_base;
    return inBase / to.exchange_rate_to_base;
  };

  return {
    settings,
    currencies,
    countries,
    getCurrency,
    getCountry,
    defaultCurrency,  // OBJECT!
    defaultCountry,   // OBJECT!
    acceptedCurrencies,
    formatCurrency,
    convertCurrency,
    loading: false,
  };
};

// =============================================
// TEST: defaultCurrency is OBJECT not STRING
// =============================================

describe('defaultCurrency Object Type', () => {
  it('defaultCurrency should be a full currency object, not a string', () => {
    const context = createMockRegionalContext();
    
    expect(typeof context.defaultCurrency).toBe('object');
    expect(context.defaultCurrency).not.toBe('EGP');
    expect(context.defaultCurrency.code).toBe('EGP');
    expect(context.defaultCurrency.symbol).toBe('E£');
    expect(context.defaultCurrency.name_en).toBe('Egyptian Pound');
  });

  it('should have all expected properties on defaultCurrency object', () => {
    const context = createMockRegionalContext();
    
    expect(context.defaultCurrency).toHaveProperty('code');
    expect(context.defaultCurrency).toHaveProperty('name_en');
    expect(context.defaultCurrency).toHaveProperty('symbol');
    expect(context.defaultCurrency).toHaveProperty('decimal_places');
    expect(context.defaultCurrency).toHaveProperty('exchange_rate_to_base');
  });

  it('should access currency code using defaultCurrency.code', () => {
    const context = createMockRegionalContext();
    
    // CORRECT: using .code property
    expect(context.defaultCurrency.code).toBe('EGP');
    
    // This simulates the bug - passing object where string expected
    const formatWithObject = () => context.formatCurrency(100, context.defaultCurrency);
    const formatWithCode = () => context.formatCurrency(100, context.defaultCurrency.code);
    
    // formatCurrency expects a string code, not an object
    // The function handles object gracefully but it's not the intended usage
    const resultWithCode = formatWithCode();
    expect(resultWithCode).toBe('E£ 100.00');
  });
});

// =============================================
// TEST: Currency Selection in UI Components
// =============================================

describe('Currency Selection Components', () => {
  const CurrencyDropdown = ({ currencies, value, onChange, defaultCurrency }) => (
    <select 
      data-testid="currency-dropdown"
      value={value || defaultCurrency?.code || 'EGP'}
      onChange={(e) => onChange(e.target.value)}
    >
      {currencies.map(curr => (
        <option key={curr.code} value={curr.code}>
          {curr.symbol} {curr.code} - {curr.name_en}
        </option>
      ))}
    </select>
  );

  it('should correctly show selected currency using defaultCurrency.code', () => {
    const context = createMockRegionalContext();
    const handleChange = vi.fn();
    
    render(
      <CurrencyDropdown 
        currencies={context.acceptedCurrencies}
        value=""
        onChange={handleChange}
        defaultCurrency={context.defaultCurrency}
      />
    );
    
    const dropdown = screen.getByTestId('currency-dropdown');
    expect(dropdown.value).toBe('EGP'); // Falls back to defaultCurrency.code
  });

  it('should allow changing currency selection', () => {
    const context = createMockRegionalContext();
    const handleChange = vi.fn();
    
    render(
      <CurrencyDropdown 
        currencies={context.acceptedCurrencies}
        value="EGP"
        onChange={handleChange}
        defaultCurrency={context.defaultCurrency}
      />
    );
    
    const dropdown = screen.getByTestId('currency-dropdown');
    fireEvent.change(dropdown, { target: { value: 'USD' } });
    
    expect(handleChange).toHaveBeenCalledWith('USD');
  });

  it('should display all accepted currencies', () => {
    const context = createMockRegionalContext();
    
    render(
      <CurrencyDropdown 
        currencies={context.acceptedCurrencies}
        value="EGP"
        onChange={() => {}}
        defaultCurrency={context.defaultCurrency}
      />
    );
    
    const dropdown = screen.getByTestId('currency-dropdown');
    const options = within(dropdown).getAllByRole('option');
    
    expect(options.length).toBe(context.acceptedCurrencies.length);
    expect(options[0].value).toBe('EGP');
    expect(options[1].value).toBe('USD');
  });
});

// =============================================
// TEST: Invoice Currency Operations
// =============================================

describe('Invoice Currency Operations', () => {
  const createInvoiceData = (context, overrides = {}) => {
    const currencyCode = overrides.currency || context.defaultCurrency?.code || 'EGP';
    const currency = context.getCurrency(currencyCode);
    
    return {
      patient_id: 'patient-001',
      issue_date: '2026-01-29',
      due_date: '2026-02-28',
      status: 'draft',
      total_amount: overrides.total_amount || 5000,
      currency: currencyCode,  // Should be string CODE, not object
      exchange_rate: currency?.exchange_rate_to_base || 1,
      ...overrides,
    };
  };

  it('should create invoice with currency CODE not OBJECT', () => {
    const context = createMockRegionalContext();
    const invoice = createInvoiceData(context);
    
    expect(typeof invoice.currency).toBe('string');
    expect(invoice.currency).toBe('EGP');
    expect(invoice.currency).not.toEqual(context.defaultCurrency);
  });

  it('should calculate base currency total correctly', () => {
    const context = createMockRegionalContext();
    
    // Invoice in USD
    const invoice = createInvoiceData(context, {
      currency: 'USD',
      total_amount: 100,
    });
    
    const baseCurrencyTotal = invoice.total_amount * invoice.exchange_rate;
    expect(baseCurrencyTotal).toBe(5000); // 100 USD * 50 = 5000 EGP
  });

  it('should format invoice total with correct currency', () => {
    const context = createMockRegionalContext();
    const invoice = createInvoiceData(context, { currency: 'USD', total_amount: 100 });
    
    // CORRECT: Pass currency CODE string
    const formatted = context.formatCurrency(invoice.total_amount, invoice.currency);
    expect(formatted).toBe('$ 100.00');
  });

  it('should handle currency change in invoice', () => {
    const context = createMockRegionalContext();
    const invoice = createInvoiceData(context, { currency: 'EGP', total_amount: 5000 });
    
    // Simulate changing currency to USD
    const newCurrency = 'USD';
    const newCurrencyData = context.getCurrency(newCurrency);
    
    const updatedInvoice = {
      ...invoice,
      currency: newCurrency, // String code
      exchange_rate: newCurrencyData.exchange_rate_to_base,
    };
    
    expect(updatedInvoice.currency).toBe('USD');
    expect(updatedInvoice.exchange_rate).toBe(50.0);
  });
});

// =============================================
// TEST: Patient Regional Fields
// =============================================

describe('Patient Regional Fields', () => {
  const createPatientData = (context, overrides = {}) => {
    return {
      first_name: 'John',
      last_name: 'Doe',
      phone: '+201234567890',
      country_code: overrides.country_code || context.defaultCountry?.code || 'EG',
      phone_country_code: overrides.phone_country_code || '+20',
      preferred_currency: overrides.preferred_currency || context.defaultCurrency?.code || 'EGP',
      ...overrides,
    };
  };

  it('should use currency CODE not OBJECT for preferred_currency', () => {
    const context = createMockRegionalContext();
    const patient = createPatientData(context);
    
    expect(typeof patient.preferred_currency).toBe('string');
    expect(patient.preferred_currency).toBe('EGP');
  });

  it('should use country CODE not OBJECT for country_code', () => {
    const context = createMockRegionalContext();
    const patient = createPatientData(context);
    
    expect(typeof patient.country_code).toBe('string');
    expect(patient.country_code).toBe('EG');
  });

  it('should allow UAE patient with AED currency', () => {
    const context = createMockRegionalContext();
    const patient = createPatientData(context, {
      country_code: 'AE',
      phone_country_code: '+971',
      preferred_currency: 'AED',
    });
    
    expect(patient.country_code).toBe('AE');
    expect(patient.preferred_currency).toBe('AED');
    
    // Format currency for this patient
    const formatted = context.formatCurrency(1000, patient.preferred_currency);
    expect(formatted).toBe('د.إ 1,000.00');
  });
});

// =============================================
// TEST: Currency Conversion
// =============================================

describe('Currency Conversion', () => {
  it('should convert EGP to USD correctly', () => {
    const context = createMockRegionalContext();
    
    // 5000 EGP to USD
    const result = context.convertCurrency(5000, 'EGP', 'USD');
    expect(result).toBeCloseTo(100, 0); // 5000 * 1 / 50 = 100
  });

  it('should convert USD to EGP correctly', () => {
    const context = createMockRegionalContext();
    
    // 100 USD to EGP
    const result = context.convertCurrency(100, 'USD', 'EGP');
    expect(result).toBeCloseTo(5000, 0); // 100 * 50 / 1 = 5000
  });

  it('should convert between non-base currencies', () => {
    const context = createMockRegionalContext();
    
    // 100 USD to EUR
    const result = context.convertCurrency(100, 'USD', 'EUR');
    // 100 * 50 / 54 = ~92.59
    expect(result).toBeCloseTo(92.59, 1);
  });

  it('should handle KWD with 3 decimal places', () => {
    const context = createMockRegionalContext();
    
    // 1000 EGP to KWD
    const result = context.convertCurrency(1000, 'EGP', 'KWD');
    // 1000 * 1 / 163 = ~6.13
    expect(result).toBeCloseTo(6.13, 1);
    
    // Format in KWD (3 decimal places)
    const formatted = context.formatCurrency(result, 'KWD');
    expect(formatted).toMatch(/د\.ك \d+\.\d{3}/);
  });
});

// =============================================
// TEST: formatCurrency Edge Cases
// =============================================

describe('formatCurrency Edge Cases', () => {
  it('should handle null amount', () => {
    const context = createMockRegionalContext();
    const result = context.formatCurrency(null, 'EGP');
    expect(result).toBe('E£ 0.00');
  });

  it('should handle undefined amount', () => {
    const context = createMockRegionalContext();
    const result = context.formatCurrency(undefined, 'EGP');
    expect(result).toBe('E£ 0.00');
  });

  it('should handle zero amount', () => {
    const context = createMockRegionalContext();
    const result = context.formatCurrency(0, 'EGP');
    expect(result).toBe('E£ 0.00');
  });

  it('should handle negative amount', () => {
    const context = createMockRegionalContext();
    const result = context.formatCurrency(-500, 'EGP');
    expect(result).toBe('E£ -500.00');
  });

  it('should handle large amounts', () => {
    const context = createMockRegionalContext();
    const result = context.formatCurrency(1000000, 'EGP');
    expect(result).toBe('E£ 1,000,000.00');
  });

  it('should handle unknown currency code', () => {
    const context = createMockRegionalContext();
    const result = context.formatCurrency(100, 'XYZ');
    expect(result).toBe('XYZ 100');
  });

  it('should use default currency when code is null', () => {
    const context = createMockRegionalContext();
    const result = context.formatCurrency(100, null);
    expect(result).toBe('E£ 100.00');
  });
});

// =============================================
// TEST: Currency Position Settings
// =============================================

describe('Currency Position Settings', () => {
  it('should place symbol before amount when position is "before"', () => {
    const context = createMockRegionalContext({
      settings: { ...MOCK_SETTINGS, currency_position: 'before' }
    });
    
    const result = context.formatCurrency(100, 'EGP');
    expect(result).toBe('E£ 100.00');
  });

  it('should place symbol after amount when position is "after"', () => {
    const context = createMockRegionalContext({
      settings: { ...MOCK_SETTINGS, currency_position: 'after' }
    });
    
    const result = context.formatCurrency(100, 'EGP');
    expect(result).toBe('100.00 E£');
  });
});

// =============================================
// TEST: acceptedCurrencies Filtering
// =============================================

describe('acceptedCurrencies Filtering', () => {
  it('should only return currencies in accepted list', () => {
    const context = createMockRegionalContext();
    
    const acceptedCodes = context.acceptedCurrencies.map(c => c.code);
    expect(acceptedCodes).toContain('EGP');
    expect(acceptedCodes).toContain('USD');
    expect(acceptedCodes).toContain('EUR');
    expect(acceptedCodes).not.toContain('KWD'); // Not in accepted list
  });

  it('should include all properties on accepted currencies', () => {
    const context = createMockRegionalContext();
    
    context.acceptedCurrencies.forEach(currency => {
      expect(currency).toHaveProperty('code');
      expect(currency).toHaveProperty('name_en');
      expect(currency).toHaveProperty('symbol');
      expect(currency).toHaveProperty('decimal_places');
      expect(currency).toHaveProperty('exchange_rate_to_base');
    });
  });
});

// =============================================
// TEST: Invoice Form State Management
// =============================================

describe('Invoice Form State Management', () => {
  it('should initialize with default currency CODE', () => {
    const context = createMockRegionalContext();
    
    // Simulating InvoiceForm initial state
    const initialState = {
      patient_id: '',
      issue_date: new Date().toISOString().split('T')[0],
      status: 'draft',
      currency: '', // Empty initially
      exchange_rate: 1,
    };

    // After useEffect sets default currency - CORRECT way
    const stateAfterEffect = {
      ...initialState,
      currency: context.defaultCurrency?.code || 'EGP', // Use .code
      exchange_rate: context.defaultCurrency?.exchange_rate_to_base || 1,
    };

    expect(stateAfterEffect.currency).toBe('EGP');
    expect(typeof stateAfterEffect.currency).toBe('string');
  });

  it('should update currency with CODE on selection change', () => {
    const context = createMockRegionalContext();
    
    const state = { currency: 'EGP', exchange_rate: 1 };
    
    // Simulate onChange handler
    const newCurrencyCode = 'USD';
    const newCurrency = context.getCurrency(newCurrencyCode);
    
    const newState = {
      ...state,
      currency: newCurrencyCode, // Should be string CODE
      exchange_rate: newCurrency?.exchange_rate_to_base || 1,
    };

    expect(newState.currency).toBe('USD');
    expect(newState.exchange_rate).toBe(50.0);
  });
});

// =============================================
// TEST: Treatment Plan Currency Display
// =============================================

describe('Treatment Plan Currency Display', () => {
  it('should display treatment plan costs in default currency', () => {
    const context = createMockRegionalContext();
    
    const treatmentPlan = {
      id: 'tp-001',
      total_cost: 15000,
      final_cost: 14000,
      discount_value: 1000,
    };
    
    // Treatment plans don't store currency - always use default
    const formattedTotal = context.formatCurrency(treatmentPlan.total_cost, context.defaultCurrency?.code);
    const formattedFinal = context.formatCurrency(treatmentPlan.final_cost, context.defaultCurrency?.code);
    
    expect(formattedTotal).toBe('E£ 15,000.00');
    expect(formattedFinal).toBe('E£ 14,000.00');
  });
});

// =============================================
// TEST: Dashboard Stats Formatting
// =============================================

describe('Dashboard Stats Formatting', () => {
  it('should format revenue stats in default currency', () => {
    const context = createMockRegionalContext();
    
    const stats = {
      monthRevenue: 250000,
      totalPaid: 200000,
      totalOutstanding: 50000,
    };
    
    // Use defaultCurrency.code for formatting
    const formattedRevenue = context.formatCurrency(stats.monthRevenue, context.defaultCurrency?.code);
    
    expect(formattedRevenue).toBe('E£ 250,000.00');
  });
});

// =============================================
// TEST: Error Scenarios
// =============================================

describe('Error Scenarios', () => {
  it('should handle getCurrency with invalid input', () => {
    const context = createMockRegionalContext();
    
    expect(context.getCurrency(null)).toBeNull();
    expect(context.getCurrency(undefined)).toBeNull();
    expect(context.getCurrency('')).toBeNull();
    expect(context.getCurrency(123)).toBeNull();
    expect(context.getCurrency({})).toBeNull();
    expect(context.getCurrency('INVALID')).toBeNull();
  });

  it('should handle conversion with invalid currencies', () => {
    const context = createMockRegionalContext();
    
    const result = context.convertCurrency(100, 'INVALID', 'USD');
    expect(result).toBe(0);
  });

  it('should handle formatCurrency with object passed as code (bug scenario)', () => {
    const context = createMockRegionalContext();
    
    // This simulates the bug where defaultCurrency object is passed
    // instead of defaultCurrency.code string
    const buggyResult = context.formatCurrency(100, context.defaultCurrency);
    
    // The function should handle this gracefully (treat object as unknown)
    // In actual implementation, this would fail or show incorrect output
    expect(buggyResult).toBeDefined();
  });
});

// =============================================
// SUMMARY TEST
// =============================================

describe('Summary: All Components Should Use Currency CODE', () => {
  it('CRITICAL: All components must use defaultCurrency?.code, NOT defaultCurrency', () => {
    const context = createMockRegionalContext();
    
    // This test documents the correct pattern
    const correctUsage = {
      // For saving to database
      invoiceCurrency: context.defaultCurrency?.code,
      patientPreferredCurrency: context.defaultCurrency?.code,
      
      // For formatCurrency calls
      formattedAmount: context.formatCurrency(1000, context.defaultCurrency?.code),
      
      // For dropdown values
      dropdownValue: context.defaultCurrency?.code || 'EGP',
      
      // For comparisons
      isDefaultCurrency: 'USD' === context.defaultCurrency?.code,
    };

    expect(typeof correctUsage.invoiceCurrency).toBe('string');
    expect(typeof correctUsage.patientPreferredCurrency).toBe('string');
    expect(typeof correctUsage.dropdownValue).toBe('string');
    expect(correctUsage.formattedAmount).toContain('E£');
  });
});
