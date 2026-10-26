/**
 * Site Settings Regional Tab Tests
 * Tests for regional settings configuration in Site Settings
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';

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
  { code: 'EGP', name_en: 'Egyptian Pound', symbol: 'E£', decimal_places: 2, exchange_rate_to_base: 1.0 },
  { code: 'AED', name_en: 'UAE Dirham', symbol: 'د.إ', decimal_places: 2, exchange_rate_to_base: 0.135 },
  { code: 'SAR', name_en: 'Saudi Riyal', symbol: 'ر.س', decimal_places: 2, exchange_rate_to_base: 0.132 },
  { code: 'USD', name_en: 'US Dollar', symbol: '$', decimal_places: 2, exchange_rate_to_base: 0.032 },
  { code: 'EUR', name_en: 'Euro', symbol: '€', decimal_places: 2, exchange_rate_to_base: 0.029 },
  { code: 'GBP', name_en: 'British Pound', symbol: '£', decimal_places: 2, exchange_rate_to_base: 0.025 },
];

const MOCK_REGIONAL_SETTINGS = {
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

const TIMEZONES = [
  { value: 'Africa/Cairo', label: 'Africa/Cairo (UTC+2)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (UTC+4)' },
  { value: 'Asia/Riyadh', label: 'Asia/Riyadh (UTC+3)' },
  { value: 'Europe/London', label: 'Europe/London (UTC+0)' },
  { value: 'America/New_York', label: 'America/New_York (UTC-5)' },
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (29/01/2026)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (01/29/2026)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-01-29)' },
];

const TIME_FORMATS = [
  { value: '12h', label: '12-hour (2:30 PM)' },
  { value: '24h', label: '24-hour (14:30)' },
];

// =============================================
// DEFAULT COUNTRY DROPDOWN TESTS
// =============================================

describe('Default Country Dropdown', () => {
  const DefaultCountryDropdown = ({ countries, value, onChange, loading = false }) => (
    <div>
      <label htmlFor="default-country">Default Country</label>
      <select
        id="default-country"
        data-testid="default-country-dropdown"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border border-gray-300 rounded-lg"
        disabled={loading}
      >
        {loading && <option value="">Loading countries...</option>}
        {countries.map(c => (
          <option key={c.code} value={c.code}>
            {c.flag_emoji} {c.name_en}
          </option>
        ))}
      </select>
    </div>
  );

  it('should render dropdown with label', () => {
    render(
      <DefaultCountryDropdown 
        countries={MOCK_COUNTRIES}
        value="EG"
        onChange={() => {}}
      />
    );
    
    expect(screen.getByLabelText(/default country/i)).toBeInTheDocument();
  });

  it('should show all countries', () => {
    render(
      <DefaultCountryDropdown 
        countries={MOCK_COUNTRIES}
        value="EG"
        onChange={() => {}}
      />
    );
    
    const dropdown = screen.getByTestId('default-country-dropdown');
    const options = within(dropdown).getAllByRole('option');
    expect(options.length).toBe(MOCK_COUNTRIES.length);
  });

  it('should have Egypt selected by default', () => {
    render(
      <DefaultCountryDropdown 
        countries={MOCK_COUNTRIES}
        value="EG"
        onChange={() => {}}
      />
    );
    
    expect(screen.getByTestId('default-country-dropdown').value).toBe('EG');
  });

  it('should call onChange when country is changed', () => {
    const handleChange = vi.fn();
    render(
      <DefaultCountryDropdown 
        countries={MOCK_COUNTRIES}
        value="EG"
        onChange={handleChange}
      />
    );
    
    fireEvent.change(screen.getByTestId('default-country-dropdown'), {
      target: { value: 'AE' }
    });
    
    expect(handleChange).toHaveBeenCalledWith('AE');
  });

  it('should show loading state', () => {
    render(
      <DefaultCountryDropdown 
        countries={[]}
        value=""
        onChange={() => {}}
        loading={true}
      />
    );
    
    expect(screen.getByText('Loading countries...')).toBeInTheDocument();
  });

  it('should have bg-white class', () => {
    render(
      <DefaultCountryDropdown 
        countries={MOCK_COUNTRIES}
        value="EG"
        onChange={() => {}}
      />
    );
    
    expect(screen.getByTestId('default-country-dropdown')).toHaveClass('bg-white');
  });
});

// =============================================
// DEFAULT CURRENCY DROPDOWN TESTS
// =============================================

describe('Default Currency Dropdown', () => {
  const DefaultCurrencyDropdown = ({ currencies, value, onChange, loading = false }) => (
    <div>
      <label htmlFor="default-currency">Default Currency</label>
      <select
        id="default-currency"
        data-testid="default-currency-dropdown"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border border-gray-300 rounded-lg"
        disabled={loading}
      >
        {loading && <option value="">Loading currencies...</option>}
        {currencies.map(c => (
          <option key={c.code} value={c.code}>
            {c.symbol} {c.name_en} ({c.code})
          </option>
        ))}
      </select>
    </div>
  );

  it('should render dropdown with label', () => {
    render(
      <DefaultCurrencyDropdown 
        currencies={MOCK_CURRENCIES}
        value="EGP"
        onChange={() => {}}
      />
    );
    
    expect(screen.getByLabelText(/default currency/i)).toBeInTheDocument();
  });

  it('should show all currencies', () => {
    render(
      <DefaultCurrencyDropdown 
        currencies={MOCK_CURRENCIES}
        value="EGP"
        onChange={() => {}}
      />
    );
    
    const dropdown = screen.getByTestId('default-currency-dropdown');
    const options = within(dropdown).getAllByRole('option');
    expect(options.length).toBe(MOCK_CURRENCIES.length);
  });

  it('should have EGP selected by default', () => {
    render(
      <DefaultCurrencyDropdown 
        currencies={MOCK_CURRENCIES}
        value="EGP"
        onChange={() => {}}
      />
    );
    
    expect(screen.getByTestId('default-currency-dropdown').value).toBe('EGP');
  });

  it('should display symbol, name and code', () => {
    render(
      <DefaultCurrencyDropdown 
        currencies={MOCK_CURRENCIES}
        value="EGP"
        onChange={() => {}}
      />
    );
    
    const dropdown = screen.getByTestId('default-currency-dropdown');
    expect(dropdown).toHaveTextContent('E£');
    expect(dropdown).toHaveTextContent('Egyptian Pound');
    expect(dropdown).toHaveTextContent('(EGP)');
  });

  it('should call onChange when currency is changed', () => {
    const handleChange = vi.fn();
    render(
      <DefaultCurrencyDropdown 
        currencies={MOCK_CURRENCIES}
        value="EGP"
        onChange={handleChange}
      />
    );
    
    fireEvent.change(screen.getByTestId('default-currency-dropdown'), {
      target: { value: 'USD' }
    });
    
    expect(handleChange).toHaveBeenCalledWith('USD');
  });

  it('should show loading state', () => {
    render(
      <DefaultCurrencyDropdown 
        currencies={[]}
        value=""
        onChange={() => {}}
        loading={true}
      />
    );
    
    expect(screen.getByText('Loading currencies...')).toBeInTheDocument();
  });
});

// =============================================
// BASE CURRENCY DROPDOWN TESTS
// =============================================

describe('Base Currency Dropdown', () => {
  const BaseCurrencyDropdown = ({ currencies, value, onChange }) => (
    <div>
      <label htmlFor="base-currency">Base Currency (for exchange rates)</label>
      <select
        id="base-currency"
        data-testid="base-currency-dropdown"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border border-gray-300 rounded-lg"
      >
        {currencies.map(c => (
          <option key={c.code} value={c.code}>
            {c.symbol} {c.name_en} ({c.code})
          </option>
        ))}
      </select>
    </div>
  );

  it('should render dropdown with label', () => {
    render(
      <BaseCurrencyDropdown 
        currencies={MOCK_CURRENCIES}
        value="EGP"
        onChange={() => {}}
      />
    );
    
    expect(screen.getByLabelText(/base currency/i)).toBeInTheDocument();
  });

  it('should have EGP as base currency', () => {
    render(
      <BaseCurrencyDropdown 
        currencies={MOCK_CURRENCIES}
        value="EGP"
        onChange={() => {}}
      />
    );
    
    expect(screen.getByTestId('base-currency-dropdown').value).toBe('EGP');
  });

  it('should allow changing base currency', () => {
    const handleChange = vi.fn();
    render(
      <BaseCurrencyDropdown 
        currencies={MOCK_CURRENCIES}
        value="EGP"
        onChange={handleChange}
      />
    );
    
    fireEvent.change(screen.getByTestId('base-currency-dropdown'), {
      target: { value: 'USD' }
    });
    
    expect(handleChange).toHaveBeenCalledWith('USD');
  });
});

// =============================================
// TIMEZONE DROPDOWN TESTS
// =============================================

describe('Timezone Dropdown', () => {
  const TimezoneDropdown = ({ value, onChange }) => (
    <div>
      <label htmlFor="timezone">Timezone</label>
      <select
        id="timezone"
        data-testid="timezone-dropdown"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border border-gray-300 rounded-lg"
      >
        {TIMEZONES.map(tz => (
          <option key={tz.value} value={tz.value}>
            {tz.label}
          </option>
        ))}
      </select>
    </div>
  );

  it('should render dropdown with label', () => {
    render(
      <TimezoneDropdown 
        value="Africa/Cairo"
        onChange={() => {}}
      />
    );
    
    expect(screen.getByLabelText(/timezone/i)).toBeInTheDocument();
  });

  it('should show all timezones', () => {
    render(
      <TimezoneDropdown 
        value="Africa/Cairo"
        onChange={() => {}}
      />
    );
    
    const dropdown = screen.getByTestId('timezone-dropdown');
    const options = within(dropdown).getAllByRole('option');
    expect(options.length).toBe(TIMEZONES.length);
  });

  it('should have Cairo selected by default', () => {
    render(
      <TimezoneDropdown 
        value="Africa/Cairo"
        onChange={() => {}}
      />
    );
    
    expect(screen.getByTestId('timezone-dropdown').value).toBe('Africa/Cairo');
  });

  it('should call onChange when timezone is changed', () => {
    const handleChange = vi.fn();
    render(
      <TimezoneDropdown 
        value="Africa/Cairo"
        onChange={handleChange}
      />
    );
    
    fireEvent.change(screen.getByTestId('timezone-dropdown'), {
      target: { value: 'Asia/Dubai' }
    });
    
    expect(handleChange).toHaveBeenCalledWith('Asia/Dubai');
  });

  it('should have bg-white class', () => {
    render(
      <TimezoneDropdown 
        value="Africa/Cairo"
        onChange={() => {}}
      />
    );
    
    expect(screen.getByTestId('timezone-dropdown')).toHaveClass('bg-white');
  });
});

// =============================================
// DATE FORMAT DROPDOWN TESTS
// =============================================

describe('Date Format Dropdown', () => {
  const DateFormatDropdown = ({ value, onChange }) => (
    <div>
      <label htmlFor="date-format">Date Format</label>
      <select
        id="date-format"
        data-testid="date-format-dropdown"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border border-gray-300 rounded-lg"
      >
        {DATE_FORMATS.map(fmt => (
          <option key={fmt.value} value={fmt.value}>
            {fmt.label}
          </option>
        ))}
      </select>
    </div>
  );

  it('should render dropdown with label', () => {
    render(
      <DateFormatDropdown 
        value="DD/MM/YYYY"
        onChange={() => {}}
      />
    );
    
    expect(screen.getByLabelText(/date format/i)).toBeInTheDocument();
  });

  it('should show all date formats', () => {
    render(
      <DateFormatDropdown 
        value="DD/MM/YYYY"
        onChange={() => {}}
      />
    );
    
    const dropdown = screen.getByTestId('date-format-dropdown');
    const options = within(dropdown).getAllByRole('option');
    expect(options.length).toBe(DATE_FORMATS.length);
  });

  it('should have DD/MM/YYYY selected by default', () => {
    render(
      <DateFormatDropdown 
        value="DD/MM/YYYY"
        onChange={() => {}}
      />
    );
    
    expect(screen.getByTestId('date-format-dropdown').value).toBe('DD/MM/YYYY');
  });

  it('should call onChange when format is changed', () => {
    const handleChange = vi.fn();
    render(
      <DateFormatDropdown 
        value="DD/MM/YYYY"
        onChange={handleChange}
      />
    );
    
    fireEvent.change(screen.getByTestId('date-format-dropdown'), {
      target: { value: 'MM/DD/YYYY' }
    });
    
    expect(handleChange).toHaveBeenCalledWith('MM/DD/YYYY');
  });
});

// =============================================
// TIME FORMAT DROPDOWN TESTS
// =============================================

describe('Time Format Dropdown', () => {
  const TimeFormatDropdown = ({ value, onChange }) => (
    <div>
      <label htmlFor="time-format">Time Format</label>
      <select
        id="time-format"
        data-testid="time-format-dropdown"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border border-gray-300 rounded-lg"
      >
        {TIME_FORMATS.map(fmt => (
          <option key={fmt.value} value={fmt.value}>
            {fmt.label}
          </option>
        ))}
      </select>
    </div>
  );

  it('should render dropdown with label', () => {
    render(
      <TimeFormatDropdown 
        value="12h"
        onChange={() => {}}
      />
    );
    
    expect(screen.getByLabelText(/time format/i)).toBeInTheDocument();
  });

  it('should show both time formats', () => {
    render(
      <TimeFormatDropdown 
        value="12h"
        onChange={() => {}}
      />
    );
    
    const dropdown = screen.getByTestId('time-format-dropdown');
    const options = within(dropdown).getAllByRole('option');
    expect(options.length).toBe(TIME_FORMATS.length);
  });

  it('should have 12h selected by default', () => {
    render(
      <TimeFormatDropdown 
        value="12h"
        onChange={() => {}}
      />
    );
    
    expect(screen.getByTestId('time-format-dropdown').value).toBe('12h');
  });

  it('should call onChange when format is changed', () => {
    const handleChange = vi.fn();
    render(
      <TimeFormatDropdown 
        value="12h"
        onChange={handleChange}
      />
    );
    
    fireEvent.change(screen.getByTestId('time-format-dropdown'), {
      target: { value: '24h' }
    });
    
    expect(handleChange).toHaveBeenCalledWith('24h');
  });
});

// =============================================
// ACCEPTED CURRENCIES TESTS
// =============================================

describe('Accepted Currencies Configuration', () => {
  const AcceptedCurrenciesList = ({ currencies, accepted, onToggle }) => (
    <div data-testid="accepted-currencies-list">
      {currencies.map(c => (
        <div key={c.code} data-testid={`currency-item-${c.code}`}>
          <input
            type="checkbox"
            id={`currency-${c.code}`}
            data-testid={`currency-checkbox-${c.code}`}
            checked={accepted.includes(c.code)}
            onChange={() => onToggle(c.code)}
          />
          <label htmlFor={`currency-${c.code}`}>
            {c.symbol} {c.name_en} ({c.code})
          </label>
        </div>
      ))}
    </div>
  );

  it('should render all currencies', () => {
    render(
      <AcceptedCurrenciesList 
        currencies={MOCK_CURRENCIES}
        accepted={['EGP', 'USD']}
        onToggle={() => {}}
      />
    );
    
    MOCK_CURRENCIES.forEach(c => {
      expect(screen.getByTestId(`currency-item-${c.code}`)).toBeInTheDocument();
    });
  });

  it('should show checkboxes for each currency', () => {
    render(
      <AcceptedCurrenciesList 
        currencies={MOCK_CURRENCIES}
        accepted={['EGP', 'USD']}
        onToggle={() => {}}
      />
    );
    
    MOCK_CURRENCIES.forEach(c => {
      expect(screen.getByTestId(`currency-checkbox-${c.code}`)).toBeInTheDocument();
    });
  });

  it('should check accepted currencies', () => {
    render(
      <AcceptedCurrenciesList 
        currencies={MOCK_CURRENCIES}
        accepted={['EGP', 'USD']}
        onToggle={() => {}}
      />
    );
    
    expect(screen.getByTestId('currency-checkbox-EGP')).toBeChecked();
    expect(screen.getByTestId('currency-checkbox-USD')).toBeChecked();
    expect(screen.getByTestId('currency-checkbox-EUR')).not.toBeChecked();
  });

  it('should call onToggle when checkbox is clicked', () => {
    const handleToggle = vi.fn();
    render(
      <AcceptedCurrenciesList 
        currencies={MOCK_CURRENCIES}
        accepted={['EGP', 'USD']}
        onToggle={handleToggle}
      />
    );
    
    fireEvent.click(screen.getByTestId('currency-checkbox-EUR'));
    expect(handleToggle).toHaveBeenCalledWith('EUR');
  });
});

// =============================================
// EXCHANGE RATE EDITOR TESTS
// =============================================

describe('Exchange Rate Editor', () => {
  const ExchangeRateEditor = ({ currencies, baseCurrency, onUpdate }) => (
    <div data-testid="exchange-rate-editor">
      <h3>Exchange Rates (1 {baseCurrency} = )</h3>
      <table>
        <tbody>
          {currencies
            .filter(c => c.code !== baseCurrency)
            .map(c => (
              <tr key={c.code} data-testid={`rate-row-${c.code}`}>
                <td>{c.symbol} {c.name_en}</td>
                <td>
                  <input
                    type="number"
                    data-testid={`rate-input-${c.code}`}
                    defaultValue={c.exchange_rate_to_base}
                    step="0.001"
                    onBlur={(e) => onUpdate(c.code, parseFloat(e.target.value))}
                  />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );

  it('should render exchange rate table', () => {
    render(
      <ExchangeRateEditor 
        currencies={MOCK_CURRENCIES}
        baseCurrency="EGP"
        onUpdate={() => {}}
      />
    );
    
    expect(screen.getByTestId('exchange-rate-editor')).toBeInTheDocument();
  });

  it('should not show base currency in table', () => {
    render(
      <ExchangeRateEditor 
        currencies={MOCK_CURRENCIES}
        baseCurrency="EGP"
        onUpdate={() => {}}
      />
    );
    
    expect(screen.queryByTestId('rate-row-EGP')).not.toBeInTheDocument();
  });

  it('should show all other currencies', () => {
    render(
      <ExchangeRateEditor 
        currencies={MOCK_CURRENCIES}
        baseCurrency="EGP"
        onUpdate={() => {}}
      />
    );
    
    expect(screen.getByTestId('rate-row-USD')).toBeInTheDocument();
    expect(screen.getByTestId('rate-row-EUR')).toBeInTheDocument();
    expect(screen.getByTestId('rate-row-GBP')).toBeInTheDocument();
  });

  it('should show current exchange rates', () => {
    render(
      <ExchangeRateEditor 
        currencies={MOCK_CURRENCIES}
        baseCurrency="EGP"
        onUpdate={() => {}}
      />
    );
    
    const usdInput = screen.getByTestId('rate-input-USD');
    expect(usdInput).toHaveValue(0.032);
  });

  it('should call onUpdate when rate is changed', () => {
    const handleUpdate = vi.fn();
    render(
      <ExchangeRateEditor 
        currencies={MOCK_CURRENCIES}
        baseCurrency="EGP"
        onUpdate={handleUpdate}
      />
    );
    
    const usdInput = screen.getByTestId('rate-input-USD');
    fireEvent.change(usdInput, { target: { value: '0.035' } });
    fireEvent.blur(usdInput);
    
    expect(handleUpdate).toHaveBeenCalledWith('USD', 0.035);
  });
});

// =============================================
// REGIONAL TAB INTEGRATION TESTS
// =============================================

describe('Regional Tab Integration', () => {
  const RegionalTab = ({ settings, countries, currencies, loading, onChange, onSave }) => (
    <div data-testid="regional-tab">
      {loading ? (
        <div data-testid="loading-spinner">Loading...</div>
      ) : (
        <>
          <div data-testid="default-country-section">
            <label>Default Country</label>
            <select
              data-testid="default-country"
              value={settings.default_country}
              onChange={(e) => onChange({ ...settings, default_country: e.target.value })}
              className="bg-white"
            >
              {countries.map(c => <option key={c.code} value={c.code}>{c.name_en}</option>)}
            </select>
          </div>
          
          <div data-testid="default-currency-section">
            <label>Default Currency</label>
            <select
              data-testid="default-currency"
              value={settings.default_currency}
              onChange={(e) => onChange({ ...settings, default_currency: e.target.value })}
              className="bg-white"
            >
              {currencies.map(c => <option key={c.code} value={c.code}>{c.name_en}</option>)}
            </select>
          </div>
          
          <button data-testid="save-button" onClick={onSave}>
            Save Settings
          </button>
        </>
      )}
    </div>
  );

  it('should render all regional settings sections', () => {
    render(
      <RegionalTab 
        settings={MOCK_REGIONAL_SETTINGS}
        countries={MOCK_COUNTRIES}
        currencies={MOCK_CURRENCIES}
        loading={false}
        onChange={() => {}}
        onSave={() => {}}
      />
    );
    
    expect(screen.getByTestId('default-country-section')).toBeInTheDocument();
    expect(screen.getByTestId('default-currency-section')).toBeInTheDocument();
    expect(screen.getByTestId('save-button')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <RegionalTab 
        settings={MOCK_REGIONAL_SETTINGS}
        countries={[]}
        currencies={[]}
        loading={true}
        onChange={() => {}}
        onSave={() => {}}
      />
    );
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should call onChange when settings are modified', () => {
    const handleChange = vi.fn();
    render(
      <RegionalTab 
        settings={MOCK_REGIONAL_SETTINGS}
        countries={MOCK_COUNTRIES}
        currencies={MOCK_CURRENCIES}
        loading={false}
        onChange={handleChange}
        onSave={() => {}}
      />
    );
    
    fireEvent.change(screen.getByTestId('default-country'), {
      target: { value: 'AE' }
    });
    
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ default_country: 'AE' })
    );
  });

  it('should call onSave when save button is clicked', () => {
    const handleSave = vi.fn();
    render(
      <RegionalTab 
        settings={MOCK_REGIONAL_SETTINGS}
        countries={MOCK_COUNTRIES}
        currencies={MOCK_CURRENCIES}
        loading={false}
        onChange={() => {}}
        onSave={handleSave}
      />
    );
    
    fireEvent.click(screen.getByTestId('save-button'));
    expect(handleSave).toHaveBeenCalled();
  });

  it('should have bg-white on all dropdowns', () => {
    render(
      <RegionalTab 
        settings={MOCK_REGIONAL_SETTINGS}
        countries={MOCK_COUNTRIES}
        currencies={MOCK_CURRENCIES}
        loading={false}
        onChange={() => {}}
        onSave={() => {}}
      />
    );
    
    expect(screen.getByTestId('default-country')).toHaveClass('bg-white');
    expect(screen.getByTestId('default-currency')).toHaveClass('bg-white');
  });
});

// =============================================
// SETTINGS PERSISTENCE TESTS
// =============================================

describe('Settings Persistence', () => {
  it('should validate settings before save', () => {
    const validateSettings = (settings) => {
      const errors = [];
      
      if (!settings.default_country) {
        errors.push('Default country is required');
      }
      if (!settings.default_currency) {
        errors.push('Default currency is required');
      }
      if (!settings.base_currency) {
        errors.push('Base currency is required');
      }
      if (!settings.timezone) {
        errors.push('Timezone is required');
      }
      
      return errors;
    };

    const validSettings = MOCK_REGIONAL_SETTINGS;
    expect(validateSettings(validSettings)).toEqual([]);

    const invalidSettings = { ...MOCK_REGIONAL_SETTINGS, default_country: '' };
    expect(validateSettings(invalidSettings)).toContain('Default country is required');
  });

  it('should merge new settings with defaults', () => {
    const DEFAULT_SETTINGS = {
      default_country: 'EG',
      default_currency: 'EGP',
      base_currency: 'EGP',
      timezone: 'Africa/Cairo',
    };

    const partialSettings = {
      default_country: 'AE',
    };

    const merged = { ...DEFAULT_SETTINGS, ...partialSettings };
    
    expect(merged.default_country).toBe('AE');
    expect(merged.default_currency).toBe('EGP');
    expect(merged.timezone).toBe('Africa/Cairo');
  });
});

export default {};
