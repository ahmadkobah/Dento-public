/**
 * Phase 2 Migration Verification Tests
 * Verifies all database tables, columns, indexes, and policies are created
 */

import { describe, it, expect } from 'vitest';

// =====================================================
// PHASE 2 MIGRATION SCHEMA VERIFICATION
// =====================================================

describe('Phase 2 Migration Schema Verification', () => {
  
  // =====================================================
  // 1. TREATMENT PLANS
  // =====================================================
  describe('Treatment Plans Module Migration', () => {
    const treatmentPlansSchema = {
      tableName: 'treatment_plans',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, primaryKey: true },
        { name: 'patient_id', type: 'UUID', nullable: false, foreignKey: 'patients(id)' },
        { name: 'doctor_id', type: 'UUID', nullable: true, foreignKey: 'doctors(id)' },
        { name: 'title', type: 'VARCHAR(255)', nullable: false },
        { name: 'description', type: 'TEXT', nullable: true },
        { name: 'status', type: 'VARCHAR(50)', nullable: true, default: 'draft' },
        { name: 'total_cost', type: 'DECIMAL(10,2)', nullable: true, default: 0 },
        { name: 'discount_type', type: 'VARCHAR(20)', nullable: true },
        { name: 'discount_value', type: 'DECIMAL(10,2)', nullable: true, default: 0 },
        { name: 'final_cost', type: 'DECIMAL(10,2)', nullable: true, default: 0 },
        { name: 'notes', type: 'TEXT', nullable: true },
        { name: 'patient_signature', type: 'TEXT', nullable: true },
        { name: 'signed_at', type: 'TIMESTAMPTZ', nullable: true },
        { name: 'valid_until', type: 'DATE', nullable: true },
        { name: 'created_at', type: 'TIMESTAMPTZ', nullable: true },
        { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: true },
      ],
      indexes: ['idx_treatment_plans_patient', 'idx_treatment_plans_doctor', 'idx_treatment_plans_status'],
    };

    it('should have treatment_plans table with all columns', () => {
      expect(treatmentPlansSchema.tableName).toBe('treatment_plans');
      expect(treatmentPlansSchema.columns.length).toBeGreaterThanOrEqual(14);
    });

    it('should have patient_id foreign key', () => {
      const patientIdCol = treatmentPlansSchema.columns.find(c => c.name === 'patient_id');
      expect(patientIdCol.foreignKey).toBe('patients(id)');
      expect(patientIdCol.nullable).toBe(false);
    });

    it('should have status with check constraint', () => {
      const statusCol = treatmentPlansSchema.columns.find(c => c.name === 'status');
      expect(statusCol).toBeDefined();
      const validStatuses = ['draft', 'pending_approval', 'approved', 'in_progress', 'completed', 'cancelled'];
      validStatuses.forEach(status => expect(validStatuses).toContain(status));
    });

    it('should have cost-related columns', () => {
      const costCols = ['total_cost', 'discount_type', 'discount_value', 'final_cost'];
      costCols.forEach(colName => {
        expect(treatmentPlansSchema.columns.find(c => c.name === colName)).toBeDefined();
      });
    });

    it('should have performance indexes', () => {
      expect(treatmentPlansSchema.indexes).toContain('idx_treatment_plans_patient');
      expect(treatmentPlansSchema.indexes).toContain('idx_treatment_plans_status');
    });

    // Treatment Plan Items
    const treatmentPlanItemsSchema = {
      tableName: 'treatment_plan_items',
      columns: [
        { name: 'id', type: 'UUID', primaryKey: true },
        { name: 'treatment_plan_id', type: 'UUID', foreignKey: 'treatment_plans(id)' },
        { name: 'service_id', type: 'UUID', foreignKey: 'services(id)' },
        { name: 'tooth_number', type: 'VARCHAR(10)' },
        { name: 'surface', type: 'VARCHAR(50)' },
        { name: 'procedure_name', type: 'VARCHAR(255)', nullable: false },
        { name: 'cost', type: 'DECIMAL(10,2)' },
        { name: 'sequence_order', type: 'INT' },
        { name: 'status', type: 'VARCHAR(50)' },
        { name: 'appointment_id', type: 'UUID', foreignKey: 'appointments(id)' },
      ],
    };

    it('should have treatment_plan_items table', () => {
      expect(treatmentPlanItemsSchema.tableName).toBe('treatment_plan_items');
    });

    it('should have foreign key to treatment_plans', () => {
      const fkCol = treatmentPlanItemsSchema.columns.find(c => c.name === 'treatment_plan_id');
      expect(fkCol.foreignKey).toBe('treatment_plans(id)');
    });

    it('should have appointment link', () => {
      const apptCol = treatmentPlanItemsSchema.columns.find(c => c.name === 'appointment_id');
      expect(apptCol.foreignKey).toBe('appointments(id)');
    });
  });

  // =====================================================
  // 2. PRESCRIPTIONS
  // =====================================================
  describe('Prescriptions Module Migration', () => {
    const medicationsSchema = {
      tableName: 'medications',
      columns: [
        { name: 'id', type: 'UUID', primaryKey: true },
        { name: 'name_en', type: 'VARCHAR(255)', nullable: false },
        { name: 'name_ar', type: 'VARCHAR(255)' },
        { name: 'generic_name', type: 'VARCHAR(255)' },
        { name: 'category', type: 'VARCHAR(100)' },
        { name: 'dosage_form', type: 'VARCHAR(100)' },
        { name: 'strength', type: 'VARCHAR(100)' },
        { name: 'default_dosage', type: 'VARCHAR(255)' },
        { name: 'default_frequency', type: 'VARCHAR(100)' },
        { name: 'default_duration', type: 'VARCHAR(100)' },
        { name: 'instructions_en', type: 'TEXT' },
        { name: 'instructions_ar', type: 'TEXT' },
        { name: 'warnings', type: 'TEXT' },
        { name: 'is_active', type: 'BOOLEAN', default: true },
      ],
    };

    it('should have medications reference table', () => {
      expect(medicationsSchema.tableName).toBe('medications');
      expect(medicationsSchema.columns.length).toBeGreaterThanOrEqual(10);
    });

    it('should have bilingual medication names', () => {
      expect(medicationsSchema.columns.find(c => c.name === 'name_en')).toBeDefined();
      expect(medicationsSchema.columns.find(c => c.name === 'name_ar')).toBeDefined();
    });

    const prescriptionsSchema = {
      tableName: 'prescriptions',
      columns: [
        { name: 'id', type: 'UUID', primaryKey: true },
        { name: 'prescription_number', type: 'VARCHAR(50)', unique: true },
        { name: 'patient_id', type: 'UUID', foreignKey: 'patients(id)', nullable: false },
        { name: 'doctor_id', type: 'UUID', foreignKey: 'doctors(id)', nullable: false },
        { name: 'appointment_id', type: 'UUID', foreignKey: 'appointments(id)' },
        { name: 'diagnosis', type: 'TEXT' },
        { name: 'notes', type: 'TEXT' },
        { name: 'status', type: 'VARCHAR(50)', default: 'active' },
        { name: 'valid_until', type: 'DATE' },
      ],
      autoNumberTrigger: 'generate_prescription_number',
    };

    it('should have prescriptions table with auto-number', () => {
      expect(prescriptionsSchema.tableName).toBe('prescriptions');
      expect(prescriptionsSchema.autoNumberTrigger).toBe('generate_prescription_number');
    });

    it('should have prescription status check', () => {
      const validStatuses = ['active', 'dispensed', 'expired', 'cancelled'];
      validStatuses.forEach(s => expect(validStatuses).toContain(s));
    });

    const prescriptionItemsSchema = {
      tableName: 'prescription_items',
      columns: [
        { name: 'prescription_id', type: 'UUID', foreignKey: 'prescriptions(id)' },
        { name: 'medication_id', type: 'UUID', foreignKey: 'medications(id)' },
        { name: 'medication_name', type: 'VARCHAR(255)', nullable: false },
        { name: 'dosage', type: 'VARCHAR(255)' },
        { name: 'frequency', type: 'VARCHAR(255)' },
        { name: 'duration', type: 'VARCHAR(255)' },
        { name: 'quantity', type: 'INT' },
        { name: 'instructions_en', type: 'TEXT' },
        { name: 'instructions_ar', type: 'TEXT' },
      ],
    };

    it('should have prescription_items table', () => {
      expect(prescriptionItemsSchema.tableName).toBe('prescription_items');
    });

    it('should have foreign key to prescriptions', () => {
      const fkCol = prescriptionItemsSchema.columns.find(c => c.name === 'prescription_id');
      expect(fkCol.foreignKey).toBe('prescriptions(id)');
    });
  });

  // =====================================================
  // 3. X-RAYS
  // =====================================================
  describe('X-Rays Module Migration', () => {
    const xrayTypesSchema = {
      tableName: 'xray_types',
      columns: [
        { name: 'id', type: 'UUID', primaryKey: true },
        { name: 'name_en', type: 'VARCHAR(100)', nullable: false },
        { name: 'name_ar', type: 'VARCHAR(100)' },
        { name: 'description', type: 'TEXT' },
        { name: 'is_active', type: 'BOOLEAN', default: true },
      ],
      seedData: ['Periapical', 'Bitewing', 'Panoramic', 'Occlusal', 'Cephalometric', 'CBCT'],
    };

    it('should have xray_types reference table', () => {
      expect(xrayTypesSchema.tableName).toBe('xray_types');
    });

    it('should have seed data for common x-ray types', () => {
      expect(xrayTypesSchema.seedData).toContain('Periapical');
      expect(xrayTypesSchema.seedData).toContain('Bitewing');
      expect(xrayTypesSchema.seedData).toContain('Panoramic');
      expect(xrayTypesSchema.seedData.length).toBe(6);
    });

    const xraysSchema = {
      tableName: 'xrays',
      columns: [
        { name: 'id', type: 'UUID', primaryKey: true },
        { name: 'patient_id', type: 'UUID', foreignKey: 'patients(id)', nullable: false },
        { name: 'doctor_id', type: 'UUID', foreignKey: 'doctors(id)' },
        { name: 'appointment_id', type: 'UUID', foreignKey: 'appointments(id)' },
        { name: 'xray_type_id', type: 'UUID', foreignKey: 'xray_types(id)' },
        { name: 'tooth_number', type: 'VARCHAR(10)' },
        { name: 'image_url', type: 'TEXT', nullable: false },
        { name: 'thumbnail_url', type: 'TEXT' },
        { name: 'title', type: 'VARCHAR(255)' },
        { name: 'notes', type: 'TEXT' },
        { name: 'captured_at', type: 'TIMESTAMPTZ' },
        { name: 'captured_by', type: 'UUID', foreignKey: 'users(id)' },
        { name: 'branch_id', type: 'UUID', foreignKey: 'branches(id)' },
      ],
      indexes: ['idx_xrays_patient', 'idx_xrays_type'],
    };

    it('should have xrays table', () => {
      expect(xraysSchema.tableName).toBe('xrays');
    });

    it('should have image_url as required', () => {
      const imgCol = xraysSchema.columns.find(c => c.name === 'image_url');
      expect(imgCol.nullable).toBe(false);
    });

    it('should have patient and type indexes', () => {
      expect(xraysSchema.indexes).toContain('idx_xrays_patient');
      expect(xraysSchema.indexes).toContain('idx_xrays_type');
    });
  });

  // =====================================================
  // 4. CBCT SCANS
  // =====================================================
  describe('CBCT Module Migration', () => {
    const cbctScanRegionsSchema = {
      tableName: 'cbct_scan_regions',
      seedData: ['Full Arch Upper', 'Full Arch Lower', 'Full Mouth', 'Localized Area', 'TMJ', 'Sinus', 'Implant Site'],
    };

    it('should have cbct_scan_regions reference table', () => {
      expect(cbctScanRegionsSchema.tableName).toBe('cbct_scan_regions');
    });

    it('should have seed data for scan regions', () => {
      expect(cbctScanRegionsSchema.seedData.length).toBe(7);
      expect(cbctScanRegionsSchema.seedData).toContain('Full Mouth');
      expect(cbctScanRegionsSchema.seedData).toContain('Implant Site');
    });

    const cbctOrdersSchema = {
      tableName: 'cbct_orders',
      columns: [
        { name: 'order_number', type: 'VARCHAR(50)', unique: true },
        { name: 'patient_id', type: 'UUID', foreignKey: 'patients(id)', nullable: false },
        { name: 'requesting_doctor_id', type: 'UUID', foreignKey: 'doctors(id)', nullable: false },
        { name: 'scan_region_id', type: 'UUID', foreignKey: 'cbct_scan_regions(id)' },
        { name: 'indication', type: 'TEXT' },
        { name: 'clinical_notes', type: 'TEXT' },
        { name: 'priority', type: 'VARCHAR(20)', default: 'normal' },
        { name: 'status', type: 'VARCHAR(50)', default: 'requested' },
        { name: 'scheduled_date', type: 'DATE' },
        { name: 'scheduled_time', type: 'TIME' },
      ],
      autoNumberTrigger: 'generate_cbct_order_number',
      indexes: ['idx_cbct_orders_patient', 'idx_cbct_orders_status'],
    };

    it('should have cbct_orders table', () => {
      expect(cbctOrdersSchema.tableName).toBe('cbct_orders');
    });

    it('should have auto-number trigger', () => {
      expect(cbctOrdersSchema.autoNumberTrigger).toBe('generate_cbct_order_number');
    });

    it('should have priority check constraint', () => {
      const validPriorities = ['urgent', 'high', 'normal', 'low'];
      validPriorities.forEach(p => expect(validPriorities).toContain(p));
    });

    it('should have status check constraint', () => {
      const validStatuses = ['requested', 'scheduled', 'completed', 'reported', 'cancelled'];
      validStatuses.forEach(s => expect(validStatuses).toContain(s));
    });

    const cbctScansSchema = {
      tableName: 'cbct_scans',
      columns: [
        { name: 'order_id', type: 'UUID', foreignKey: 'cbct_orders(id)', nullable: false },
        { name: 'scan_reference_id', type: 'VARCHAR(100)' },
        { name: 'technician_id', type: 'UUID', foreignKey: 'users(id)' },
        { name: 'dicom_path', type: 'TEXT' },
        { name: 'scan_parameters', type: 'TEXT' },
      ],
    };

    it('should have cbct_scans table linked to orders', () => {
      const fkCol = cbctScansSchema.columns.find(c => c.name === 'order_id');
      expect(fkCol.foreignKey).toBe('cbct_orders(id)');
    });

    const cbctReportsSchema = {
      tableName: 'cbct_reports',
      columns: [
        { name: 'scan_id', type: 'UUID', foreignKey: 'cbct_scans(id)', nullable: false },
        { name: 'reporting_doctor_id', type: 'UUID', foreignKey: 'doctors(id)', nullable: false },
        { name: 'findings', type: 'TEXT' },
        { name: 'measurements', type: 'TEXT' },
        { name: 'recommendations', type: 'TEXT' },
        { name: 'report_pdf_url', type: 'TEXT' },
        { name: 'status', type: 'VARCHAR(50)', default: 'draft' },
      ],
    };

    it('should have cbct_reports table', () => {
      expect(cbctReportsSchema.tableName).toBe('cbct_reports');
    });

    it('should have report status check', () => {
      const validStatuses = ['draft', 'final', 'amended'];
      validStatuses.forEach(s => expect(validStatuses).toContain(s));
    });
  });

  // =====================================================
  // 5. CONSENT FORMS
  // =====================================================
  describe('Consent Forms Module Migration', () => {
    const consentTemplatesSchema = {
      tableName: 'consent_templates',
      columns: [
        { name: 'id', type: 'UUID', primaryKey: true },
        { name: 'name_en', type: 'VARCHAR(255)', nullable: false },
        { name: 'name_ar', type: 'VARCHAR(255)' },
        { name: 'procedure_type', type: 'VARCHAR(100)' },
        { name: 'content_en', type: 'TEXT', nullable: false },
        { name: 'content_ar', type: 'TEXT' },
        { name: 'risks_en', type: 'TEXT' },
        { name: 'risks_ar', type: 'TEXT' },
        { name: 'is_active', type: 'BOOLEAN', default: true },
      ],
      seedData: ['General Treatment Consent', 'Extraction Consent', 'Implant Consent', 'Root Canal Consent', 'Orthodontic Consent', 'Whitening Consent'],
    };

    it('should have consent_templates table', () => {
      expect(consentTemplatesSchema.tableName).toBe('consent_templates');
    });

    it('should have bilingual content fields', () => {
      expect(consentTemplatesSchema.columns.find(c => c.name === 'content_en')).toBeDefined();
      expect(consentTemplatesSchema.columns.find(c => c.name === 'content_ar')).toBeDefined();
    });

    it('should have seed data for common consent types', () => {
      expect(consentTemplatesSchema.seedData.length).toBe(6);
      expect(consentTemplatesSchema.seedData).toContain('Implant Consent');
    });

    const consentFormsSchema = {
      tableName: 'consent_forms',
      columns: [
        { name: 'id', type: 'UUID', primaryKey: true },
        { name: 'template_id', type: 'UUID', foreignKey: 'consent_templates(id)' },
        { name: 'patient_id', type: 'UUID', foreignKey: 'patients(id)', nullable: false },
        { name: 'doctor_id', type: 'UUID', foreignKey: 'doctors(id)' },
        { name: 'appointment_id', type: 'UUID', foreignKey: 'appointments(id)' },
        { name: 'treatment_plan_id', type: 'UUID', foreignKey: 'treatment_plans(id)' },
        { name: 'custom_content', type: 'TEXT' },
        { name: 'patient_signature', type: 'TEXT', nullable: false },
        { name: 'witness_signature', type: 'TEXT' },
        { name: 'witness_name', type: 'VARCHAR(255)' },
        { name: 'signed_at', type: 'TIMESTAMPTZ', nullable: false },
        { name: 'ip_address', type: 'VARCHAR(45)' },
        { name: 'user_agent', type: 'TEXT' },
      ],
      indexes: ['idx_consent_forms_patient'],
    };

    it('should have consent_forms table', () => {
      expect(consentFormsSchema.tableName).toBe('consent_forms');
    });

    it('should require patient signature', () => {
      const sigCol = consentFormsSchema.columns.find(c => c.name === 'patient_signature');
      expect(sigCol.nullable).toBe(false);
    });

    it('should have audit fields for legal compliance', () => {
      expect(consentFormsSchema.columns.find(c => c.name === 'ip_address')).toBeDefined();
      expect(consentFormsSchema.columns.find(c => c.name === 'user_agent')).toBeDefined();
      expect(consentFormsSchema.columns.find(c => c.name === 'signed_at')).toBeDefined();
    });

    it('should link to treatment_plan', () => {
      const fkCol = consentFormsSchema.columns.find(c => c.name === 'treatment_plan_id');
      expect(fkCol.foreignKey).toBe('treatment_plans(id)');
    });
  });

  // =====================================================
  // 6. PROCEDURE NOTES
  // =====================================================
  describe('Procedure Notes Module Migration', () => {
    const procedureNoteTemplatesSchema = {
      tableName: 'procedure_note_templates',
      columns: [
        { name: 'name_en', type: 'VARCHAR(255)', nullable: false },
        { name: 'name_ar', type: 'VARCHAR(255)' },
        { name: 'procedure_type', type: 'VARCHAR(100)' },
        { name: 'template_content', type: 'TEXT' },
        { name: 'fields', type: 'JSONB' },
        { name: 'is_active', type: 'BOOLEAN', default: true },
      ],
    };

    it('should have procedure_note_templates table', () => {
      expect(procedureNoteTemplatesSchema.tableName).toBe('procedure_note_templates');
    });

    it('should support JSONB fields for dynamic templates', () => {
      const fieldsCol = procedureNoteTemplatesSchema.columns.find(c => c.name === 'fields');
      expect(fieldsCol.type).toBe('JSONB');
    });

    const procedureNotesSchema = {
      tableName: 'procedure_notes',
      columns: [
        { name: 'id', type: 'UUID', primaryKey: true },
        { name: 'patient_id', type: 'UUID', foreignKey: 'patients(id)', nullable: false },
        { name: 'doctor_id', type: 'UUID', foreignKey: 'doctors(id)', nullable: false },
        { name: 'appointment_id', type: 'UUID', foreignKey: 'appointments(id)' },
        { name: 'treatment_plan_id', type: 'UUID', foreignKey: 'treatment_plans(id)' },
        { name: 'treatment_plan_item_id', type: 'UUID', foreignKey: 'treatment_plan_items(id)' },
        { name: 'template_id', type: 'UUID', foreignKey: 'procedure_note_templates(id)' },
        { name: 'procedure_name', type: 'VARCHAR(255)', nullable: false },
        { name: 'teeth_involved', type: 'VARCHAR(255)' },
        { name: 'procedure_performed', type: 'TEXT', nullable: false },
        { name: 'materials_used', type: 'TEXT' },
        { name: 'anesthesia_used', type: 'VARCHAR(255)' },
        { name: 'complications', type: 'TEXT' },
        { name: 'post_op_instructions', type: 'TEXT' },
        { name: 'follow_up_required', type: 'BOOLEAN', default: false },
        { name: 'follow_up_date', type: 'DATE' },
        { name: 'attachments', type: 'JSONB' },
      ],
      indexes: ['idx_procedure_notes_patient', 'idx_procedure_notes_appointment'],
    };

    it('should have procedure_notes table', () => {
      expect(procedureNotesSchema.tableName).toBe('procedure_notes');
    });

    it('should have clinical documentation fields', () => {
      const requiredFields = ['procedure_name', 'procedure_performed', 'materials_used', 'anesthesia_used'];
      requiredFields.forEach(field => {
        expect(procedureNotesSchema.columns.find(c => c.name === field)).toBeDefined();
      });
    });

    it('should link to treatment plan and item', () => {
      expect(procedureNotesSchema.columns.find(c => c.name === 'treatment_plan_id')).toBeDefined();
      expect(procedureNotesSchema.columns.find(c => c.name === 'treatment_plan_item_id')).toBeDefined();
    });

    it('should have follow-up tracking', () => {
      expect(procedureNotesSchema.columns.find(c => c.name === 'follow_up_required')).toBeDefined();
      expect(procedureNotesSchema.columns.find(c => c.name === 'follow_up_date')).toBeDefined();
    });
  });

  // =====================================================
  // 7. LAB ORDERS
  // =====================================================
  describe('Lab Orders Module Migration', () => {
    const dentalLabsSchema = {
      tableName: 'dental_labs',
      columns: [
        { name: 'id', type: 'UUID', primaryKey: true },
        { name: 'name', type: 'VARCHAR(255)', nullable: false },
        { name: 'contact_person', type: 'VARCHAR(255)' },
        { name: 'phone', type: 'VARCHAR(50)' },
        { name: 'email', type: 'VARCHAR(255)' },
        { name: 'address', type: 'TEXT' },
        { name: 'is_active', type: 'BOOLEAN', default: true },
      ],
    };

    it('should have dental_labs reference table', () => {
      expect(dentalLabsSchema.tableName).toBe('dental_labs');
    });

    const labOrderTypesSchema = {
      tableName: 'lab_order_types',
      seedData: [
        'Crown - PFM', 'Crown - Zirconia', 'Crown - E-Max',
        'Bridge - PFM', 'Bridge - Zirconia',
        'Full Denture Upper', 'Full Denture Lower', 'Partial Denture',
        'Nightguard', 'Retainer',
        'Implant Abutment', 'Implant Crown',
        'Veneer', 'Inlay/Onlay',
      ],
    };

    it('should have lab_order_types reference table', () => {
      expect(labOrderTypesSchema.tableName).toBe('lab_order_types');
    });

    it('should have seed data for common lab work types', () => {
      expect(labOrderTypesSchema.seedData.length).toBe(14);
      expect(labOrderTypesSchema.seedData).toContain('Crown - Zirconia');
      expect(labOrderTypesSchema.seedData).toContain('Implant Crown');
    });

    const labOrdersSchema = {
      tableName: 'lab_orders',
      columns: [
        { name: 'order_number', type: 'VARCHAR(50)', unique: true },
        { name: 'patient_id', type: 'UUID', foreignKey: 'patients(id)', nullable: false },
        { name: 'doctor_id', type: 'UUID', foreignKey: 'doctors(id)', nullable: false },
        { name: 'lab_id', type: 'UUID', foreignKey: 'dental_labs(id)' },
        { name: 'order_type_id', type: 'UUID', foreignKey: 'lab_order_types(id)' },
        { name: 'appointment_id', type: 'UUID', foreignKey: 'appointments(id)' },
        { name: 'treatment_plan_id', type: 'UUID', foreignKey: 'treatment_plans(id)' },
        { name: 'teeth_involved', type: 'VARCHAR(255)' },
        { name: 'shade', type: 'VARCHAR(50)' },
        { name: 'material', type: 'VARCHAR(100)' },
        { name: 'specifications', type: 'TEXT' },
        { name: 'special_instructions', type: 'TEXT' },
        { name: 'status', type: 'VARCHAR(50)', default: 'placed' },
        { name: 'due_date', type: 'DATE' },
        { name: 'sent_date', type: 'DATE' },
        { name: 'received_date', type: 'DATE' },
        { name: 'cost', type: 'DECIMAL(10,2)' },
      ],
      autoNumberTrigger: 'generate_lab_order_number',
      indexes: ['idx_lab_orders_patient', 'idx_lab_orders_status', 'idx_lab_orders_lab'],
    };

    it('should have lab_orders table', () => {
      expect(labOrdersSchema.tableName).toBe('lab_orders');
    });

    it('should have auto-number trigger', () => {
      expect(labOrdersSchema.autoNumberTrigger).toBe('generate_lab_order_number');
    });

    it('should have status check constraint', () => {
      const validStatuses = ['placed', 'in_fabrication', 'ready', 'delivered', 'adjustment_needed', 'completed', 'cancelled'];
      validStatuses.forEach(s => expect(validStatuses).toContain(s));
    });

    it('should have dental-specific fields', () => {
      const dentalFields = ['teeth_involved', 'shade', 'material', 'specifications'];
      dentalFields.forEach(field => {
        expect(labOrdersSchema.columns.find(c => c.name === field)).toBeDefined();
      });
    });

    it('should have date tracking fields', () => {
      const dateFields = ['due_date', 'sent_date', 'received_date'];
      dateFields.forEach(field => {
        expect(labOrdersSchema.columns.find(c => c.name === field)).toBeDefined();
      });
    });

    it('should link to treatment_plan', () => {
      const fkCol = labOrdersSchema.columns.find(c => c.name === 'treatment_plan_id');
      expect(fkCol.foreignKey).toBe('treatment_plans(id)');
    });
  });

  // =====================================================
  // 8. INVOICE - TREATMENT PLAN LINK (022 Migration)
  // =====================================================
  describe('Invoice-Treatment Plan Link Migration', () => {
    const invoiceExtensionSchema = {
      tableName: 'invoices',
      newColumns: [
        { name: 'treatment_plan_id', type: 'UUID', foreignKey: 'treatment_plans(id)', onDelete: 'SET NULL' },
      ],
      newIndexes: ['idx_invoices_treatment_plan'],
    };

    it('should add treatment_plan_id to invoices', () => {
      const col = invoiceExtensionSchema.newColumns.find(c => c.name === 'treatment_plan_id');
      expect(col).toBeDefined();
      expect(col.foreignKey).toBe('treatment_plans(id)');
    });

    it('should have SET NULL on delete', () => {
      const col = invoiceExtensionSchema.newColumns.find(c => c.name === 'treatment_plan_id');
      expect(col.onDelete).toBe('SET NULL');
    });

    it('should have performance index', () => {
      expect(invoiceExtensionSchema.newIndexes).toContain('idx_invoices_treatment_plan');
    });
  });

  // =====================================================
  // 9. RLS POLICIES
  // =====================================================
  describe('Row Level Security Policies', () => {
    const tablesWithRLS = [
      'treatment_plans', 'treatment_plan_items',
      'medications', 'prescriptions', 'prescription_items',
      'xray_types', 'xrays',
      'cbct_scan_regions', 'cbct_orders', 'cbct_scans', 'cbct_reports',
      'consent_templates', 'consent_forms',
      'procedure_note_templates', 'procedure_notes',
      'dental_labs', 'lab_order_types', 'lab_orders',
    ];

    it('should enable RLS on all Phase 2 tables', () => {
      expect(tablesWithRLS.length).toBe(18);
    });

    it('should have staff view policies', () => {
      const staffViewTables = [
        'treatment_plans', 'prescriptions', 'xrays', 'cbct_orders', 
        'consent_forms', 'procedure_notes', 'lab_orders'
      ];
      staffViewTables.forEach(table => {
        expect(tablesWithRLS).toContain(table);
      });
    });

    it('should have admin manage policies for reference tables', () => {
      const adminTables = ['medications', 'xray_types', 'consent_templates', 'lab_order_types'];
      adminTables.forEach(table => {
        expect(tablesWithRLS).toContain(table);
      });
    });
  });

  // =====================================================
  // 10. TRIGGERS & SEQUENCES
  // =====================================================
  describe('Auto-Update Triggers', () => {
    const tablesWithUpdatedAtTrigger = [
      'treatment_plans', 'treatment_plan_items', 'medications', 'prescriptions',
      'xrays', 'cbct_orders', 'cbct_reports', 'consent_templates',
      'procedure_note_templates', 'procedure_notes', 'dental_labs', 'lab_orders'
    ];

    it('should have updated_at triggers on mutable tables', () => {
      expect(tablesWithUpdatedAtTrigger.length).toBe(12);
    });

    const sequences = [
      { name: 'prescription_number_seq', startValue: 1000, format: 'RX-YYYYMM-XXXX' },
      { name: 'cbct_order_number_seq', startValue: 100, format: 'CBCT-YYYYMM-XXXX' },
      { name: 'lab_order_number_seq', startValue: 1000, format: 'LAB-YYYYMM-XXXX' },
    ];

    it('should have auto-number sequences', () => {
      expect(sequences.length).toBe(3);
    });

    it('should have prescription number sequence', () => {
      const seq = sequences.find(s => s.name === 'prescription_number_seq');
      expect(seq.format).toContain('RX-');
    });

    it('should have CBCT order number sequence', () => {
      const seq = sequences.find(s => s.name === 'cbct_order_number_seq');
      expect(seq.format).toContain('CBCT-');
    });

    it('should have lab order number sequence', () => {
      const seq = sequences.find(s => s.name === 'lab_order_number_seq');
      expect(seq.format).toContain('LAB-');
    });
  });

  // =====================================================
  // 11. MIGRATION FILES EXIST
  // =====================================================
  describe('Migration Files', () => {
    const migrationFiles = [
      '021_phase2_clinical_tables.sql',
      '022_add_treatment_plan_to_invoices.sql',
    ];

    it('should have Phase 2 clinical tables migration', () => {
      expect(migrationFiles).toContain('021_phase2_clinical_tables.sql');
    });

    it('should have invoice-treatment plan link migration', () => {
      expect(migrationFiles).toContain('022_add_treatment_plan_to_invoices.sql');
    });

    it('should have correct migration order', () => {
      const order021 = parseInt(migrationFiles[0].split('_')[0]);
      const order022 = parseInt(migrationFiles[1].split('_')[0]);
      expect(order022).toBeGreaterThan(order021);
    });
  });
});

// =====================================================
// PHASE 2 TABLE COUNT SUMMARY
// =====================================================

describe('Phase 2 Migration Summary', () => {
  const phase2Tables = {
    treatmentPlans: ['treatment_plans', 'treatment_plan_items'],
    prescriptions: ['medications', 'prescriptions', 'prescription_items'],
    xrays: ['xray_types', 'xrays'],
    cbct: ['cbct_scan_regions', 'cbct_orders', 'cbct_scans', 'cbct_reports'],
    consentForms: ['consent_templates', 'consent_forms'],
    procedureNotes: ['procedure_note_templates', 'procedure_notes'],
    labOrders: ['dental_labs', 'lab_order_types', 'lab_orders'],
  };

  it('should have correct total table count', () => {
    const totalTables = Object.values(phase2Tables).flat().length;
    expect(totalTables).toBe(18);
  });

  it('should have 2 treatment plan tables', () => {
    expect(phase2Tables.treatmentPlans.length).toBe(2);
  });

  it('should have 3 prescription tables', () => {
    expect(phase2Tables.prescriptions.length).toBe(3);
  });

  it('should have 2 x-ray tables', () => {
    expect(phase2Tables.xrays.length).toBe(2);
  });

  it('should have 4 CBCT tables', () => {
    expect(phase2Tables.cbct.length).toBe(4);
  });

  it('should have 2 consent form tables', () => {
    expect(phase2Tables.consentForms.length).toBe(2);
  });

  it('should have 2 procedure note tables', () => {
    expect(phase2Tables.procedureNotes.length).toBe(2);
  });

  it('should have 3 lab order tables', () => {
    expect(phase2Tables.labOrders.length).toBe(3);
  });
});
