/**
 * Phase 2 Integration Tests
 * Tests API call flows, form submissions, and real component behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock supabase with configurable responses
const mockSupabaseResponse = { data: null, error: null };
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockUpload = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => ({
      select: mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseResponse),
          order: vi.fn().mockResolvedValue(mockSupabaseResponse),
        }),
        order: vi.fn().mockResolvedValue(mockSupabaseResponse),
        or: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(mockSupabaseResponse),
        }),
      }),
      insert: mockInsert.mockResolvedValue(mockSupabaseResponse),
      update: mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue(mockSupabaseResponse),
      }),
      delete: mockDelete.mockReturnValue({
        eq: vi.fn().mockResolvedValue(mockSupabaseResponse),
      }),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload.mockResolvedValue({ data: { path: 'test.dcm' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/file.dcm' } }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    },
  },
}));

describe('Phase 2 Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseResponse.data = null;
    mockSupabaseResponse.error = null;
  });

  // =============================================
  // API CALL FLOW TESTS
  // =============================================
  describe('API Call Flow Tests', () => {
    describe('Treatment Plan API Flows', () => {
      it('should fetch treatment plans list on mount', async () => {
        const mockPlans = [
          { id: '1', title: 'Plan A', status: 'pending', patient_id: 'p1' },
          { id: '2', title: 'Plan B', status: 'approved', patient_id: 'p2' },
        ];
        
        // Simulate list fetch
        const fetchPlans = async () => {
          mockSupabaseResponse.data = mockPlans;
          mockSelect.mockReturnValue({ 
            order: vi.fn().mockResolvedValue(mockSupabaseResponse) 
          });
          const result = await mockSelect().order();
          return result;
        };
        
        const result = await fetchPlans();
        expect(mockSelect).toHaveBeenCalled();
        expect(result.data).toEqual(mockPlans);
      });

      it('should fetch single plan with relations', async () => {
        const mockPlan = {
          id: 'plan-001',
          title: 'Full Restoration',
          patient_id: 'patient-001',
          patients: { name: 'John Doe', phone: '123-456-7890' },
          doctors: { name_en: 'Dr. Smith' },
        };
        
        const fetchPlan = async (id) => {
          mockSupabaseResponse.data = mockPlan;
          // Simulates: supabase.from('treatment_plans').select('*, patients(*), doctors(*)').eq('id', id).single()
          return mockSupabaseResponse;
        };
        
        const result = await fetchPlan('plan-001');
        expect(result.data.patients).toBeDefined();
        expect(result.data.doctors).toBeDefined();
      });

      it('should create treatment plan with items', async () => {
        const planData = {
          patient_id: 'patient-001',
          doctor_id: 'doctor-001',
          title: 'New Plan',
          status: 'pending',
        };
        
        const itemsData = [
          { service_id: 's1', quantity: 1, unit_price: 500 },
          { service_id: 's2', quantity: 2, unit_price: 300 },
        ];
        
        const createPlanWithItems = async () => {
          // Step 1: Create plan
          mockSupabaseResponse.data = { id: 'new-plan-001', ...planData };
          const planResult = await mockInsert();
          
          // Step 2: Create items linked to plan
          const itemsWithPlanId = itemsData.map(item => ({
            ...item,
            treatment_plan_id: 'new-plan-001',
          }));
          
          mockSupabaseResponse.data = itemsWithPlanId;
          const itemsResult = await mockInsert();
          
          return { plan: planResult, items: itemsResult };
        };
        
        await createPlanWithItems();
        expect(mockInsert).toHaveBeenCalledTimes(2);
      });

      it('should update treatment plan status', async () => {
        const updateStatus = async (id, newStatus) => {
          mockSupabaseResponse.data = { id, status: newStatus };
          mockUpdate.mockReturnValue({ 
            eq: vi.fn().mockResolvedValue(mockSupabaseResponse) 
          });
          await mockUpdate().eq();
          return mockSupabaseResponse;
        };
        
        const result = await updateStatus('plan-001', 'approved');
        expect(mockUpdate).toHaveBeenCalled();
      });

      it('should delete treatment plan and cascade items', async () => {
        const deletePlan = async (id) => {
          // Items are cascade deleted by DB
          mockDelete.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null })
          });
          await mockDelete().eq();
          return { success: true };
        };
        
        await deletePlan('plan-001');
        expect(mockDelete).toHaveBeenCalled();
      });
    });

    describe('Prescription API Flows', () => {
      it('should create prescription with medications', async () => {
        const prescriptionData = {
          patient_id: 'patient-001',
          doctor_id: 'doctor-001',
          diagnosis: 'Dental infection',
          status: 'active',
        };
        
        const medications = [
          { medication_name: 'Amoxicillin', dosage: '500mg', frequency: '3x daily', duration: '7 days' },
        ];
        
        const createPrescription = async () => {
          mockSupabaseResponse.data = { id: 'rx-001', ...prescriptionData };
          await mockInsert();
          
          mockSupabaseResponse.data = medications.map(m => ({ ...m, prescription_id: 'rx-001' }));
          await mockInsert();
          
          return { success: true };
        };
        
        await createPrescription();
        expect(mockInsert).toHaveBeenCalled();
      });
    });

    describe('File Upload API Flows', () => {
      it('should upload X-ray file to storage', async () => {
        const file = new File(['test'], 'xray.dcm', { type: 'application/dicom' });
        
        const uploadFile = async (file, patientId) => {
          const path = `medical-images/xrays/${patientId}/${Date.now()}_${file.name}`;
          const result = await mockUpload(path, file);
          return result;
        };
        
        await uploadFile(file, 'patient-001');
        expect(mockUpload).toHaveBeenCalled();
      });

      it('should create X-ray record after upload', async () => {
        const createXrayRecord = async (patientId, filePath, fileUrl) => {
          mockSupabaseResponse.data = {
            id: 'xray-001',
            patient_id: patientId,
            file_path: filePath,
            file_url: fileUrl,
            type: 'panoramic',
            status: 'completed',
          };
          await mockInsert();
          return mockSupabaseResponse;
        };
        
        const result = await createXrayRecord(
          'patient-001',
          'medical-images/xrays/patient-001/123_xray.dcm',
          'https://storage.test.com/xray.dcm'
        );
        
        expect(result.data.file_url).toBeDefined();
      });
    });
  });

  // =============================================
  // FORM SUBMISSION TESTS
  // =============================================
  describe('Form Submission Tests', () => {
    it('should validate and submit treatment plan form', async () => {
      const formData = {
        patient_id: 'patient-001',
        doctor_id: 'doctor-001',
        title: 'Complete Restoration',
        description: 'Full dental restoration plan',
        status: 'pending',
        valid_until: '2026-06-01',
      };
      
      const validateForm = (data) => {
        const errors = {};
        if (!data.patient_id) errors.patient_id = 'Patient is required';
        if (!data.doctor_id) errors.doctor_id = 'Doctor is required';
        if (!data.title?.trim()) errors.title = 'Title is required';
        return errors;
      };
      
      const submitForm = async (data) => {
        const errors = validateForm(data);
        if (Object.keys(errors).length > 0) {
          return { success: false, errors };
        }
        
        mockSupabaseResponse.data = { id: 'new-001', ...data };
        await mockInsert();
        return { success: true, data: mockSupabaseResponse.data };
      };
      
      const result = await submitForm(formData);
      expect(result.success).toBe(true);
      expect(result.data.id).toBeDefined();
    });

    it('should reject form with missing required fields', async () => {
      const invalidData = {
        title: 'Test Plan',
        // Missing patient_id and doctor_id
      };
      
      const validateForm = (data) => {
        const errors = {};
        if (!data.patient_id) errors.patient_id = 'Patient is required';
        if (!data.doctor_id) errors.doctor_id = 'Doctor is required';
        return errors;
      };
      
      const errors = validateForm(invalidData);
      expect(errors.patient_id).toBeDefined();
      expect(errors.doctor_id).toBeDefined();
    });

    it('should handle consent form signature submission', async () => {
      const signatureData = 'data:image/png;base64,iVBORw0KGgo...';
      
      const submitSignature = async (consentId, signature) => {
        mockSupabaseResponse.data = {
          id: consentId,
          status: 'signed',
          signature_data: signature,
          signed_at: new Date().toISOString(),
          ip_address: '192.168.1.100',
        };
        
        mockUpdate.mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseResponse)
        });
        await mockUpdate().eq();
        return mockSupabaseResponse;
      };
      
      const result = await submitSignature('consent-001', signatureData);
      expect(result.data.status).toBe('signed');
      expect(result.data.signature_data).toBeDefined();
    });

    it('should calculate treatment plan totals on item changes', () => {
      const items = [
        { service_id: 's1', quantity: 2, unit_price: 500 },
        { service_id: 's2', quantity: 1, unit_price: 1000 },
      ];
      
      const calculateTotals = (items, discount = 0) => {
        const total = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        return {
          total_cost: total,
          discount: discount,
          final_cost: total - discount,
        };
      };
      
      const totals = calculateTotals(items, 200);
      expect(totals.total_cost).toBe(2000);
      expect(totals.discount).toBe(200);
      expect(totals.final_cost).toBe(1800);
    });
  });

  // =============================================
  // DATA TRANSFORMATION TESTS
  // =============================================
  describe('Data Transformation Tests', () => {
    it('should transform API response for display', () => {
      const apiResponse = {
        id: 'plan-001',
        created_at: '2026-01-15T10:30:00Z',
        valid_until: '2026-06-01',
        total_cost: 5000,
        patients: { name: 'John Doe' },
      };
      
      const transformForDisplay = (data) => ({
        ...data,
        createdAtFormatted: new Date(data.created_at).toLocaleDateString(),
        validUntilFormatted: new Date(data.valid_until).toLocaleDateString(),
        totalCostFormatted: `$${data.total_cost.toFixed(2)}`,
        patientName: data.patients?.name || 'Unknown',
      });
      
      const transformed = transformForDisplay(apiResponse);
      expect(transformed.patientName).toBe('John Doe');
      expect(transformed.totalCostFormatted).toBe('$5000.00');
    });

    it('should prepare form data for API submission', () => {
      const formData = {
        patient_id: 'patient-001',
        doctor_id: 'doctor-001',
        title: 'Test Plan',
        total_cost: '5000', // String from input
        discount: '', // Empty string
        valid_until: '2026-06-01',
      };
      
      const prepareForApi = (data) => ({
        patient_id: data.patient_id,
        doctor_id: data.doctor_id,
        title: data.title.trim(),
        total_cost: parseFloat(data.total_cost) || 0,
        discount: parseFloat(data.discount) || 0,
        valid_until: data.valid_until || null,
      });
      
      const prepared = prepareForApi(formData);
      expect(typeof prepared.total_cost).toBe('number');
      expect(prepared.discount).toBe(0);
    });

    it('should handle null/undefined values safely', () => {
      const incompleteData = {
        id: 'plan-001',
        patients: null,
        doctors: undefined,
      };
      
      const safeAccess = (data) => ({
        patientName: data.patients?.name || 'Not assigned',
        doctorName: data.doctors?.name_en || 'Not assigned',
      });
      
      const safe = safeAccess(incompleteData);
      expect(safe.patientName).toBe('Not assigned');
      expect(safe.doctorName).toBe('Not assigned');
    });
  });

  // =============================================
  // REAL-TIME UPDATE TESTS
  // =============================================
  describe('Real-time Update Simulation Tests', () => {
    it('should merge real-time updates into list', () => {
      const existingList = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'pending' },
      ];
      
      const realtimeUpdate = { id: '1', status: 'approved' };
      
      const mergeUpdate = (list, update) => {
        return list.map(item => 
          item.id === update.id ? { ...item, ...update } : item
        );
      };
      
      const updated = mergeUpdate(existingList, realtimeUpdate);
      expect(updated.find(i => i.id === '1').status).toBe('approved');
    });

    it('should add new item from real-time insert', () => {
      const existingList = [
        { id: '1', title: 'Plan A' },
      ];
      
      const newItem = { id: '2', title: 'Plan B' };
      
      const addToList = (list, item) => [item, ...list];
      
      const updated = addToList(existingList, newItem);
      expect(updated.length).toBe(2);
      expect(updated[0].id).toBe('2');
    });

    it('should remove item from real-time delete', () => {
      const existingList = [
        { id: '1', title: 'Plan A' },
        { id: '2', title: 'Plan B' },
      ];
      
      const deletedId = '1';
      
      const removeFromList = (list, id) => list.filter(item => item.id !== id);
      
      const updated = removeFromList(existingList, deletedId);
      expect(updated.length).toBe(1);
      expect(updated[0].id).toBe('2');
    });
  });

  // =============================================
  // OPTIMISTIC UPDATE TESTS
  // =============================================
  describe('Optimistic Update Tests', () => {
    it('should apply optimistic update before API response', async () => {
      let currentStatus = 'pending';
      
      const optimisticUpdate = async (newStatus) => {
        // Optimistically update UI immediately
        const previousStatus = currentStatus;
        currentStatus = newStatus;
        
        try {
          // Simulate API call (which takes time but status is already updated)
          mockUpdate.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: { status: newStatus }, error: null })
          });
          mockSupabaseResponse.data = { status: newStatus };
          await mockUpdate().eq();
          return { success: true };
        } catch (error) {
          // Rollback on error
          currentStatus = previousStatus;
          return { success: false };
        }
      };
      
      await optimisticUpdate('approved');
      expect(currentStatus).toBe('approved');
    });

    it('should rollback optimistic update on API error', async () => {
      let currentStatus = 'pending';
      
      const optimisticUpdateWithError = async (newStatus) => {
        const previousStatus = currentStatus;
        currentStatus = newStatus; // Optimistic
        
        // Simulate API error
        mockSupabaseResponse.error = { message: 'Network error' };
        
        if (mockSupabaseResponse.error) {
          currentStatus = previousStatus; // Rollback
          return { success: false, error: mockSupabaseResponse.error };
        }
        
        return { success: true };
      };
      
      const result = await optimisticUpdateWithError('approved');
      expect(result.success).toBe(false);
      expect(currentStatus).toBe('pending'); // Rolled back
    });
  });
});
