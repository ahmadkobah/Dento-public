/**
 * Currency utility functions to handle floating-point precision issues
 * 
 * JavaScript floating-point math can cause issues like:
 * 0.1 + 0.2 = 0.30000000000000004
 * 100.00 * 1.05 = 105.00000000000001
 * 
 * These utilities ensure proper rounding for financial calculations.
 */

/**
 * Round a number to 2 decimal places for currency
 * Uses Math.round to avoid floating-point precision issues
 * @param {number} value - The value to round
 * @returns {number} - Rounded value
 */
export const roundCurrency = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  return Math.round(value * 100) / 100;
};

/**
 * Safely multiply two numbers and round to currency precision
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} - Rounded result
 */
export const multiplyCurrency = (a, b) => {
  return roundCurrency(a * b);
};

/**
 * Safely add currency values
 * @param  {...number} values - Values to add
 * @returns {number} - Rounded sum
 */
export const addCurrency = (...values) => {
  const sum = values.reduce((acc, val) => acc + (val || 0), 0);
  return roundCurrency(sum);
};

/**
 * Safely subtract currency values
 * @param {number} from - Starting value
 * @param  {...number} values - Values to subtract
 * @returns {number} - Rounded result
 */
export const subtractCurrency = (from, ...values) => {
  const result = values.reduce((acc, val) => acc - (val || 0), from || 0);
  return roundCurrency(result);
};

/**
 * Calculate percentage of a value
 * @param {number} value - Base value
 * @param {number} percentage - Percentage (e.g., 5 for 5%)
 * @returns {number} - Rounded percentage value
 */
export const calculatePercentage = (value, percentage) => {
  return roundCurrency((value || 0) * (percentage || 0) / 100);
};

/**
 * Calculate item total (quantity * price - discount)
 * @param {object} item - Item with quantity, unit_price, discount
 * @returns {number} - Rounded item total
 */
export const calculateItemTotal = (item) => {
  const quantity = item.quantity || 0;
  const unitPrice = item.unit_price || 0;
  const discount = item.discount || 0;
  return roundCurrency(multiplyCurrency(quantity, unitPrice) - discount);
};

/**
 * Calculate invoice totals with proper rounding
 * @param {array} items - Array of invoice items
 * @param {number} discountPercentage - Overall discount percentage
 * @param {number} taxPercentage - Tax percentage
 * @returns {object} - { subtotal, discount, tax, total }
 */
export const calculateInvoiceTotals = (items, discountPercentage = 0, taxPercentage = 0) => {
  const subtotal = items.reduce((sum, item) => addCurrency(sum, calculateItemTotal(item)), 0);
  const discount = calculatePercentage(subtotal, discountPercentage);
  const taxableAmount = subtractCurrency(subtotal, discount);
  const tax = calculatePercentage(taxableAmount, taxPercentage);
  const total = addCurrency(taxableAmount, tax);
  
  return {
    subtotal,
    discount,
    tax,
    total,
  };
};

/**
 * Validate that a price value is valid (positive number)
 * @param {number} value - Price value to validate
 * @returns {boolean} - True if valid
 */
export const isValidPrice = (value) => {
  return typeof value === 'number' && !isNaN(value) && value > 0;
};

/**
 * Validate that a quantity is valid (positive integer or decimal)
 * @param {number} value - Quantity value to validate
 * @returns {boolean} - True if valid
 */
export const isValidQuantity = (value) => {
  return typeof value === 'number' && !isNaN(value) && value > 0;
};

export default {
  roundCurrency,
  multiplyCurrency,
  addCurrency,
  subtractCurrency,
  calculatePercentage,
  calculateItemTotal,
  calculateInvoiceTotals,
  isValidPrice,
  isValidQuantity,
};
