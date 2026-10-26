/**
 * Invoice Currency Tests
 * Tests for currency handling in invoices
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

// =============================================
// MOCK DATA
// =============================================

const MOCK_CURRENCIES = [
  { code: 'EGP', name_en: 'Egyptian Pound', symbol: 'E£', decimal_places: 2, exchange_rate_to_base: 1.0 },
  { code: 'USD', name_en: 'US Dollar', symbol: '$', decimal_places: 2, exchange_rate_to_base: 0.032 },
  { code: 'EUR', name_en: 'Euro', symbol: '€', decimal_places: 2, exchange_rate_to_base: 0.029 },
  { code: 'AED', name_en: 'UAE Dirham', symbol: 'د.إ', decimal_places: 2, exchange_rate_to_base: 0.135 },
  { code: 'KWD', name_en: 'Kuwaiti Dinar', symbol: 'د.ك', decimal_places: 3, exchange_rate_to_base: 0.010 },
];

const MOCK_INVOICE = {
  id: 'inv-001',
  invoice_number: 'INV-2026-001',
  patient_id: 'patient-001',
  total_amount: 5000,
  currency: 'EGP',
  exchange_rate: 1.0,
  status: 'pending',
  items: [
    { id: '1', description: 'Dental Cleaning', quantity: 1, unit_price: 500, total: 500 },
    { id: '2', description: 'X-Ray', quantity: 2, unit_price: 250, total: 500 },
    { id: '3', description: 'Root Canal', quantity: 1, unit_price: 4000, total: 4000 },
  ],
};

// =============================================
// CURRENCY FORMATTING IN INVOICES
// =============================================

describe('Invoice Currency Formatting', () => {
  const formatCurrency = (amount, currencyCode = 'EGP') => {
    const currency = MOCK_CURRENCIES.find(c => c.code === currencyCode);
    if (!currency) return `${currencyCode} ${amount.toLocaleString()}`;
    
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: currency.decimal_places,
      maximumFractionDigits: currency.decimal_places,
    });
    
    return `${currency.symbol} ${formatted}`;
  };

  describe('Basic Amount Formatting', () => {
    it('should format invoice total in EGP', () => {
      const result = formatCurrency(5000, 'EGP');
      expect(result).toBe('E£ 5,000.00');
    });

    it('should format invoice total in USD', () => {
      const result = formatCurrency(160, 'USD');
      expect(result).toBe('$ 160.00');
    });

    it('should format invoice total in EUR', () => {
      const result = formatCurrency(145, 'EUR');
      expect(result).toBe('€ 145.00');
    });

    it('should format KWD with 3 decimal places', () => {
      const result = formatCurrency(50, 'KWD');
      expect(result).toBe('د.ك 50.000');
    });
  });

  describe('Line Item Formatting', () => {
    it('should format each line item correctly', () => {
      MOCK_INVOICE.items.forEach(item => {
        const formatted = formatCurrency(item.total, MOCK_INVOICE.currency);
        expect(formatted).toContain('E£');
        expect(formatted).toContain(item.total.toLocaleString());
      });
    });

    it('should format unit prices correctly', () => {
      MOCK_INVOICE.items.forEach(item => {
        const formatted = formatCurrency(item.unit_price, MOCK_INVOICE.currency);
        expect(formatted).toMatch(/E£ [\d,]+\.\d{2}/);
      });
    });
  });

  describe('Subtotal and Tax Formatting', () => {
    it('should format subtotal correctly', () => {
      const subtotal = MOCK_INVOICE.items.reduce((sum, item) => sum + item.total, 0);
      const formatted = formatCurrency(subtotal, MOCK_INVOICE.currency);
      expect(formatted).toBe('E£ 5,000.00');
    });

    it('should format tax amount correctly', () => {
      const taxRate = 0.14; // 14% VAT
      const subtotal = MOCK_INVOICE.items.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * taxRate;
      const formatted = formatCurrency(tax, MOCK_INVOICE.currency);
      expect(formatted).toBe('E£ 700.00');
    });

    it('should format grand total correctly', () => {
      const subtotal = 5000;
      const tax = 700;
      const total = subtotal + tax;
      const formatted = formatCurrency(total, MOCK_INVOICE.currency);
      expect(formatted).toBe('E£ 5,700.00');
    });
  });
});

// =============================================
// CURRENCY CONVERSION IN INVOICES
// =============================================

describe('Invoice Currency Conversion', () => {
  // exchange_rate_to_base means: 1 EGP = X of this currency
  // So to convert FROM a currency TO EGP: divide by rate
  // To convert FROM EGP TO a currency: multiply by rate
  const convertCurrency = (amount, fromCode, toCode) => {
    const fromCurrency = MOCK_CURRENCIES.find(c => c.code === fromCode);
    const toCurrency = MOCK_CURRENCIES.find(c => c.code === toCode);
    
    if (!fromCurrency || !toCurrency) return amount;
    
    // Convert from source to EGP first, then from EGP to target
    // amount / fromRate = EGP equivalent
    // EGP equivalent * toRate = target currency amount
    const egpAmount = amount / fromCurrency.exchange_rate_to_base;
    const convertedAmount = egpAmount * toCurrency.exchange_rate_to_base;
    
    return Math.round(convertedAmount * 100) / 100;
  };

  describe('EGP to Other Currencies', () => {
    it('should convert EGP to USD', () => {
      const result = convertCurrency(1000, 'EGP', 'USD');
      // 1000 EGP * 0.032 = 32 USD approximately
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1000);
    });

    it('should convert EGP to EUR', () => {
      const result = convertCurrency(1000, 'EGP', 'EUR');
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1000);
    });

    it('should convert EGP to AED', () => {
      const result = convertCurrency(1000, 'EGP', 'AED');
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('Other Currencies to EGP', () => {
    it('should convert USD to EGP', () => {
      const result = convertCurrency(100, 'USD', 'EGP');
      // USD is stronger, so 100 USD > 100 EGP
      expect(result).toBeGreaterThan(100);
    });

    it('should convert EUR to EGP', () => {
      const result = convertCurrency(100, 'EUR', 'EGP');
      expect(result).toBeGreaterThan(100);
    });
  });

  describe('Invoice Total Conversion', () => {
    it('should convert full invoice from EGP to USD', () => {
      const egpTotal = MOCK_INVOICE.total_amount;
      const usdTotal = convertCurrency(egpTotal, 'EGP', 'USD');
      
      expect(usdTotal).toBeLessThan(egpTotal);
      expect(usdTotal).toBeGreaterThan(0);
    });

    it('should maintain item ratio after conversion', () => {
      const item1EGP = 500;
      const item2EGP = 4000;
      
      const item1USD = convertCurrency(item1EGP, 'EGP', 'USD');
      const item2USD = convertCurrency(item2EGP, 'EGP', 'USD');
      
      const originalRatio = item2EGP / item1EGP;
      const convertedRatio = item2USD / item1USD;
      
      // Ratio should be the same (within floating point precision)
      expect(Math.abs(originalRatio - convertedRatio)).toBeLessThan(0.01);
    });
  });
});

// =============================================
// INVOICE CURRENCY DROPDOWN
// =============================================

describe('Invoice Currency Dropdown', () => {
  const InvoiceCurrencySelect = ({ currencies, value, exchangeRate, onChange, onRateChange }) => (
    <div data-testid="invoice-currency-section">
      <select
        data-testid="invoice-currency-dropdown"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border border-gray-300 rounded-lg"
      >
        {currencies.map(c => (
          <option key={c.code} value={c.code}>
            {c.symbol} {c.name_en}
          </option>
        ))}
      </select>
      
      {value !== 'EGP' && (
        <div data-testid="exchange-rate-section">
          <label>Exchange Rate (1 {value} = X EGP)</label>
          <input
            type="number"
            data-testid="exchange-rate-input"
            value={exchangeRate}
            onChange={(e) => onRateChange(parseFloat(e.target.value))}
            step="0.01"
          />
        </div>
      )}
    </div>
  );

  it('should render currency dropdown', () => {
    render(
      <InvoiceCurrencySelect 
        currencies={MOCK_CURRENCIES}
        value="EGP"
        exchangeRate={1}
        onChange={() => {}}
        onRateChange={() => {}}
      />
    );
    
    expect(screen.getByTestId('invoice-currency-dropdown')).toBeInTheDocument();
  });

  it('should show all available currencies', () => {
    render(
      <InvoiceCurrencySelect 
        currencies={MOCK_CURRENCIES}
        value="EGP"
        exchangeRate={1}
        onChange={() => {}}
        onRateChange={() => {}}
      />
    );
    
    const dropdown = screen.getByTestId('invoice-currency-dropdown');
    const options = within(dropdown).getAllByRole('option');
    expect(options.length).toBe(MOCK_CURRENCIES.length);
  });

  it('should not show exchange rate input for base currency', () => {
    render(
      <InvoiceCurrencySelect 
        currencies={MOCK_CURRENCIES}
        value="EGP"
        exchangeRate={1}
        onChange={() => {}}
        onRateChange={() => {}}
      />
    );
    
    expect(screen.queryByTestId('exchange-rate-section')).not.toBeInTheDocument();
  });

  it('should show exchange rate input for non-base currency', () => {
    render(
      <InvoiceCurrencySelect 
        currencies={MOCK_CURRENCIES}
        value="USD"
        exchangeRate={31.25}
        onChange={() => {}}
        onRateChange={() => {}}
      />
    );
    
    expect(screen.getByTestId('exchange-rate-section')).toBeInTheDocument();
    expect(screen.getByTestId('exchange-rate-input')).toHaveValue(31.25);
  });

  it('should call onChange when currency is selected', () => {
    const handleChange = vi.fn();
    render(
      <InvoiceCurrencySelect 
        currencies={MOCK_CURRENCIES}
        value="EGP"
        exchangeRate={1}
        onChange={handleChange}
        onRateChange={() => {}}
      />
    );
    
    fireEvent.change(screen.getByTestId('invoice-currency-dropdown'), { 
      target: { value: 'USD' } 
    });
    
    expect(handleChange).toHaveBeenCalledWith('USD');
  });

  it('should call onRateChange when exchange rate is updated', () => {
    const handleRateChange = vi.fn();
    render(
      <InvoiceCurrencySelect 
        currencies={MOCK_CURRENCIES}
        value="USD"
        exchangeRate={31.25}
        onChange={() => {}}
        onRateChange={handleRateChange}
      />
    );
    
    fireEvent.change(screen.getByTestId('exchange-rate-input'), { 
      target: { value: '32.00' } 
    });
    
    expect(handleRateChange).toHaveBeenCalledWith(32);
  });
});

// =============================================
// INVOICE DISPLAY WITH MULTI-CURRENCY
// =============================================

describe('Invoice Display Multi-Currency', () => {
  const formatCurrency = (amount, currencyCode) => {
    const currency = MOCK_CURRENCIES.find(c => c.code === currencyCode);
    const symbol = currency?.symbol || currencyCode;
    const decimals = currency?.decimal_places || 2;
    return `${symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  };

  const InvoiceDisplay = ({ invoice, baseCurrency = 'EGP' }) => {
    const exchangeRate = invoice.exchange_rate || 1;
    const baseTotal = invoice.currency === baseCurrency 
      ? invoice.total_amount 
      : invoice.total_amount * exchangeRate;

    return (
      <div data-testid="invoice-display">
        <div data-testid="invoice-total">
          {formatCurrency(invoice.total_amount, invoice.currency)}
        </div>
        
        {invoice.currency !== baseCurrency && (
          <div data-testid="base-equivalent">
            ({formatCurrency(baseTotal, baseCurrency)} equivalent)
          </div>
        )}
        
        <div data-testid="currency-label">
          Currency: {invoice.currency}
        </div>
      </div>
    );
  };

  it('should display invoice total in invoice currency', () => {
    render(
      <InvoiceDisplay 
        invoice={MOCK_INVOICE}
      />
    );
    
    expect(screen.getByTestId('invoice-total')).toHaveTextContent('E£ 5,000.00');
  });

  it('should show base equivalent for foreign currency', () => {
    const usdInvoice = {
      ...MOCK_INVOICE,
      currency: 'USD',
      total_amount: 160,
      exchange_rate: 31.25, // 1 USD = 31.25 EGP
    };
    
    render(
      <InvoiceDisplay 
        invoice={usdInvoice}
      />
    );
    
    expect(screen.getByTestId('base-equivalent')).toBeInTheDocument();
    expect(screen.getByTestId('base-equivalent')).toHaveTextContent('E£');
  });

  it('should not show base equivalent for base currency', () => {
    render(
      <InvoiceDisplay 
        invoice={MOCK_INVOICE}
      />
    );
    
    expect(screen.queryByTestId('base-equivalent')).not.toBeInTheDocument();
  });

  it('should display correct currency label', () => {
    const usdInvoice = {
      ...MOCK_INVOICE,
      currency: 'USD',
    };
    
    render(
      <InvoiceDisplay 
        invoice={usdInvoice}
      />
    );
    
    expect(screen.getByTestId('currency-label')).toHaveTextContent('Currency: USD');
  });
});

// =============================================
// INVOICE PAYMENT CURRENCY HANDLING
// =============================================

describe('Invoice Payment Currency Handling', () => {
  const calculatePaymentInBaseCurrency = (payment, baseCurrency = 'EGP') => {
    if (payment.currency === baseCurrency) {
      return payment.amount;
    }
    return payment.amount * payment.exchange_rate;
  };

  const MOCK_PAYMENTS = [
    { id: '1', amount: 100, currency: 'USD', exchange_rate: 31.25 },
    { id: '2', amount: 1000, currency: 'EGP', exchange_rate: 1 },
    { id: '3', amount: 50, currency: 'EUR', exchange_rate: 34.00 },
  ];

  it('should calculate USD payment in EGP', () => {
    const result = calculatePaymentInBaseCurrency(MOCK_PAYMENTS[0]);
    expect(result).toBe(3125); // 100 * 31.25
  });

  it('should return same amount for EGP payment', () => {
    const result = calculatePaymentInBaseCurrency(MOCK_PAYMENTS[1]);
    expect(result).toBe(1000);
  });

  it('should calculate EUR payment in EGP', () => {
    const result = calculatePaymentInBaseCurrency(MOCK_PAYMENTS[2]);
    expect(result).toBe(1700); // 50 * 34
  });

  it('should calculate total paid in base currency', () => {
    const totalPaid = MOCK_PAYMENTS.reduce((sum, payment) => {
      return sum + calculatePaymentInBaseCurrency(payment);
    }, 0);
    
    expect(totalPaid).toBe(5825); // 3125 + 1000 + 1700
  });
});

// =============================================
// INVOICE EDGE CASES
// =============================================

describe('Invoice Currency Edge Cases', () => {
  describe('Zero Amount Handling', () => {
    it('should format zero amount correctly', () => {
      const formatCurrency = (amount, currencyCode) => {
        const currency = MOCK_CURRENCIES.find(c => c.code === currencyCode);
        return `${currency?.symbol || currencyCode} ${amount.toFixed(currency?.decimal_places || 2)}`;
      };
      
      expect(formatCurrency(0, 'EGP')).toBe('E£ 0.00');
      expect(formatCurrency(0, 'KWD')).toBe('د.ك 0.000');
    });

    it('should handle zero exchange rate gracefully', () => {
      const convert = (amount, rate) => {
        if (rate === 0) return 0;
        return amount * rate;
      };
      
      expect(convert(100, 0)).toBe(0);
    });
  });

  describe('Large Amount Handling', () => {
    it('should format large amounts with proper separators', () => {
      const formatCurrency = (amount) => {
        return `E£ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      };
      
      expect(formatCurrency(1000000)).toBe('E£ 1,000,000.00');
      expect(formatCurrency(999999999.99)).toBe('E£ 999,999,999.99');
    });
  });

  describe('Decimal Precision', () => {
    it('should maintain precision during conversion', () => {
      const amount = 0.1 + 0.2;
      const formatted = amount.toFixed(2);
      expect(formatted).toBe('0.30');
    });

    it('should round correctly for display', () => {
      const amount = 100.999;
      const formatted = amount.toFixed(2);
      expect(formatted).toBe('101.00');
    });
  });

  describe('Missing Currency Data', () => {
    it('should fallback gracefully for unknown currency', () => {
      const formatCurrency = (amount, currencyCode) => {
        const currency = MOCK_CURRENCIES.find(c => c.code === currencyCode);
        if (!currency) {
          return `${currencyCode} ${amount.toFixed(2)}`;
        }
        return `${currency.symbol} ${amount.toFixed(currency.decimal_places)}`;
      };
      
      expect(formatCurrency(100, 'XXX')).toBe('XXX 100.00');
    });
  });
});

// =============================================
// INVOICE LIST CURRENCY DISPLAY
// =============================================

describe('Invoice List Currency Display', () => {
  const MOCK_INVOICES = [
    { id: '1', invoice_number: 'INV-001', total_amount: 5000, currency: 'EGP' },
    { id: '2', invoice_number: 'INV-002', total_amount: 160, currency: 'USD' },
    { id: '3', invoice_number: 'INV-003', total_amount: 145, currency: 'EUR' },
    { id: '4', invoice_number: 'INV-004', total_amount: 600, currency: 'AED' },
  ];

  const formatCurrency = (amount, currencyCode) => {
    const currency = MOCK_CURRENCIES.find(c => c.code === currencyCode);
    return `${currency?.symbol || currencyCode} ${amount.toLocaleString()}`;
  };

  const InvoiceListItem = ({ invoice }) => (
    <tr data-testid={`invoice-row-${invoice.id}`}>
      <td data-testid="invoice-number">{invoice.invoice_number}</td>
      <td data-testid="invoice-amount">{formatCurrency(invoice.total_amount, invoice.currency)}</td>
      <td data-testid="invoice-currency">{invoice.currency}</td>
    </tr>
  );

  it('should display each invoice with correct currency symbol', () => {
    render(
      <table>
        <tbody>
          {MOCK_INVOICES.map(inv => (
            <InvoiceListItem key={inv.id} invoice={inv} />
          ))}
        </tbody>
      </table>
    );
    
    // Check EGP invoice
    const egpRow = screen.getByTestId('invoice-row-1');
    expect(within(egpRow).getByTestId('invoice-amount')).toHaveTextContent('E£');
    
    // Check USD invoice
    const usdRow = screen.getByTestId('invoice-row-2');
    expect(within(usdRow).getByTestId('invoice-amount')).toHaveTextContent('$');
    
    // Check EUR invoice
    const eurRow = screen.getByTestId('invoice-row-3');
    expect(within(eurRow).getByTestId('invoice-amount')).toHaveTextContent('€');
  });

  it('should show currency code in separate column', () => {
    render(
      <table>
        <tbody>
          <InvoiceListItem invoice={MOCK_INVOICES[0]} />
        </tbody>
      </table>
    );
    
    expect(screen.getByTestId('invoice-currency')).toHaveTextContent('EGP');
  });
});

export default {};
