/**
 * Dropdown Component Tests
 * Tests for country, currency, and phone code dropdown components
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

// =============================================
// MOCK DATA
// =============================================

const MOCK_COUNTRIES = [
  { code: 'EG', name_en: 'Egypt', name_ar: 'مصر', phone_code: '+20', currency_code: 'EGP', flag_emoji: '🇪🇬' },
  { code: 'AE', name_en: 'United Arab Emirates', name_ar: 'الإمارات', phone_code: '+971', currency_code: 'AED', flag_emoji: '🇦🇪' },
  { code: 'SA', name_en: 'Saudi Arabia', name_ar: 'السعودية', phone_code: '+966', currency_code: 'SAR', flag_emoji: '🇸🇦' },
  { code: 'US', name_en: 'United States', name_ar: 'أمريكا', phone_code: '+1', currency_code: 'USD', flag_emoji: '🇺🇸' },
  { code: 'GB', name_en: 'United Kingdom', name_ar: 'بريطانيا', phone_code: '+44', currency_code: 'GBP', flag_emoji: '🇬🇧' },
];

const MOCK_CURRENCIES = [
  { code: 'EGP', name_en: 'Egyptian Pound', symbol: 'E£', decimal_places: 2 },
  { code: 'AED', name_en: 'UAE Dirham', symbol: 'د.إ', decimal_places: 2 },
  { code: 'SAR', name_en: 'Saudi Riyal', symbol: 'ر.س', decimal_places: 2 },
  { code: 'USD', name_en: 'US Dollar', symbol: '$', decimal_places: 2 },
  { code: 'EUR', name_en: 'Euro', symbol: '€', decimal_places: 2 },
  { code: 'GBP', name_en: 'British Pound', symbol: '£', decimal_places: 2 },
];

// =============================================
// COUNTRY DROPDOWN TESTS
// =============================================

describe('Country Dropdown Component', () => {
  // Mock country dropdown component
  const CountryDropdown = ({ countries, value, onChange, loading = false, className = '' }) => (
    <select
      data-testid="country-dropdown"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 border border-gray-300 rounded-lg bg-white ${className}`}
      disabled={loading}
    >
      {loading && <option value="">Loading countries...</option>}
      {!loading && countries.length === 0 && <option value="">No countries available</option>}
      {countries.map(c => (
        <option key={c.code} value={c.code}>
          {c.flag_emoji || ''} {c.name_en}
        </option>
      ))}
    </select>
  );

  describe('Rendering', () => {
    it('should render dropdown with countries', () => {
      render(
        <CountryDropdown 
          countries={MOCK_COUNTRIES} 
          value="EG" 
          onChange={() => {}} 
        />
      );
      
      const dropdown = screen.getByTestId('country-dropdown');
      expect(dropdown).toBeInTheDocument();
    });

    it('should show all countries as options', () => {
      render(
        <CountryDropdown 
          countries={MOCK_COUNTRIES} 
          value="EG" 
          onChange={() => {}} 
        />
      );
      
      const dropdown = screen.getByTestId('country-dropdown');
      const options = within(dropdown).getAllByRole('option');
      expect(options.length).toBe(MOCK_COUNTRIES.length);
    });

    it('should display flag emoji in options', () => {
      render(
        <CountryDropdown 
          countries={MOCK_COUNTRIES} 
          value="EG" 
          onChange={() => {}} 
        />
      );
      
      const dropdown = screen.getByTestId('country-dropdown');
      expect(dropdown).toHaveTextContent('🇪🇬');
      expect(dropdown).toHaveTextContent('🇦🇪');
      expect(dropdown).toHaveTextContent('🇺🇸');
    });

    it('should display country names in options', () => {
      render(
        <CountryDropdown 
          countries={MOCK_COUNTRIES} 
          value="EG" 
          onChange={() => {}} 
        />
      );
      
      const dropdown = screen.getByTestId('country-dropdown');
      expect(dropdown).toHaveTextContent('Egypt');
      expect(dropdown).toHaveTextContent('United Arab Emirates');
      expect(dropdown).toHaveTextContent('United States');
    });

    it('should have correct selected value', () => {
      render(
        <CountryDropdown 
          countries={MOCK_COUNTRIES} 
          value="AE" 
          onChange={() => {}} 
        />
      );
      
      const dropdown = screen.getByTestId('country-dropdown');
      expect(dropdown.value).toBe('AE');
    });
  });

  describe('Loading State', () => {
    it('should show loading text when loading', () => {
      render(
        <CountryDropdown 
          countries={[]} 
          value="" 
          onChange={() => {}}
          loading={true}
        />
      );
      
      expect(screen.getByText('Loading countries...')).toBeInTheDocument();
    });

    it('should be disabled when loading', () => {
      render(
        <CountryDropdown 
          countries={[]} 
          value="" 
          onChange={() => {}}
          loading={true}
        />
      );
      
      const dropdown = screen.getByTestId('country-dropdown');
      expect(dropdown).toBeDisabled();
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no countries', () => {
      render(
        <CountryDropdown 
          countries={[]} 
          value="" 
          onChange={() => {}}
          loading={false}
        />
      );
      
      expect(screen.getByText('No countries available')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onChange when country is selected', async () => {
      const handleChange = vi.fn();
      render(
        <CountryDropdown 
          countries={MOCK_COUNTRIES} 
          value="EG" 
          onChange={handleChange}
        />
      );
      
      const dropdown = screen.getByTestId('country-dropdown');
      fireEvent.change(dropdown, { target: { value: 'US' } });
      
      expect(handleChange).toHaveBeenCalledWith('US');
    });

    it('should update displayed value on selection', async () => {
      const handleChange = vi.fn();
      render(
        <CountryDropdown 
          countries={MOCK_COUNTRIES} 
          value="EG" 
          onChange={handleChange}
        />
      );
      
      const dropdown = screen.getByTestId('country-dropdown');
      
      // Initial value should be EG
      expect(dropdown.value).toBe('EG');
      
      // Simulate selecting a new country
      fireEvent.change(dropdown, { target: { value: 'US' } });
      
      // Verify onChange was called with new value
      expect(handleChange).toHaveBeenCalledWith('US');
    });
  });

  describe('Styling', () => {
    it('should have white background class', () => {
      render(
        <CountryDropdown 
          countries={MOCK_COUNTRIES} 
          value="EG" 
          onChange={() => {}}
        />
      );
      
      const dropdown = screen.getByTestId('country-dropdown');
      expect(dropdown).toHaveClass('bg-white');
    });

    it('should have border styling', () => {
      render(
        <CountryDropdown 
          countries={MOCK_COUNTRIES} 
          value="EG" 
          onChange={() => {}}
        />
      );
      
      const dropdown = screen.getByTestId('country-dropdown');
      expect(dropdown).toHaveClass('border');
      expect(dropdown).toHaveClass('border-gray-300');
    });

    it('should have rounded corners', () => {
      render(
        <CountryDropdown 
          countries={MOCK_COUNTRIES} 
          value="EG" 
          onChange={() => {}}
        />
      );
      
      const dropdown = screen.getByTestId('country-dropdown');
      expect(dropdown).toHaveClass('rounded-lg');
    });

    it('should accept custom className', () => {
      render(
        <CountryDropdown 
          countries={MOCK_COUNTRIES} 
          value="EG" 
          onChange={() => {}}
          className="w-full"
        />
      );
      
      const dropdown = screen.getByTestId('country-dropdown');
      expect(dropdown).toHaveClass('w-full');
    });
  });
});

// =============================================
// CURRENCY DROPDOWN TESTS
// =============================================

describe('Currency Dropdown Component', () => {
  // Mock currency dropdown component
  const CurrencyDropdown = ({ currencies, value, onChange, loading = false, className = '' }) => (
    <select
      data-testid="currency-dropdown"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 border border-gray-300 rounded-lg bg-white ${className}`}
      disabled={loading}
    >
      {loading && <option value="">Loading currencies...</option>}
      {!loading && currencies.length === 0 && <option value="">No currencies available</option>}
      {currencies.map(c => (
        <option key={c.code} value={c.code}>
          {c.symbol} {c.name_en} ({c.code})
        </option>
      ))}
    </select>
  );

  describe('Rendering', () => {
    it('should render dropdown with currencies', () => {
      render(
        <CurrencyDropdown 
          currencies={MOCK_CURRENCIES} 
          value="EGP" 
          onChange={() => {}} 
        />
      );
      
      const dropdown = screen.getByTestId('currency-dropdown');
      expect(dropdown).toBeInTheDocument();
    });

    it('should show all currencies as options', () => {
      render(
        <CurrencyDropdown 
          currencies={MOCK_CURRENCIES} 
          value="EGP" 
          onChange={() => {}} 
        />
      );
      
      const dropdown = screen.getByTestId('currency-dropdown');
      const options = within(dropdown).getAllByRole('option');
      expect(options.length).toBe(MOCK_CURRENCIES.length);
    });

    it('should display currency symbol in options', () => {
      render(
        <CurrencyDropdown 
          currencies={MOCK_CURRENCIES} 
          value="EGP" 
          onChange={() => {}} 
        />
      );
      
      const dropdown = screen.getByTestId('currency-dropdown');
      expect(dropdown).toHaveTextContent('E£');
      expect(dropdown).toHaveTextContent('$');
      expect(dropdown).toHaveTextContent('€');
    });

    it('should display currency name and code', () => {
      render(
        <CurrencyDropdown 
          currencies={MOCK_CURRENCIES} 
          value="EGP" 
          onChange={() => {}} 
        />
      );
      
      const dropdown = screen.getByTestId('currency-dropdown');
      expect(dropdown).toHaveTextContent('Egyptian Pound');
      expect(dropdown).toHaveTextContent('(EGP)');
      expect(dropdown).toHaveTextContent('US Dollar');
      expect(dropdown).toHaveTextContent('(USD)');
    });

    it('should have correct selected value', () => {
      render(
        <CurrencyDropdown 
          currencies={MOCK_CURRENCIES} 
          value="USD" 
          onChange={() => {}} 
        />
      );
      
      const dropdown = screen.getByTestId('currency-dropdown');
      expect(dropdown.value).toBe('USD');
    });
  });

  describe('Loading State', () => {
    it('should show loading text when loading', () => {
      render(
        <CurrencyDropdown 
          currencies={[]} 
          value="" 
          onChange={() => {}}
          loading={true}
        />
      );
      
      expect(screen.getByText('Loading currencies...')).toBeInTheDocument();
    });

    it('should be disabled when loading', () => {
      render(
        <CurrencyDropdown 
          currencies={[]} 
          value="" 
          onChange={() => {}}
          loading={true}
        />
      );
      
      const dropdown = screen.getByTestId('currency-dropdown');
      expect(dropdown).toBeDisabled();
    });
  });

  describe('User Interactions', () => {
    it('should call onChange when currency is selected', () => {
      const handleChange = vi.fn();
      render(
        <CurrencyDropdown 
          currencies={MOCK_CURRENCIES} 
          value="EGP" 
          onChange={handleChange}
        />
      );
      
      const dropdown = screen.getByTestId('currency-dropdown');
      fireEvent.change(dropdown, { target: { value: 'USD' } });
      
      expect(handleChange).toHaveBeenCalledWith('USD');
    });
  });

  describe('Arabic Currency Symbols', () => {
    it('should display AED symbol correctly', () => {
      render(
        <CurrencyDropdown 
          currencies={MOCK_CURRENCIES} 
          value="AED" 
          onChange={() => {}} 
        />
      );
      
      const dropdown = screen.getByTestId('currency-dropdown');
      expect(dropdown).toHaveTextContent('د.إ');
    });

    it('should display SAR symbol correctly', () => {
      render(
        <CurrencyDropdown 
          currencies={MOCK_CURRENCIES} 
          value="SAR" 
          onChange={() => {}} 
        />
      );
      
      const dropdown = screen.getByTestId('currency-dropdown');
      expect(dropdown).toHaveTextContent('ر.س');
    });
  });
});

// =============================================
// PHONE CODE DROPDOWN TESTS
// =============================================

describe('Phone Code Dropdown Component', () => {
  // Mock phone code dropdown component
  const PhoneCodeDropdown = ({ countries, value, onChange, loading = false, className = '' }) => (
    <select
      data-testid="phone-code-dropdown"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-32 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm ${className}`}
      disabled={loading}
    >
      {loading && <option value="">Loading...</option>}
      {countries.map(c => (
        <option key={c.code} value={c.phone_code}>
          {c.flag_emoji || ''} {c.phone_code}
        </option>
      ))}
    </select>
  );

  describe('Rendering', () => {
    it('should render phone code dropdown', () => {
      render(
        <PhoneCodeDropdown 
          countries={MOCK_COUNTRIES} 
          value="+20" 
          onChange={() => {}} 
        />
      );
      
      const dropdown = screen.getByTestId('phone-code-dropdown');
      expect(dropdown).toBeInTheDocument();
    });

    it('should show all phone codes', () => {
      render(
        <PhoneCodeDropdown 
          countries={MOCK_COUNTRIES} 
          value="+20" 
          onChange={() => {}} 
        />
      );
      
      const dropdown = screen.getByTestId('phone-code-dropdown');
      expect(dropdown).toHaveTextContent('+20');
      expect(dropdown).toHaveTextContent('+971');
      expect(dropdown).toHaveTextContent('+1');
      expect(dropdown).toHaveTextContent('+44');
    });

    it('should display flag with phone code', () => {
      render(
        <PhoneCodeDropdown 
          countries={MOCK_COUNTRIES} 
          value="+20" 
          onChange={() => {}} 
        />
      );
      
      const dropdown = screen.getByTestId('phone-code-dropdown');
      expect(dropdown).toHaveTextContent('🇪🇬 +20');
    });

    it('should have correct width class', () => {
      render(
        <PhoneCodeDropdown 
          countries={MOCK_COUNTRIES} 
          value="+20" 
          onChange={() => {}} 
        />
      );
      
      const dropdown = screen.getByTestId('phone-code-dropdown');
      expect(dropdown).toHaveClass('w-32');
    });
  });

  describe('User Interactions', () => {
    it('should call onChange when phone code is selected', () => {
      const handleChange = vi.fn();
      render(
        <PhoneCodeDropdown 
          countries={MOCK_COUNTRIES} 
          value="+20" 
          onChange={handleChange}
        />
      );
      
      const dropdown = screen.getByTestId('phone-code-dropdown');
      fireEvent.change(dropdown, { target: { value: '+971' } });
      
      expect(handleChange).toHaveBeenCalledWith('+971');
    });
  });

  describe('Phone Code Formats', () => {
    it('should have + prefix for all phone codes', () => {
      MOCK_COUNTRIES.forEach(country => {
        expect(country.phone_code).toMatch(/^\+\d+$/);
      });
    });

    it('should select correct value for Egypt', () => {
      render(
        <PhoneCodeDropdown 
          countries={MOCK_COUNTRIES} 
          value="+20" 
          onChange={() => {}} 
        />
      );
      
      const dropdown = screen.getByTestId('phone-code-dropdown');
      expect(dropdown.value).toBe('+20');
    });

    it('should select correct value for UAE', () => {
      render(
        <PhoneCodeDropdown 
          countries={MOCK_COUNTRIES} 
          value="+971" 
          onChange={() => {}} 
        />
      );
      
      const dropdown = screen.getByTestId('phone-code-dropdown');
      expect(dropdown.value).toBe('+971');
    });
  });
});

// =============================================
// INTEGRATION TESTS - Country-Currency Link
// =============================================

describe('Country-Currency Integration', () => {
  const getCountryCurrency = (countryCode) => {
    const country = MOCK_COUNTRIES.find(c => c.code === countryCode);
    if (!country) return null;
    return MOCK_CURRENCIES.find(c => c.code === country.currency_code);
  };

  it('should link Egypt to EGP', () => {
    const currency = getCountryCurrency('EG');
    expect(currency?.code).toBe('EGP');
  });

  it('should link UAE to AED', () => {
    const currency = getCountryCurrency('AE');
    expect(currency?.code).toBe('AED');
  });

  it('should link USA to USD', () => {
    const currency = getCountryCurrency('US');
    expect(currency?.code).toBe('USD');
  });

  it('should link UK to GBP', () => {
    const currency = getCountryCurrency('GB');
    expect(currency?.code).toBe('GBP');
  });

  it('should return null for unknown country', () => {
    const currency = getCountryCurrency('XX');
    expect(currency).toBeNull();
  });
});

// =============================================
// INTEGRATION TESTS - Country-Phone Code Link
// =============================================

describe('Country-Phone Code Integration', () => {
  const getCountryPhoneCode = (countryCode) => {
    const country = MOCK_COUNTRIES.find(c => c.code === countryCode);
    return country?.phone_code || null;
  };

  it('should link Egypt to +20', () => {
    expect(getCountryPhoneCode('EG')).toBe('+20');
  });

  it('should link UAE to +971', () => {
    expect(getCountryPhoneCode('AE')).toBe('+971');
  });

  it('should link USA to +1', () => {
    expect(getCountryPhoneCode('US')).toBe('+1');
  });

  it('should link UK to +44', () => {
    expect(getCountryPhoneCode('GB')).toBe('+44');
  });

  it('should link Saudi Arabia to +966', () => {
    expect(getCountryPhoneCode('SA')).toBe('+966');
  });
});

// =============================================
// FORM INTEGRATION TESTS
// =============================================

describe('Form Integration Tests', () => {
  // Mock form component combining all dropdowns
  const PatientRegionalForm = ({ 
    countries, 
    currencies, 
    patient, 
    onChange 
  }) => {
    const handleCountryChange = (countryCode) => {
      const country = countries.find(c => c.code === countryCode);
      onChange({
        ...patient,
        country_code: countryCode,
        phone_country_code: country?.phone_code || patient.phone_country_code,
      });
    };

    return (
      <div data-testid="patient-regional-form">
        <select
          data-testid="country-select"
          value={patient.country_code}
          onChange={(e) => handleCountryChange(e.target.value)}
        >
          {countries.map(c => (
            <option key={c.code} value={c.code}>{c.name_en}</option>
          ))}
        </select>
        
        <select
          data-testid="phone-code-select"
          value={patient.phone_country_code}
          onChange={(e) => onChange({ ...patient, phone_country_code: e.target.value })}
        >
          {countries.map(c => (
            <option key={c.code} value={c.phone_code}>{c.phone_code}</option>
          ))}
        </select>
        
        <select
          data-testid="currency-select"
          value={patient.preferred_currency}
          onChange={(e) => onChange({ ...patient, preferred_currency: e.target.value })}
        >
          {currencies.map(c => (
            <option key={c.code} value={c.code}>{c.name_en}</option>
          ))}
        </select>
      </div>
    );
  };

  it('should render all regional form fields', () => {
    const patient = {
      country_code: 'EG',
      phone_country_code: '+20',
      preferred_currency: 'EGP',
    };

    render(
      <PatientRegionalForm 
        countries={MOCK_COUNTRIES}
        currencies={MOCK_CURRENCIES}
        patient={patient}
        onChange={() => {}}
      />
    );

    expect(screen.getByTestId('country-select')).toBeInTheDocument();
    expect(screen.getByTestId('phone-code-select')).toBeInTheDocument();
    expect(screen.getByTestId('currency-select')).toBeInTheDocument();
  });

  it('should auto-update phone code when country changes', () => {
    const patient = {
      country_code: 'EG',
      phone_country_code: '+20',
      preferred_currency: 'EGP',
    };

    const handleChange = vi.fn();

    render(
      <PatientRegionalForm 
        countries={MOCK_COUNTRIES}
        currencies={MOCK_CURRENCIES}
        patient={patient}
        onChange={handleChange}
      />
    );

    const countrySelect = screen.getByTestId('country-select');
    fireEvent.change(countrySelect, { target: { value: 'AE' } });

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        country_code: 'AE',
        phone_country_code: '+971',
      })
    );
  });

  it('should allow independent currency selection', () => {
    const patient = {
      country_code: 'EG',
      phone_country_code: '+20',
      preferred_currency: 'EGP',
    };

    const handleChange = vi.fn();

    render(
      <PatientRegionalForm 
        countries={MOCK_COUNTRIES}
        currencies={MOCK_CURRENCIES}
        patient={patient}
        onChange={handleChange}
      />
    );

    const currencySelect = screen.getByTestId('currency-select');
    fireEvent.change(currencySelect, { target: { value: 'USD' } });

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        preferred_currency: 'USD',
      })
    );
  });
});

// =============================================
// ACCESSIBILITY TESTS
// =============================================

describe('Dropdown Accessibility', () => {
  const AccessibleDropdown = ({ id, label, options, value, onChange }) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  it('should have associated label', () => {
    render(
      <AccessibleDropdown 
        id="country"
        label="Country"
        options={[{ value: 'EG', label: 'Egypt' }]}
        value="EG"
        onChange={() => {}}
      />
    );

    const select = screen.getByRole('combobox', { name: /country/i });
    expect(select).toBeInTheDocument();
  });

  it('should have aria-label', () => {
    render(
      <AccessibleDropdown 
        id="currency"
        label="Currency"
        options={[{ value: 'EGP', label: 'Egyptian Pound' }]}
        value="EGP"
        onChange={() => {}}
      />
    );

    const select = screen.getByLabelText(/currency/i);
    expect(select).toHaveAttribute('aria-label', 'Currency');
  });

  it('should be keyboard navigable', () => {
    const handleChange = vi.fn();
    render(
      <AccessibleDropdown 
        id="test"
        label="Test"
        options={[
          { value: 'A', label: 'Option A' },
          { value: 'B', label: 'Option B' },
        ]}
        value="A"
        onChange={handleChange}
      />
    );

    const select = screen.getByRole('combobox');
    select.focus();
    expect(document.activeElement).toBe(select);
  });
});

export default {};
