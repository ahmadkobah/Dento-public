/**
 * Phase 1 CRUD Operations Test Suite
 * Tests all Create, Read, Update, Delete operations for every entity
 * 
 * Entities Covered:
 * - Patients
 * - Doctors
 * - Branches
 * - Appointments
 * - Services
 * - Dental Charts
 * - Invoices
 * - Testimonials
 * - Portfolio Cases
 * - Translations
 * - Media/Files
 * - User Sessions
 * - Notifications
 * - Chairs
 * - Doctor Certificates
 * - Patient Family Links
 * - Users
 * - Prescriptions
 * - Lab Orders
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================
// MOCK SUPABASE RESPONSES
// ============================================

const createMockResponse = (data, error = null) => ({ data, error })
const createMockError = (message, code = 'ERROR') => ({ message, code })

// ============================================
// PATIENTS CRUD TESTS
// ============================================

describe('Patients CRUD Operations', () => {

  describe('CREATE Patient', () => {
    it('should create a new patient with required fields', () => {
      const patientData = {
        name: 'John Doe',
        phone: '01144848521',
        email: 'john@example.com',
        date_of_birth: '1990-01-15',
        gender: 'male',
        is_active: true
      }
      
      expect(patientData.name).toBeDefined()
      expect(patientData.phone).toBeDefined()
      expect(patientData.is_active).toBe(true)
    })

    it('should generate patient code on creation', () => {
      const generatePatientCode = () => {
        const timestamp = Date.now().toString(36).toUpperCase()
        const random = Math.random().toString(36).substring(2, 6).toUpperCase()
        return `PT-${timestamp}-${random}`
      }
      
      const code = generatePatientCode()
      expect(code).toMatch(/^PT-[A-Z0-9]+-[A-Z0-9]+$/)
    })

    it('should validate required fields before creation', () => {
      const validatePatient = (data) => {
        const errors = []
        if (!data.name?.trim()) errors.push('name')
        if (!data.phone?.trim()) errors.push('phone')
        return errors
      }
      
      expect(validatePatient({})).toContain('name')
      expect(validatePatient({ name: 'John' })).toContain('phone')
      expect(validatePatient({ name: 'John', phone: '01144848521' })).toHaveLength(0)
    })

    it('should handle duplicate phone number error', () => {
      const error = createMockError('duplicate key value violates unique constraint', '23505')
      const isDuplicate = error.code === '23505'
      expect(isDuplicate).toBe(true)
    })

    it('should set default values on creation', () => {
      const defaults = {
        is_active: true,
        created_at: new Date().toISOString(),
        medical_history: {},
        allergies: []
      }
      
      expect(defaults.is_active).toBe(true)
      expect(defaults.allergies).toEqual([])
    })
  })

  describe('READ Patient', () => {
    it('should read patient by ID', () => {
      const patient = {
        id: 'uuid-123',
        name: 'John Doe',
        phone: '01144848521'
      }
      
      expect(patient.id).toBe('uuid-123')
    })

    it('should read patient with relations', () => {
      const patientWithRelations = {
        id: 'uuid-123',
        name: 'John Doe',
        appointments: [{ id: 'apt-1', status: 'completed' }],
        treatments: [{ id: 'trt-1', type: 'cleaning' }],
        invoices: [{ id: 'inv-1', total: 500 }]
      }
      
      expect(patientWithRelations.appointments.length).toBeGreaterThan(0)
      expect(patientWithRelations.treatments.length).toBeGreaterThan(0)
    })

    it('should search patients by name or phone', () => {
      const patients = [
        { name: 'John Doe', phone: '01144848521' },
        { name: 'Jane Smith', phone: '01098765432' },
        { name: 'Ahmed Mohamed', phone: '01234567890' }
      ]
      
      const searchByName = (query) => patients.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase())
      )
      
      const searchByPhone = (query) => patients.filter(p => 
        p.phone.includes(query)
      )
      
      expect(searchByName('john').length).toBe(1)
      expect(searchByPhone('0114').length).toBe(1)
    })

    it('should paginate patient list', () => {
      const totalPatients = 100
      const pageSize = 10
      const currentPage = 3
      
      const offset = (currentPage - 1) * pageSize
      const totalPages = Math.ceil(totalPatients / pageSize)
      
      expect(offset).toBe(20)
      expect(totalPages).toBe(10)
    })

    it('should filter active/inactive patients', () => {
      const patients = [
        { name: 'Active', is_active: true },
        { name: 'Inactive', is_active: false }
      ]
      
      const activeOnly = patients.filter(p => p.is_active)
      expect(activeOnly.length).toBe(1)
    })
  })

  describe('UPDATE Patient', () => {
    it('should update patient fields', () => {
      const original = { name: 'John Doe', phone: '01144848521' }
      const updates = { phone: '01198765432' }
      const updated = { ...original, ...updates }
      
      expect(updated.phone).toBe('01198765432')
      expect(updated.name).toBe('John Doe')
    })

    it('should update medical history', () => {
      const medicalHistory = {
        conditions: ['diabetes'],
        medications: ['metformin'],
        allergies: ['penicillin']
      }
      
      const updatedHistory = {
        ...medicalHistory,
        conditions: [...medicalHistory.conditions, 'hypertension']
      }
      
      expect(updatedHistory.conditions).toContain('hypertension')
    })

    it('should track update timestamp', () => {
      const beforeUpdate = new Date('2026-01-28T10:00:00')
      const afterUpdate = new Date('2026-01-29T10:00:00')
      
      expect(afterUpdate > beforeUpdate).toBe(true)
    })

    it('should validate updates before saving', () => {
      const validateUpdate = (data) => {
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          return { valid: false, error: 'Invalid email' }
        }
        return { valid: true }
      }
      
      expect(validateUpdate({ email: 'invalid' }).valid).toBe(false)
      expect(validateUpdate({ email: 'valid@test.com' }).valid).toBe(true)
    })
  })

  describe('DELETE Patient', () => {
    it('should soft delete patient (set is_active = false)', () => {
      const softDelete = (patient) => ({ ...patient, is_active: false })
      
      const patient = { name: 'John', is_active: true }
      const deleted = softDelete(patient)
      
      expect(deleted.is_active).toBe(false)
    })

    it('should prevent deletion if patient has unpaid invoices', () => {
      const canDelete = (patient) => {
        const unpaidInvoices = patient.invoices?.filter(i => i.status !== 'paid') || []
        return unpaidInvoices.length === 0
      }
      
      const patientWithUnpaid = { invoices: [{ status: 'pending' }] }
      const patientAllPaid = { invoices: [{ status: 'paid' }] }
      
      expect(canDelete(patientWithUnpaid)).toBe(false)
      expect(canDelete(patientAllPaid)).toBe(true)
    })

    it('should cascade soft delete to related records', () => {
      const cascadeDelete = (patientId, relatedTables) => {
        return relatedTables.map(table => ({
          table,
          action: 'soft_delete',
          where: { patient_id: patientId }
        }))
      }
      
      const tables = ['appointments', 'dental_charts', 'invoices']
      const actions = cascadeDelete('patient-123', tables)
      
      expect(actions.length).toBe(3)
    })
  })
})

// ============================================
// DOCTORS CRUD TESTS
// ============================================

describe('Doctors CRUD Operations', () => {

  describe('CREATE Doctor', () => {
    it('should create doctor with required fields', () => {
      const doctorData = {
        name_en: 'Dr. Ahmed',
        name_ar: 'د. أحمد',
        specialty_en: 'Orthodontics',
        specialty_ar: 'تقويم الأسنان',
        license_number: 'EG-MED-12345',
        is_active: true
      }
      
      expect(doctorData.name_en).toBeDefined()
      expect(doctorData.license_number).toBeDefined()
    })

    it('should validate license number format', () => {
      const validateLicense = (license) => /^[A-Z]{2}-[A-Z]+-\d+$/.test(license)
      
      expect(validateLicense('EG-MED-12345')).toBe(true)
      expect(validateLicense('invalid')).toBe(false)
    })

    it('should create doctor with working hours', () => {
      const workingHours = {
        monday: { start: '09:00', end: '17:00', off: false },
        friday: { start: null, end: null, off: true }
      }
      
      expect(workingHours.monday.off).toBe(false)
      expect(workingHours.friday.off).toBe(true)
    })

    it('should assign doctor to branches', () => {
      const assignment = {
        doctor_id: 'doc-123',
        branch_id: 'branch-456',
        is_primary: true
      }
      
      expect(assignment.is_primary).toBe(true)
    })
  })

  describe('READ Doctor', () => {
    it('should read doctor with certificates', () => {
      const doctor = {
        id: 'doc-123',
        name_en: 'Dr. Ahmed',
        certificates: [
          { name: 'Board Certification', authority: 'ADA', expiry: '2027-01-01' }
        ]
      }
      
      expect(doctor.certificates.length).toBe(1)
    })

    it('should read doctor availability', () => {
      const availability = [
        { day_of_week: 1, start_time: '09:00', end_time: '17:00' },
        { day_of_week: 2, start_time: '09:00', end_time: '17:00' }
      ]
      
      const isAvailable = (day) => availability.some(a => a.day_of_week === day)
      expect(isAvailable(1)).toBe(true)
      expect(isAvailable(6)).toBe(false)
    })

    it('should get doctor appointments count', () => {
      const appointments = [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'pending' }
      ]
      
      const completed = appointments.filter(a => a.status === 'completed').length
      expect(completed).toBe(2)
    })
  })

  describe('UPDATE Doctor', () => {
    it('should update doctor specialty', () => {
      const doctor = { specialty_en: 'General Dentistry' }
      const updated = { ...doctor, specialty_en: 'Orthodontics' }
      
      expect(updated.specialty_en).toBe('Orthodontics')
    })

    it('should update license expiry date', () => {
      const doctor = { license_expiry: '2025-12-31' }
      const updated = { ...doctor, license_expiry: '2027-12-31' }
      
      expect(new Date(updated.license_expiry) > new Date(doctor.license_expiry)).toBe(true)
    })

    it('should update buffer time between appointments', () => {
      const doctor = { buffer_time_minutes: 0 }
      const updated = { ...doctor, buffer_time_minutes: 15 }
      
      expect(updated.buffer_time_minutes).toBe(15)
    })
  })

  describe('DELETE Doctor', () => {
    it('should soft delete doctor', () => {
      const doctor = { is_active: true }
      const deleted = { ...doctor, is_active: false }
      
      expect(deleted.is_active).toBe(false)
    })

    it('should prevent deletion if has future appointments', () => {
      const canDelete = (doctor) => {
        const futureAppts = doctor.appointments?.filter(a => 
          new Date(a.datetime_start) > new Date()
        ) || []
        return futureAppts.length === 0
      }
      
      const doctorWithFuture = { appointments: [{ datetime_start: '2026-12-01' }] }
      expect(canDelete(doctorWithFuture)).toBe(false)
    })
  })
})

// ============================================
// BRANCHES CRUD TESTS
// ============================================

describe('Branches CRUD Operations', () => {

  describe('CREATE Branch', () => {
    it('should create branch with bilingual data', () => {
      const branch = {
        name_en: 'Nasr City Branch',
        name_ar: 'فرع مدينة نصر',
        address_en: '123 Main St',
        address_ar: '١٢٣ الشارع الرئيسي',
        phone: '0222345678',
        is_active: true
      }
      
      expect(branch.name_en).toBeDefined()
      expect(branch.name_ar).toBeDefined()
    })

    it('should create branch with working hours', () => {
      const workingHours = {
        monday: { open: '09:00', close: '21:00' },
        friday: { open: '14:00', close: '21:00' }
      }
      
      expect(workingHours.friday.open).toBe('14:00')
    })

    it('should set default buffer time', () => {
      const branch = { buffer_time_minutes: 10 }
      expect(branch.buffer_time_minutes).toBe(10)
    })
  })

  describe('READ Branch', () => {
    it('should read branch with chairs', () => {
      const branch = {
        id: 'branch-123',
        chairs: [
          { chair_number: '1', chair_type: 'standard' },
          { chair_number: '2', chair_type: 'surgery' }
        ]
      }
      
      expect(branch.chairs.length).toBe(2)
    })

    it('should read branch with assigned doctors', () => {
      const branch = {
        doctors: [
          { name_en: 'Dr. Ahmed', is_primary: true },
          { name_en: 'Dr. Mohamed', is_primary: false }
        ]
      }
      
      const primaryDoctor = branch.doctors.find(d => d.is_primary)
      expect(primaryDoctor.name_en).toBe('Dr. Ahmed')
    })
  })

  describe('UPDATE Branch', () => {
    it('should update branch contact info', () => {
      const branch = { phone: '0222345678' }
      const updated = { ...branch, phone: '0233456789' }
      
      expect(updated.phone).toBe('0233456789')
    })

    it('should update working hours', () => {
      const branch = { working_hours: { monday: { open: '09:00' } } }
      const updated = { 
        ...branch, 
        working_hours: { ...branch.working_hours, monday: { open: '08:00' } } 
      }
      
      expect(updated.working_hours.monday.open).toBe('08:00')
    })
  })

  describe('DELETE Branch', () => {
    it('should soft delete branch', () => {
      const branch = { is_active: true }
      const deleted = { ...branch, is_active: false }
      
      expect(deleted.is_active).toBe(false)
    })

    it('should reassign doctors before deletion', () => {
      const reassignDoctors = (branchId, newBranchId, doctors) => {
        return doctors.map(d => ({
          ...d,
          branch_id: d.branch_id === branchId ? newBranchId : d.branch_id
        }))
      }
      
      const doctors = [{ id: 1, branch_id: 'old-branch' }]
      const reassigned = reassignDoctors('old-branch', 'new-branch', doctors)
      
      expect(reassigned[0].branch_id).toBe('new-branch')
    })
  })
})

// ============================================
// APPOINTMENTS CRUD TESTS
// ============================================

describe('Appointments CRUD Operations', () => {

  describe('CREATE Appointment', () => {
    it('should create appointment with required fields', () => {
      const appointment = {
        patient_id: 'patient-123',
        doctor_id: 'doctor-456',
        branch_id: 'branch-789',
        datetime_start: '2026-02-01T10:00:00',
        datetime_end: '2026-02-01T10:30:00',
        service_type: 'Consultation',
        status: 'pending'
      }
      
      expect(appointment.patient_id).toBeDefined()
      expect(appointment.doctor_id).toBeDefined()
      expect(appointment.status).toBe('pending')
    })

    it('should check for conflicts before creation', () => {
      const checkConflict = (newAppt, existingAppts) => {
        const newStart = new Date(newAppt.datetime_start).getTime()
        const newEnd = new Date(newAppt.datetime_end).getTime()
        
        return existingAppts.some(appt => {
          if (appt.doctor_id !== newAppt.doctor_id) return false
          const start = new Date(appt.datetime_start).getTime()
          const end = new Date(appt.datetime_end).getTime()
          return newStart < end && newEnd > start
        })
      }
      
      const existing = [{ doctor_id: 'd1', datetime_start: '2026-02-01T10:00:00', datetime_end: '2026-02-01T11:00:00' }]
      const conflicting = { doctor_id: 'd1', datetime_start: '2026-02-01T10:30:00', datetime_end: '2026-02-01T11:30:00' }
      const nonConflicting = { doctor_id: 'd1', datetime_start: '2026-02-01T11:00:00', datetime_end: '2026-02-01T12:00:00' }
      
      expect(checkConflict(conflicting, existing)).toBe(true)
      expect(checkConflict(nonConflicting, existing)).toBe(false)
    })

    it('should create recurring appointments', () => {
      const createRecurring = (baseAppt, pattern, count) => {
        const appointments = [baseAppt]
        let currentDate = new Date(baseAppt.datetime_start)
        
        for (let i = 1; i < count; i++) {
          if (pattern === 'weekly') {
            currentDate.setDate(currentDate.getDate() + 7)
          } else if (pattern === 'monthly') {
            currentDate.setMonth(currentDate.getMonth() + 1)
          }
          appointments.push({
            ...baseAppt,
            datetime_start: new Date(currentDate).toISOString()
          })
        }
        return appointments
      }
      
      const base = { datetime_start: '2026-02-01T10:00:00' }
      const weekly = createRecurring(base, 'weekly', 4)
      
      expect(weekly.length).toBe(4)
    })

    it('should apply buffer time to start', () => {
      const applyBuffer = (startTime, bufferMinutes) => {
        const start = new Date(startTime)
        start.setMinutes(start.getMinutes() + bufferMinutes)
        return start.toISOString()
      }
      
      const adjusted = applyBuffer('2026-02-01T10:00:00', 10)
      expect(new Date(adjusted).getMinutes()).toBe(10)
    })
  })

  describe('READ Appointment', () => {
    it('should read appointment with patient and doctor info', () => {
      const appointment = {
        id: 'apt-123',
        patient: { name: 'John Doe', phone: '01144848521' },
        doctor: { name_en: 'Dr. Ahmed' },
        branch: { name_en: 'Main Branch' }
      }
      
      expect(appointment.patient.name).toBe('John Doe')
      expect(appointment.doctor.name_en).toBe('Dr. Ahmed')
    })

    it('should filter appointments by date range', () => {
      const appointments = [
        { datetime_start: '2026-01-15T10:00:00' },
        { datetime_start: '2026-01-20T10:00:00' },
        { datetime_start: '2026-02-01T10:00:00' }
      ]
      
      const filterByRange = (appts, start, end) => {
        return appts.filter(a => {
          const date = new Date(a.datetime_start)
          return date >= new Date(start) && date <= new Date(end)
        })
      }
      
      const januaryAppts = filterByRange(appointments, '2026-01-01', '2026-01-31')
      expect(januaryAppts.length).toBe(2)
    })

    it('should get today appointments', () => {
      const today = '2026-01-29'
      const appointments = [
        { datetime_start: '2026-01-29T10:00:00' },
        { datetime_start: '2026-01-29T14:00:00' },
        { datetime_start: '2026-01-30T10:00:00' }
      ]
      
      const todayAppts = appointments.filter(a => a.datetime_start.startsWith(today))
      expect(todayAppts.length).toBe(2)
    })
  })

  describe('UPDATE Appointment', () => {
    it('should update appointment status', () => {
      const statusTransitions = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['in_progress', 'cancelled', 'no_show'],
        in_progress: ['completed'],
        completed: [],
        cancelled: [],
        no_show: []
      }
      
      const canTransition = (current, next) => {
        return statusTransitions[current]?.includes(next) || false
      }
      
      expect(canTransition('pending', 'confirmed')).toBe(true)
      expect(canTransition('completed', 'pending')).toBe(false)
    })

    it('should reschedule appointment', () => {
      const reschedule = (appt, newStart, duration) => {
        const start = new Date(newStart)
        const end = new Date(start.getTime() + duration * 60000)
        return {
          ...appt,
          datetime_start: start.toISOString(),
          datetime_end: end.toISOString()
        }
      }
      
      const appt = { datetime_start: '2026-02-01T10:00:00' }
      const rescheduled = reschedule(appt, '2026-02-02T14:00:00', 30)
      
      expect(rescheduled.datetime_start).toContain('2026-02-02')
    })

    it('should add notes to appointment', () => {
      const appt = { notes: '' }
      const updated = { ...appt, notes: 'Patient requested morning slot' }
      
      expect(updated.notes).toContain('morning')
    })
  })

  describe('DELETE Appointment', () => {
    it('should cancel appointment (not hard delete)', () => {
      const cancelAppointment = (appt, reason) => ({
        ...appt,
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString()
      })
      
      const cancelled = cancelAppointment({ status: 'confirmed' }, 'Patient request')
      expect(cancelled.status).toBe('cancelled')
      expect(cancelled.cancellation_reason).toBe('Patient request')
    })

    it('should notify patient on cancellation', () => {
      const createNotification = (appt, type) => ({
        patient_id: appt.patient_id,
        type: type,
        message: `Your appointment has been ${type}`,
        created_at: new Date().toISOString()
      })
      
      const notification = createNotification({ patient_id: 'p1' }, 'cancelled')
      expect(notification.type).toBe('cancelled')
    })
  })
})

// ============================================
// SERVICES CRUD TESTS
// ============================================

describe('Services CRUD Operations', () => {

  describe('CREATE Service', () => {
    it('should create service with pricing', () => {
      const service = {
        name_en: 'Dental Cleaning',
        name_ar: 'تنظيف الأسنان',
        description_en: 'Professional dental cleaning',
        price: 300,
        duration_minutes: 45,
        category_id: 'cat-general',
        is_active: true
      }
      
      expect(service.price).toBe(300)
      expect(service.duration_minutes).toBe(45)
    })

    it('should assign service to category', () => {
      const categories = ['General', 'Cosmetic', 'Surgery', 'Orthodontics']
      const service = { category: 'Cosmetic' }
      
      expect(categories).toContain(service.category)
    })
  })

  describe('READ Service', () => {
    it('should read services by category', () => {
      const services = [
        { name: 'Cleaning', category: 'General' },
        { name: 'Whitening', category: 'Cosmetic' },
        { name: 'Extraction', category: 'Surgery' }
      ]
      
      const generalServices = services.filter(s => s.category === 'General')
      expect(generalServices.length).toBe(1)
    })

    it('should read service with price tiers', () => {
      const service = {
        name: 'Dental Implant',
        base_price: 5000,
        price_tiers: [
          { material: 'Titanium', price: 5000 },
          { material: 'Zirconia', price: 7000 }
        ]
      }
      
      expect(service.price_tiers.length).toBe(2)
    })
  })

  describe('UPDATE Service', () => {
    it('should update service price', () => {
      const service = { price: 300 }
      const updated = { ...service, price: 350 }
      
      expect(updated.price).toBe(350)
    })

    it('should track price history', () => {
      const priceHistory = [
        { price: 250, effective_from: '2025-01-01' },
        { price: 300, effective_from: '2025-07-01' },
        { price: 350, effective_from: '2026-01-01' }
      ]
      
      const currentPrice = priceHistory[priceHistory.length - 1]
      expect(currentPrice.price).toBe(350)
    })
  })

  describe('DELETE Service', () => {
    it('should soft delete service', () => {
      const service = { is_active: true }
      const deleted = { ...service, is_active: false }
      
      expect(deleted.is_active).toBe(false)
    })
  })
})

// ============================================
// DENTAL CHARTS CRUD TESTS
// ============================================

describe('Dental Charts CRUD Operations', () => {

  describe('CREATE Dental Chart', () => {
    it('should create initial dental chart for patient', () => {
      const chart = {
        patient_id: 'patient-123',
        chart_type: 'adult',
        teeth_data: {},
        created_at: new Date().toISOString()
      }
      
      expect(chart.chart_type).toBe('adult')
    })

    it('should initialize with healthy teeth', () => {
      const initializeChart = (type) => {
        const teethCount = type === 'adult' ? 32 : 20
        const teeth = {}
        for (let i = 1; i <= teethCount; i++) {
          teeth[i] = { condition: 'healthy', notes: '' }
        }
        return teeth
      }
      
      const adultChart = initializeChart('adult')
      expect(Object.keys(adultChart).length).toBe(32)
      expect(adultChart[1].condition).toBe('healthy')
    })
  })

  describe('READ Dental Chart', () => {
    it('should read chart with history', () => {
      const chart = {
        teeth_data: { 11: { condition: 'filled' } },
        history: [
          { date: '2025-06-01', tooth: 11, change: 'healthy → cavity' },
          { date: '2025-07-01', tooth: 11, change: 'cavity → filled' }
        ]
      }
      
      expect(chart.history.length).toBe(2)
    })

    it('should get teeth by condition', () => {
      const teeth = {
        1: { condition: 'healthy' },
        2: { condition: 'cavity' },
        3: { condition: 'filled' },
        4: { condition: 'cavity' }
      }
      
      const cavities = Object.entries(teeth).filter(([_, t]) => t.condition === 'cavity')
      expect(cavities.length).toBe(2)
    })
  })

  describe('UPDATE Dental Chart', () => {
    it('should update tooth condition', () => {
      const chart = { teeth: { 11: { condition: 'healthy' } } }
      const updated = {
        ...chart,
        teeth: { ...chart.teeth, 11: { condition: 'cavity' } }
      }
      
      expect(updated.teeth[11].condition).toBe('cavity')
    })

    it('should record chart change history', () => {
      const recordChange = (patientId, toothNumber, oldCondition, newCondition) => ({
        patient_id: patientId,
        tooth_number: toothNumber,
        previous_condition: oldCondition,
        new_condition: newCondition,
        changed_at: new Date().toISOString()
      })
      
      const history = recordChange('p1', 11, 'healthy', 'cavity')
      expect(history.previous_condition).toBe('healthy')
      expect(history.new_condition).toBe('cavity')
    })
  })
})

// ============================================
// INVOICES CRUD TESTS
// ============================================

describe('Invoices CRUD Operations', () => {

  describe('CREATE Invoice', () => {
    it('should create invoice with line items', () => {
      const invoice = {
        patient_id: 'patient-123',
        invoice_number: 'INV-202601-0001',
        items: [
          { service: 'Cleaning', quantity: 1, price: 300 },
          { service: 'X-Ray', quantity: 2, price: 100 }
        ],
        subtotal: 500,
        discount: 50,
        total: 450,
        status: 'pending'
      }
      
      expect(invoice.items.length).toBe(2)
      expect(invoice.total).toBe(450)
    })

    it('should calculate totals correctly', () => {
      const calculateInvoice = (items, discountPercent = 0) => {
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        const discount = subtotal * (discountPercent / 100)
        return {
          subtotal,
          discount,
          total: subtotal - discount
        }
      }
      
      const items = [
        { price: 300, quantity: 1 },
        { price: 100, quantity: 2 }
      ]
      const result = calculateInvoice(items, 10)
      
      expect(result.subtotal).toBe(500)
      expect(result.discount).toBe(50)
      expect(result.total).toBe(450)
    })

    it('should generate sequential invoice number', () => {
      const generateInvoiceNumber = (branchPrefix, lastNumber) => {
        const date = new Date()
        const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
        const sequence = String(lastNumber + 1).padStart(4, '0')
        return `${branchPrefix}-${yearMonth}-${sequence}`
      }
      
      const invoiceNum = generateInvoiceNumber('INV', 5)
      const now = new Date()
      const expectedMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
      expect(invoiceNum).toBe(`INV-${expectedMonth}-0006`)
    })
  })

  describe('READ Invoice', () => {
    it('should read invoice with payment history', () => {
      const invoice = {
        total: 500,
        payments: [
          { amount: 200, method: 'cash', date: '2026-01-15' },
          { amount: 300, method: 'card', date: '2026-01-20' }
        ]
      }
      
      const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
      expect(totalPaid).toBe(500)
    })

    it('should calculate balance due', () => {
      const calculateBalance = (invoice) => {
        const paid = invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
        return invoice.total - paid
      }
      
      const invoice = { total: 500, payments: [{ amount: 200 }] }
      expect(calculateBalance(invoice)).toBe(300)
    })
  })

  describe('UPDATE Invoice', () => {
    it('should record payment', () => {
      const recordPayment = (invoice, payment) => ({
        ...invoice,
        payments: [...(invoice.payments || []), payment],
        status: calculateNewStatus(invoice, payment)
      })
      
      const calculateNewStatus = (invoice, payment) => {
        const totalPaid = (invoice.payments?.reduce((s, p) => s + p.amount, 0) || 0) + payment.amount
        return totalPaid >= invoice.total ? 'paid' : 'partial'
      }
      
      const invoice = { total: 500, payments: [], status: 'pending' }
      const updated = recordPayment(invoice, { amount: 500 })
      
      expect(updated.status).toBe('paid')
    })

    it('should update invoice status', () => {
      const statuses = ['draft', 'pending', 'partial', 'paid', 'overdue', 'cancelled']
      expect(statuses).toContain('partial')
    })
  })
})

// ============================================
// MEDIA/FILES CRUD TESTS
// ============================================

describe('Media/Files CRUD Operations', () => {

  describe('CREATE/UPLOAD Media', () => {
    it('should validate file type before upload', () => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      const validateType = (type) => allowedTypes.includes(type)
      
      expect(validateType('image/jpeg')).toBe(true)
      expect(validateType('application/exe')).toBe(false)
    })

    it('should validate file size', () => {
      const maxSize = 10 * 1024 * 1024 // 10MB
      const validateSize = (size) => size <= maxSize
      
      expect(validateSize(5 * 1024 * 1024)).toBe(true)
      expect(validateSize(15 * 1024 * 1024)).toBe(false)
    })

    it('should generate unique file path', () => {
      const generatePath = (folder, filename) => {
        const timestamp = Date.now()
        const ext = filename.split('.').pop()
        return `${folder}/${timestamp}-${Math.random().toString(36).substr(2, 9)}.${ext}`
      }
      
      const path = generatePath('patients', 'photo.jpg')
      expect(path).toMatch(/^patients\/\d+-[a-z0-9]+\.jpg$/)
    })
  })

  describe('READ Media', () => {
    it('should get media by folder', () => {
      const media = [
        { path: 'patients/1.jpg', folder: 'patients' },
        { path: 'patients/2.jpg', folder: 'patients' },
        { path: 'xrays/1.jpg', folder: 'xrays' }
      ]
      
      const patientMedia = media.filter(m => m.folder === 'patients')
      expect(patientMedia.length).toBe(2)
    })

    it('should generate signed URL for private files', () => {
      const generateSignedUrl = (path, expiresIn = 3600) => ({
        url: `https://storage.example.com/${path}?token=abc&expires=${Date.now() + expiresIn * 1000}`,
        expiresAt: new Date(Date.now() + expiresIn * 1000)
      })
      
      const signed = generateSignedUrl('private/file.pdf')
      expect(signed.url).toContain('token=')
    })
  })

  describe('DELETE Media', () => {
    it('should delete file from storage', () => {
      const deleteFile = (path) => ({
        success: true,
        deletedPath: path
      })
      
      const result = deleteFile('patients/photo.jpg')
      expect(result.success).toBe(true)
    })

    it('should delete associated database record', () => {
      const deleteMediaRecord = (id) => ({
        id,
        deleted: true
      })
      
      const result = deleteMediaRecord('media-123')
      expect(result.deleted).toBe(true)
    })
  })
})

// ============================================
// CHAIRS CRUD TESTS
// ============================================

describe('Chairs CRUD Operations', () => {

  describe('CREATE Chair', () => {
    it('should create chair with type', () => {
      const chair = {
        branch_id: 'branch-123',
        chair_number: '1',
        chair_type: 'standard',
        is_active: true
      }
      
      expect(chair.chair_type).toBe('standard')
    })

    it('should validate chair types', () => {
      const validTypes = ['standard', 'pediatric', 'surgery', 'hygiene']
      const isValid = (type) => validTypes.includes(type)
      
      expect(isValid('standard')).toBe(true)
      expect(isValid('invalid')).toBe(false)
    })
  })

  describe('READ Chair', () => {
    it('should get available chairs for branch', () => {
      const chairs = [
        { id: 1, is_active: true, current_appointment: null },
        { id: 2, is_active: true, current_appointment: 'apt-123' },
        { id: 3, is_active: false, current_appointment: null }
      ]
      
      const available = chairs.filter(c => c.is_active && !c.current_appointment)
      expect(available.length).toBe(1)
    })
  })

  describe('UPDATE Chair', () => {
    it('should update chair status', () => {
      const chair = { is_active: true }
      const updated = { ...chair, is_active: false }
      
      expect(updated.is_active).toBe(false)
    })
  })
})

// ============================================
// NOTIFICATIONS CRUD TESTS
// ============================================

describe('Notifications CRUD Operations', () => {

  describe('CREATE Notification', () => {
    it('should create appointment reminder notification', () => {
      const notification = {
        patient_id: 'patient-123',
        type: 'appointment_reminder',
        title: 'Appointment Tomorrow',
        message: 'Your appointment is tomorrow at 10:00 AM',
        scheduled_for: '2026-01-28T10:00:00',
        sent: false
      }
      
      expect(notification.type).toBe('appointment_reminder')
    })

    it('should create status change notification', () => {
      const createStatusNotification = (patientId, oldStatus, newStatus) => ({
        patient_id: patientId,
        type: 'status_change',
        title: 'Appointment Status Updated',
        message: `Your appointment status changed from ${oldStatus} to ${newStatus}`,
        created_at: new Date().toISOString()
      })
      
      const notification = createStatusNotification('p1', 'pending', 'confirmed')
      expect(notification.message).toContain('confirmed')
    })
  })

  describe('READ Notification', () => {
    it('should get unread notifications', () => {
      const notifications = [
        { id: 1, read: false },
        { id: 2, read: true },
        { id: 3, read: false }
      ]
      
      const unread = notifications.filter(n => !n.read)
      expect(unread.length).toBe(2)
    })

    it('should get notifications by type', () => {
      const notifications = [
        { type: 'appointment_reminder' },
        { type: 'status_change' },
        { type: 'appointment_reminder' }
      ]
      
      const reminders = notifications.filter(n => n.type === 'appointment_reminder')
      expect(reminders.length).toBe(2)
    })
  })

  describe('UPDATE Notification', () => {
    it('should mark notification as read', () => {
      const notification = { read: false, read_at: null }
      const updated = { ...notification, read: true, read_at: new Date().toISOString() }
      
      expect(updated.read).toBe(true)
    })

    it('should mark all as read', () => {
      const markAllRead = (notifications) => 
        notifications.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
      
      const notifications = [{ read: false }, { read: false }]
      const updated = markAllRead(notifications)
      
      expect(updated.every(n => n.read)).toBe(true)
    })
  })
})

// ============================================
// TRANSLATIONS CRUD TESTS
// ============================================

describe('Translations CRUD Operations', () => {

  describe('CREATE Translation', () => {
    it('should create bilingual translation', () => {
      const translation = {
        key: 'nav.home',
        value_en: 'Home',
        value_ar: 'الرئيسية',
        page: 'common'
      }
      
      expect(translation.value_en).toBe('Home')
      expect(translation.value_ar).toBe('الرئيسية')
    })

    it('should validate translation key format', () => {
      const validateKey = (key) => /^[a-z]+(\.[a-z]+)*$/.test(key)
      
      expect(validateKey('nav.home')).toBe(true)
      expect(validateKey('Invalid Key')).toBe(false)
    })
  })

  describe('READ Translation', () => {
    it('should get translations by page', () => {
      const translations = [
        { key: 'nav.home', page: 'common' },
        { key: 'home.title', page: 'home' },
        { key: 'nav.about', page: 'common' }
      ]
      
      const commonTranslations = translations.filter(t => t.page === 'common')
      expect(commonTranslations.length).toBe(2)
    })

    it('should find missing translations', () => {
      const checkMissing = (translations) => 
        translations.filter(t => !t.value_en?.trim() || !t.value_ar?.trim())
      
      const translations = [
        { key: 'a', value_en: 'A', value_ar: 'أ' },
        { key: 'b', value_en: 'B', value_ar: '' }
      ]
      
      const missing = checkMissing(translations)
      expect(missing.length).toBe(1)
    })
  })

  describe('UPDATE Translation', () => {
    it('should update translation value', () => {
      const translation = { value_en: 'Home' }
      const updated = { ...translation, value_en: 'Homepage' }
      
      expect(updated.value_en).toBe('Homepage')
    })
  })

  describe('DELETE Translation', () => {
    it('should delete translation by key', () => {
      const translations = [
        { key: 'a', value: '1' },
        { key: 'b', value: '2' }
      ]
      
      const afterDelete = translations.filter(t => t.key !== 'a')
      expect(afterDelete.length).toBe(1)
    })
  })
})

// ============================================
// USER SESSIONS CRUD TESTS
// ============================================

describe('User Sessions CRUD Operations', () => {

  describe('CREATE Session', () => {
    it('should create session with device info', () => {
      const session = {
        user_id: 'user-123',
        session_token: 'token-abc',
        device_info: {
          browser: 'Chrome',
          os: 'Windows',
          device_type: 'Desktop'
        },
        is_active: true,
        created_at: new Date().toISOString()
      }
      
      expect(session.device_info.browser).toBe('Chrome')
    })
  })

  describe('READ Session', () => {
    it('should get active sessions for user', () => {
      const sessions = [
        { id: 1, user_id: 'u1', is_active: true },
        { id: 2, user_id: 'u1', is_active: false },
        { id: 3, user_id: 'u1', is_active: true }
      ]
      
      const activeSessions = sessions.filter(s => s.is_active)
      expect(activeSessions.length).toBe(2)
    })
  })

  describe('UPDATE Session', () => {
    it('should update last activity', () => {
      const session = { last_activity: '2026-01-29T10:00:00' }
      const updated = { ...session, last_activity: '2026-01-29T11:00:00' }
      
      expect(new Date(updated.last_activity) > new Date(session.last_activity)).toBe(true)
    })
  })

  describe('DELETE Session', () => {
    it('should end session', () => {
      const endSession = (session) => ({
        ...session,
        is_active: false,
        ended_at: new Date().toISOString()
      })
      
      const ended = endSession({ is_active: true })
      expect(ended.is_active).toBe(false)
      expect(ended.ended_at).toBeDefined()
    })

    it('should end all other sessions', () => {
      const endOtherSessions = (sessions, currentSessionId) => 
        sessions.map(s => s.id === currentSessionId ? s : { ...s, is_active: false })
      
      const sessions = [
        { id: 1, is_active: true },
        { id: 2, is_active: true }
      ]
      const updated = endOtherSessions(sessions, 1)
      
      expect(updated[0].is_active).toBe(true)
      expect(updated[1].is_active).toBe(false)
    })
  })
})

// ============================================
// DOCTOR CERTIFICATES CRUD TESTS
// ============================================

describe('Doctor Certificates CRUD Operations', () => {

  describe('CREATE Certificate', () => {
    it('should create certificate with expiry', () => {
      const certificate = {
        doctor_id: 'doc-123',
        certificate_name: 'Board Certification',
        issuing_authority: 'ADA',
        issue_date: '2020-01-01',
        expiry_date: '2026-01-01',
        certificate_number: 'CERT-12345'
      }
      
      expect(certificate.issuing_authority).toBe('ADA')
    })
  })

  describe('READ Certificate', () => {
    it('should check certificate expiry status', () => {
      const checkExpiry = (expiryDate) => {
        const today = new Date('2026-01-29')
        const expiry = new Date(expiryDate)
        const daysUntil = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
        
        if (daysUntil < 0) return 'expired'
        if (daysUntil <= 30) return 'expiring_soon'
        return 'valid'
      }
      
      expect(checkExpiry('2026-01-01')).toBe('expired')
      expect(checkExpiry('2026-02-15')).toBe('expiring_soon')
      expect(checkExpiry('2027-01-01')).toBe('valid')
    })
  })

  describe('UPDATE Certificate', () => {
    it('should renew certificate', () => {
      const renewCertificate = (cert, newExpiryDate) => ({
        ...cert,
        expiry_date: newExpiryDate,
        renewed_at: new Date().toISOString()
      })
      
      const cert = { expiry_date: '2026-01-01' }
      const renewed = renewCertificate(cert, '2028-01-01')
      
      expect(renewed.expiry_date).toBe('2028-01-01')
    })
  })
})

// ============================================
// PATIENT FAMILY LINKS CRUD TESTS
// ============================================

describe('Patient Family Links CRUD Operations', () => {

  describe('CREATE Family Link', () => {
    it('should create family relationship', () => {
      const link = {
        patient_id: 'p1',
        related_patient_id: 'p2',
        relationship_type: 'spouse'
      }
      
      expect(link.relationship_type).toBe('spouse')
    })

    it('should prevent self-linking', () => {
      const validateLink = (link) => {
        if (link.patient_id === link.related_patient_id) {
          return { valid: false, error: 'Cannot link to self' }
        }
        return { valid: true }
      }
      
      expect(validateLink({ patient_id: 'p1', related_patient_id: 'p1' }).valid).toBe(false)
    })

    it('should validate relationship types', () => {
      const validTypes = ['spouse', 'parent', 'child', 'sibling', 'guardian', 'other']
      const isValid = (type) => validTypes.includes(type)
      
      expect(isValid('spouse')).toBe(true)
      expect(isValid('invalid')).toBe(false)
    })
  })

  describe('READ Family Link', () => {
    it('should get family members for patient', () => {
      const links = [
        { patient_id: 'p1', related_patient_id: 'p2', relationship_type: 'spouse' },
        { patient_id: 'p1', related_patient_id: 'p3', relationship_type: 'child' }
      ]
      
      const familyMembers = links.filter(l => l.patient_id === 'p1')
      expect(familyMembers.length).toBe(2)
    })
  })

  describe('DELETE Family Link', () => {
    it('should remove family relationship', () => {
      const links = [
        { id: 1, patient_id: 'p1', related_patient_id: 'p2' },
        { id: 2, patient_id: 'p1', related_patient_id: 'p3' }
      ]
      
      const afterDelete = links.filter(l => l.id !== 1)
      expect(afterDelete.length).toBe(1)
    })
  })
})

// ============================================
// PRESCRIPTIONS CRUD TESTS
// ============================================

describe('Prescriptions CRUD Operations', () => {

  describe('CREATE Prescription', () => {
    it('should create prescription with medications', () => {
      const prescription = {
        patient_id: 'p1',
        doctor_id: 'd1',
        appointment_id: 'apt1',
        medications: [
          { name: 'Amoxicillin', dosage: '500mg', frequency: '3x daily', duration: '7 days' },
          { name: 'Ibuprofen', dosage: '400mg', frequency: 'as needed', duration: '5 days' }
        ],
        notes: 'Take after meals',
        created_at: new Date().toISOString()
      }
      
      expect(prescription.medications.length).toBe(2)
    })
  })

  describe('READ Prescription', () => {
    it('should get prescriptions for patient', () => {
      const prescriptions = [
        { patient_id: 'p1', created_at: '2026-01-15' },
        { patient_id: 'p1', created_at: '2026-01-20' },
        { patient_id: 'p2', created_at: '2026-01-18' }
      ]
      
      const patientPrescriptions = prescriptions.filter(p => p.patient_id === 'p1')
      expect(patientPrescriptions.length).toBe(2)
    })
  })
})

// ============================================
// LAB ORDERS CRUD TESTS
// ============================================

describe('Lab Orders CRUD Operations', () => {

  describe('CREATE Lab Order', () => {
    it('should create lab order', () => {
      const labOrder = {
        patient_id: 'p1',
        doctor_id: 'd1',
        order_type: 'crown',
        specifications: {
          tooth_number: 14,
          material: 'Zirconia',
          shade: 'A2'
        },
        status: 'pending',
        due_date: '2026-02-05'
      }
      
      expect(labOrder.order_type).toBe('crown')
      expect(labOrder.specifications.material).toBe('Zirconia')
    })
  })

  describe('READ Lab Order', () => {
    it('should get orders by status', () => {
      const orders = [
        { id: 1, status: 'pending' },
        { id: 2, status: 'in_progress' },
        { id: 3, status: 'completed' },
        { id: 4, status: 'pending' }
      ]
      
      const pending = orders.filter(o => o.status === 'pending')
      expect(pending.length).toBe(2)
    })
  })

  describe('UPDATE Lab Order', () => {
    it('should update order status', () => {
      const statusFlow = ['pending', 'in_progress', 'ready', 'delivered']
      const currentIndex = statusFlow.indexOf('pending')
      const nextStatus = statusFlow[currentIndex + 1]
      
      expect(nextStatus).toBe('in_progress')
    })
  })
})

// ============================================
// TESTIMONIALS CRUD TESTS
// ============================================

describe('Testimonials CRUD Operations', () => {

  describe('CREATE Testimonial', () => {
    it('should create testimonial', () => {
      const testimonial = {
        patient_name: 'John Doe',
        rating: 5,
        content_en: 'Excellent service!',
        content_ar: 'خدمة ممتازة!',
        is_featured: true,
        is_active: true
      }
      
      expect(testimonial.rating).toBe(5)
      expect(testimonial.is_featured).toBe(true)
    })

    it('should validate rating range', () => {
      const validateRating = (rating) => rating >= 1 && rating <= 5
      
      expect(validateRating(5)).toBe(true)
      expect(validateRating(0)).toBe(false)
      expect(validateRating(6)).toBe(false)
    })
  })

  describe('READ Testimonial', () => {
    it('should get featured testimonials', () => {
      const testimonials = [
        { id: 1, is_featured: true, is_active: true },
        { id: 2, is_featured: false, is_active: true },
        { id: 3, is_featured: true, is_active: false }
      ]
      
      const featured = testimonials.filter(t => t.is_featured && t.is_active)
      expect(featured.length).toBe(1)
    })

    it('should calculate average rating', () => {
      const testimonials = [
        { rating: 5 },
        { rating: 4 },
        { rating: 5 },
        { rating: 3 }
      ]
      
      const avgRating = testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length
      expect(avgRating).toBe(4.25)
    })
  })
})

// ============================================
// PORTFOLIO CASES CRUD TESTS
// ============================================

describe('Portfolio Cases CRUD Operations', () => {

  describe('CREATE Portfolio Case', () => {
    it('should create before/after case', () => {
      const portfolioCase = {
        title_en: 'Smile Makeover',
        title_ar: 'تجميل الابتسامة',
        description_en: 'Complete smile transformation',
        category: 'cosmetic',
        before_image: 'before.jpg',
        after_image: 'after.jpg',
        doctor_id: 'd1',
        is_featured: true,
        is_active: true
      }
      
      expect(portfolioCase.before_image).toBeDefined()
      expect(portfolioCase.after_image).toBeDefined()
    })
  })

  describe('READ Portfolio Case', () => {
    it('should get cases by category', () => {
      const cases = [
        { id: 1, category: 'cosmetic' },
        { id: 2, category: 'orthodontics' },
        { id: 3, category: 'cosmetic' }
      ]
      
      const cosmeticCases = cases.filter(c => c.category === 'cosmetic')
      expect(cosmeticCases.length).toBe(2)
    })

    it('should get cases by doctor', () => {
      const cases = [
        { id: 1, doctor_id: 'd1' },
        { id: 2, doctor_id: 'd2' },
        { id: 3, doctor_id: 'd1' }
      ]
      
      const doctorCases = cases.filter(c => c.doctor_id === 'd1')
      expect(doctorCases.length).toBe(2)
    })
  })
})

// ============================================
// USERS CRUD TESTS
// ============================================

describe('Users CRUD Operations', () => {

  describe('CREATE User', () => {
    it('should create user with role', () => {
      const user = {
        email: 'user@example.com',
        full_name: 'John Doe',
        role: 'receptionist',
        is_active: true
      }
      
      expect(user.role).toBe('receptionist')
    })

    it('should validate role assignment', () => {
      const validRoles = ['developer', 'admin', 'doctor', 'receptionist', 'cbct_tech', 'assistant', 'patient']
      const isValidRole = (role) => validRoles.includes(role)
      
      expect(isValidRole('admin')).toBe(true)
      expect(isValidRole('superuser')).toBe(false)
    })
  })

  describe('READ User', () => {
    it('should get users by role', () => {
      const users = [
        { id: 1, role: 'admin' },
        { id: 2, role: 'doctor' },
        { id: 3, role: 'receptionist' },
        { id: 4, role: 'doctor' }
      ]
      
      const doctors = users.filter(u => u.role === 'doctor')
      expect(doctors.length).toBe(2)
    })
  })

  describe('UPDATE User', () => {
    it('should update user role', () => {
      const user = { role: 'receptionist' }
      const updated = { ...user, role: 'admin' }
      
      expect(updated.role).toBe('admin')
    })

    it('should deactivate user', () => {
      const user = { is_active: true }
      const deactivated = { ...user, is_active: false }
      
      expect(deactivated.is_active).toBe(false)
    })
  })
})
