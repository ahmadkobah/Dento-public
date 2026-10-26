import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetIdentity } from '@refinedev/core';
import { ArrowLeft, Save, Loader2, Calendar, Clock, Building2, User, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';

const DoctorScheduleForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  
  const { data: identity } = useGetIdentity();
  const userId = identity?.id;
  const { tenantId } = useTenant();

  const [doctors, setDoctors] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    doctor_id: '',
    branch_id: '',
    schedule_type: 'recurring',
    days_of_week: [], // Array for multiple day selection
    specific_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '17:00',
    is_active: true,
    notes: '',
  });

  // Fetch doctors and branches
  useEffect(() => {
    const fetchData = async () => {
      if (!tenantId) return;
      const [doctorsRes, branchesRes] = await Promise.all([
        supabase
          .from('doctors')
          .select('id, name_en, photo_url')
          .eq('is_active', true)
          .eq('tenant_id', tenantId)
          .order('name_en'),
        supabase
          .from('branches')
          .select('id, name_en')
          .eq('is_active', true)
          .eq('tenant_id', tenantId)
          .order('name_en')
      ]);

      setDoctors(doctorsRes.data || []);
      setBranches(branchesRes.data || []);
      setLoading(false);
    };

    fetchData();
  }, [tenantId]);

  // Fetch schedule data if editing
  useEffect(() => {
    const fetchSchedule = async () => {
      if (!isEdit || !id) return;

      const { data, error: fetchError } = await supabase
        .from('doctor_schedules')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        setError('Failed to load schedule data');
        console.error('Error fetching schedule:', fetchError);
      } else if (data) {
        setFormData({
          doctor_id: data.doctor_id,
          branch_id: data.branch_id,
          schedule_type: data.schedule_type,
          days_of_week: data.day_of_week !== null ? [data.day_of_week] : [], // Convert single day to array
          specific_date: data.specific_date || format(new Date(), 'yyyy-MM-dd'),
          start_time: data.start_time || '09:00',
          end_time: data.end_time || '17:00',
          is_active: data.is_active ?? true,
          notes: data.notes || '',
        });
      }
    };

    fetchSchedule();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    // Validation
    if (!formData.doctor_id) {
      setError('Please select a doctor');
      setSaving(false);
      return;
    }

    if (!formData.branch_id) {
      setError('Please select a branch');
      setSaving(false);
      return;
    }

    if (formData.schedule_type === 'recurring' && formData.days_of_week.length === 0) {
      setError('Please select at least one day of the week');
      setSaving(false);
      return;
    }

    if (formData.schedule_type === 'specific' && !formData.specific_date) {
      setError('Please select a specific date');
      setSaving(false);
      return;
    }

    try {
      if (isEdit) {
        // When editing, update the single record
        const dataToSave = {
          doctor_id: formData.doctor_id,
          branch_id: formData.branch_id,
          schedule_type: formData.schedule_type,
          day_of_week: formData.schedule_type === 'recurring' ? formData.days_of_week[0] : null,
          specific_date: formData.schedule_type === 'specific' ? formData.specific_date : null,
          start_time: formData.start_time,
          end_time: formData.end_time,
          is_active: formData.is_active,
          notes: formData.notes || null,
        };

        const result = await supabase
          .from('doctor_schedules')
          .update(dataToSave)
          .eq('id', id)
          .select()
          .single();
        
        if (result.error) throw result.error;
      } else {
        // When creating new, insert a record for each selected day
        if (formData.schedule_type === 'recurring') {
          const recordsToInsert = formData.days_of_week.map(day => ({
            doctor_id: formData.doctor_id,
            branch_id: formData.branch_id,
            schedule_type: 'recurring',
            day_of_week: parseInt(day),
            specific_date: null,
            start_time: formData.start_time,
            end_time: formData.end_time,
            is_active: formData.is_active,
            notes: formData.notes || null,
            created_by: userId,
          }));

          const result = await supabase
            .from('doctor_schedules')
            .insert(recordsToInsert)
            .select();
          
          if (result.error) throw result.error;
        } else {
          // Specific date - single record
          const result = await supabase
            .from('doctor_schedules')
            .insert({
              doctor_id: formData.doctor_id,
              branch_id: formData.branch_id,
              schedule_type: 'specific',
              day_of_week: null,
              specific_date: formData.specific_date,
              start_time: formData.start_time,
              end_time: formData.end_time,
              is_active: formData.is_active,
              notes: formData.notes || null,
              created_by: userId,
            })
            .select()
            .single();
          
          if (result.error) throw result.error;
        }
      }

      navigate('/schedules');
    } catch (err) {
      console.error('Error saving schedule:', err);
      setError(err.message || 'Failed to save doctor schedule');
    } finally {
      setSaving(false);
    }
  };

  const dayNames = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Doctor Schedule' : 'Assign Doctor to Branch'}
          </h1>
          <p className="text-gray-600 mt-1">
            Assign a doctor to work at a specific branch on certain days
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
        {/* Doctor Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-1" />
            Doctor <span className="text-red-500">*</span>
          </label>
          <select
            name="doctor_id"
            value={formData.doctor_id}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          >
            <option value="">Select a doctor...</option>
            {doctors.map(doc => (
              <option key={doc.id} value={doc.id}>{doc.name_en}</option>
            ))}
          </select>
        </div>

        {/* Branch Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Building2 className="w-4 h-4 inline mr-1" />
            Branch <span className="text-red-500">*</span>
          </label>
          <select
            name="branch_id"
            value={formData.branch_id}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          >
            <option value="">Select a branch...</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name_en}</option>
            ))}
          </select>
        </div>

        {/* Schedule Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Schedule Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-colors ${
                formData.schedule_type === 'recurring'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="schedule_type"
                value="recurring"
                checked={formData.schedule_type === 'recurring'}
                onChange={handleChange}
                className="sr-only"
              />
              <span className="font-medium text-gray-900">Weekly Recurring</span>
              <span className="text-xs text-gray-500 mt-1">Same day every week</span>
            </label>
            <label
              className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-colors ${
                formData.schedule_type === 'specific'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="schedule_type"
                value="specific"
                checked={formData.schedule_type === 'specific'}
                onChange={handleChange}
                className="sr-only"
              />
              <span className="font-medium text-gray-900">Specific Date</span>
              <span className="text-xs text-gray-500 mt-1">One-time assignment</span>
            </label>
          </div>
        </div>

        {/* Days of Week (for recurring) - Multiple Selection */}
        {formData.schedule_type === 'recurring' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Days of Week <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 ml-2">(Select multiple)</span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {dayNames.map(day => (
                <label
                  key={day.value}
                  className={`flex items-center justify-center p-2 border rounded-lg cursor-pointer transition-colors text-sm ${
                    formData.days_of_week.includes(day.value)
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    value={day.value}
                    checked={formData.days_of_week.includes(day.value)}
                    onChange={(e) => {
                      const dayVal = parseInt(e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        days_of_week: e.target.checked
                          ? [...prev.days_of_week, dayVal]
                          : prev.days_of_week.filter(d => d !== dayVal)
                      }));
                    }}
                    className="sr-only"
                  />
                  {day.label.slice(0, 3)}
                </label>
              ))}
            </div>
            {formData.days_of_week.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Selected: {formData.days_of_week.sort((a, b) => a - b).map(d => dayNames.find(dn => dn.value === d)?.label).join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Specific Date (for specific) */}
        {formData.schedule_type === 'specific' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="specific_date"
              value={formData.specific_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
        )}

        {/* Working Hours */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Start Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              name="start_time"
              value={formData.start_time}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              End Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              name="end_time"
              value={formData.end_time}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={2}
            placeholder="Optional notes about this schedule..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Active Status */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="is_active" className="text-sm text-gray-700">
            Schedule is active
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isEdit ? 'Update Schedule' : 'Assign Doctor'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DoctorScheduleForm;
