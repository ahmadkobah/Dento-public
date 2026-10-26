/**
 * Form validation utilities
 * Centralized validation functions for consistent error handling across forms
 */

/**
 * Validate required fields
 * @param {object} data - Form data object
 * @param {array} requiredFields - Array of field names or { field, label } objects
 * @returns {array} - Array of error messages
 */
export const validateRequired = (data, requiredFields) => {
  const errors = [];
  
  for (const fieldConfig of requiredFields) {
    const field = typeof fieldConfig === 'string' ? fieldConfig : fieldConfig.field;
    const label = typeof fieldConfig === 'string' ? field : fieldConfig.label;
    
    const value = data[field];
    
    if (value === undefined || value === null || value === '') {
      errors.push(`${label} is required`);
    }
  }
  
  return errors;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format (basic validation)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
export const isValidPhone = (phone) => {
  if (!phone) return false;
  // Remove spaces, dashes, parentheses for validation
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Should be at least 8 digits, optionally starting with +
  return /^\+?\d{8,15}$/.test(cleaned);
};

/**
 * Validate date is not in the past
 * @param {string} dateString - Date string (YYYY-MM-DD)
 * @returns {boolean} - True if valid (today or future)
 */
export const isNotPastDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
};

/**
 * Validate time range (end time after start time)
 * @param {string} startTime - Start time (HH:mm)
 * @param {string} endTime - End time (HH:mm)
 * @returns {boolean} - True if end is after start
 */
export const isValidTimeRange = (startTime, endTime) => {
  if (!startTime || !endTime) return false;
  return endTime > startTime;
};

/**
 * Validate patient form data
 * @param {object} patient - Patient form data
 * @returns {{ isValid: boolean, errors: array }}
 */
export const validatePatient = (patient) => {
  const errors = [];
  
  // Check required fields
  if (!patient.first_name?.trim() && !patient.name?.trim()) {
    errors.push('First name is required');
  }
  
  if (!patient.phone?.trim()) {
    errors.push('Phone number is required');
  } else if (!isValidPhone(patient.phone)) {
    errors.push('Please enter a valid phone number');
  }
  
  // Email is optional but must be valid if provided
  if (patient.email && !isValidEmail(patient.email)) {
    errors.push('Please enter a valid email address');
  }
  
  // Date of birth validation if provided
  if (patient.date_of_birth) {
    const dob = new Date(patient.date_of_birth);
    const today = new Date();
    if (dob >= today) {
      errors.push('Date of birth must be in the past');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate appointment form data
 * @param {object} appointment - Appointment form data
 * @returns {{ isValid: boolean, errors: array }}
 */
export const validateAppointment = (appointment) => {
  const errors = [];
  
  // Required fields
  if (!appointment.patient_id) {
    errors.push('Please select a patient');
  }
  
  if (!appointment.doctor_id) {
    errors.push('Please select a doctor');
  }
  
  if (!appointment.appointment_date) {
    errors.push('Please select an appointment date');
  }
  
  if (!appointment.start_time) {
    errors.push('Please select a start time');
  }
  
  // Time validation
  if (appointment.start_time && appointment.end_time) {
    if (!isValidTimeRange(appointment.start_time, appointment.end_time)) {
      errors.push('End time must be after start time');
    }
  }
  
  // Date validation (can't book in the past)
  if (appointment.appointment_date && appointment.start_time) {
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
    if (appointmentDateTime < new Date()) {
      errors.push('Cannot book appointments in the past');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate invoice item
 * @param {object} item - Invoice item
 * @returns {{ isValid: boolean, errors: array }}
 */
export const validateInvoiceItem = (item) => {
  const errors = [];
  
  if (!item.description?.trim()) {
    errors.push('Description is required');
  }
  
  if (!item.quantity || item.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }
  
  if (item.unit_price === undefined || item.unit_price === null || item.unit_price <= 0) {
    errors.push('Unit price must be greater than 0');
  }
  
  if (item.discount && item.discount < 0) {
    errors.push('Discount cannot be negative');
  }
  
  // Check if discount exceeds item total
  if (item.discount && item.quantity && item.unit_price) {
    const itemTotal = item.quantity * item.unit_price;
    if (item.discount > itemTotal) {
      errors.push('Discount cannot exceed item total');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate installment plan
 * @param {object} plan - Installment plan data
 * @returns {{ isValid: boolean, errors: array }}
 */
export const validateInstallmentPlan = (plan) => {
  const errors = [];
  
  if (!plan.patient_id) {
    errors.push('Please select a patient');
  }
  
  if (!plan.invoice_id) {
    errors.push('Please select an invoice');
  }
  
  if (!plan.total_amount || plan.total_amount <= 0) {
    errors.push('Total amount must be greater than 0');
  }
  
  if (plan.down_payment < 0) {
    errors.push('Down payment cannot be negative');
  }
  
  if (plan.down_payment > plan.total_amount) {
    errors.push('Down payment cannot exceed total amount');
  }
  
  if (!plan.number_of_installments || plan.number_of_installments < 1) {
    errors.push('Number of installments must be at least 1');
  }
  
  if (!plan.start_date) {
    errors.push('Please select a start date');
  }
  
  if (plan.late_fee_percentage && plan.late_fee_percentage < 0) {
    errors.push('Late fee percentage cannot be negative');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Sanitize HTML to prevent XSS attacks
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
export const sanitizeHTML = (str) => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Escape HTML for safe display
 * Alias for sanitizeHTML
 */
export const escapeHTML = sanitizeHTML;

export default {
  validateRequired,
  isValidEmail,
  isValidPhone,
  isNotPastDate,
  isValidTimeRange,
  validatePatient,
  validateAppointment,
  validateInvoiceItem,
  validateInstallmentPlan,
  sanitizeHTML,
  escapeHTML,
};

/**
 * Escape special characters for PostgreSQL LIKE/ILIKE queries
 * Prevents SQL injection in search terms
 * @param {string} term - Search term to escape
 * @returns {string} - Escaped search term safe for LIKE/ILIKE queries
 */
export const escapeSearchTerm = (term) => {
  if (!term || typeof term !== 'string') return '';
  // Escape backslash first (as it's used to escape other characters)
  // Then escape % and _ which are LIKE wildcards
  return term
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
};

// ============================================
// Issue #25-30: Status State Machines
// ============================================

/**
 * Status transition rules for each module
 * Define valid transitions: { currentStatus: [allowedNextStatuses] }
 */
export const STATUS_TRANSITIONS = {
  // Issue #25: Treatment Plans
  treatment_plan: {
    draft: ['pending', 'cancelled'],
    pending: ['approved', 'rejected', 'cancelled'],
    approved: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: [], // Terminal state
    rejected: ['draft'], // Can revise
    cancelled: [], // Terminal state
  },
  
  // Issue #26: CBCT Orders
  cbct: {
    ordered: ['scheduled', 'cancelled'],
    scheduled: ['completed', 'cancelled'],
    completed: ['reported'],
    reported: [], // Terminal state
    cancelled: [], // Terminal state
  },
  
  // Issue #27: Lab Orders
  lab_order: {
    ordered: ['in_progress', 'cancelled', 'on_hold'],
    in_progress: ['ready', 'on_hold', 'cancelled'],
    on_hold: ['in_progress', 'cancelled'],
    ready: ['delivered'],
    delivered: ['adjustment_needed', 'completed'],
    adjustment_needed: ['in_progress'],
    completed: [], // Terminal state
    cancelled: [], // Terminal state
  },
  
  // Issue #28: Insurance Claims
  insurance_claim: {
    draft: ['submitted', 'cancelled'],
    submitted: ['pending', 'approved', 'partially_approved', 'rejected'],
    pending: ['approved', 'partially_approved', 'rejected'],
    approved: ['paid'],
    partially_approved: ['paid'],
    rejected: ['draft'], // Can revise
    paid: [], // Terminal state
    cancelled: [], // Terminal state
  },
  
  // Issue #29: Consent Forms
  consent_form: {
    draft: ['sent', 'cancelled'],
    sent: ['viewed', 'expired'],
    viewed: ['signed', 'declined', 'expired'],
    signed: ['revoked'], // Can be revoked
    declined: [], // Terminal state
    expired: ['sent'], // Can resend
    revoked: [], // Terminal state
    cancelled: [], // Terminal state
  },
  
  // Issue #30: Invoices
  invoice: {
    draft: ['sent', 'cancelled'],
    sent: ['partial', 'paid', 'overdue', 'cancelled'],
    partial: ['paid', 'overdue'],
    overdue: ['partial', 'paid', 'written_off'],
    paid: ['refunded'], // Can only be refunded
    refunded: [], // Terminal state
    written_off: [], // Terminal state
    cancelled: [], // Terminal state
  },
  
  // X-Rays
  xray: {
    ordered: ['scheduled', 'cancelled'],
    scheduled: ['completed', 'cancelled'],
    completed: ['reported'],
    reported: [], // Terminal state
    cancelled: [], // Terminal state
  },
  
  // Prescriptions
  prescription: {
    active: ['dispensed', 'expired', 'cancelled'],
    dispensed: ['completed'],
    completed: [], // Terminal state
    expired: [], // Terminal state
    cancelled: [], // Terminal state
  },
  
  // Leave Requests
  leave_request: {
    pending: ['approved', 'rejected', 'cancelled'],
    approved: ['cancelled'], // Can be cancelled by admin
    rejected: [], // Terminal state
    cancelled: [], // Terminal state
  },
};

/**
 * Validate if a status transition is allowed
 * @param {string} module - Module name (e.g., 'treatment_plan', 'invoice')
 * @param {string} currentStatus - Current status
 * @param {string} newStatus - Desired new status
 * @returns {{ valid: boolean, error: string | null }}
 */
export const validateStatusTransition = (module, currentStatus, newStatus) => {
  const transitions = STATUS_TRANSITIONS[module];
  
  if (!transitions) {
    return { valid: false, error: `Unknown module: ${module}` };
  }
  
  // Same status is always allowed (no change)
  if (currentStatus === newStatus) {
    return { valid: true, error: null };
  }
  
  const allowedTransitions = transitions[currentStatus];
  
  if (!allowedTransitions) {
    return { valid: false, error: `Unknown status: ${currentStatus}` };
  }
  
  if (allowedTransitions.length === 0) {
    return { valid: false, error: `Status '${currentStatus}' is a terminal state and cannot be changed` };
  }
  
  if (!allowedTransitions.includes(newStatus)) {
    return { 
      valid: false, 
      error: `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowedTransitions.join(', ')}` 
    };
  }
  
  return { valid: true, error: null };
};

/**
 * Get allowed next statuses for a given module and current status
 * @param {string} module - Module name
 * @param {string} currentStatus - Current status
 * @returns {string[]} - Array of allowed next statuses
 */
export const getAllowedTransitions = (module, currentStatus) => {
  const transitions = STATUS_TRANSITIONS[module];
  if (!transitions || !transitions[currentStatus]) {
    return [];
  }
  return transitions[currentStatus];
};

/**
 * Check if a status is terminal (no further transitions allowed)
 * @param {string} module - Module name
 * @param {string} status - Status to check
 * @returns {boolean}
 */
export const isTerminalStatus = (module, status) => {
  const transitions = STATUS_TRANSITIONS[module];
  if (!transitions || !transitions[status]) {
    return true;
  }
  return transitions[status].length === 0;
};
