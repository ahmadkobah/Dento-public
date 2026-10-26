import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Heart,
  AlertTriangle,
  Pill,
  Stethoscope,
  Shield,
  FileText,
  Clock,
  Cigarette,
  Globe,
  UserCheck,
  ClipboardList,
  DollarSign,
  ChevronRight,
  Users,
  Plus,
  X,
  Search,
  Image,
  Scan,
  FileSignature,
  Package,
  Receipt
} from 'lucide-react';
import { format, parseISO, differenceInYears } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { useSelectedTenantId } from '../../../contexts/UnifiedTenantContext';
import { escapeSearchTerm } from '../../../utils/validation';
import PatientClinicalRecords from './PatientClinicalRecords';

const PatientView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const tenantId = useSelectedTenantId();
  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [treatments, setTreatments] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loadingTreatments, setLoadingTreatments] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [loadingMedical, setLoadingMedical] = useState(true);
  const [loadingFamily, setLoadingFamily] = useState(true);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [familySearch, setFamilySearch] = useState('');
  const [familySearchResults, setFamilySearchResults] = useState([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedRelation, setSelectedRelation] = useState('spouse');
  const [error, setError] = useState(null);
  const [clinicalCounts, setClinicalCounts] = useState({
    treatmentPlans: 0,
    prescriptions: 0,
    xrays: 0,
    cbct: 0,
    consentForms: 0,
    labOrders: 0,
    invoices: 0
  });

  // Fetch patient data
  const fetchPatient = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError) throw fetchError;
      setPatient(data);
    } catch (err) {
      setError(err.message);
      setPatient(null);
    } finally {
      setIsLoading(false);
    }
  }, [id, tenantId]);

  // Load medical history
  const loadMedicalHistory = useCallback(async () => {
    setLoadingMedical(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('medical_history')
        .select('*')
        .eq('patient_id', id)
        .single();

      if (data && !fetchError) {
        setMedicalHistory(data);
      }
    } catch (err) {
      console.error('Error loading medical history:', err);
    } finally {
      setLoadingMedical(false);
    }
  }, [id]);

  // Load treatment history (including procedure notes and completed treatment plans)
  const loadTreatments = useCallback(async () => {
    setLoadingTreatments(true);
    try {
      // Load treatments
      const { data: treatmentsData, error: _treatmentsError } = await supabase
        .from('treatments')
        .select(`
          *,
          doctors (name_en, name_ar)
        `)
        .eq('patient_id', id)
        .order('treatment_date', { ascending: false })
        .limit(10);

      // Load procedure notes
      const { data: procedureNotesData, error: _procedureNotesError } = await supabase
        .from('procedure_notes')
        .select(`
          *,
          doctors:doctor_id (name_en, name_ar)
        `)
        .eq('patient_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Load completed treatment plans
      const { data: treatmentPlansData, error: _treatmentPlansError } = await supabase
        .from('treatment_plans')
        .select(`
          *,
          doctors:doctor_id (name_en, name_ar)
        `)
        .eq('patient_id', id)
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(10);

      // Combine and sort by date
      const combinedData = [
        ...(treatmentsData || []).map(t => ({ ...t, type: 'treatment', date: t.treatment_date })),
        ...(procedureNotesData || []).map(p => ({ ...p, type: 'procedure_note', date: p.created_at })),
        ...(treatmentPlansData || []).map(tp => ({ ...tp, type: 'treatment_plan', date: tp.updated_at }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

      setTreatments(combinedData);
    } catch (err) {
      console.error('Error loading treatments:', err);
    } finally {
      setLoadingTreatments(false);
    }
  }, [id, tenantId]);

  // Load appointment history
  const loadAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          doctors (name_en, name_ar)
        `)
        .eq('patient_id', id)
        .eq('tenant_id', tenantId)
        .order('datetime_start', { ascending: false })
        .limit(10);

      if (data && !error) {
        setAppointments(data);
      }
    } catch (err) {
      console.error('Error loading appointments:', err);
    } finally {
      setLoadingAppointments(false);
    }
  }, [id, tenantId]);

  // Load family members
  const loadFamilyMembers = useCallback(async () => {
    setLoadingFamily(true);
    try {
      // Get links where this patient is patient_id
      const { data: links1, error: err1 } = await supabase
        .from('patient_family_links')
        .select(`
          id,
          relationship_type,
          related_patient:related_patient_id (id, first_name, last_name, phone, date_of_birth)
        `)
        .eq('patient_id', id);

      // Get links where this patient is related_patient_id  
      const { data: links2, error: err2 } = await supabase
        .from('patient_family_links')
        .select(`
          id,
          relationship_type,
          related_patient:patient_id (id, first_name, last_name, phone, date_of_birth)
        `)
        .eq('related_patient_id', id);

      if (!err1 && !err2) {
        const allLinks = [...(links1 || []), ...(links2 || [])];
        setFamilyMembers(allLinks);
      }
    } catch (err) {
      console.error('Error loading family members:', err);
    } finally {
      setLoadingFamily(false);
    }
  }, [id]);

  // Load clinical record counts
  const loadClinicalCounts = useCallback(async () => {
    try {
      const [
        { count: treatmentPlans },
        { count: prescriptions },
        { count: xrays },
        { count: cbct },
        { count: consentForms },
        { count: labOrders },
        { count: invoices },
      ] = await Promise.all([
        supabase.from('treatment_plans').select('*', { count: 'exact', head: true }).eq('patient_id', id).eq('tenant_id', tenantId),
        supabase.from('prescriptions').select('*', { count: 'exact', head: true }).eq('patient_id', id).eq('tenant_id', tenantId),
        supabase.from('xrays').select('*', { count: 'exact', head: true }).eq('patient_id', id),
        supabase.from('cbct_orders').select('*', { count: 'exact', head: true }).eq('patient_id', id),
        supabase.from('consent_forms').select('*', { count: 'exact', head: true }).eq('patient_id', id),
        supabase.from('lab_orders').select('*', { count: 'exact', head: true }).eq('patient_id', id),
        supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('patient_id', id).eq('tenant_id', tenantId),
      ]);

      setClinicalCounts({
        treatmentPlans: treatmentPlans || 0,
        prescriptions: prescriptions || 0,
        xrays: xrays || 0,
        cbct: cbct || 0,
        consentForms: consentForms || 0,
        labOrders: labOrders || 0,
        invoices: invoices || 0
      });
    } catch (err) {
      console.error('Error loading clinical counts:', err);
    }
  }, [id, tenantId]);

  // Search patients for family linking
  const searchPatients = async (query) => {
    if (!query || query.length < 2) {
      setFamilySearchResults([]);
      return;
    }
    setSearchingPatients(true);
    try {
      const safeQuery = escapeSearchTerm(query);
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, phone')
        .eq('tenant_id', tenantId)
        .neq('id', id) // Exclude current patient
        .or(`first_name.ilike.%${safeQuery}%,last_name.ilike.%${safeQuery}%,phone.ilike.%${safeQuery}%`)
        .limit(10);

      if (data && !error) {
        // Filter out already linked patients
        const linkedIds = familyMembers.map(f => f.related_patient?.id);
        setFamilySearchResults(data.filter(p => !linkedIds.includes(p.id)));
      }
    } catch (err) {
      console.error('Error searching patients:', err);
    } finally {
      setSearchingPatients(false);
    }
  };

  // Add family link
  const addFamilyLink = async (relatedPatientId) => {
    try {
      const { error } = await supabase
        .from('patient_family_links')
        .insert({
          patient_id: id,
          related_patient_id: relatedPatientId,
          relationship_type: selectedRelation
        });

      if (!error) {
        loadFamilyMembers();
        setShowFamilyModal(false);
        setFamilySearch('');
        setFamilySearchResults([]);
      }
    } catch (err) {
      console.error('Error adding family link:', err);
    }
  };

  // Remove family link
  const _removeFamilyLink = async (linkId) => {
    if (!window.confirm('Remove this family link?')) return;
    try {
      const { error } = await supabase
        .from('patient_family_links')
        .delete()
        .eq('id', linkId);

      if (!error) {
        loadFamilyMembers();
      }
    } catch (err) {
      console.error('Error removing family link:', err);
    }
  };

  useEffect(() => {
    if (id && tenantId) {
      fetchPatient();
      loadMedicalHistory();
      loadTreatments();
      loadAppointments();
      loadFamilyMembers();
      loadClinicalCounts();
    }
  }, [id, tenantId, fetchPatient, loadMedicalHistory, loadTreatments, loadAppointments, loadFamilyMembers, loadClinicalCounts]);

  // Debounced search for family members
  useEffect(() => {
    const timer = setTimeout(() => {
      searchPatients(familySearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [familySearch]);

  const getAge = (dob) => {
    if (!dob) return null;
    return differenceInYears(new Date(), parseISO(dob));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{error || 'Patient not found'}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-primary-500 hover:underline"
        >
          Back to Patients
        </button>
      </div>
    );
  }

  const conditions = medicalHistory ? [
    { name: 'Diabetes', has: medicalHistory.has_diabetes },
    { name: 'Hypertension', has: medicalHistory.has_hypertension },
    { name: 'Heart Disease', has: medicalHistory.has_heart_disease },
    { name: 'Bleeding Disorder', has: medicalHistory.has_bleeding_disorder },
    { name: 'Hepatitis', has: medicalHistory.has_hepatitis },
    { name: 'HIV/AIDS', has: medicalHistory.has_hiv },
    { name: 'Asthma', has: medicalHistory.has_asthma },
    { name: 'Epilepsy', has: medicalHistory.has_epilepsy },
    { name: 'Pregnancy', has: medicalHistory.has_pregnancy },
  ].filter(c => c.has) : [];

  const criticalAllergies = medicalHistory ? [
    { name: 'Anesthesia', has: medicalHistory.allergic_to_anesthesia },
    { name: 'Penicillin', has: medicalHistory.allergic_to_penicillin },
    { name: 'Latex', has: medicalHistory.allergic_to_latex },
  ].filter(a => a.has) : [];

  // Stats for right sidebar
  const statsItems = [
    { label: 'Treatment Plans', count: clinicalCounts.treatmentPlans, icon: ClipboardList, color: 'text-blue-500', bg: 'bg-blue-50', link: `/treatment-plans?patient=${id}` },
    { label: 'Prescriptions', count: clinicalCounts.prescriptions, icon: Pill, color: 'text-green-500', bg: 'bg-green-50', link: `/prescriptions?patient=${id}` },
    { label: 'X-Rays', count: clinicalCounts.xrays, icon: Image, color: 'text-purple-500', bg: 'bg-purple-50', link: `/xrays?patient=${id}` },
    { label: 'CBCT Scans', count: clinicalCounts.cbct, icon: Scan, color: 'text-indigo-500', bg: 'bg-indigo-50', link: `/cbct?patient=${id}` },
    { label: 'Consent Forms', count: clinicalCounts.consentForms, icon: FileSignature, color: 'text-orange-500', bg: 'bg-orange-50', link: `/consent-forms?patient=${id}` },
    { label: 'Lab Orders', count: clinicalCounts.labOrders, icon: Package, color: 'text-teal-500', bg: 'bg-teal-50', link: `/lab-orders?patient=${id}` },
    { label: 'Invoices', count: clinicalCounts.invoices, icon: Receipt, color: 'text-red-500', bg: 'bg-red-50', link: `/invoices?patient=${id}` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patient Profile</h1>
            <p className="text-gray-500 mt-1">
              {patient.patient_code || `PT-${patient.id?.slice(0, 6).toUpperCase()}`}
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(criticalAllergies.length > 0 || medicalHistory?.taking_blood_thinners) && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Critical Medical Alerts</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {criticalAllergies.map(a => (
                  <span key={a.name} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                    Allergic to {a.name}
                  </span>
                ))}
                {medicalHistory?.taking_blood_thinners && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                    On Blood Thinners
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT COLUMN - Patient Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-3">
                <span className="text-primary-600 font-bold text-xl">
                  {patient.first_name?.[0]?.toUpperCase()}{patient.last_name?.[0]?.toUpperCase()}
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-900">
                {patient.first_name} {patient.last_name}
              </h2>
              <p className="text-gray-500 capitalize text-sm">{patient.gender || 'Gender not set'}</p>
              {patient.date_of_birth && (
                <p className="text-sm text-gray-500">
                  {getAge(patient.date_of_birth)} years old
                </p>
              )}
              <span className={`mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                patient.is_active 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {patient.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-primary-500" />
              Contact
            </h3>
            <div className="space-y-2 text-sm">
              {patient.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-600">{patient.phone}</span>
                </div>
              )}
              {patient.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-600 truncate">{patient.email}</span>
                </div>
              )}
              {(patient.address || patient.city) && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                  <span className="text-gray-600">
                    {patient.city}{patient.city && patient.country && ', '}{patient.country}
                  </span>
                </div>
              )}
              {patient.date_of_birth && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-600">
                    {format(parseISO(patient.date_of_birth), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Emergency Contact */}
          {(patient.emergency_contact_name || patient.emergency_contact_phone) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-red-500" />
                Emergency
              </h3>
              <div className="space-y-1 text-sm">
                {patient.emergency_contact_name && (
                  <p className="text-gray-900 font-medium">{patient.emergency_contact_name}</p>
                )}
                {patient.emergency_contact_phone && (
                  <p className="text-gray-600 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" />
                    {patient.emergency_contact_phone}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Family Members */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-purple-500" />
                Family
              </h3>
              <button
                onClick={() => setShowFamilyModal(true)}
                className="text-xs text-primary-500 hover:text-primary-600"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {loadingFamily ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : familyMembers.length === 0 ? (
              <p className="text-gray-500 text-xs text-center py-2">No family linked</p>
            ) : (
              <div className="space-y-2">
                {familyMembers.slice(0, 3).map(link => (
                  <Link
                    key={link.id}
                    to={`/patients/${link.related_patient?.id}`}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-purple-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {link.related_patient?.first_name} {link.related_patient?.last_name}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{link.relationship_type}</p>
                    </div>
                  </Link>
                ))}
                {familyMembers.length > 3 && (
                  <p className="text-xs text-gray-500 text-center">+{familyMembers.length - 3} more</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CENTER COLUMN - Medical Info & Records (Wide) */}
        <div className="lg:col-span-8 space-y-4">
          {loadingMedical ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : !medicalHistory ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
              <Heart className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">No medical history recorded</p>
              <Link
                to={`/patients/${id}/medical-history`}
                className="text-primary-500 hover:underline text-sm mt-2 inline-block"
              >
                Add Medical History
              </Link>
            </div>
          ) : (
            <>
              {/* Medical Conditions & Allergies Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Medical Conditions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                    <Heart className="w-4 h-4 text-red-500" />
                    Medical Conditions
                  </h3>
                  {conditions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {conditions.map(c => (
                        <span key={c.name} className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          {c.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs">No conditions reported</p>
                  )}
                </div>

                {/* Allergies */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Allergies
                  </h3>
                  {criticalAllergies.length > 0 || medicalHistory.allergies?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {criticalAllergies.map(a => (
                        <span key={a.name} className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                          {a.name}
                        </span>
                      ))}
                      {medicalHistory.allergies?.map((allergy, i) => (
                        <span key={i} className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                          {allergy}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs">No allergies reported</p>
                  )}
                </div>
              </div>

              {/* Medications & Dental History Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Medications */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                    <Pill className="w-4 h-4 text-blue-500" />
                    Medications
                  </h3>
                  {medicalHistory.taking_blood_thinners && (
                    <div className="mb-2 p-2 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-xs text-red-700 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Blood Thinners
                      </p>
                    </div>
                  )}
                  {medicalHistory.current_medications?.length > 0 ? (
                    <div className="space-y-1.5">
                      {medicalHistory.current_medications.slice(0, 4).map((med, i) => (
                        <div key={i} className="flex items-center gap-2 p-1.5 bg-blue-50 rounded text-xs">
                          <Pill className="w-3 h-3 text-blue-500" />
                          <span className="text-blue-700">{med}</span>
                        </div>
                      ))}
                      {medicalHistory.current_medications.length > 4 && (
                        <p className="text-xs text-gray-500">+{medicalHistory.current_medications.length - 4} more</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs">No medications</p>
                  )}
                </div>

                {/* Dental History */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                    <Stethoscope className="w-4 h-4 text-primary-500" />
                    Dental History
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Last Visit</p>
                      <p className="font-medium text-gray-900 text-sm">
                        {medicalHistory.last_dental_visit 
                          ? format(parseISO(medicalHistory.last_dental_visit), 'MMM d, yyyy')
                          : 'Not recorded'}
                      </p>
                    </div>
                    {medicalHistory.has_dental_anxiety && (
                      <div>
                        <p className="text-xs text-gray-500">Anxiety Level</p>
                        <p className={`font-medium text-sm ${
                          medicalHistory.dental_anxiety_level <= 3 ? 'text-green-600' :
                          medicalHistory.dental_anxiety_level <= 6 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {medicalHistory.dental_anxiety_level}/10
                        </p>
                      </div>
                    )}
                    {medicalHistory.is_smoker && (
                      <div className="p-2 bg-yellow-50 rounded-lg">
                        <p className="text-xs text-yellow-700">
                          <Cigarette className="w-3 h-3 inline mr-1" />
                          Smoker
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Appointments & Treatments Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Appointments */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Appointments
                </h3>
                <Link
                  to={`/appointments?patient=${id}`}
                  className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1"
                >
                  All <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {loadingAppointments ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : appointments.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-4">No appointments</p>
              ) : (
                <div className="space-y-2">
                  {appointments.slice(0, 3).map(apt => (
                    <Link
                      key={apt.id}
                      to={`/appointments/edit/${apt.id}`}
                      className="block p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-900">
                            {apt.datetime_start && format(parseISO(apt.datetime_start), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {apt.datetime_start && format(parseISO(apt.datetime_start), 'h:mm a')}
                          </p>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                          apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          apt.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {apt.status?.replace('_', ' ')}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Treatments */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                  <ClipboardList className="w-4 h-4 text-green-500" />
                  Treatments
                </h3>
                <Link
                  to={`/patients/${id}/treatment-history`}
                  className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1"
                >
                  All <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {loadingTreatments ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : treatments.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-4">No treatments</p>
              ) : (
                <div className="space-y-2">
                  {treatments.slice(0, 3).map(treatment => (
                    <Link
                      key={`${treatment.type}-${treatment.id}`}
                      to={treatment.type === 'procedure_note' 
                        ? `/procedure-notes/${treatment.id}` 
                        : treatment.type === 'treatment_plan'
                        ? `/treatment-plans/${treatment.id}`
                        : `/treatments/${treatment.id}`}
                      className="block p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {treatment.type === 'procedure_note' 
                          ? treatment.procedure_name 
                          : treatment.type === 'treatment_plan'
                          ? treatment.title
                          : (treatment.treatment_type || 'Treatment')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {treatment.date && format(parseISO(treatment.date), 'MMM d, yyyy')}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Clinical Records */}
          <PatientClinicalRecords patientId={id} />
        </div>

        {/* RIGHT COLUMN - Stats & Quick Actions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Clinical Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Clinical Records</h3>
            <div className="space-y-2">
              {statsItems.map(item => (
                <Link
                  key={item.label}
                  to={item.link}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center`}>
                      <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                    </div>
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                to={`/patients/${id}/dental-chart`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-primary-50 text-primary-600 transition-colors"
              >
                <span className="text-base">🦷</span>
                <span className="text-sm font-medium">Dental Chart</span>
              </Link>
              <Link
                to={`/patients/${id}/medical-history`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-teal-50 text-teal-600 transition-colors"
              >
                <span className="text-base">📋</span>
                <span className="text-sm font-medium">Medical History</span>
              </Link>
              <Link
                to={`/patients/edit/${id}`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span className="text-sm font-medium">Edit Patient</span>
              </Link>
              <div className="border-t border-gray-100 my-2"></div>
              <Link
                to={`/appointments/create?patient=${id}`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">New Appointment</span>
              </Link>
              <Link
                to={`/prescriptions/create?patient=${id}`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">New Prescription</span>
              </Link>
              <Link
                to={`/treatment-plans/create?patient=${id}`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">New Treatment Plan</span>
              </Link>
              <Link
                to={`/invoices/create?patient=${id}`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">New Invoice</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Family Link Modal */}
      {showFamilyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Link Family Member</h3>
              <button
                onClick={() => {
                  setShowFamilyModal(false);
                  setFamilySearch('');
                  setFamilySearchResults([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship Type
                </label>
                <select
                  value={selectedRelation}
                  onChange={(e) => setSelectedRelation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="spouse">Spouse</option>
                  <option value="parent">Parent</option>
                  <option value="child">Child</option>
                  <option value="sibling">Sibling</option>
                  <option value="guardian">Guardian</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Patient
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={familySearch}
                    onChange={(e) => setFamilySearch(e.target.value)}
                    placeholder="Search by name or phone..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {searchingPatients && (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}

              {familySearchResults.length > 0 && (
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  {familySearchResults.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addFamilyLink(p.id)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <p className="font-medium text-gray-900">
                        {p.first_name} {p.last_name}
                      </p>
                      {p.phone && (
                        <p className="text-sm text-gray-500">{p.phone}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {familySearch.length >= 2 && !searchingPatients && familySearchResults.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No patients found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientView;
