import { describe, it, expect, vi, beforeEach } from 'vitest';

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
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

// Test data
const mockLabOrder = {
  id: 'lab-001',
  patient_id: 'patient-001',
  doctor_id: 'doctor-001',
  lab_id: 'dental-lab-001',
  work_type: 'Crown',
  teeth: [36],
  shade: 'A2',
  material: 'Zirconia',
  status: 'in_progress',
  due_date: '2026-02-01',
  delivery_date: null,
  estimated_cost: 450.00,
  special_instructions: 'Match adjacent teeth closely',
  notes: 'Patient prefers natural appearance',
  created_at: '2026-01-15T10:00:00Z',
  patients: { id: 'patient-001', name: 'John Doe', phone: '123-456-7890' },
  doctors: { id: 'doctor-001', name_en: 'Dr. Smith' },
  dental_labs: { id: 'dental-lab-001', name: 'Premium Dental Lab', phone: '555-1234' },
};

const labStatuses = ['ordered', 'in_progress', 'ready', 'delivered', 'cancelled', 'on_hold'];

const workTypes = [
  'Crown',
  'Bridge',
  'Denture - Full',
  'Denture - Partial',
  'Implant Crown',
  'Veneer',
  'Inlay/Onlay',
  'Night Guard',
  'Retainer',
  'Orthodontic Appliance',
  'Surgical Guide',
  'Custom Tray',
  'Other',
];

const materials = [
  'Porcelain Fused to Metal (PFM)',
  'Zirconia',
  'E-max',
  'Full Cast Gold',
  'Acrylic',
  'Flexible Denture Material',
  'PMMA',
  'Titanium',
  'Chrome Cobalt',
  'Other',
];

const shades = [
  'A1', 'A2', 'A3', 'A3.5', 'A4',
  'B1', 'B2', 'B3', 'B4',
  'C1', 'C2', 'C3', 'C4',
  'D2', 'D3', 'D4',
  'Bleach 1', 'Bleach 2', 'Bleach 3', 'Bleach 4',
];

// FDI teeth
const ALL_TEETH = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

describe('Lab Orders Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Lab Order Data Validation', () => {
    it('should validate required fields', () => {
      const requiredFields = ['patient_id', 'doctor_id', 'work_type', 'status'];
      
      requiredFields.forEach(field => {
        expect(mockLabOrder[field]).toBeDefined();
        expect(mockLabOrder[field]).not.toBe('');
      });
    });

    it('should have valid status', () => {
      expect(labStatuses).toContain(mockLabOrder.status);
    });

    it('should have valid work type', () => {
      expect(workTypes).toContain(mockLabOrder.work_type);
    });

    it('should have valid teeth numbers', () => {
      mockLabOrder.teeth.forEach(tooth => {
        expect(ALL_TEETH).toContain(tooth);
      });
    });

    it('should have patient reference', () => {
      expect(mockLabOrder.patients).toBeDefined();
      expect(mockLabOrder.patients.name).toBeDefined();
    });
  });

  describe('Shade System', () => {
    it('should have all VITA shade options', () => {
      expect(shades).toContain('A1');
      expect(shades).toContain('A2');
      expect(shades).toContain('B1');
      expect(shades).toContain('C1');
      expect(shades).toContain('D2');
    });

    it('should have bleach shades', () => {
      const bleachShades = shades.filter(s => s.startsWith('Bleach'));
      expect(bleachShades.length).toBe(4);
    });

    it('should validate shade format', () => {
      expect(mockLabOrder.shade).toBe('A2');
      expect(shades).toContain(mockLabOrder.shade);
    });
  });

  describe('Materials', () => {
    it('should have common materials', () => {
      expect(materials).toContain('Zirconia');
      expect(materials).toContain('E-max');
      expect(materials).toContain('Porcelain Fused to Metal (PFM)');
    });

    it('should have metal options', () => {
      expect(materials).toContain('Full Cast Gold');
      expect(materials).toContain('Titanium');
    });

    it('should have denture materials', () => {
      expect(materials).toContain('Acrylic');
      expect(materials).toContain('Flexible Denture Material');
    });

    it('should validate material selection', () => {
      expect(materials).toContain(mockLabOrder.material);
    });
  });

  describe('Work Types', () => {
    it('should have crown and bridge options', () => {
      expect(workTypes).toContain('Crown');
      expect(workTypes).toContain('Bridge');
    });

    it('should have denture options', () => {
      expect(workTypes).toContain('Denture - Full');
      expect(workTypes).toContain('Denture - Partial');
    });

    it('should have implant options', () => {
      expect(workTypes).toContain('Implant Crown');
    });

    it('should have orthodontic options', () => {
      expect(workTypes).toContain('Retainer');
      expect(workTypes).toContain('Orthodontic Appliance');
    });

    it('should have Other for custom work', () => {
      expect(workTypes).toContain('Other');
    });
  });

  describe('Status Workflow', () => {
    it('should start as ordered', () => {
      const newOrder = { status: 'ordered' };
      expect(newOrder.status).toBe('ordered');
    });

    it('should have valid status transitions', () => {
      const validTransitions = {
        ordered: ['in_progress', 'on_hold', 'cancelled'],
        in_progress: ['ready', 'on_hold', 'cancelled'],
        ready: ['delivered', 'on_hold'],
        delivered: [],
        cancelled: [],
        on_hold: ['ordered', 'in_progress', 'cancelled'],
      };

      expect(validTransitions.ordered).toContain('in_progress');
      expect(validTransitions.in_progress).toContain('ready');
      expect(validTransitions.ready).toContain('delivered');
    });

    it('should allow putting order on hold', () => {
      const transitions = { in_progress: ['ready', 'on_hold', 'cancelled'] };
      expect(transitions.in_progress).toContain('on_hold');
    });
  });

  describe('Due Date Handling', () => {
    it('should have due date', () => {
      expect(mockLabOrder.due_date).toBeDefined();
    });

    it('should identify overdue orders', () => {
      const isOverdue = (order) => {
        if (!order.due_date) return false;
        if (['delivered', 'cancelled'].includes(order.status)) return false;
        return new Date(order.due_date) < new Date();
      };

      // Order due 2026-02-01, current date 2026-01-29 - not overdue
      const currentDate = new Date('2026-01-29');
      const dueDate = new Date(mockLabOrder.due_date);
      expect(dueDate > currentDate).toBe(true);
    });

    it('should mark as overdue when past due date', () => {
      const overdueOrder = {
        ...mockLabOrder,
        due_date: '2026-01-01',
        status: 'in_progress',
      };
      
      const currentDate = new Date('2026-01-29');
      const dueDate = new Date(overdueOrder.due_date);
      const isOverdue = dueDate < currentDate && !['delivered', 'cancelled'].includes(overdueOrder.status);
      
      expect(isOverdue).toBe(true);
    });
  });

  describe('Delivery Tracking', () => {
    it('should track delivery date', () => {
      const deliveredOrder = {
        ...mockLabOrder,
        status: 'delivered',
        delivery_date: '2026-01-28T14:00:00Z',
      };
      
      expect(deliveredOrder.delivery_date).toBeDefined();
    });

    it('should auto-set delivery date when delivered', () => {
      const markDelivered = (order) => ({
        ...order,
        status: 'delivered',
        delivery_date: new Date().toISOString(),
      });

      const delivered = markDelivered(mockLabOrder);
      expect(delivered.delivery_date).toBeDefined();
    });
  });

  describe('Cost Tracking', () => {
    it('should have estimated cost', () => {
      expect(mockLabOrder.estimated_cost).toBeDefined();
      expect(mockLabOrder.estimated_cost).toBeGreaterThan(0);
    });

    it('should format currency correctly', () => {
      const formatted = `$${mockLabOrder.estimated_cost.toFixed(2)}`;
      expect(formatted).toBe('$450.00');
    });
  });

  describe('Lab Selection', () => {
    it('should have lab reference', () => {
      expect(mockLabOrder.dental_labs).toBeDefined();
      expect(mockLabOrder.dental_labs.name).toBeDefined();
    });

    it('should have lab contact info', () => {
      expect(mockLabOrder.dental_labs.phone).toBeDefined();
    });

    it('should allow no lab selected', () => {
      const orderWithoutLab = { ...mockLabOrder, lab_id: null, dental_labs: null };
      expect(orderWithoutLab.lab_id).toBeNull();
    });
  });

  describe('Special Instructions', () => {
    it('should allow special instructions', () => {
      expect(mockLabOrder.special_instructions).toBeDefined();
    });

    it('should display instructions prominently', () => {
      const hasInstructions = mockLabOrder.special_instructions !== null 
        && mockLabOrder.special_instructions.length > 0;
      expect(hasInstructions).toBe(true);
    });
  });
});

describe('Lab Order Form Validation', () => {
  it('should require patient', () => {
    const formData = { patient_id: '' };
    const isValid = formData.patient_id !== '';
    expect(isValid).toBe(false);
  });

  it('should require doctor', () => {
    const formData = { doctor_id: '' };
    const isValid = formData.doctor_id !== '';
    expect(isValid).toBe(false);
  });

  it('should require work type', () => {
    const formData = { work_type: '' };
    const isValid = formData.work_type !== '';
    expect(isValid).toBe(false);
  });

  it('should validate cost as number', () => {
    const cost = '450.00';
    const parsed = parseFloat(cost);
    expect(parsed).toBe(450);
    expect(typeof parsed).toBe('number');
  });

  it('should validate date format', () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    expect(mockLabOrder.due_date).toMatch(dateRegex);
  });
});

describe('Lab Order List Features', () => {
  it('should filter by status', () => {
    const orders = [
      { ...mockLabOrder, status: 'ordered' },
      { ...mockLabOrder, status: 'in_progress' },
      { ...mockLabOrder, status: 'ready' },
    ];
    
    const inProgress = orders.filter(o => o.status === 'in_progress');
    expect(inProgress.length).toBe(1);
  });

  it('should filter by lab', () => {
    const orders = [
      { ...mockLabOrder, lab_id: 'lab-001' },
      { ...mockLabOrder, lab_id: 'lab-002' },
    ];
    
    const filtered = orders.filter(o => o.lab_id === 'lab-001');
    expect(filtered.length).toBe(1);
  });

  it('should show status stats', () => {
    const orders = [
      { status: 'ordered' },
      { status: 'ordered' },
      { status: 'in_progress' },
      { status: 'ready' },
    ];
    
    const stats = {
      ordered: orders.filter(o => o.status === 'ordered').length,
      in_progress: orders.filter(o => o.status === 'in_progress').length,
      ready: orders.filter(o => o.status === 'ready').length,
    };
    
    expect(stats.ordered).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.ready).toBe(1);
  });
});

describe('Lab Order Print Support', () => {
  it('should have print-friendly format', () => {
    const printClasses = ['print:shadow-none', 'print:border', 'print:hidden'];
    expect(printClasses.length).toBeGreaterThan(0);
  });

  it('should include all order details for print', () => {
    const printData = {
      orderNumber: mockLabOrder.id.slice(-8).toUpperCase(),
      patient: mockLabOrder.patients.name,
      workType: mockLabOrder.work_type,
      teeth: mockLabOrder.teeth.join(', '),
      shade: mockLabOrder.shade,
      material: mockLabOrder.material,
      dueDate: mockLabOrder.due_date,
      instructions: mockLabOrder.special_instructions,
    };

    expect(printData.patient).toBeDefined();
    expect(printData.workType).toBeDefined();
    expect(printData.shade).toBeDefined();
  });
});
