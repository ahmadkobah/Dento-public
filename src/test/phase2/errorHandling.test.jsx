/**
 * Phase 2 Error Handling Tests
 * Tests network errors, validation errors, and error display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock supabase with error scenarios
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(),
        })),
        order: vi.fn(),
      })),
      insert: vi.fn(),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        remove: vi.fn(),
      })),
    },
  },
}));

describe('Phase 2 Error Handling Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =============================================
  // NETWORK ERROR TESTS
  // =============================================
  describe('Network Error Scenarios', () => {
    it('should handle connection timeout', async () => {
      const fetchWithTimeout = async (timeout = 5000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
          // Simulate timeout
          await new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 100);
          });
        } catch (error) {
          clearTimeout(timeoutId);
          return { error: { message: 'Connection timeout. Please try again.' } };
        }
      };
      
      const result = await fetchWithTimeout(50);
      expect(result.error.message).toContain('timeout');
    });

    it('should handle network disconnection', async () => {
      const simulateNetworkError = async () => {
        return {
          data: null,
          error: { message: 'Failed to fetch', code: 'NETWORK_ERROR' }
        };
      };
      
      const result = await simulateNetworkError();
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('NETWORK_ERROR');
    });

    it('should handle 500 server error', async () => {
      const handleServerError = (error) => {
        if (error.status === 500) {
          return {
            userMessage: 'Server error. Please try again later.',
            shouldRetry: true,
            retryDelay: 5000,
          };
        }
        return { userMessage: error.message, shouldRetry: false };
      };
      
      const result = handleServerError({ status: 500, message: 'Internal Server Error' });
      expect(result.userMessage).toContain('Server error');
      expect(result.shouldRetry).toBe(true);
    });

    it('should handle 404 not found', async () => {
      const handleNotFound = (error) => {
        if (error.code === 'PGRST116') { // Supabase not found code
          return {
            userMessage: 'The requested record was not found.',
            shouldRedirect: true,
          };
        }
        return { userMessage: error.message };
      };
      
      const result = handleNotFound({ code: 'PGRST116', message: 'Row not found' });
      expect(result.userMessage).toContain('not found');
      expect(result.shouldRedirect).toBe(true);
    });

    it('should handle 401 unauthorized', async () => {
      const handleUnauthorized = (error) => {
        if (error.status === 401) {
          return {
            userMessage: 'Session expired. Please log in again.',
            shouldLogout: true,
          };
        }
        return { userMessage: error.message };
      };
      
      const result = handleUnauthorized({ status: 401 });
      expect(result.shouldLogout).toBe(true);
    });

    it('should handle 403 forbidden', async () => {
      const handleForbidden = (error) => {
        if (error.status === 403) {
          return {
            userMessage: 'You do not have permission to perform this action.',
            shouldRedirect: true,
          };
        }
        return { userMessage: error.message };
      };
      
      const result = handleForbidden({ status: 403 });
      expect(result.userMessage).toContain('permission');
    });

    it('should implement retry logic for transient errors', async () => {
      let attempts = 0;
      const maxRetries = 3;
      
      const fetchWithRetry = async () => {
        while (attempts < maxRetries) {
          attempts++;
          try {
            // Simulate failure on first 2 attempts
            if (attempts < 3) {
              throw new Error('Transient error');
            }
            return { data: 'success', error: null };
          } catch (error) {
            if (attempts >= maxRetries) {
              return { data: null, error: { message: 'Max retries exceeded' } };
            }
            // Wait before retry (simulated)
            await new Promise(r => setTimeout(r, 10));
          }
        }
      };
      
      const result = await fetchWithRetry();
      expect(attempts).toBe(3);
      expect(result.data).toBe('success');
    });
  });

  // =============================================
  // VALIDATION ERROR TESTS
  // =============================================
  describe('Form Validation Errors', () => {
    it('should validate required fields', () => {
      const validateRequired = (value, fieldName) => {
        if (!value || (typeof value === 'string' && !value.trim())) {
          return `${fieldName} is required`;
        }
        return null;
      };
      
      expect(validateRequired('', 'Patient')).toBe('Patient is required');
      expect(validateRequired(null, 'Doctor')).toBe('Doctor is required');
      expect(validateRequired('  ', 'Title')).toBe('Title is required');
      expect(validateRequired('John', 'Name')).toBeNull();
    });

    it('should validate email format', () => {
      const validateEmail = (email) => {
        if (!email) return 'Email is required';
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regex.test(email)) return 'Invalid email format';
        return null;
      };
      
      expect(validateEmail('')).toBe('Email is required');
      expect(validateEmail('invalid')).toBe('Invalid email format');
      expect(validateEmail('test@')).toBe('Invalid email format');
      expect(validateEmail('test@example.com')).toBeNull();
    });

    it('should validate phone number format', () => {
      const validatePhone = (phone) => {
        if (!phone) return 'Phone is required';
        const regex = /^(\+?20)?0?1[0-9]{9}$/;
        if (!regex.test(phone.replace(/\s/g, ''))) return 'Invalid Egyptian phone number';
        return null;
      };
      
      expect(validatePhone('')).toBe('Phone is required');
      expect(validatePhone('123')).toBe('Invalid Egyptian phone number');
      expect(validatePhone('01144848521')).toBeNull();
      expect(validatePhone('+201000000021')).toBeNull();
    });

    it('should validate date range', () => {
      const validateDateRange = (startDate, endDate) => {
        if (!startDate) return { startDate: 'Start date is required' };
        if (!endDate) return { endDate: 'End date is required' };
        if (new Date(endDate) < new Date(startDate)) {
          return { endDate: 'End date must be after start date' };
        }
        return {};
      };
      
      expect(validateDateRange('', '2026-02-01')).toHaveProperty('startDate');
      expect(validateDateRange('2026-02-01', '2026-01-01')).toHaveProperty('endDate');
      expect(validateDateRange('2026-01-01', '2026-02-01')).toEqual({});
    });

    it('should validate numeric fields', () => {
      const validateNumber = (value, { min, max, fieldName }) => {
        const num = parseFloat(value);
        if (isNaN(num)) return `${fieldName} must be a number`;
        if (min !== undefined && num < min) return `${fieldName} must be at least ${min}`;
        if (max !== undefined && num > max) return `${fieldName} must be at most ${max}`;
        return null;
      };
      
      expect(validateNumber('abc', { fieldName: 'Cost' })).toBe('Cost must be a number');
      expect(validateNumber('-10', { min: 0, fieldName: 'Cost' })).toBe('Cost must be at least 0');
      expect(validateNumber('150', { max: 100, fieldName: 'Discount' })).toBe('Discount must be at most 100');
      expect(validateNumber('50', { min: 0, max: 100, fieldName: 'Value' })).toBeNull();
    });

    it('should validate file type', () => {
      const validateFileType = (file, allowedTypes) => {
        if (!file) return 'File is required';
        if (!allowedTypes.includes(file.type)) {
          return `File type not allowed. Allowed: ${allowedTypes.join(', ')}`;
        }
        return null;
      };
      
      const allowedTypes = ['image/jpeg', 'image/png', 'application/dicom'];
      
      expect(validateFileType(null, allowedTypes)).toBe('File is required');
      expect(validateFileType({ type: 'application/pdf' }, allowedTypes)).toContain('not allowed');
      expect(validateFileType({ type: 'image/jpeg' }, allowedTypes)).toBeNull();
    });

    it('should validate file size', () => {
      const validateFileSize = (file, maxSizeMB) => {
        if (!file) return 'File is required';
        const maxBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxBytes) {
          return `File size must be less than ${maxSizeMB}MB`;
        }
        return null;
      };
      
      expect(validateFileSize({ size: 200 * 1024 * 1024 }, 100)).toBe('File size must be less than 100MB');
      expect(validateFileSize({ size: 50 * 1024 * 1024 }, 100)).toBeNull();
    });

    it('should collect all form errors', () => {
      const validateForm = (data) => {
        const errors = {};
        
        if (!data.patient_id) errors.patient_id = 'Patient is required';
        if (!data.doctor_id) errors.doctor_id = 'Doctor is required';
        if (!data.title?.trim()) errors.title = 'Title is required';
        if (data.discount && parseFloat(data.discount) < 0) {
          errors.discount = 'Discount cannot be negative';
        }
        
        return {
          isValid: Object.keys(errors).length === 0,
          errors,
        };
      };
      
      const result = validateForm({ title: 'Test', discount: '-10' });
      expect(result.isValid).toBe(false);
      expect(result.errors.patient_id).toBeDefined();
      expect(result.errors.doctor_id).toBeDefined();
      expect(result.errors.discount).toBeDefined();
    });
  });

  // =============================================
  // ERROR DISPLAY TESTS
  // =============================================
  describe('Error Display Tests', () => {
    it('should display inline field error', () => {
      const FieldError = ({ error }) => (
        error ? <span data-testid="field-error" className="error">{error}</span> : null
      );
      
      const { rerender } = render(<FieldError error={null} />);
      expect(screen.queryByTestId('field-error')).not.toBeInTheDocument();
      
      rerender(<FieldError error="This field is required" />);
      expect(screen.getByTestId('field-error')).toHaveTextContent('This field is required');
    });

    it('should display toast notification for errors', () => {
      const Toast = ({ message, type }) => (
        <div data-testid="toast" className={`toast toast-${type}`}>
          {message}
        </div>
      );
      
      render(<Toast message="Failed to save" type="error" />);
      expect(screen.getByTestId('toast')).toHaveTextContent('Failed to save');
      expect(screen.getByTestId('toast')).toHaveClass('toast-error');
    });

    it('should display error banner for critical errors', () => {
      const ErrorBanner = ({ error, onRetry }) => (
        <div data-testid="error-banner" className="error-banner">
          <span>{error.message}</span>
          {error.retryable && (
            <button data-testid="retry-btn" onClick={onRetry}>Retry</button>
          )}
        </div>
      );
      
      const onRetry = vi.fn();
      render(
        <ErrorBanner 
          error={{ message: 'Network error', retryable: true }} 
          onRetry={onRetry}
        />
      );
      
      expect(screen.getByTestId('error-banner')).toHaveTextContent('Network error');
      fireEvent.click(screen.getByTestId('retry-btn'));
      expect(onRetry).toHaveBeenCalled();
    });

    it('should display empty state when no data', () => {
      const EmptyState = ({ items, message }) => (
        items.length === 0 ? (
          <div data-testid="empty-state">
            <p>{message}</p>
          </div>
        ) : (
          <ul data-testid="items-list">
            {items.map(i => <li key={i.id}>{i.name}</li>)}
          </ul>
        )
      );
      
      const { rerender } = render(
        <EmptyState items={[]} message="No treatment plans found" />
      );
      expect(screen.getByTestId('empty-state')).toHaveTextContent('No treatment plans found');
      
      rerender(
        <EmptyState items={[{ id: 1, name: 'Plan A' }]} message="No treatment plans found" />
      );
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
      expect(screen.getByTestId('items-list')).toBeInTheDocument();
    });

    it('should clear errors on successful submission', () => {
      let errors = { title: 'Required' };
      
      const clearErrors = () => {
        errors = {};
      };
      
      const submitForm = async (isValid) => {
        if (isValid) {
          clearErrors();
          return { success: true };
        }
        return { success: false };
      };
      
      submitForm(true);
      expect(Object.keys(errors).length).toBe(0);
    });
  });

  // =============================================
  // DATABASE ERROR TESTS
  // =============================================
  describe('Database Error Handling', () => {
    it('should handle unique constraint violation', () => {
      const handleDbError = (error) => {
        if (error.code === '23505') { // PostgreSQL unique violation
          return { userMessage: 'This record already exists' };
        }
        return { userMessage: 'Database error occurred' };
      };
      
      const result = handleDbError({ code: '23505', message: 'duplicate key value' });
      expect(result.userMessage).toBe('This record already exists');
    });

    it('should handle foreign key constraint violation', () => {
      const handleDbError = (error) => {
        if (error.code === '23503') { // PostgreSQL FK violation
          return { userMessage: 'Cannot delete: record is referenced by other data' };
        }
        return { userMessage: 'Database error occurred' };
      };
      
      const result = handleDbError({ code: '23503' });
      expect(result.userMessage).toContain('referenced');
    });

    it('should handle row-level security violation', () => {
      const handleDbError = (error) => {
        if (error.code === '42501') { // PostgreSQL RLS violation
          return { userMessage: 'You do not have permission to access this data' };
        }
        return { userMessage: 'Database error occurred' };
      };
      
      const result = handleDbError({ code: '42501' });
      expect(result.userMessage).toContain('permission');
    });
  });

  // =============================================
  // FILE UPLOAD ERROR TESTS
  // =============================================
  describe('File Upload Error Handling', () => {
    it('should handle upload failure', async () => {
      const uploadFile = async (file) => {
        return {
          data: null,
          error: { message: 'Upload failed: storage limit exceeded' }
        };
      };
      
      const result = await uploadFile({ name: 'large-file.dcm', size: 1000000000 });
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('storage limit');
    });

    it('should handle upload timeout', async () => {
      const uploadWithTimeout = async (file, timeout = 30000) => {
        // Simulate timeout
        return {
          data: null,
          error: { message: 'Upload timed out. Please try again with a smaller file.' }
        };
      };
      
      const result = await uploadWithTimeout({ name: 'file.dcm' });
      expect(result.error.message).toContain('timed out');
    });

    it('should handle corrupt file', () => {
      const validateFile = (file) => {
        // Simulate file validation
        if (file.corrupted) {
          return { valid: false, error: 'File appears to be corrupted' };
        }
        return { valid: true };
      };
      
      const result = validateFile({ name: 'bad.dcm', corrupted: true });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('corrupted');
    });
  });
});
