/**
 * Patient Regional Settings Tests
 * Tests for patient-specific country, currency, and phone settings
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

// =============================================
// MOCK DATA
// =============================================

const MOCK_COUNTRIES = [
  { code: 'EG', name_en: 'Egypt', phone_code: '+20', currency_code: 'EGP', flag_emoji: '🇪🇬' },
  { code: 'AE', name_en: 'United Arab Emirates', phone_code: '+971', currency_code: 'AED', flag_emoji: '🇦🇪' },
  { code: 'SA', name_en: 'Saudi Arabia', phone_code: '+966', currency_code: 'SAR', flag_emoji: '🇸🇦' },
  { code: 'US', name_en: 'United States', phone_code: '+1', currency_code: 'USD', flag_emoji: '🇺🇸' },
  { code: 'GB', name_en: 'United Kingdom', phone_code: '+44', currency_code: 'GBP', flag_emoji: '🇬🇧' },
];

const MOCK_CURRENCIES = [
  { code: 'EGP', name_en: 'Egyptian Pound', symbol: 'E£', decimal_places: 2 },
  { code: 'AED', name_en: 'UAE Dirham', symbol: 'د.إ', decimal_places: 2 },
  { code: 'SAR', name_en: 'Saudi Riyal', symbol: 'ر.س', decimal_places: 2 },
  { code: 'USD', name_en: 'US Dollar', symbol: '$', decimal_places: 2 },
  { code: 'GBP', name_en: 'British Pound', symbol: '£', decimal_places: 2 },
];

const MOCK_PATIENTS = [
  {
    id: 'patient-001',
    first_name: 'Ahmed',
    last_name: 'Mohamed',
    phone: '1144848521',
    phone_country_code: '+20',
    country_code: 'EG',
    preferred_currency: 'EGP',
    email: 'ahmed@example.com',
  },
  {
    id: 'patient-002',
    first_name: 'John',
    last_name: 'Smith',
    phone: '5551234567',
    phone_country_code: '+1',
    country_code: 'US',
    preferred_currency: 'USD',
    email: 'john@example.com',
  },
  {
    id: 'patient-003',
    first_name: 'Fatima',
    last_name: 'Al Maktoum',
    phone: '501234567',
    phone_country_code: '+971',
    country_code: 'AE',
    preferred_currency: 'AED',
    email: 'fatima@example.com',
  },
];

// =============================================
// PATIENT FORM REGIONAL FIELDS
// =============================================

describe('Patient Form Regional Fields', () => {
  describe('Phone Country Code Picker', () => {
    const PhoneCodePicker = ({ countries, value, onChange }) => (
      <select
        data-testid="phone-country-code"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-32 bg-white"
      >
        {countries.map(c => (
          <option key={c.code} value={c.phone_code}>
            {c.flag_emoji} {c.phone_code}
          </option>
        ))}
      </select>
    );

    it('should render with all phone codes', () => {
      render(
        <PhoneCodePicker 
          countries={MOCK_COUNTRIES}
          value="+20"
          onChange={() => {}}
        />
      );
      
      const dropdown = screen.getByTestId('phone-country-code');
      const options = within(dropdown).getAllByRole('option');
      expect(options.length).toBe(MOCK_COUNTRIES.length);
    });

    it('should display flag emoji with phone code', () => {
      render(
        <PhoneCodePicker 
          countries={MOCK_COUNTRIES}
          value="+20"
          onChange={() => {}}
        />
      );
      
      const dropdown = screen.getByTestId('phone-country-code');
      expect(dropdown).toHaveTextContent('🇪🇬 +20');
    });

    it('should have default value of +20 (Egypt)', () => {
      render(
        <PhoneCodePicker 
          countries={MOCK_COUNTRIES}
          value="+20"
          onChange={() => {}}
        />
      );
      
      const dropdown = screen.getByTestId('phone-country-code');
      expect(dropdown.value).toBe('+20');
    });

    it('should call onChange when phone code is selected', () => {
      const handleChange = vi.fn();
      render(
        <PhoneCodePicker 
          countries={MOCK_COUNTRIES}
          value="+20"
          onChange={handleChange}
        />
      );
      
      fireEvent.change(screen.getByTestId('phone-country-code'), {
        target: { value: '+971' }
      });
      
      expect(handleChange).toHaveBeenCalledWith('+971');
    });
  });

  describe('Country Dropdown', () => {
    const CountryDropdown = ({ countries, value, onChange }) => (
      <select
        data-testid="patient-country"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white"
      >
        {countries.map(c => (
          <option key={c.code} value={c.code}>
            {c.flag_emoji} {c.name_en}
          </option>
        ))}
      </select>
    );

    it('should render with all countries', () => {
      render(
        <CountryDropdown 
          countries={MOCK_COUNTRIES}
          value="EG"
          onChange={() => {}}
        />
      );
      
      const dropdown = screen.getByTestId('patient-country');
      const options = within(dropdown).getAllByRole('option');
      expect(options.length).toBe(MOCK_COUNTRIES.length);
    });

    it('should display country name with flag', () => {
      render(
        <CountryDropdown 
          countries={MOCK_COUNTRIES}
          value="EG"
          onChange={() => {}}
        />
      );
      
      const dropdown = screen.getByTestId('patient-country');
      expect(dropdown).toHaveTextContent('🇪🇬 Egypt');
    });

    it('should call onChange when country is selected', () => {
      const handleChange = vi.fn();
      render(
        <CountryDropdown 
          countries={MOCK_COUNTRIES}
          value="EG"
          onChange={handleChange}
        />
      );
      
      fireEvent.change(screen.getByTestId('patient-country'), {
        target: { value: 'US' }
      });
      
      expect(handleChange).toHaveBeenCalledWith('US');
    });
  });

  describe('Preferred Currency Dropdown', () => {
    const CurrencyDropdown = ({ currencies, value, onChange }) => (
      <select
        data-testid="preferred-currency"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white"
      >
        {currencies.map(c => (
          <option key={c.code} value={c.code}>
            {c.symbol} {c.name_en} ({c.code})
          </option>
        ))}
      </select>
    );

    it('should render with all currencies', () => {
      render(
        <CurrencyDropdown 
          currencies={MOCK_CURRENCIES}
          value="EGP"
          onChange={() => {}}
        />
      );
      
      const dropdown = screen.getByTestId('preferred-currency');
      const options = within(dropdown).getAllByRole('option');
      expect(options.length).toBe(MOCK_CURRENCIES.length);
    });

    it('should display currency symbol, name and code', () => {
      render(
        <CurrencyDropdown 
          currencies={MOCK_CURRENCIES}
          value="EGP"
          onChange={() => {}}
        />
      );
      
      const dropdown = screen.getByTestId('preferred-currency');
      expect(dropdown).toHaveTextContent('E£ Egyptian Pound (EGP)');
    });

    it('should call onChange when currency is selected', () => {
      const handleChange = vi.fn();
      render(
        <CurrencyDropdown 
          currencies={MOCK_CURRENCIES}
          value="EGP"
          onChange={handleChange}
        />
      );
      
      fireEvent.change(screen.getByTestId('preferred-currency'), {
        target: { value: 'USD' }
      });
      
      expect(handleChange).toHaveBeenCalledWith('USD');
    });
  });
});

// =============================================
// COUNTRY-PHONE CODE AUTO-SYNC
// =============================================

describe('Country-Phone Code Auto-Sync', () => {
  const getPhoneCodeForCountry = (countryCode) => {
    const country = MOCK_COUNTRIES.find(c => c.code === countryCode);
    return country?.phone_code || '+20';
  };

  it('should return +20 for Egypt', () => {
    expect(getPhoneCodeForCountry('EG')).toBe('+20');
  });

  it('should return +971 for UAE', () => {
    expect(getPhoneCodeForCountry('AE')).toBe('+971');
  });

  it('should return +1 for USA', () => {
    expect(getPhoneCodeForCountry('US')).toBe('+1');
  });

  it('should return +44 for UK', () => {
    expect(getPhoneCodeForCountry('GB')).toBe('+44');
  });

  it('should return +966 for Saudi Arabia', () => {
    expect(getPhoneCodeForCountry('SA')).toBe('+966');
  });

  it('should return default +20 for unknown country', () => {
    expect(getPhoneCodeForCountry('XX')).toBe('+20');
  });

  describe('Form Integration', () => {
    const PatientRegionalForm = ({ patient, onChange }) => {
      const handleCountryChange = (countryCode) => {
        const phoneCode = getPhoneCodeForCountry(countryCode);
        onChange({
          ...patient,
          country_code: countryCode,
          phone_country_code: phoneCode,
        });
      };

      return (
        <div data-testid="patient-regional-form">
          <select
            data-testid="country-select"
            value={patient.country_code}
            onChange={(e) => handleCountryChange(e.target.value)}
          >
            {MOCK_COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.name_en}</option>
            ))}
          </select>
          
          <div data-testid="phone-code-display">
            {patient.phone_country_code}
          </div>
        </div>
      );
    };

    it('should auto-update phone code when country changes', () => {
      const patient = {
        country_code: 'EG',
        phone_country_code: '+20',
      };
      const handleChange = vi.fn();

      render(
        <PatientRegionalForm 
          patient={patient}
          onChange={handleChange}
        />
      );

      fireEvent.change(screen.getByTestId('country-select'), {
        target: { value: 'AE' }
      });

      expect(handleChange).toHaveBeenCalledWith({
        country_code: 'AE',
        phone_country_code: '+971',
      });
    });
  });
});

// =============================================
// PATIENT PREFERRED CURRENCY
// =============================================

describe('Patient Preferred Currency', () => {
  const getPatientCurrency = (patient) => {
    return MOCK_CURRENCIES.find(c => c.code === patient.preferred_currency) || 
           MOCK_CURRENCIES.find(c => c.code === 'EGP');
  };

  it('should return EGP for Egyptian patient', () => {
    const currency = getPatientCurrency(MOCK_PATIENTS[0]);
    expect(currency.code).toBe('EGP');
    expect(currency.symbol).toBe('E£');
  });

  it('should return USD for American patient', () => {
    const currency = getPatientCurrency(MOCK_PATIENTS[1]);
    expect(currency.code).toBe('USD');
    expect(currency.symbol).toBe('$');
  });

  it('should return AED for UAE patient', () => {
    const currency = getPatientCurrency(MOCK_PATIENTS[2]);
    expect(currency.code).toBe('AED');
    expect(currency.symbol).toBe('د.إ');
  });

  it('should return default EGP for patient without preference', () => {
    const patientWithoutPref = { ...MOCK_PATIENTS[0], preferred_currency: null };
    const currency = getPatientCurrency(patientWithoutPref);
    expect(currency.code).toBe('EGP');
  });
});

// =============================================
// PATIENT PHONE FORMATTING
// =============================================

describe('Patient Phone Formatting', () => {
  const formatPatientPhone = (patient) => {
    if (!patient.phone) return '';
    
    const phoneCode = patient.phone_country_code || '+20';
    let digits = patient.phone.replace(/\D/g, '');
    
    // Remove leading zero
    if (digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    
    return `${phoneCode} ${digits}`;
  };

  it('should format Egyptian phone correctly', () => {
    const result = formatPatientPhone(MOCK_PATIENTS[0]);
    expect(result).toBe('+20 1000000021');
  });

  it('should format American phone correctly', () => {
    const result = formatPatientPhone(MOCK_PATIENTS[1]);
    expect(result).toBe('+1 5551234567');
  });

  it('should format UAE phone correctly', () => {
    const result = formatPatientPhone(MOCK_PATIENTS[2]);
    expect(result).toBe('+971 501234567');
  });

  it('should handle phone with leading zero', () => {
    const patient = { ...MOCK_PATIENTS[0], phone: '01144848521' };
    const result = formatPatientPhone(patient);
    expect(result).toBe('+20 1000000021');
  });

  it('should handle empty phone', () => {
    const patient = { ...MOCK_PATIENTS[0], phone: '' };
    const result = formatPatientPhone(patient);
    expect(result).toBe('');
  });

  it('should use default +20 if phone_country_code is missing', () => {
    const patient = { ...MOCK_PATIENTS[0], phone_country_code: null };
    const result = formatPatientPhone(patient);
    expect(result).toContain('+20');
  });
});

// =============================================
// PATIENT BILLING IN PREFERRED CURRENCY
// =============================================

describe('Patient Billing in Preferred Currency', () => {
  const formatCurrency = (amount, currencyCode) => {
    const currency = MOCK_CURRENCIES.find(c => c.code === currencyCode);
    if (!currency) return `${currencyCode} ${amount.toFixed(2)}`;
    
    return `${currency.symbol} ${amount.toLocaleString('en-US', {
      minimumFractionDigits: currency.decimal_places,
      maximumFractionDigits: currency.decimal_places,
    })}`;
  };

  it('should format billing in patient preferred currency (EGP)', () => {
    const result = formatCurrency(1000, MOCK_PATIENTS[0].preferred_currency);
    expect(result).toBe('E£ 1,000.00');
  });

  it('should format billing in patient preferred currency (USD)', () => {
    const result = formatCurrency(100, MOCK_PATIENTS[1].preferred_currency);
    expect(result).toBe('$ 100.00');
  });

  it('should format billing in patient preferred currency (AED)', () => {
    const result = formatCurrency(500, MOCK_PATIENTS[2].preferred_currency);
    expect(result).toBe('د.إ 500.00');
  });
});

// =============================================
// PATIENT COUNTRY-CURRENCY RELATIONSHIP
// =============================================

describe('Patient Country-Currency Relationship', () => {
  const getCurrencyForCountry = (countryCode) => {
    const country = MOCK_COUNTRIES.find(c => c.code === countryCode);
    if (!country) return null;
    return MOCK_CURRENCIES.find(c => c.code === country.currency_code);
  };

  it('should link Egypt to EGP', () => {
    const currency = getCurrencyForCountry('EG');
    expect(currency?.code).toBe('EGP');
  });

  it('should link UAE to AED', () => {
    const currency = getCurrencyForCountry('AE');
    expect(currency?.code).toBe('AED');
  });

  it('should link USA to USD', () => {
    const currency = getCurrencyForCountry('US');
    expect(currency?.code).toBe('USD');
  });

  it('should link UK to GBP', () => {
    const currency = getCurrencyForCountry('GB');
    expect(currency?.code).toBe('GBP');
  });

  it('should link Saudi Arabia to SAR', () => {
    const currency = getCurrencyForCountry('SA');
    expect(currency?.code).toBe('SAR');
  });

  it('should return null for unknown country', () => {
    const currency = getCurrencyForCountry('XX');
    expect(currency).toBeNull();
  });

  describe('Auto-suggest Currency Based on Country', () => {
    const suggestCurrencyForCountry = (countryCode, currentCurrency) => {
      const countryCurrency = getCurrencyForCountry(countryCode);
      return countryCurrency?.code || currentCurrency || 'EGP';
    };

    it('should suggest EGP when Egypt is selected', () => {
      const suggested = suggestCurrencyForCountry('EG', 'USD');
      expect(suggested).toBe('EGP');
    });

    it('should suggest AED when UAE is selected', () => {
      const suggested = suggestCurrencyForCountry('AE', 'EGP');
      expect(suggested).toBe('AED');
    });

    it('should keep current currency for unknown country', () => {
      const suggested = suggestCurrencyForCountry('XX', 'USD');
      expect(suggested).toBe('USD');
    });
  });
});

// =============================================
// PATIENT VALIDATION
// =============================================

describe('Patient Regional Field Validation', () => {
  describe('Country Code Validation', () => {
    const isValidCountryCode = (code) => {
      if (!code) return false;
      return MOCK_COUNTRIES.some(c => c.code === code);
    };

    it('should validate EG as valid', () => {
      expect(isValidCountryCode('EG')).toBe(true);
    });

    it('should validate US as valid', () => {
      expect(isValidCountryCode('US')).toBe(true);
    });

    it('should reject XX as invalid', () => {
      expect(isValidCountryCode('XX')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidCountryCode('')).toBe(false);
    });

    it('should reject null', () => {
      expect(isValidCountryCode(null)).toBe(false);
    });
  });

  describe('Currency Code Validation', () => {
    const isValidCurrencyCode = (code) => {
      if (!code) return false;
      return MOCK_CURRENCIES.some(c => c.code === code);
    };

    it('should validate EGP as valid', () => {
      expect(isValidCurrencyCode('EGP')).toBe(true);
    });

    it('should validate USD as valid', () => {
      expect(isValidCurrencyCode('USD')).toBe(true);
    });

    it('should reject XXX as invalid', () => {
      expect(isValidCurrencyCode('XXX')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidCurrencyCode('')).toBe(false);
    });
  });

  describe('Phone Code Validation', () => {
    const isValidPhoneCode = (code) => {
      if (!code) return false;
      return /^\+\d{1,4}$/.test(code);
    };

    it('should validate +20 as valid', () => {
      expect(isValidPhoneCode('+20')).toBe(true);
    });

    it('should validate +971 as valid', () => {
      expect(isValidPhoneCode('+971')).toBe(true);
    });

    it('should validate +1 as valid', () => {
      expect(isValidPhoneCode('+1')).toBe(true);
    });

    it('should reject code without +', () => {
      expect(isValidPhoneCode('20')).toBe(false);
    });

    it('should reject code with letters', () => {
      expect(isValidPhoneCode('+20a')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidPhoneCode('')).toBe(false);
    });
  });
});

// =============================================
// PATIENT DISPLAY COMPONENTS
// =============================================

describe('Patient Display Components', () => {
  const PatientInfo = ({ patient }) => {
    const formatPhone = () => {
      if (!patient.phone) return '-';
      return `${patient.phone_country_code} ${patient.phone}`;
    };

    const formatCurrency = (amount) => {
      const currency = MOCK_CURRENCIES.find(c => c.code === patient.preferred_currency);
      return `${currency?.symbol || '$'} ${amount.toLocaleString()}`;
    };

    const country = MOCK_COUNTRIES.find(c => c.code === patient.country_code);

    return (
      <div data-testid="patient-info">
        <div data-testid="patient-name">{patient.first_name} {patient.last_name}</div>
        <div data-testid="patient-phone">{formatPhone()}</div>
        <div data-testid="patient-country">{country?.flag_emoji} {country?.name_en}</div>
        <div data-testid="patient-balance">{formatCurrency(1500)}</div>
      </div>
    );
  };

  it('should display patient phone with country code', () => {
    render(<PatientInfo patient={MOCK_PATIENTS[0]} />);
    expect(screen.getByTestId('patient-phone')).toHaveTextContent('+20 1000000021');
  });

  it('should display patient country with flag', () => {
    render(<PatientInfo patient={MOCK_PATIENTS[0]} />);
    expect(screen.getByTestId('patient-country')).toHaveTextContent('🇪🇬 Egypt');
  });

  it('should display balance in preferred currency', () => {
    render(<PatientInfo patient={MOCK_PATIENTS[0]} />);
    expect(screen.getByTestId('patient-balance')).toHaveTextContent('E£ 1,500');
  });

  it('should display UAE patient with AED', () => {
    render(<PatientInfo patient={MOCK_PATIENTS[2]} />);
    expect(screen.getByTestId('patient-balance')).toHaveTextContent('د.إ 1,500');
  });
});

export default {};
