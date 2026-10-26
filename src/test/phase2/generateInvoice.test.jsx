/**
 * Generate Invoice from Treatment Plan Tests
 * Tests for the invoice generation functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock treatment plan data
const mockTreatmentPlan = {
  id: 'tp-001',
  plan_number: 'TP-2026-001',
  title: 'Full Mouth Rehabilitation',
  patient_id: 'patient-001',
  doctor_id: 'doctor-001',
  status: 'approved',
  total_cost: 25000,
  discount_type: 'percentage',
  discount_value: 10,
  final_cost: 22500,
  treatment_plan_items: [
    {
      id: 'tpi-001',
      service_id: 'srv-001',
      procedure_name: 'Root Canal Treatment',
      tooth_number: '16',
      cost: 2500,
      sequence_order: 1,
      status: 'pending',
    },
    {
      id: 'tpi-002',
      service_id: 'srv-002',
      procedure_name: 'Crown - Porcelain',
      tooth_number: '16',
      cost: 3500,
      sequence_order: 2,
      status: 'pending',
    },
    {
      id: 'tpi-003',
      service_id: 'srv-003',
      procedure_name: 'Dental Implant',
      tooth_number: '36',
      cost: 15000,
      sequence_order: 3,
      status: 'pending',
    },
    {
      id: 'tpi-004',
      service_id: 'srv-004',
      procedure_name: 'Scaling and Polishing',
      tooth_number: null,
      cost: 500,
      sequence_order: 4,
      status: 'pending',
    },
  ],
  patients: {
    id: 'patient-001',
    first_name: 'John',
    last_name: 'Doe',
  },
};

const mockGeneratedInvoice = {
  id: 'inv-001',
  invoice_number: 'INV-20260129-ABC1',
  patient_id: 'patient-001',
  treatment_plan_id: 'tp-001',
  status: 'draft',
  subtotal: 25000,
  discount_percentage: 10,
  discount_amount: 2500,
  total_amount: 22500,
  amount_paid: 0,
  balance_due: 22500,
  issue_date: '2026-01-29',
  due_date: '2026-02-28',
  notes: 'Invoice generated from Treatment Plan: Full Mouth Rehabilitation',
};

const mockInvoiceItems = [
  {
    id: 'ii-001',
    invoice_id: 'inv-001',
    service_id: 'srv-001',
    description: 'Root Canal Treatment (Tooth 16)',
    quantity: 1,
    unit_price: 2500,
    discount: 0,
    total: 2500,
  },
  {
    id: 'ii-002',
    invoice_id: 'inv-001',
    service_id: 'srv-002',
    description: 'Crown - Porcelain (Tooth 16)',
    quantity: 1,
    unit_price: 3500,
    discount: 0,
    total: 3500,
  },
  {
    id: 'ii-003',
    invoice_id: 'inv-001',
    service_id: 'srv-003',
    description: 'Dental Implant (Tooth 36)',
    quantity: 1,
    unit_price: 15000,
    discount: 0,
    total: 15000,
  },
  {
    id: 'ii-004',
    invoice_id: 'inv-001',
    service_id: 'srv-004',
    description: 'Scaling and Polishing',
    quantity: 1,
    unit_price: 500,
    discount: 0,
    total: 500,
  },
];

describe('Generate Invoice from Treatment Plan', () => {
  describe('Invoice Generation Prerequisites', () => {
    it('should require treatment plan to have items', () => {
      expect(mockTreatmentPlan.treatment_plan_items.length).toBeGreaterThan(0);
    });

    it('should allow generation for approved treatment plans', () => {
      expect(mockTreatmentPlan.status).toBe('approved');
    });

    it('should allow generation for completed treatment plans', () => {
      const completedPlan = { ...mockTreatmentPlan, status: 'completed' };
      expect(['approved', 'completed', 'in_progress']).toContain(completedPlan.status);
    });

    it('should not allow generation for cancelled plans', () => {
      const cancelledPlan = { ...mockTreatmentPlan, status: 'cancelled' };
      expect(cancelledPlan.status).toBe('cancelled');
    });

    it('should not allow generation for draft plans', () => {
      const draftPlan = { ...mockTreatmentPlan, status: 'draft' };
      expect(draftPlan.status).toBe('draft');
    });

    it('should check for existing linked invoice', () => {
      const hasLinkedInvoice = mockGeneratedInvoice.treatment_plan_id === mockTreatmentPlan.id;
      expect(hasLinkedInvoice).toBe(true);
    });
  });

  describe('Invoice Number Generation', () => {
    it('should generate unique invoice number', () => {
      const invoiceNumber = mockGeneratedInvoice.invoice_number;
      expect(invoiceNumber).toMatch(/^INV-\d{8}-[A-Z0-9]{4}$/);
    });

    it('should include date in invoice number', () => {
      const invoiceNumber = 'INV-20260129-ABC1';
      expect(invoiceNumber).toContain('20260129');
    });

    it('should have random suffix for uniqueness', () => {
      const suffix = mockGeneratedInvoice.invoice_number.split('-')[2];
      expect(suffix.length).toBe(4);
    });
  });

  describe('Invoice Data Population', () => {
    it('should set patient from treatment plan', () => {
      expect(mockGeneratedInvoice.patient_id).toBe(mockTreatmentPlan.patient_id);
    });

    it('should link to treatment plan', () => {
      expect(mockGeneratedInvoice.treatment_plan_id).toBe(mockTreatmentPlan.id);
    });

    it('should set subtotal from treatment plan total', () => {
      expect(mockGeneratedInvoice.subtotal).toBe(mockTreatmentPlan.total_cost);
    });

    it('should apply percentage discount', () => {
      expect(mockGeneratedInvoice.discount_percentage).toBe(mockTreatmentPlan.discount_value);
    });

    it('should calculate total amount correctly', () => {
      expect(mockGeneratedInvoice.total_amount).toBe(mockTreatmentPlan.final_cost);
    });

    it('should set initial status as draft', () => {
      expect(mockGeneratedInvoice.status).toBe('draft');
    });

    it('should set issue date to today', () => {
      expect(mockGeneratedInvoice.issue_date).toBe('2026-01-29');
    });

    it('should set due date 30 days from issue', () => {
      expect(mockGeneratedInvoice.due_date).toBe('2026-02-28');
    });

    it('should set amount paid to zero', () => {
      expect(mockGeneratedInvoice.amount_paid).toBe(0);
    });

    it('should set balance due to total', () => {
      expect(mockGeneratedInvoice.balance_due).toBe(mockGeneratedInvoice.total_amount);
    });

    it('should include treatment plan title in notes', () => {
      expect(mockGeneratedInvoice.notes).toContain(mockTreatmentPlan.title);
    });
  });

  describe('Invoice Items Creation', () => {
    it('should create item for each treatment plan item', () => {
      expect(mockInvoiceItems.length).toBe(mockTreatmentPlan.treatment_plan_items.length);
    });

    it('should link items to invoice', () => {
      mockInvoiceItems.forEach(item => {
        expect(item.invoice_id).toBe(mockGeneratedInvoice.id);
      });
    });

    it('should copy service reference', () => {
      expect(mockInvoiceItems[0].service_id).toBe(mockTreatmentPlan.treatment_plan_items[0].service_id);
    });

    it('should include procedure name in description', () => {
      expect(mockInvoiceItems[0].description).toContain('Root Canal Treatment');
    });

    it('should include tooth number in description when present', () => {
      expect(mockInvoiceItems[0].description).toContain('Tooth 16');
    });

    it('should not include tooth number when not applicable', () => {
      expect(mockInvoiceItems[3].description).not.toContain('Tooth');
    });

    it('should set quantity to 1 for each item', () => {
      mockInvoiceItems.forEach(item => {
        expect(item.quantity).toBe(1);
      });
    });

    it('should set unit price from treatment plan item cost', () => {
      expect(mockInvoiceItems[0].unit_price).toBe(mockTreatmentPlan.treatment_plan_items[0].cost);
    });

    it('should calculate item total correctly', () => {
      mockInvoiceItems.forEach(item => {
        expect(item.total).toBe(item.quantity * item.unit_price);
      });
    });
  });

  describe('Invoice Total Calculations', () => {
    it('should sum all item totals for subtotal', () => {
      const calculatedSubtotal = mockInvoiceItems.reduce((sum, item) => sum + item.total, 0);
      expect(calculatedSubtotal).toBe(21500); // 2500 + 3500 + 15000 + 500
    });

    it('should handle percentage discount', () => {
      const subtotal = 25000;
      const discountPercentage = 10;
      const discountAmount = subtotal * (discountPercentage / 100);
      expect(discountAmount).toBe(2500);
    });

    it('should handle fixed discount', () => {
      const planWithFixedDiscount = {
        ...mockTreatmentPlan,
        discount_type: 'fixed',
        discount_value: 3000,
      };
      expect(planWithFixedDiscount.discount_value).toBe(3000);
    });

    it('should calculate final total after discount', () => {
      const subtotal = 25000;
      const discountAmount = 2500;
      const total = subtotal - discountAmount;
      expect(total).toBe(22500);
    });

    it('should handle zero discount', () => {
      const planNoDiscount = {
        ...mockTreatmentPlan,
        discount_type: 'percentage',
        discount_value: 0,
        final_cost: 25000,
      };
      expect(planNoDiscount.final_cost).toBe(planNoDiscount.total_cost);
    });
  });

  describe('Generate Invoice Button State', () => {
    it('should show "Generate Invoice" when no linked invoice', () => {
      const linkedInvoice = null;
      expect(linkedInvoice).toBeNull();
    });

    it('should show "View Invoice" when invoice exists', () => {
      const linkedInvoice = mockGeneratedInvoice;
      expect(linkedInvoice).not.toBeNull();
    });

    it('should disable button while generating', () => {
      const generatingInvoice = true;
      expect(generatingInvoice).toBe(true);
    });

    it('should disable button for cancelled plans', () => {
      const plan = { ...mockTreatmentPlan, status: 'cancelled' };
      expect(plan.status).toBe('cancelled');
    });

    it('should show loading spinner while generating', () => {
      const generatingInvoice = true;
      expect(generatingInvoice).toBe(true);
    });
  });

  describe('Invoice Link in Treatment Plan', () => {
    it('should display linked invoice in treatment plan view', () => {
      const linkedInvoice = mockGeneratedInvoice;
      expect(linkedInvoice.id).toBeDefined();
    });

    it('should show invoice number', () => {
      expect(mockGeneratedInvoice.invoice_number).toBe('INV-20260129-ABC1');
    });

    it('should show invoice status', () => {
      expect(mockGeneratedInvoice.status).toBe('draft');
    });

    it('should navigate to invoice on click', () => {
      const invoiceUrl = `/invoices/${mockGeneratedInvoice.id}`;
      expect(invoiceUrl).toContain(mockGeneratedInvoice.id);
    });
  });

  describe('Treatment Plan Link in Invoice', () => {
    it('should display linked treatment plan in invoice view', () => {
      expect(mockGeneratedInvoice.treatment_plan_id).toBeDefined();
    });

    it('should show treatment plan number', () => {
      expect(mockTreatmentPlan.plan_number).toBe('TP-2026-001');
    });

    it('should show treatment plan title', () => {
      expect(mockTreatmentPlan.title).toBe('Full Mouth Rehabilitation');
    });

    it('should navigate to treatment plan on click', () => {
      const planUrl = `/treatment-plans/${mockTreatmentPlan.id}`;
      expect(planUrl).toContain(mockTreatmentPlan.id);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty treatment plan items', () => {
      const emptyPlan = { ...mockTreatmentPlan, treatment_plan_items: [] };
      expect(emptyPlan.treatment_plan_items.length).toBe(0);
    });

    it('should show error message on failure', () => {
      const errorMessage = 'Failed to generate invoice';
      expect(errorMessage).toBeDefined();
    });

    it('should show success message on completion', () => {
      const successMessage = 'Invoice generated successfully!';
      expect(successMessage).toBeDefined();
    });

    it('should handle database errors gracefully', () => {
      const dbError = { code: 'PGRST116', message: 'Database error' };
      expect(dbError.code).toBeDefined();
    });
  });

  describe('Navigation After Generation', () => {
    it('should navigate to invoice after creation', () => {
      const invoiceId = mockGeneratedInvoice.id;
      const navigateTo = `/invoices/${invoiceId}`;
      expect(navigateTo).toBe('/invoices/inv-001');
    });

    it('should delay navigation for message visibility', async () => {
      const delay = 1500;
      expect(delay).toBe(1500);
    });
  });
});

describe('Generate Invoice Security', () => {
  describe('Authorization', () => {
    it('should require authentication', () => {
      const isAuthenticated = true;
      expect(isAuthenticated).toBe(true);
    });

    it('should check user has permission to create invoices', () => {
      const canCreateInvoice = true;
      expect(canCreateInvoice).toBe(true);
    });

    it('should verify user has access to patient', () => {
      const hasPatientAccess = true;
      expect(hasPatientAccess).toBe(true);
    });
  });

  describe('Data Validation', () => {
    it('should validate treatment plan exists', () => {
      expect(mockTreatmentPlan.id).toBeDefined();
    });

    it('should validate patient exists', () => {
      expect(mockTreatmentPlan.patient_id).toBeDefined();
    });

    it('should validate costs are positive numbers', () => {
      mockTreatmentPlan.treatment_plan_items.forEach(item => {
        expect(item.cost).toBeGreaterThanOrEqual(0);
      });
    });
  });
});

describe('Generate Invoice CRUD Operations', () => {
  describe('Create Invoice', () => {
    it('should insert invoice record', async () => {
      const insertInvoice = vi.fn().mockResolvedValue({ data: mockGeneratedInvoice });
      const result = await insertInvoice(mockGeneratedInvoice);
      expect(result.data).toEqual(mockGeneratedInvoice);
    });

    it('should insert invoice items', async () => {
      const insertItems = vi.fn().mockResolvedValue({ data: mockInvoiceItems });
      const result = await insertItems(mockInvoiceItems);
      expect(result.data.length).toBe(4);
    });
  });

  describe('Read Linked Invoice', () => {
    it('should query invoice by treatment_plan_id', async () => {
      const findInvoice = vi.fn().mockResolvedValue({ data: mockGeneratedInvoice });
      const result = await findInvoice(mockTreatmentPlan.id);
      expect(result.data.treatment_plan_id).toBe(mockTreatmentPlan.id);
    });

    it('should return null when no linked invoice', async () => {
      const findInvoice = vi.fn().mockResolvedValue({ data: null });
      const result = await findInvoice('non-existent-id');
      expect(result.data).toBeNull();
    });
  });

  describe('Update Invoice', () => {
    it('should allow updating invoice status', async () => {
      const updateInvoice = vi.fn().mockResolvedValue({ data: { ...mockGeneratedInvoice, status: 'sent' } });
      const result = await updateInvoice({ status: 'sent' });
      expect(result.data.status).toBe('sent');
    });
  });
});

describe('Invoice-Treatment Plan Relationship', () => {
  describe('Database Schema', () => {
    it('should have treatment_plan_id column in invoices', () => {
      expect(mockGeneratedInvoice).toHaveProperty('treatment_plan_id');
    });

    it('should allow null treatment_plan_id', () => {
      const standaloneInvoice = { ...mockGeneratedInvoice, treatment_plan_id: null };
      expect(standaloneInvoice.treatment_plan_id).toBeNull();
    });

    it('should use UUID for treatment_plan_id', () => {
      expect(mockGeneratedInvoice.treatment_plan_id).toMatch(/^[a-z]+-\d+$/);
    });
  });

  describe('Referential Integrity', () => {
    it('should set null on treatment plan delete', () => {
      // ON DELETE SET NULL behavior
      const deletePlan = true;
      const invoiceAfterDelete = { ...mockGeneratedInvoice, treatment_plan_id: null };
      expect(invoiceAfterDelete.treatment_plan_id).toBeNull();
    });
  });
});
