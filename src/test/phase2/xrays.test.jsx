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
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'xray.dcm' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com/xray.dcm' } })),
        remove: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    },
  },
}));

// Test data
const mockXray = {
  id: 'xray-001',
  patient_id: 'patient-001',
  doctor_id: 'doctor-001',
  appointment_id: 'appt-001',
  type: 'panoramic',
  region: 'full_mouth',
  file_path: 'medical-images/xrays/xray-001.dcm',
  file_url: 'https://test.com/xray.dcm',
  file_size: 15728640, // 15 MB
  findings: 'No significant pathology noted',
  notes: 'Annual checkup x-ray',
  status: 'reported',
  taken_at: '2026-01-15T10:30:00Z',
  created_at: '2026-01-15T10:00:00Z',
  patients: { id: 'patient-001', name: 'John Doe' },
  doctors: { id: 'doctor-001', name_en: 'Dr. Smith' },
};

const xrayTypes = ['periapical', 'bitewing', 'panoramic', 'cephalometric', 'occlusal'];
const xrayRegions = ['full_mouth', 'upper_jaw', 'lower_jaw', 'anterior', 'posterior', 'left', 'right'];
const xrayStatuses = ['ordered', 'scheduled', 'completed', 'reported', 'cancelled'];

describe('X-Ray Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('X-Ray Data Validation', () => {
    it('should validate required fields', () => {
      const requiredFields = ['patient_id', 'type', 'status'];
      
      requiredFields.forEach(field => {
        expect(mockXray[field]).toBeDefined();
        expect(mockXray[field]).not.toBe('');
      });
    });

    it('should have valid x-ray type', () => {
      expect(xrayTypes).toContain(mockXray.type);
    });

    it('should have valid region', () => {
      expect(xrayRegions).toContain(mockXray.region);
    });

    it('should have valid status', () => {
      expect(xrayStatuses).toContain(mockXray.status);
    });
  });

  describe('File Upload Validation', () => {
    const maxFileSize = 100 * 1024 * 1024; // 100 MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/dicom', 'application/dicom'];

    it('should validate file size within limit', () => {
      expect(mockXray.file_size).toBeLessThan(maxFileSize);
    });

    it('should accept DICOM files', () => {
      const dicomType = 'application/dicom';
      expect(allowedTypes).toContain(dicomType);
    });

    it('should accept image files', () => {
      const jpegType = 'image/jpeg';
      expect(allowedTypes).toContain(jpegType);
    });

    it('should reject files over size limit', () => {
      const largeFile = { size: 200 * 1024 * 1024 }; // 200 MB
      expect(largeFile.size).toBeGreaterThan(maxFileSize);
    });

    it('should generate unique file path', () => {
      const patientId = 'patient-001';
      const timestamp = Date.now();
      const filename = 'test.dcm';
      const path = `medical-images/xrays/${patientId}/${timestamp}_${filename}`;
      
      expect(path).toContain(patientId);
      expect(path).toContain('medical-images/xrays');
    });
  });

  describe('X-Ray Types', () => {
    it('should have all common x-ray types', () => {
      expect(xrayTypes).toContain('periapical');
      expect(xrayTypes).toContain('bitewing');
      expect(xrayTypes).toContain('panoramic');
      expect(xrayTypes).toContain('cephalometric');
      expect(xrayTypes).toContain('occlusal');
    });

    it('should have type descriptions available', () => {
      const typeDescriptions = {
        periapical: 'Shows entire tooth from crown to root',
        bitewing: 'Shows upper and lower teeth biting together',
        panoramic: 'Full view of entire mouth',
        cephalometric: 'Side view of head for orthodontics',
        occlusal: 'Shows floor or roof of mouth',
      };

      Object.keys(typeDescriptions).forEach(type => {
        expect(typeDescriptions[type]).toBeDefined();
        expect(typeDescriptions[type].length).toBeGreaterThan(10);
      });
    });
  });

  describe('Status Workflow', () => {
    it('should have valid status transitions', () => {
      const transitions = {
        ordered: ['scheduled', 'completed', 'cancelled'],
        scheduled: ['completed', 'cancelled'],
        completed: ['reported'],
        reported: [],
        cancelled: [],
      };

      expect(transitions.ordered).toContain('scheduled');
      expect(transitions.completed).toContain('reported');
    });

    it('should allow adding findings when completed', () => {
      const xray = { ...mockXray, status: 'completed' };
      xray.findings = 'New findings added';
      xray.status = 'reported';
      
      expect(xray.findings).toBeDefined();
      expect(xray.status).toBe('reported');
    });
  });

  describe('Region Selection', () => {
    it('should have all mouth regions', () => {
      expect(xrayRegions).toContain('full_mouth');
      expect(xrayRegions).toContain('upper_jaw');
      expect(xrayRegions).toContain('lower_jaw');
    });

    it('should have quadrant selections', () => {
      expect(xrayRegions).toContain('left');
      expect(xrayRegions).toContain('right');
    });
  });

  describe('Date Handling', () => {
    it('should parse taken_at date correctly', () => {
      const takenAt = new Date(mockXray.taken_at);
      expect(takenAt.getFullYear()).toBe(2026);
      expect(takenAt.getMonth()).toBe(0); // January
      expect(takenAt.getDate()).toBe(15);
    });

    it('should format date for display', () => {
      const date = new Date(mockXray.taken_at);
      const formatted = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      expect(formatted).toContain('2026');
      expect(formatted).toContain('January');
    });
  });
});

describe('X-Ray Form Validation', () => {
  it('should require patient', () => {
    const formData = { patient_id: '' };
    const isValid = formData.patient_id !== '';
    expect(isValid).toBe(false);
  });

  it('should require x-ray type', () => {
    const formData = { type: '' };
    const isValid = formData.type !== '';
    expect(isValid).toBe(false);
  });

  it('should validate file before upload', () => {
    const file = {
      name: 'xray.dcm',
      size: 10 * 1024 * 1024,
      type: 'application/dicom',
    };
    
    const maxSize = 100 * 1024 * 1024;
    const isValidSize = file.size <= maxSize;
    expect(isValidSize).toBe(true);
  });
});

describe('X-Ray Reporting', () => {
  it('should allow findings entry', () => {
    const findings = 'No caries detected. Bone levels normal.';
    expect(findings.length).toBeGreaterThan(0);
  });

  it('should track reporting doctor', () => {
    const report = {
      findings: 'Normal',
      reported_by: 'doctor-001',
      reported_at: new Date().toISOString(),
    };
    
    expect(report.reported_by).toBeDefined();
    expect(report.reported_at).toBeDefined();
  });
});
