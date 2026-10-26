// Currency conversion utility with caching
// Fetches live exchange rates from exchangerate-api.com (free, no key needed)
// Caches rates for 1 hour to avoid excessive API calls

const CACHE_KEY = 'dento_exchange_rates';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in ms
const BASE_CURRENCY = 'USD';
const API_URL = `https://api.exchangerate-api.com/v4/latest/${BASE_CURRENCY}`;

// Fallback rates (updated 2026-02-14) — used if API is unreachable
const FALLBACK_RATES = {
  USD: 1,
  EGP: 46.85,
  EUR: 0.843,
  GBP: 0.733,
  SAR: 3.75,
  AED: 3.67,
  TRY: 43.72,
  KWD: 0.307,
};

// Currency display configuration
export const CURRENCY_CONFIG = {
  USD: { symbol: '$', name: 'US Dollar', decimals: 2 },
  EGP: { symbol: 'E£', name: 'Egyptian Pound', decimals: 2 },
  EUR: { symbol: '€', name: 'Euro', decimals: 2 },
  GBP: { symbol: '£', name: 'British Pound', decimals: 2 },
  SAR: { symbol: 'SAR ', name: 'Saudi Riyal', decimals: 2 },
  AED: { symbol: 'AED ', name: 'UAE Dirham', decimals: 2 },
  TRY: { symbol: '₺', name: 'Turkish Lira', decimals: 2 },
  KWD: { symbol: 'KD ', name: 'Kuwaiti Dinar', decimals: 3 },
};

let cachedRates = null;
let cacheTimestamp = 0;

/**
 * Fetch live exchange rates with caching
 * @returns {Promise<Record<string, number>>} rates object (base: USD)
 */
export async function getExchangeRates() {
  const now = Date.now();

  // Check in-memory cache first
  if (cachedRates && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedRates;
  }

  // Check localStorage cache (survives page reload)
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      const { rates, timestamp } = JSON.parse(stored);
      if ((now - timestamp) < CACHE_DURATION) {
        cachedRates = rates;
        cacheTimestamp = timestamp;
        return rates;
      }
    }
  } catch (_e) {
    // localStorage not available or corrupted — continue
  }

  // Fetch fresh rates
  try {
    const response = await fetch(API_URL, { 
      signal: AbortSignal.timeout(5000) // 5s timeout
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    const rates = data.rates;

    // Cache in memory
    cachedRates = rates;
    cacheTimestamp = now;

    // Cache in localStorage
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, timestamp: now }));
    } catch (_e) {
      // Storage full — ignore
    }

    return rates;
  } catch (error) {
    console.warn('[CurrencyConverter] API unavailable, using fallback rates:', error.message);
    cachedRates = FALLBACK_RATES;
    cacheTimestamp = now;
    return FALLBACK_RATES;
  }
}

/**
 * Convert amount from USD to target currency
 * @param {number} amountUSD - Amount in USD
 * @param {string} targetCurrency - Target currency code (e.g., 'EGP')
 * @param {Record<string, number>} [rates] - Pre-fetched rates (optional)
 * @returns {number} Converted amount, rounded to 2 decimals
 */
export function convertFromUSD(amountUSD, targetCurrency, rates) {
  if (!amountUSD || targetCurrency === 'USD') return amountUSD || 0;
  
  const ratesObj = rates || cachedRates || FALLBACK_RATES;
  const rate = ratesObj[targetCurrency];
  
  if (!rate) {
    console.warn(`[CurrencyConverter] Unknown currency: ${targetCurrency}, returning USD amount`);
    return amountUSD;
  }

  const decimals = CURRENCY_CONFIG[targetCurrency]?.decimals || 2;
  const factor = Math.pow(10, decimals);
  return Math.round(amountUSD * rate * factor) / factor;
}

/**
 * Convert amount from any currency back to USD
 * @param {number} amount - Amount in source currency
 * @param {string} sourceCurrency - Source currency code
 * @param {Record<string, number>} [rates] - Pre-fetched rates (optional)
 * @returns {number} Amount in USD
 */
export function convertToUSD(amount, sourceCurrency, rates) {
  if (!amount || sourceCurrency === 'USD') return amount || 0;
  
  const ratesObj = rates || cachedRates || FALLBACK_RATES;
  const rate = ratesObj[sourceCurrency];
  
  if (!rate) return amount;
  return Math.round((amount / rate) * 100) / 100;
}

/**
 * Format amount with currency symbol
 * @param {number} amount 
 * @param {string} currencyCode 
 * @returns {string} Formatted string like "E£1,470.00"
 */
export function formatCurrencyAmount(amount, currencyCode = 'USD') {
  const config = CURRENCY_CONFIG[currencyCode] || { symbol: `${currencyCode} `, decimals: 2 };
  const formatted = (amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });
  return `${config.symbol}${formatted}`;
}

/**
 * Get the current cached exchange rate for a currency
 * @param {string} currencyCode 
 * @returns {number|null}
 */
export function getCachedRate(currencyCode) {
  const rates = cachedRates || FALLBACK_RATES;
  return rates[currencyCode] || null;
}

export default {
  getExchangeRates,
  convertFromUSD,
  convertToUSD,
  formatCurrencyAmount,
  getCachedRate,
  CURRENCY_CONFIG,
  FALLBACK_RATES,
};
