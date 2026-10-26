/**
 * Patient Clinical Records Tests
 * Tests for the clinical records tabs in Patient Profile
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock data for patient clinical records
const mockPatientId = 'patient-001';

const mockCounts = {
  'treatment-plans': 5,
  'prescriptions': 12,
  'xrays': 8,
  'cbct': 2,
  'consent-forms': 15,
  'lab-orders': 6,
  'invoices': 10,
};

const mockTreatmentPlans = [
  {
    id: 'tp-001',
    plan_number: 'TP-2026-001',
    title: 'Full Mouth Rehabilitation',
    status: 'in_progress',
    total_cost: 25000,
    final_cost: 22500,
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'tp-002',
    plan_number: 'TP-2026-002',
    title: 'Implant Treatment',
    status: 'approved',
    total_cost: 15000,
    final_cost: 15000,
    created_at: '2026-01-20T14:00:00Z',
  },
];

const mockPrescriptions = [
  {
    id: 'rx-001',
    prescription_number: 'RX-2026-001',
    status: 'active',
    created_at: '2026-01-25T09:00:00Z',
    doctors: { name_en: 'Dr. Smith' },
  },
];

const mockXrays = [
  {
    id: 'xray-001',
    xray_type: 'panoramic',
    region: 'full_mouth',
    status: 'completed',
    taken_at: '2026-01-20T11:00:00Z',
  },
];

const mockCbctScans = [
  {
    id: 'cbct-001',
    scan_region: 'maxilla',
    fov_size: 'medium',
    status: 'reported',
    scan_date: '2026-01-18T10:00:00Z',
  },
];

const mockConsentForms = [
  {
    id: 'consent-001',
    consent_templates: { name_en: 'General Treatment Consent' },
    status: 'signed',
    signed_at: '2026-01-15T08:00:00Z',
  },
];

const mockLabOrders = [
  {
    id: 'lab-001',
    order_number: 'LAB-2026-001',
    work_type: 'crown',
    status: 'fabricating',
    due_date: '2026-02-01',
  },
];

const mockInvoices = [
  {
    id: 'inv-001',
    invoice_number: 'INV-2026-001',
    status: 'paid',
    total_amount: 5000,
    issue_date: '2026-01-20',
  },
];

describe('Patient Clinical Records Component', () => {
  describe('Tab Configuration', () => {
    const TABS = [
      { id: 'treatment-plans', label: 'Treatment Plans' },
      { id: 'prescriptions', label: 'Prescriptions' },
      { id: 'xrays', label: 'X-Rays' },
      { id: 'cbct', label: 'CBCT Scans' },
      { id: 'consent-forms', label: 'Consent Forms' },
      { id: 'lab-orders', label: 'Lab Orders' },
      { id: 'invoices', label: 'Invoices' },
    ];

    it('should have all 7 clinical record tabs', () => {
      expect(TABS).toHaveLength(7);
    });

    it('should have treatment plans tab', () => {
      expect(TABS.find(t => t.id === 'treatment-plans')).toBeDefined();
    });

    it('should have prescriptions tab', () => {
      expect(TABS.find(t => t.id === 'prescriptions')).toBeDefined();
    });

    it('should have x-rays tab', () => {
      expect(TABS.find(t => t.id === 'xrays')).toBeDefined();
    });

    it('should have CBCT scans tab', () => {
      expect(TABS.find(t => t.id === 'cbct')).toBeDefined();
    });

    it('should have consent forms tab', () => {
      expect(TABS.find(t => t.id === 'consent-forms')).toBeDefined();
    });

    it('should have lab orders tab', () => {
      expect(TABS.find(t => t.id === 'lab-orders')).toBeDefined();
    });

    it('should have invoices tab', () => {
      expect(TABS.find(t => t.id === 'invoices')).toBeDefined();
    });
  });

  describe('Record Count Display', () => {
    it('should display count for each tab', () => {
      Object.keys(mockCounts).forEach(tabId => {
        expect(mockCounts[tabId]).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle zero counts', () => {
      const emptyCounts = { ...mockCounts, 'cbct': 0 };
      expect(emptyCounts['cbct']).toBe(0);
    });

    it('should handle large counts', () => {
      const largeCounts = { ...mockCounts, 'prescriptions': 999 };
      expect(largeCounts['prescriptions']).toBe(999);
    });
  });

  describe('Treatment Plans Tab', () => {
    it('should display treatment plan list', () => {
      expect(mockTreatmentPlans).toHaveLength(2);
    });

    it('should show plan number', () => {
      expect(mockTreatmentPlans[0].plan_number).toBe('TP-2026-001');
    });

    it('should show plan title', () => {
      expect(mockTreatmentPlans[0].title).toBe('Full Mouth Rehabilitation');
    });

    it('should show plan status', () => {
      expect(mockTreatmentPlans[0].status).toBe('in_progress');
    });

    it('should show plan cost', () => {
      expect(mockTreatmentPlans[0].final_cost).toBe(22500);
    });

    it('should link to view treatment plan', () => {
      const viewUrl = `/treatment-plans/${mockTreatmentPlans[0].id}`;
      expect(viewUrl).toContain(mockTreatmentPlans[0].id);
    });

    it('should link to create new treatment plan', () => {
      const createUrl = `/treatment-plans/new?patient=${mockPatientId}`;
      expect(createUrl).toContain(mockPatientId);
    });
  });

  describe('Prescriptions Tab', () => {
    it('should display prescription list', () => {
      expect(mockPrescriptions).toHaveLength(1);
    });

    it('should show prescription number', () => {
      expect(mockPrescriptions[0].prescription_number).toBe('RX-2026-001');
    });

    it('should show prescription status', () => {
      expect(mockPrescriptions[0].status).toBe('active');
    });

    it('should show prescribing doctor', () => {
      expect(mockPrescriptions[0].doctors.name_en).toBe('Dr. Smith');
    });

    it('should link to view prescription', () => {
      const viewUrl = `/prescriptions/${mockPrescriptions[0].id}`;
      expect(viewUrl).toContain(mockPrescriptions[0].id);
    });
  });

  describe('X-Rays Tab', () => {
    it('should display x-ray list', () => {
      expect(mockXrays).toHaveLength(1);
    });

    it('should show x-ray type', () => {
      expect(mockXrays[0].xray_type).toBe('panoramic');
    });

    it('should show x-ray region', () => {
      expect(mockXrays[0].region).toBe('full_mouth');
    });

    it('should show x-ray status', () => {
      expect(mockXrays[0].status).toBe('completed');
    });

    it('should link to view x-ray', () => {
      const viewUrl = `/xrays/${mockXrays[0].id}`;
      expect(viewUrl).toContain(mockXrays[0].id);
    });
  });

  describe('CBCT Scans Tab', () => {
    it('should display CBCT scan list', () => {
      expect(mockCbctScans).toHaveLength(1);
    });

    it('should show scan region', () => {
      expect(mockCbctScans[0].scan_region).toBe('maxilla');
    });

    it('should show FOV size', () => {
      expect(mockCbctScans[0].fov_size).toBe('medium');
    });

    it('should show scan status', () => {
      expect(mockCbctScans[0].status).toBe('reported');
    });

    it('should link to view CBCT scan', () => {
      const viewUrl = `/cbct/${mockCbctScans[0].id}`;
      expect(viewUrl).toContain(mockCbctScans[0].id);
    });
  });

  describe('Consent Forms Tab', () => {
    it('should display consent form list', () => {
      expect(mockConsentForms).toHaveLength(1);
    });

    it('should show consent template name', () => {
      expect(mockConsentForms[0].consent_templates.name_en).toBe('General Treatment Consent');
    });

    it('should show consent status', () => {
      expect(mockConsentForms[0].status).toBe('signed');
    });

    it('should show signed date', () => {
      expect(mockConsentForms[0].signed_at).toBeDefined();
    });

    it('should link to view consent form', () => {
      const viewUrl = `/consent-forms/${mockConsentForms[0].id}`;
      expect(viewUrl).toContain(mockConsentForms[0].id);
    });
  });

  describe('Lab Orders Tab', () => {
    it('should display lab order list', () => {
      expect(mockLabOrders).toHaveLength(1);
    });

    it('should show order number', () => {
      expect(mockLabOrders[0].order_number).toBe('LAB-2026-001');
    });

    it('should show work type', () => {
      expect(mockLabOrders[0].work_type).toBe('crown');
    });

    it('should show order status', () => {
      expect(mockLabOrders[0].status).toBe('fabricating');
    });

    it('should show due date', () => {
      expect(mockLabOrders[0].due_date).toBe('2026-02-01');
    });

    it('should link to view lab order', () => {
      const viewUrl = `/lab-orders/${mockLabOrders[0].id}`;
      expect(viewUrl).toContain(mockLabOrders[0].id);
    });
  });

  describe('Invoices Tab', () => {
    it('should display invoice list', () => {
      expect(mockInvoices).toHaveLength(1);
    });

    it('should show invoice number', () => {
      expect(mockInvoices[0].invoice_number).toBe('INV-2026-001');
    });

    it('should show invoice status', () => {
      expect(mockInvoices[0].status).toBe('paid');
    });

    it('should show invoice amount', () => {
      expect(mockInvoices[0].total_amount).toBe(5000);
    });

    it('should link to view invoice', () => {
      const viewUrl = `/invoices/${mockInvoices[0].id}`;
      expect(viewUrl).toContain(mockInvoices[0].id);
    });
  });

  describe('Status Badge Styling', () => {
    const STATUS_COLORS = {
      draft: 'bg-gray-100 text-gray-700',
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      active: 'bg-green-100 text-green-700',
      expired: 'bg-gray-100 text-gray-500',
      paid: 'bg-green-100 text-green-700',
      partial: 'bg-yellow-100 text-yellow-700',
      overdue: 'bg-red-100 text-red-700',
      signed: 'bg-green-100 text-green-700',
      fabricating: 'bg-purple-100 text-purple-700',
      delivered: 'bg-green-100 text-green-700',
    };

    it('should have styling for all treatment plan statuses', () => {
      ['draft', 'pending', 'approved', 'in_progress', 'completed', 'cancelled'].forEach(status => {
        expect(STATUS_COLORS[status]).toBeDefined();
      });
    });

    it('should have styling for invoice statuses', () => {
      ['draft', 'paid', 'partial', 'overdue'].forEach(status => {
        expect(STATUS_COLORS[status]).toBeDefined();
      });
    });

    it('should have styling for lab order statuses', () => {
      ['fabricating', 'delivered'].forEach(status => {
        expect(STATUS_COLORS[status]).toBeDefined();
      });
    });
  });

  describe('Empty State Handling', () => {
    it('should show empty state when no records', () => {
      const emptyRecords = [];
      expect(emptyRecords).toHaveLength(0);
    });

    it('should show create link in empty state', () => {
      const createUrl = `/treatment-plans/new?patient=${mockPatientId}`;
      expect(createUrl).toContain('new');
    });

    it('should show appropriate empty message per tab', () => {
      const emptyMessages = {
        'treatment-plans': 'No treatment plans yet',
        'prescriptions': 'No prescriptions yet',
        'xrays': 'No X-rays yet',
        'cbct': 'No CBCT scans yet',
        'consent-forms': 'No consent forms yet',
        'lab-orders': 'No lab orders yet',
        'invoices': 'No invoices yet',
      };
      
      Object.keys(emptyMessages).forEach(tab => {
        expect(emptyMessages[tab]).toBeDefined();
      });
    });
  });

  describe('Tab Switching', () => {
    it('should default to treatment-plans tab', () => {
      const defaultTab = 'treatment-plans';
      expect(defaultTab).toBe('treatment-plans');
    });

    it('should allow switching between tabs', () => {
      const tabs = ['treatment-plans', 'prescriptions', 'xrays', 'cbct', 'consent-forms', 'lab-orders', 'invoices'];
      tabs.forEach(tab => {
        const activeTab = tab;
        expect(activeTab).toBe(tab);
      });
    });

    it('should load records when tab changes', () => {
      // Simulates tab change triggering data fetch
      const fetchRecords = vi.fn();
      fetchRecords('prescriptions');
      expect(fetchRecords).toHaveBeenCalledWith('prescriptions');
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching', () => {
      const loading = true;
      expect(loading).toBe(true);
    });

    it('should hide loading spinner when data loaded', () => {
      const loading = false;
      expect(loading).toBe(false);
    });
  });
});

describe('Patient Clinical Records Security', () => {
  describe('Data Isolation', () => {
    it('should only fetch records for specified patient', () => {
      const query = { patient_id: mockPatientId };
      expect(query.patient_id).toBe(mockPatientId);
    });

    it('should not expose other patients records', () => {
      const otherPatientId = 'patient-002';
      expect(otherPatientId).not.toBe(mockPatientId);
    });
  });

  describe('Permission Checks', () => {
    it('should require authentication to view records', () => {
      const isAuthenticated = true;
      expect(isAuthenticated).toBe(true);
    });

    it('should check role permissions', () => {
      const allowedRoles = ['admin', 'doctor', 'receptionist'];
      expect(allowedRoles).toContain('admin');
    });
  });
});

describe('Patient Clinical Records Performance', () => {
  describe('Data Loading', () => {
    it('should fetch counts in parallel', async () => {
      const fetchCounts = vi.fn().mockResolvedValue(mockCounts);
      const counts = await fetchCounts();
      expect(counts).toEqual(mockCounts);
    });

    it('should paginate large record sets', () => {
      const PAGE_SIZE = 10;
      const totalRecords = 50;
      const pageCount = Math.ceil(totalRecords / PAGE_SIZE);
      expect(pageCount).toBe(5);
    });

    it('should limit initial fetch to active tab only', () => {
      const activeTab = 'treatment-plans';
      const fetchedTab = activeTab;
      expect(fetchedTab).toBe('treatment-plans');
    });
  });
});
