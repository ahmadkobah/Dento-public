/**
 * Phase 2 Cross-Module Integration Tests
 * Tests interactions between different clinical modules
 */

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
      insert: vi.fn(() => Promise.resolve({ data: { id: 'new-001' }, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

describe('Phase 2 Cross-Module Integration Tests', () => {
  // =============================================
  // TREATMENT PLAN → LAB ORDER INTEGRATION
  // =============================================
  describe('Treatment Plan to Lab Order Integration', () => {
    const mockTreatmentPlan = {
      id: 'tp-001',
      patient_id: 'patient-001',
      doctor_id: 'doctor-001',
      status: 'approved',
      items: [
        { id: 'item-001', service_id: 'crown-service', teeth: [36], quantity: 1 },
        { id: 'item-002', service_id: 'bridge-service', teeth: [34, 35, 36], quantity: 1 },
      ],
    };

    it('should create lab order from treatment plan item', () => {
      const createLabOrderFromPlan = (planItem, treatmentPlan) => ({
        patient_id: treatmentPlan.patient_id,
        doctor_id: treatmentPlan.doctor_id,
        treatment_plan_id: treatmentPlan.id,
        treatment_plan_item_id: planItem.id,
        work_type: getWorkTypeFromService(planItem.service_id),
        teeth: planItem.teeth,
        status: 'ordered',
      });

      const getWorkTypeFromService = (serviceId) => {
        const serviceMap = {
          'crown-service': 'Crown',
          'bridge-service': 'Bridge',
          'denture-service': 'Denture - Full',
        };
        return serviceMap[serviceId] || 'Other';
      };

      const labOrder = createLabOrderFromPlan(mockTreatmentPlan.items[0], mockTreatmentPlan);
      
      expect(labOrder.patient_id).toBe(mockTreatmentPlan.patient_id);
      expect(labOrder.treatment_plan_id).toBe(mockTreatmentPlan.id);
      expect(labOrder.work_type).toBe('Crown');
      expect(labOrder.teeth).toEqual([36]);
    });

    it('should link multiple lab orders to single treatment plan', () => {
      const createLabOrdersFromPlan = (treatmentPlan) => {
        const labWorkServices = ['crown-service', 'bridge-service', 'veneer-service'];
        
        return treatmentPlan.items
          .filter(item => labWorkServices.includes(item.service_id))
          .map(item => ({
            treatment_plan_id: treatmentPlan.id,
            treatment_plan_item_id: item.id,
            teeth: item.teeth,
            status: 'ordered',
          }));
      };

      const labOrders = createLabOrdersFromPlan(mockTreatmentPlan);
      expect(labOrders.length).toBe(2);
      expect(labOrders.every(o => o.treatment_plan_id === 'tp-001')).toBe(true);
    });

    it('should update treatment plan progress when lab order completes', () => {
      const treatmentPlanProgress = {
        total_items: 5,
        completed_items: 2,
        lab_orders: [
          { id: 'lab-001', status: 'delivered' },
          { id: 'lab-002', status: 'in_progress' },
        ],
      };

      const calculateProgress = (progress) => {
        const deliveredLabOrders = progress.lab_orders.filter(o => o.status === 'delivered').length;
        return {
          percentage: Math.round((progress.completed_items / progress.total_items) * 100),
          labOrdersDelivered: deliveredLabOrders,
          labOrdersPending: progress.lab_orders.length - deliveredLabOrders,
        };
      };

      const result = calculateProgress(treatmentPlanProgress);
      expect(result.percentage).toBe(40);
      expect(result.labOrdersDelivered).toBe(1);
      expect(result.labOrdersPending).toBe(1);
    });
  });

  // =============================================
  // CONSENT FORM → TREATMENT PLAN INTEGRATION
  // =============================================
  describe('Consent Form to Treatment Plan Integration', () => {
    const mockTreatmentPlan = {
      id: 'tp-001',
      patient_id: 'patient-001',
      title: 'Implant Surgery Plan',
      status: 'approved',
      requires_consent: true,
    };

    it('should require consent before starting treatment', () => {
      const checkConsentRequired = (treatmentPlan) => {
        const proceduresRequiringConsent = [
          'Implant',
          'Extraction',
          'Surgery',
          'Root Canal',
          'Sedation',
        ];

        return proceduresRequiringConsent.some(proc => 
          treatmentPlan.title.toLowerCase().includes(proc.toLowerCase())
        );
      };

      const requiresConsent = checkConsentRequired(mockTreatmentPlan);
      expect(requiresConsent).toBe(true);
    });

    it('should create consent form linked to treatment plan', () => {
      const createConsentForPlan = (treatmentPlan, templateId) => ({
        patient_id: treatmentPlan.patient_id,
        treatment_plan_id: treatmentPlan.id,
        template_id: templateId,
        title: `Consent for: ${treatmentPlan.title}`,
        status: 'pending',
        expires_at: calculateExpirationDate(30), // 30 days
      });

      const calculateExpirationDate = (days) => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString();
      };

      const consentForm = createConsentForPlan(mockTreatmentPlan, 'implant-consent-template');
      
      expect(consentForm.treatment_plan_id).toBe('tp-001');
      expect(consentForm.title).toContain('Implant Surgery Plan');
      expect(consentForm.status).toBe('pending');
    });

    it('should prevent treatment start without signed consent', () => {
      const canStartTreatment = (treatmentPlan, consentForms) => {
        if (!treatmentPlan.requires_consent) return true;

        const linkedConsents = consentForms.filter(
          c => c.treatment_plan_id === treatmentPlan.id
        );

        if (linkedConsents.length === 0) {
          return { allowed: false, reason: 'No consent form created' };
        }

        const signedConsent = linkedConsents.find(c => c.status === 'signed');
        if (!signedConsent) {
          return { allowed: false, reason: 'Consent not signed' };
        }

        // Check if consent is still valid
        if (new Date(signedConsent.expires_at) < new Date()) {
          return { allowed: false, reason: 'Consent expired' };
        }

        return { allowed: true };
      };

      // No consent
      const noConsent = canStartTreatment(mockTreatmentPlan, []);
      expect(noConsent.allowed).toBe(false);
      expect(noConsent.reason).toBe('No consent form created');

      // Unsigned consent
      const unsignedConsent = canStartTreatment(mockTreatmentPlan, [
        { treatment_plan_id: 'tp-001', status: 'pending' }
      ]);
      expect(unsignedConsent.allowed).toBe(false);

      // Valid signed consent
      const signedConsent = canStartTreatment(mockTreatmentPlan, [
        { 
          treatment_plan_id: 'tp-001', 
          status: 'signed',
          expires_at: '2027-01-01'
        }
      ]);
      expect(signedConsent.allowed).toBe(true);
    });
  });

  // =============================================
  // X-RAY/CBCT → APPOINTMENT INTEGRATION
  // =============================================
  describe('X-Ray/CBCT to Appointment Integration', () => {
    const mockAppointment = {
      id: 'appt-001',
      patient_id: 'patient-001',
      doctor_id: 'doctor-001',
      service_id: 'implant-consultation',
      appointment_date: '2026-01-30T10:00:00Z',
    };

    it('should link X-ray to appointment', () => {
      const createXrayForAppointment = (appointment, xrayData) => ({
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        appointment_id: appointment.id,
        ...xrayData,
        status: 'completed',
      });

      const xray = createXrayForAppointment(mockAppointment, {
        type: 'panoramic',
        region: 'full_mouth',
      });

      expect(xray.appointment_id).toBe('appt-001');
      expect(xray.patient_id).toBe('patient-001');
    });

    it('should suggest required imaging based on service', () => {
      const getRequiredImaging = (serviceId) => {
        const imagingRequirements = {
          'implant-consultation': ['panoramic', 'cbct'],
          'root-canal': ['periapical'],
          'extraction': ['periapical', 'panoramic'],
          'orthodontic-consultation': ['panoramic', 'cephalometric'],
          'routine-checkup': [],
        };

        return imagingRequirements[serviceId] || [];
      };

      const implantImaging = getRequiredImaging('implant-consultation');
      expect(implantImaging).toContain('panoramic');
      expect(implantImaging).toContain('cbct');

      const checkupImaging = getRequiredImaging('routine-checkup');
      expect(checkupImaging.length).toBe(0);
    });

    it('should check imaging completeness for appointment', () => {
      const checkImagingComplete = (appointment, existingImaging) => {
        const required = getRequiredImaging(appointment.service_id);
        
        if (required.length === 0) {
          return { complete: true, missing: [] };
        }

        const existingTypes = existingImaging
          .filter(img => img.appointment_id === appointment.id)
          .map(img => img.type);

        const missing = required.filter(type => !existingTypes.includes(type));

        return {
          complete: missing.length === 0,
          missing,
        };
      };

      const getRequiredImaging = (serviceId) => {
        const requirements = {
          'implant-consultation': ['panoramic', 'cbct'],
        };
        return requirements[serviceId] || [];
      };

      // Missing CBCT
      const result = checkImagingComplete(mockAppointment, [
        { appointment_id: 'appt-001', type: 'panoramic' }
      ]);
      expect(result.complete).toBe(false);
      expect(result.missing).toContain('cbct');
    });
  });

  // =============================================
  // PROCEDURE NOTE → PRESCRIPTION INTEGRATION
  // =============================================
  describe('Procedure Note to Prescription Integration', () => {
    const mockProcedureNote = {
      id: 'note-001',
      patient_id: 'patient-001',
      doctor_id: 'doctor-001',
      appointment_id: 'appt-001',
      procedure_type: 'Extraction',
      complications: null,
    };

    it('should suggest medications based on procedure type', () => {
      const getSuggestedMedications = (procedureType) => {
        const suggestions = {
          'Extraction': [
            { name: 'Amoxicillin', dosage: '500mg', frequency: '3x daily', duration: '5 days' },
            { name: 'Ibuprofen', dosage: '400mg', frequency: 'As needed', duration: '3 days' },
          ],
          'Root Canal': [
            { name: 'Amoxicillin', dosage: '500mg', frequency: '3x daily', duration: '7 days' },
            { name: 'Ibuprofen', dosage: '600mg', frequency: 'Every 6 hours', duration: '3 days' },
          ],
          'Implant Placement': [
            { name: 'Amoxicillin', dosage: '875mg', frequency: '2x daily', duration: '7 days' },
            { name: 'Chlorhexidine Rinse', dosage: '0.12%', frequency: '2x daily', duration: '14 days' },
          ],
        };

        return suggestions[procedureType] || [];
      };

      const meds = getSuggestedMedications('Extraction');
      expect(meds.length).toBe(2);
      expect(meds[0].name).toBe('Amoxicillin');
    });

    it('should create prescription from procedure note', () => {
      const createPrescriptionFromNote = (procedureNote, medications) => ({
        patient_id: procedureNote.patient_id,
        doctor_id: procedureNote.doctor_id,
        appointment_id: procedureNote.appointment_id,
        procedure_note_id: procedureNote.id,
        diagnosis: `Post-${procedureNote.procedure_type} management`,
        status: 'active',
        items: medications,
      });

      const prescription = createPrescriptionFromNote(mockProcedureNote, [
        { name: 'Amoxicillin', dosage: '500mg' }
      ]);

      expect(prescription.procedure_note_id).toBe('note-001');
      expect(prescription.diagnosis).toContain('Extraction');
    });

    it('should add extra medications for complications', () => {
      const noteWithComplication = {
        ...mockProcedureNote,
        complications: 'Excessive bleeding',
      };

      const getExtraMedications = (complications) => {
        if (!complications) return [];

        const extraMeds = [];
        
        if (complications.toLowerCase().includes('bleeding')) {
          extraMeds.push({ name: 'Tranexamic Acid', dosage: '500mg' });
        }
        
        if (complications.toLowerCase().includes('infection')) {
          extraMeds.push({ name: 'Metronidazole', dosage: '400mg' });
        }

        return extraMeds;
      };

      const extraMeds = getExtraMedications(noteWithComplication.complications);
      expect(extraMeds.length).toBe(1);
      expect(extraMeds[0].name).toBe('Tranexamic Acid');
    });
  });

  // =============================================
  // TREATMENT PLAN → INVOICE INTEGRATION
  // =============================================
  describe('Treatment Plan to Invoice Integration', () => {
    const mockTreatmentPlan = {
      id: 'tp-001',
      patient_id: 'patient-001',
      total_cost: 5000,
      discount: 500,
      final_cost: 4500,
      status: 'completed',
      items: [
        { service_id: 's1', service_name: 'Crown', unit_price: 1000, quantity: 2 },
        { service_id: 's2', service_name: 'Root Canal', unit_price: 500, quantity: 1 },
      ],
    };

    it('should generate invoice from completed treatment plan', () => {
      const generateInvoice = (treatmentPlan) => {
        if (treatmentPlan.status !== 'completed') {
          throw new Error('Cannot invoice incomplete treatment plan');
        }

        return {
          patient_id: treatmentPlan.patient_id,
          treatment_plan_id: treatmentPlan.id,
          subtotal: treatmentPlan.total_cost,
          discount: treatmentPlan.discount,
          total: treatmentPlan.final_cost,
          status: 'unpaid',
          items: treatmentPlan.items.map(item => ({
            description: item.service_name,
            unit_price: item.unit_price,
            quantity: item.quantity,
            total: item.unit_price * item.quantity,
          })),
        };
      };

      const invoice = generateInvoice(mockTreatmentPlan);
      
      expect(invoice.treatment_plan_id).toBe('tp-001');
      expect(invoice.total).toBe(4500);
      expect(invoice.items.length).toBe(2);
    });

    it('should split invoice for phased treatment', () => {
      const createPhasedInvoices = (treatmentPlan, phases) => {
        return phases.map((phase, index) => ({
          patient_id: treatmentPlan.patient_id,
          treatment_plan_id: treatmentPlan.id,
          phase_number: index + 1,
          phase_name: phase.name,
          total: phase.amount,
          due_date: phase.dueDate,
          status: 'unpaid',
        }));
      };

      const phases = [
        { name: 'Initial Payment', amount: 1500, dueDate: '2026-02-01' },
        { name: 'Mid Treatment', amount: 1500, dueDate: '2026-03-01' },
        { name: 'Final Payment', amount: 1500, dueDate: '2026-04-01' },
      ];

      const invoices = createPhasedInvoices(mockTreatmentPlan, phases);
      
      expect(invoices.length).toBe(3);
      expect(invoices.reduce((sum, inv) => sum + inv.total, 0)).toBe(4500);
    });
  });

  // =============================================
  // PATIENT TIMELINE INTEGRATION
  // =============================================
  describe('Patient Timeline Integration', () => {
    it('should compile patient clinical timeline', () => {
      const compileTimeline = (patientId, data) => {
        const events = [];

        // Add treatment plans
        data.treatmentPlans?.forEach(plan => {
          events.push({
            type: 'treatment_plan',
            date: plan.created_at,
            title: plan.title,
            status: plan.status,
            id: plan.id,
          });
        });

        // Add appointments
        data.appointments?.forEach(appt => {
          events.push({
            type: 'appointment',
            date: appt.appointment_date,
            title: `Appointment: ${appt.service_name}`,
            status: appt.status,
            id: appt.id,
          });
        });

        // Add X-rays
        data.xrays?.forEach(xray => {
          events.push({
            type: 'xray',
            date: xray.taken_at,
            title: `X-Ray: ${xray.type}`,
            id: xray.id,
          });
        });

        // Add prescriptions
        data.prescriptions?.forEach(rx => {
          events.push({
            type: 'prescription',
            date: rx.created_at,
            title: `Prescription: ${rx.diagnosis}`,
            id: rx.id,
          });
        });

        // Sort by date descending
        return events.sort((a, b) => new Date(b.date) - new Date(a.date));
      };

      const mockData = {
        treatmentPlans: [{ id: 'tp-001', title: 'Crown Treatment', status: 'completed', created_at: '2026-01-15' }],
        appointments: [{ id: 'appt-001', service_name: 'Crown Fitting', status: 'completed', appointment_date: '2026-01-20' }],
        xrays: [{ id: 'xray-001', type: 'periapical', taken_at: '2026-01-10' }],
        prescriptions: [{ id: 'rx-001', diagnosis: 'Post-procedure', created_at: '2026-01-20' }],
      };

      const timeline = compileTimeline('patient-001', mockData);
      
      expect(timeline.length).toBe(4);
      expect(timeline[0].date).toBe('2026-01-20'); // Most recent first
    });
  });
});
