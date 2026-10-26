import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetIdentity } from '@refinedev/core';
import { ArrowLeft, Save, Loader2, Calendar, Clock, AlertCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';

const ScheduleExceptionForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  
  const { data: identity } = useGetIdentity();
  const userRole = identity?.role;
  const userId = identity?.id;
  const isAdmin = ['developer', 'admin'].includes(userRole);
  const { tenantId } = useTenant();

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    doctor_id: '',
    exception_type: 'vacation',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    start_time: '',
    end_time: '',
    is_full_day: true,
    reason: '',
  });

  // Fetch doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      if (!identity) return;
      if (!tenantId) return;

      let query = supabase
        .from('doctors')
        .select('id, name_en, user_id')
        .eq('is_active', true)
        .eq('tenant_id', tenantId)
        .order('name_en');

      // If not admin, only fetch their own doctor record
      if (!isAdmin) {
        query = query.eq('user_id', userId);
      }

      const { data, error: fetchError } = await query;
      
      if (fetchError) {
        console.error('Error fetching doctors:', fetchError);
      } else {
        setDoctors(data || []);
        // Auto-select if only one doctor (i.e., the doctor themselves)
        if (data && data.length === 1) {
          setFormData(prev => ({ ...prev, doctor_id: data[0].id }));
        }
      }
    };

    fetchDoctors();
  }, [identity, isAdmin, userId, tenantId]);

  // Fetch exception data if editing
  useEffect(() => {
    const fetchException = async () => {
      if (!isEdit || !id) {
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('schedule_exceptions')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        setError('Failed to load exception data');
        console.error('Error fetching exception:', fetchError);
      } else if (data) {
        // Check permission - doctors can only edit their own pending exceptions
        if (!isAdmin) {
          const doctorCheck = await supabase
            .from('doctors')
            .select('id')
            .eq('id', data.doctor_id)
            .eq('user_id', userId)
            .eq('tenant_id', tenantId)
            .single();

          if (!doctorCheck.data) {
            setError('You do not have permission to edit this exception');
            setLoading(false);
            return;
          }

          if (data.is_approved) {
            setError('You cannot edit an approved exception. Contact an administrator.');
            setLoading(false);
            return;
          }
        }

        setFormData({
          doctor_id: data.doctor_id,
          exception_type: data.exception_type || 'vacation',
          start_date: data.start_date,
          end_date: data.end_date,
          start_time: data.start_time || '',
          end_time: data.end_time || '',
          is_full_day: data.is_full_day ?? true,
          reason: data.reason || '',
        });
      }

      setLoading(false);
    };

    fetchException();
  }, [id, isEdit, isAdmin, userId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
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

    if (formData.end_date < formData.start_date) {
      setError('End date cannot be before start date');
      setSaving(false);
      return;
    }

    try {
      // Use actual database columns
      const dataToSave = {
        doctor_id: formData.doctor_id,
        exception_type: formData.exception_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_full_day: true,
        reason: formData.reason || null,
        status: 'pending',
        is_approved: isAdmin,
        ...(isAdmin && !isEdit && { approved_by: userId, approved_at: new Date().toISOString() }),
        ...(!isEdit && { created_by: userId }),
      };

      let result;
      if (isEdit) {
        result = await supabase
          .from('schedule_exceptions')
          .update(dataToSave)
          .eq('id', id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('schedule_exceptions')
          .insert(dataToSave)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      navigate('/schedules');
    } catch (err) {
      console.error('Error saving exception:', err);
      setError(err.message || 'Failed to save schedule exception');
    } finally {
      setSaving(false);
    }
  };

  const exceptionTypes = [
    { value: 'vacation', label: 'Vacation', description: 'Planned time off' },
    { value: 'sick_leave', label: 'Sick Leave', description: 'Medical leave' },
    { value: 'personal', label: 'Personal', description: 'Personal day off' },
    { value: 'training', label: 'Training', description: 'Training or conference attendance' },
    { value: 'other', label: 'Other', description: 'Other reason' },
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
            {isEdit ? 'Edit Schedule Exception' : 'Request Time Off'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isAdmin 
              ? 'Create or modify a schedule exception for a doctor'
              : 'Submit a time-off request (requires admin approval)'}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {!isAdmin && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3 text-yellow-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          Your request will need to be approved by an administrator before it takes effect.
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
        {/* Doctor Selection (Admin only sees dropdown, doctors see their name) */}
        {isAdmin ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
        ) : doctors.length === 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Doctor</label>
            <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">{doctors[0].name_en}</p>
          </div>
        )}

        {/* Exception Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {exceptionTypes.map(type => (
              <label
                key={type.value}
                className={`flex flex-col p-3 border rounded-lg cursor-pointer transition-colors ${
                  formData.exception_type === type.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="exception_type"
                  value={type.value}
                  checked={formData.exception_type === type.value}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className="font-medium text-gray-900">{type.label}</span>
                <span className="text-xs text-gray-500">{type.description}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              min={formData.start_date}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason / Notes
          </label>
          <textarea
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            rows={3}
            placeholder="Optional: Provide additional details about this time-off request..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
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
            {isEdit ? 'Update Exception' : (isAdmin ? 'Create Exception' : 'Submit Request')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScheduleExceptionForm;
