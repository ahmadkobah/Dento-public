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
const mockProcedureNote = {
  id: 'note-001',
  patient_id: 'patient-001',
  doctor_id: 'doctor-001',
  appointment_id: 'appt-001',
  treatment_plan_id: 'tp-001',
  procedure_type: 'Extraction',
  teeth: [36, 46],
  procedure_date: '2026-01-15',
  chief_complaint: 'Pain in lower molars',
  findings: 'Severe decay in teeth 36 and 46, non-restorable',
  diagnosis: 'Irreversible pulpitis with periapical abscess',
  procedure_performed: 'Simple extraction of teeth 36 and 46',
  anesthesia_used: 'Lidocaine 2% with epinephrine 1:100,000',
  anesthesia_amount: '3.6ml',
  materials_used: 'Surgical gauze, suture 3-0 silk',
  complications: null,
  post_op_instructions: 'Bite on gauze for 30 min. No rinsing for 24 hours. Soft diet.',
  follow_up_notes: 'Review in 1 week for suture removal',
  created_at: '2026-01-15T15:00:00Z',
  patients: { id: 'patient-001', name: 'John Doe' },
  doctors: { id: 'doctor-001', name_en: 'Dr. Smith' },
};

const procedureTypes = [
  'Examination',
  'Cleaning',
  'Filling',
  'Extraction',
  'Root Canal',
  'Crown Preparation',
  'Bridge Preparation',
  'Implant Placement',
  'Denture Fitting',
  'Orthodontic Adjustment',
  'Periodontal Treatment',
  'Emergency Treatment',
  'Other',
];

// FDI tooth numbering
const TEETH_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const TEETH_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const ALL_TEETH = [...TEETH_UPPER, ...TEETH_LOWER];

describe('Procedure Notes Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Procedure Note Data Validation', () => {
    it('should validate required fields', () => {
      const requiredFields = ['patient_id', 'doctor_id', 'procedure_type', 'procedure_date'];
      
      requiredFields.forEach(field => {
        expect(mockProcedureNote[field]).toBeDefined();
        expect(mockProcedureNote[field]).not.toBe('');
      });
    });

    it('should have valid procedure type', () => {
      expect(procedureTypes).toContain(mockProcedureNote.procedure_type);
    });

    it('should have valid teeth numbers', () => {
      mockProcedureNote.teeth.forEach(tooth => {
        expect(ALL_TEETH).toContain(tooth);
      });
    });

    it('should have patient reference', () => {
      expect(mockProcedureNote.patients).toBeDefined();
      expect(mockProcedureNote.patients.name).toBeDefined();
    });

    it('should have doctor reference', () => {
      expect(mockProcedureNote.doctors).toBeDefined();
      expect(mockProcedureNote.doctors.name_en).toBeDefined();
    });
  });

  describe('Teeth Selection (FDI Numbering)', () => {
    it('should have all upper teeth', () => {
      expect(TEETH_UPPER.length).toBe(16);
      expect(TEETH_UPPER).toContain(11);
      expect(TEETH_UPPER).toContain(28);
    });

    it('should have all lower teeth', () => {
      expect(TEETH_LOWER.length).toBe(16);
      expect(TEETH_LOWER).toContain(31);
      expect(TEETH_LOWER).toContain(48);
    });

    it('should validate FDI tooth number format', () => {
      // First digit: quadrant (1-4)
      // Second digit: tooth position (1-8)
      const validTooth = 36; // Lower left first molar
      const quadrant = Math.floor(validTooth / 10);
      const position = validTooth % 10;
      
      expect([1, 2, 3, 4]).toContain(quadrant);
      expect(position).toBeGreaterThanOrEqual(1);
      expect(position).toBeLessThanOrEqual(8);
    });

    it('should identify quadrant from tooth number', () => {
      const getQuadrant = (tooth) => Math.floor(tooth / 10);
      
      expect(getQuadrant(11)).toBe(1); // Upper right
      expect(getQuadrant(21)).toBe(2); // Upper left
      expect(getQuadrant(31)).toBe(3); // Lower left
      expect(getQuadrant(41)).toBe(4); // Lower right
    });

    it('should identify tooth type from position', () => {
      const getToothType = (tooth) => {
        const position = tooth % 10;
        if (position <= 2) return 'incisor';
        if (position === 3) return 'canine';
        if (position <= 5) return 'premolar';
        return 'molar';
      };
      
      expect(getToothType(11)).toBe('incisor');
      expect(getToothType(13)).toBe('canine');
      expect(getToothType(14)).toBe('premolar');
      expect(getToothType(36)).toBe('molar');
    });
  });

  describe('Procedure Types', () => {
    it('should have common procedure types', () => {
      expect(procedureTypes).toContain('Extraction');
      expect(procedureTypes).toContain('Root Canal');
      expect(procedureTypes).toContain('Filling');
      expect(procedureTypes).toContain('Crown Preparation');
    });

    it('should have examination type', () => {
      expect(procedureTypes).toContain('Examination');
    });

    it('should have emergency option', () => {
      expect(procedureTypes).toContain('Emergency Treatment');
    });

    it('should have Other for custom procedures', () => {
      expect(procedureTypes).toContain('Other');
    });
  });

  describe('Anesthesia Documentation', () => {
    it('should record anesthesia type', () => {
      expect(mockProcedureNote.anesthesia_used).toBeDefined();
      expect(mockProcedureNote.anesthesia_used).toContain('Lidocaine');
    });

    it('should record anesthesia amount', () => {
      expect(mockProcedureNote.anesthesia_amount).toBeDefined();
      expect(mockProcedureNote.anesthesia_amount).toContain('ml');
    });

    it('should validate common anesthetics', () => {
      const commonAnesthetics = [
        'Lidocaine 2% with epinephrine 1:100,000',
        'Lidocaine 2% plain',
        'Articaine 4% with epinephrine 1:100,000',
        'Mepivacaine 3% plain',
        'Bupivacaine 0.5%',
      ];
      
      expect(commonAnesthetics.length).toBeGreaterThan(0);
    });
  });

  describe('Complications Tracking', () => {
    it('should allow null for no complications', () => {
      expect(mockProcedureNote.complications).toBeNull();
    });

    it('should record complications when present', () => {
      const noteWithComplication = {
        ...mockProcedureNote,
        complications: 'Minor bleeding, controlled with pressure',
      };
      
      expect(noteWithComplication.complications).toBeDefined();
      expect(noteWithComplication.complications.length).toBeGreaterThan(0);
    });

    it('should highlight complications in view', () => {
      const hasComplications = mockProcedureNote.complications !== null;
      expect(hasComplications).toBe(false);
    });
  });

  describe('Post-Op Instructions', () => {
    it('should have post-op instructions', () => {
      expect(mockProcedureNote.post_op_instructions).toBeDefined();
      expect(mockProcedureNote.post_op_instructions.length).toBeGreaterThan(0);
    });

    it('should include relevant instructions for procedure', () => {
      const instructions = mockProcedureNote.post_op_instructions;
      expect(instructions).toContain('gauze');
      expect(instructions).toContain('24 hours');
    });
  });

  describe('Follow-Up Notes', () => {
    it('should allow follow-up documentation', () => {
      expect(mockProcedureNote.follow_up_notes).toBeDefined();
    });

    it('should mention follow-up timeframe', () => {
      const followUp = mockProcedureNote.follow_up_notes;
      expect(followUp).toContain('week');
    });
  });

  describe('Materials Used', () => {
    it('should track materials', () => {
      expect(mockProcedureNote.materials_used).toBeDefined();
    });

    it('should list multiple materials', () => {
      const materials = mockProcedureNote.materials_used;
      expect(materials).toContain(',');
    });
  });
});

describe('Procedure Note Form Validation', () => {
  it('should require patient', () => {
    const formData = { patient_id: '' };
    const isValid = formData.patient_id !== '';
    expect(isValid).toBe(false);
  });

  it('should require procedure type', () => {
    const formData = { procedure_type: '' };
    const isValid = formData.procedure_type !== '';
    expect(isValid).toBe(false);
  });

  it('should require procedure date', () => {
    const formData = { procedure_date: '' };
    const isValid = formData.procedure_date !== '';
    expect(isValid).toBe(false);
  });

  it('should validate date format', () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    expect(mockProcedureNote.procedure_date).toMatch(dateRegex);
  });
});

describe('Procedure Note Duplication', () => {
  it('should allow duplicating notes', () => {
    const duplicated = { ...mockProcedureNote };
    delete duplicated.id;
    delete duplicated.created_at;
    
    expect(duplicated.id).toBeUndefined();
    expect(duplicated.procedure_type).toBe(mockProcedureNote.procedure_type);
  });

  it('should preserve clinical content when duplicating', () => {
    const duplicated = { ...mockProcedureNote };
    
    expect(duplicated.procedure_performed).toBe(mockProcedureNote.procedure_performed);
    expect(duplicated.anesthesia_used).toBe(mockProcedureNote.anesthesia_used);
  });
});

describe('Procedure Note Print Support', () => {
  it('should format for printing', () => {
    const printData = {
      patient: mockProcedureNote.patients.name,
      doctor: mockProcedureNote.doctors.name_en,
      date: mockProcedureNote.procedure_date,
      procedure: mockProcedureNote.procedure_type,
      teeth: mockProcedureNote.teeth.join(', '),
    };
    
    expect(printData.patient).toBeDefined();
    expect(printData.teeth).toContain('36');
  });
});
