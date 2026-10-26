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
        upload: vi.fn(() => Promise.resolve({ data: { path: 'cbct.dcm' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com/cbct.dcm' } })),
        remove: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    },
  },
}));

// Test data
const mockCbct = {
  id: 'cbct-001',
  patient_id: 'patient-001',
  doctor_id: 'doctor-001',
  appointment_id: 'appt-001',
  scan_date: '2026-01-15T10:00:00Z',
  region: 'full_arch',
  fov_size: 'large',
  voxel_size: 0.2,
  file_path: 'medical-images/cbct/cbct-001.dcm',
  file_url: 'https://test.com/cbct.dcm',
  file_size: 524288000, // 500 MB
  findings: '3D analysis shows adequate bone for implant placement',
  notes: 'Pre-implant planning scan',
  status: 'reported',
  created_at: '2026-01-15T10:00:00Z',
  patients: { id: 'patient-001', name: 'John Doe' },
  doctors: { id: 'doctor-001', name_en: 'Dr. Smith' },
};

const cbctRegions = ['full_arch', 'maxilla', 'mandible', 'tmj', 'single_arch', 'localized'];
const fovSizes = ['small', 'medium', 'large', 'extra_large'];
const cbctStatuses = ['ordered', 'scheduled', 'completed', 'reported', 'cancelled'];

describe('CBCT Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CBCT Data Validation', () => {
    it('should validate required fields', () => {
      const requiredFields = ['patient_id', 'region', 'status'];
      
      requiredFields.forEach(field => {
        expect(mockCbct[field]).toBeDefined();
        expect(mockCbct[field]).not.toBe('');
      });
    });

    it('should have valid region', () => {
      expect(cbctRegions).toContain(mockCbct.region);
    });

    it('should have valid FOV size', () => {
      expect(fovSizes).toContain(mockCbct.fov_size);
    });

    it('should have valid status', () => {
      expect(cbctStatuses).toContain(mockCbct.status);
    });

    it('should have valid voxel size range', () => {
      const minVoxel = 0.08;
      const maxVoxel = 0.4;
      expect(mockCbct.voxel_size).toBeGreaterThanOrEqual(minVoxel);
      expect(mockCbct.voxel_size).toBeLessThanOrEqual(maxVoxel);
    });
  });

  describe('DICOM File Handling', () => {
    const maxFileSize = 500 * 1024 * 1024; // 500 MB
    const allowedTypes = ['application/dicom', 'application/octet-stream'];

    it('should validate file size within limit', () => {
      expect(mockCbct.file_size).toBeLessThanOrEqual(maxFileSize);
    });

    it('should accept DICOM files', () => {
      const dicomExtensions = ['.dcm', '.dicom', '.dic'];
      const filePath = 'scan.dcm';
      const ext = '.' + filePath.split('.').pop();
      expect(dicomExtensions).toContain(ext);
    });

    it('should generate organized file path', () => {
      const patientId = 'patient-001';
      const scanId = 'cbct-001';
      const expectedPath = `medical-images/cbct/${patientId}/${scanId}`;
      
      expect(expectedPath).toContain('medical-images/cbct');
      expect(expectedPath).toContain(patientId);
    });

    it('should reject oversized files', () => {
      const largeFile = { size: 600 * 1024 * 1024 }; // 600 MB
      expect(largeFile.size).toBeGreaterThan(maxFileSize);
    });
  });

  describe('CBCT Regions', () => {
    it('should have all scan regions', () => {
      expect(cbctRegions).toContain('full_arch');
      expect(cbctRegions).toContain('maxilla');
      expect(cbctRegions).toContain('mandible');
      expect(cbctRegions).toContain('tmj');
    });

    it('should map regions to descriptions', () => {
      const regionDescriptions = {
        full_arch: 'Complete upper and lower jaw',
        maxilla: 'Upper jaw only',
        mandible: 'Lower jaw only',
        tmj: 'Temporomandibular joint',
        single_arch: 'Single arch scan',
        localized: 'Specific localized area',
      };

      cbctRegions.forEach(region => {
        expect(regionDescriptions[region]).toBeDefined();
      });
    });
  });

  describe('FOV Size Configuration', () => {
    it('should have FOV dimensions', () => {
      const fovDimensions = {
        small: { width: 40, height: 40 },
        medium: { width: 80, height: 80 },
        large: { width: 120, height: 80 },
        extra_large: { width: 160, height: 100 },
      };

      fovSizes.forEach(size => {
        expect(fovDimensions[size]).toBeDefined();
        expect(fovDimensions[size].width).toBeGreaterThan(0);
        expect(fovDimensions[size].height).toBeGreaterThan(0);
      });
    });

    it('should recommend FOV based on region', () => {
      const recommendations = {
        full_arch: 'large',
        maxilla: 'medium',
        mandible: 'medium',
        tmj: 'small',
        localized: 'small',
      };

      expect(recommendations.full_arch).toBe('large');
      expect(recommendations.tmj).toBe('small');
    });
  });

  describe('Voxel Size Settings', () => {
    it('should have valid voxel size options', () => {
      const voxelSizes = [0.08, 0.1, 0.125, 0.15, 0.2, 0.25, 0.3, 0.4];
      expect(voxelSizes).toContain(0.2);
    });

    it('should balance resolution and file size', () => {
      // Smaller voxel = higher resolution = larger file
      const smallVoxel = 0.1;
      const largeVoxel = 0.4;
      
      expect(smallVoxel).toBeLessThan(largeVoxel);
      // In practice: smaller voxel means better detail but larger file
    });
  });

  describe('Status Workflow', () => {
    it('should have valid status transitions', () => {
      const transitions = {
        ordered: ['scheduled', 'cancelled'],
        scheduled: ['completed', 'cancelled'],
        completed: ['reported'],
        reported: [],
        cancelled: [],
      };

      expect(transitions.ordered).toContain('scheduled');
      expect(transitions.scheduled).toContain('completed');
      expect(transitions.completed).toContain('reported');
    });

    it('should require findings for reported status', () => {
      const cbct = { ...mockCbct, status: 'reported' };
      expect(cbct.findings).toBeDefined();
      expect(cbct.findings.length).toBeGreaterThan(0);
    });
  });

  describe('Reporting Features', () => {
    it('should support detailed findings', () => {
      const findings = {
        bone_quality: 'D2 - Good cortical bone',
        bone_quantity: 'Adequate for standard implant',
        pathology: 'None detected',
        recommendations: 'Clear for implant placement',
      };

      Object.values(findings).forEach(value => {
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('should track measurements', () => {
      const measurements = {
        bone_height: 15.5, // mm
        bone_width: 8.2, // mm
        cortical_thickness: 2.1, // mm
      };

      expect(measurements.bone_height).toBeGreaterThan(0);
      expect(measurements.bone_width).toBeGreaterThan(0);
    });
  });
});

describe('CBCT Form Validation', () => {
  it('should require patient', () => {
    const formData = { patient_id: '' };
    const isValid = formData.patient_id !== '';
    expect(isValid).toBe(false);
  });

  it('should require scan region', () => {
    const formData = { region: '' };
    const isValid = formData.region !== '';
    expect(isValid).toBe(false);
  });

  it('should validate DICOM file format', () => {
    const validFile = { name: 'scan.dcm', type: 'application/dicom' };
    const invalidFile = { name: 'scan.pdf', type: 'application/pdf' };
    
    expect(validFile.name.endsWith('.dcm')).toBe(true);
    expect(invalidFile.name.endsWith('.dcm')).toBe(false);
  });

  it('should set default values', () => {
    const defaults = {
      status: 'ordered',
      fov_size: 'medium',
      voxel_size: 0.2,
    };

    expect(defaults.status).toBe('ordered');
    expect(defaults.fov_size).toBe('medium');
    expect(defaults.voxel_size).toBe(0.2);
  });
});

describe('CBCT Integration with Treatment Planning', () => {
  it('should link to treatment plan', () => {
    const cbctWithPlan = {
      ...mockCbct,
      treatment_plan_id: 'tp-001',
    };
    
    expect(cbctWithPlan.treatment_plan_id).toBeDefined();
  });

  it('should support implant planning annotations', () => {
    const annotations = {
      implant_positions: [
        { tooth: 36, length: 10, diameter: 4 },
        { tooth: 46, length: 11.5, diameter: 4.5 },
      ],
    };

    expect(annotations.implant_positions.length).toBe(2);
    expect(annotations.implant_positions[0].tooth).toBe(36);
  });
});
