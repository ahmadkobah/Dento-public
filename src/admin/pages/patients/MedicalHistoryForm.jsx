import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Heart,
  AlertTriangle,
  Pill,
  Cigarette,
  Calendar,
  Stethoscope,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useSelectedTenantId } from '../../../contexts/UnifiedTenantContext';

const MedicalHistoryForm = () => {
  const { id: patientId } = useParams();
  const navigate = useNavigate();
  const tenantId = useSelectedTenantId();
  
  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [existingId, setExistingId] = useState(null);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    // Chronic Conditions
    has_diabetes: false,
    has_hypertension: false,
    has_heart_disease: false,
    has_bleeding_disorder: false,
    has_hepatitis: false,
    has_hiv: false,
    has_asthma: false,
    has_epilepsy: false,
    has_pregnancy: false,
    other_conditions: '',

    // Allergies
    allergies: [],
    allergic_to_anesthesia: false,
    allergic_to_penicillin: false,
    allergic_to_latex: false,
    allergy_notes: '',

    // Medications
    current_medications: [],
    taking_blood_thinners: false,

    // Dental History
    previous_dental_surgeries: '',
    last_dental_visit: '',
    has_dental_anxiety: false,
    dental_anxiety_level: 1,

    // Lifestyle
    is_smoker: false,
    smoking_frequency: '',

    // Notes
    additional_notes: ''
  });

  const [newAllergy, setNewAllergy] = useState('');
  const [newMedication, setNewMedication] = useState('');

  // Fetch patient and existing medical history
  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Fetch patient
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('id, name, first_name, last_name, patient_code')
        .eq('id', patientId)
        .eq('tenant_id', tenantId)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);

      // Fetch existing medical history
      const { data: historyData, error: historyError } = await supabase
        .from('medical_history')
        .select('*')
        .eq('patient_id', patientId)
        .single();

      if (historyData && !historyError) {
        setExistingId(historyData.id);
        setFormData({
          has_diabetes: historyData.has_diabetes || false,
          has_hypertension: historyData.has_hypertension || false,
          has_heart_disease: historyData.has_heart_disease || false,
          has_bleeding_disorder: historyData.has_bleeding_disorder || false,
          has_hepatitis: historyData.has_hepatitis || false,
          has_hiv: historyData.has_hiv || false,
          has_asthma: historyData.has_asthma || false,
          has_epilepsy: historyData.has_epilepsy || false,
          has_pregnancy: historyData.has_pregnancy || false,
          other_conditions: historyData.other_conditions || '',
          allergies: historyData.allergies || [],
          allergic_to_anesthesia: historyData.allergic_to_anesthesia || false,
          allergic_to_penicillin: historyData.allergic_to_penicillin || false,
          allergic_to_latex: historyData.allergic_to_latex || false,
          allergy_notes: historyData.allergy_notes || '',
          current_medications: historyData.current_medications || [],
          taking_blood_thinners: historyData.taking_blood_thinners || false,
          previous_dental_surgeries: historyData.previous_dental_surgeries || '',
          last_dental_visit: historyData.last_dental_visit || '',
          has_dental_anxiety: historyData.has_dental_anxiety || false,
          dental_anxiety_level: historyData.dental_anxiety_level || 1,
          is_smoker: historyData.is_smoker || false,
          smoking_frequency: historyData.smoking_frequency || '',
          additional_notes: historyData.additional_notes || ''
        });
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const addAllergy = () => {
    if (newAllergy.trim() && !formData.allergies.includes(newAllergy.trim())) {
      setFormData(prev => ({
        ...prev,
        allergies: [...prev.allergies, newAllergy.trim()]
      }));
      setNewAllergy('');
    }
  };

  const removeAllergy = (allergy) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.filter(a => a !== allergy)
    }));
  };

  const addMedication = () => {
    if (newMedication.trim() && !formData.current_medications.includes(newMedication.trim())) {
      setFormData(prev => ({
        ...prev,
        current_medications: [...prev.current_medications, newMedication.trim()]
      }));
      setNewMedication('');
    }
  };

  const removeMedication = (medication) => {
    setFormData(prev => ({
      ...prev,
      current_medications: prev.current_medications.filter(m => m !== medication)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        patient_id: patientId,
        ...formData,
        last_dental_visit: formData.last_dental_visit || null,
        dental_anxiety_level: formData.has_dental_anxiety ? parseInt(formData.dental_anxiety_level) : null,
        updated_at: new Date().toISOString()
      };

      if (existingId) {
        // Update
        const { error: updateError } = await supabase
          .from('medical_history')
          .update(payload)
          .eq('id', existingId);
        if (updateError) throw updateError;
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from('medical_history')
          .insert([payload]);
        if (insertError) throw insertError;
      }

      navigate(`/patients/${patientId}/view`);
    } catch (err) {
      console.error('Error saving medical history:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const chronicConditions = [
    { key: 'has_diabetes', label: 'Diabetes', icon: '🩸' },
    { key: 'has_hypertension', label: 'Hypertension', icon: '💓' },
    { key: 'has_heart_disease', label: 'Heart Disease', icon: '❤️' },
    { key: 'has_bleeding_disorder', label: 'Bleeding Disorder', icon: '🩹' },
    { key: 'has_hepatitis', label: 'Hepatitis', icon: '🫀' },
    { key: 'has_hiv', label: 'HIV/AIDS', icon: '⚠️' },
    { key: 'has_asthma', label: 'Asthma', icon: '🫁' },
    { key: 'has_epilepsy', label: 'Epilepsy', icon: '⚡' },
    { key: 'has_pregnancy', label: 'Pregnancy', icon: '🤰' },
  ];

  const criticalAllergies = [
    { key: 'allergic_to_anesthesia', label: 'Local Anesthesia' },
    { key: 'allergic_to_penicillin', label: 'Penicillin' },
    { key: 'allergic_to_latex', label: 'Latex' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Medical History</h1>
              <p className="text-gray-500">
                {patient?.name || `${patient?.first_name} ${patient?.last_name}`}
                {patient?.patient_code && ` • ${patient.patient_code}`}
              </p>
            </div>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Chronic Conditions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900">Chronic Conditions</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {chronicConditions.map(condition => (
              <label 
                key={condition.key}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                  ${formData[condition.key] 
                    ? 'bg-red-50 border-red-300' 
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <input
                  type="checkbox"
                  name={condition.key}
                  checked={formData[condition.key]}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-lg">{condition.icon}</span>
                <span className="text-sm font-medium text-gray-700">{condition.label}</span>
              </label>
            ))}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Other Conditions
            </label>
            <textarea
              name="other_conditions"
              value={formData.other_conditions}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="List any other medical conditions..."
            />
          </div>
        </div>

        {/* Allergies */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">Allergies</h2>
          </div>

          {/* Critical Allergies */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-600 mb-2">Critical Allergies (Dental-Related)</p>
            <div className="flex flex-wrap gap-3">
              {criticalAllergies.map(allergy => (
                <label 
                  key={allergy.key}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all
                    ${formData[allergy.key] 
                      ? 'bg-red-100 border-red-400 text-red-700' 
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    name={allergy.key}
                    checked={formData[allergy.key]}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium">{allergy.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Other Allergies */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-600 mb-2">Other Allergies</p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Add allergy..."
              />
              <button
                type="button"
                onClick={addAllergy}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.allergies.map((allergy, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm"
                >
                  {allergy}
                  <button
                    type="button"
                    onClick={() => removeAllergy(allergy)}
                    className="w-4 h-4 hover:text-amber-900"
                  >
                    ×
                  </button>
                </span>
              ))}
              {formData.allergies.length === 0 && (
                <span className="text-sm text-gray-400">No allergies listed</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Allergy Notes
            </label>
            <textarea
              name="allergy_notes"
              value={formData.allergy_notes}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Any additional notes about allergies..."
            />
          </div>
        </div>

        {/* Medications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Pill className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Current Medications</h2>
          </div>

          <label className={`
            flex items-center gap-3 p-3 mb-4 rounded-lg border-2 cursor-pointer transition-all
            ${formData.taking_blood_thinners 
              ? 'bg-red-50 border-red-300' 
              : 'bg-gray-50 border-gray-200 hover:border-gray-300'
            }
          `}>
            <input
              type="checkbox"
              name="taking_blood_thinners"
              checked={formData.taking_blood_thinners}
              onChange={handleChange}
              className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-lg">💊</span>
            <span className="text-sm font-medium text-gray-700">
              Taking Blood Thinners (Aspirin, Warfarin, etc.)
            </span>
          </label>

          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newMedication}
              onChange={(e) => setNewMedication(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMedication())}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Add medication..."
            />
            <button
              type="button"
              onClick={addMedication}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.current_medications.map((med, index) => (
              <span 
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
              >
                {med}
                <button
                  type="button"
                  onClick={() => removeMedication(med)}
                  className="w-4 h-4 hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            ))}
            {formData.current_medications.length === 0 && (
              <span className="text-sm text-gray-400">No medications listed</span>
            )}
          </div>
        </div>

        {/* Dental History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope className="w-5 h-5 text-teal-500" />
            <h2 className="text-lg font-semibold text-gray-900">Dental History</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Last Dental Visit
              </label>
              <input
                type="date"
                name="last_dental_visit"
                value={formData.last_dental_visit}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Previous Dental Surgeries
              </label>
              <input
                type="text"
                name="previous_dental_surgeries"
                value={formData.previous_dental_surgeries}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Wisdom tooth extraction, implant..."
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="has_dental_anxiety"
                checked={formData.has_dental_anxiety}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm font-medium text-gray-700">Patient has dental anxiety</span>
            </label>

            {formData.has_dental_anxiety && (
              <div className="mt-3 ml-7">
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Anxiety Level (1-10)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    name="dental_anxiety_level"
                    min="1"
                    max="10"
                    value={formData.dental_anxiety_level}
                    onChange={handleChange}
                    className="flex-1"
                  />
                  <span className={`
                    w-8 h-8 flex items-center justify-center rounded-full font-bold
                    ${formData.dental_anxiety_level <= 3 ? 'bg-green-100 text-green-700' :
                      formData.dental_anxiety_level <= 6 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }
                  `}>
                    {formData.dental_anxiety_level}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lifestyle */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cigarette className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Lifestyle</h2>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="is_smoker"
              checked={formData.is_smoker}
              onChange={handleChange}
              className="w-4 h-4 rounded border-gray-300 text-gray-600 focus:ring-gray-500"
            />
            <span className="text-sm font-medium text-gray-700">Patient is a smoker</span>
          </label>

          {formData.is_smoker && (
            <div className="mt-3 ml-7">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Smoking Frequency
              </label>
              <select
                name="smoking_frequency"
                value={formData.smoking_frequency}
                onChange={handleChange}
                className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select frequency</option>
                <option value="light">Light (1-5 cigarettes/day)</option>
                <option value="moderate">Moderate (6-15 cigarettes/day)</option>
                <option value="heavy">Heavy (16+ cigarettes/day)</option>
                <option value="social">Social smoker only</option>
                <option value="former">Former smoker</option>
              </select>
            </div>
          )}
        </div>

        {/* Additional Notes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h2>
          <textarea
            name="additional_notes"
            value={formData.additional_notes}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Any other relevant medical information..."
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Medical History
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MedicalHistoryForm;
