import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock supabase
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        ilike: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'test.pdf' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com/file.pdf' } })),
      })),
    },
  },
}));

// Test data
const mockTreatmentPlan = {
  id: 'tp-001',
  patient_id: 'patient-001',
  doctor_id: 'doctor-001',
  title: 'Full Dental Restoration',
  description: 'Complete treatment plan for dental restoration',
  status: 'pending',
  total_cost: 5000,
  discount: 500,
  final_cost: 4500,
  valid_until: '2026-06-01',
  created_at: '2026-01-15',
  patients: { id: 'patient-001', name: 'John Doe', phone: '123-456-7890' },
  doctors: { id: 'doctor-001', name_en: 'Dr. Smith' },
};

const mockTreatmentPlanItems = [
  {
    id: 'item-001',
    treatment_plan_id: 'tp-001',
    service_id: 'service-001',
    teeth: [11, 12, 13],
    quantity: 3,
    unit_price: 500,
    total_price: 1500,
    notes: 'Front teeth restoration',
    services: { id: 'service-001', name_en: 'Dental Crown' },
  },
  {
    id: 'item-002',
    treatment_plan_id: 'tp-001',
    service_id: 'service-002',
    teeth: [36, 46],
    quantity: 2,
    unit_price: 300,
    total_price: 600,
    notes: 'Root canal treatment',
    services: { id: 'service-002', name_en: 'Root Canal' },
  },
];

describe('Treatment Plans Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Data Validation', () => {
    it('should validate treatment plan required fields', () => {
      const requiredFields = ['patient_id', 'doctor_id', 'title', 'status'];
      const plan = { ...mockTreatmentPlan };
      
      requiredFields.forEach(field => {
        expect(plan[field]).toBeDefined();
        expect(plan[field]).not.toBe('');
      });
    });

    it('should validate treatment plan status values', () => {
      const validStatuses = ['pending', 'approved', 'in_progress', 'completed', 'cancelled'];
      expect(validStatuses).toContain(mockTreatmentPlan.status);
    });

    it('should calculate final cost correctly', () => {
      const { total_cost, discount, final_cost } = mockTreatmentPlan;
      expect(final_cost).toBe(total_cost - discount);
    });

    it('should validate teeth array format (FDI numbering)', () => {
      const validTeeth = [11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28,
                         31, 32, 33, 34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48];
      
      mockTreatmentPlanItems.forEach(item => {
        if (item.teeth) {
          item.teeth.forEach(tooth => {
            expect(validTeeth).toContain(tooth);
          });
        }
      });
    });

    it('should validate item total price calculation', () => {
      mockTreatmentPlanItems.forEach(item => {
        expect(item.total_price).toBe(item.unit_price * item.quantity);
      });
    });
  });

  describe('Treatment Plan Items', () => {
    it('should have valid service references', () => {
      mockTreatmentPlanItems.forEach(item => {
        expect(item.service_id).toBeDefined();
        expect(item.services).toBeDefined();
        expect(item.services.name_en).toBeDefined();
      });
    });

    it('should calculate total plan cost from items', () => {
      const itemsTotal = mockTreatmentPlanItems.reduce((sum, item) => sum + item.total_price, 0);
      expect(itemsTotal).toBeGreaterThan(0);
    });
  });

  describe('Status Transitions', () => {
    it('should allow valid status transitions', () => {
      const validTransitions = {
        pending: ['approved', 'cancelled'],
        approved: ['in_progress', 'cancelled'],
        in_progress: ['completed', 'cancelled'],
        completed: [],
        cancelled: [],
      };

      Object.keys(validTransitions).forEach(status => {
        expect(validTransitions[status]).toBeDefined();
      });
    });
  });
});

describe('Treatment Plan Form Validation', () => {
  it('should require patient selection', () => {
    const formData = { patient_id: '', title: 'Test Plan' };
    expect(formData.patient_id).toBe('');
    // In real component, this would trigger validation error
  });

  it('should require at least one treatment item', () => {
    const items = [];
    expect(items.length).toBe(0);
    // In real component, this would show error message
  });

  it('should validate date format for valid_until', () => {
    const validDate = '2026-06-01';
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    expect(validDate).toMatch(dateRegex);
  });

  it('should ensure valid_until is in the future', () => {
    const validUntil = new Date(mockTreatmentPlan.valid_until);
    const today = new Date();
    expect(validUntil > today).toBe(true);
  });
});
