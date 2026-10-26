import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import clsx from 'clsx';

const BranchForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { tenantId } = useTenant();

  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [_error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    address_en: '',
    address_ar: '',
    phone: '',
    email: '',
    whatsapp: '',
    map_link: '',
    is_active: true,
    buffer_minutes: 10,
    work_hours: {
      sunday: { start: '10:00', end: '22:00' },
      monday: { start: '10:00', end: '22:00' },
      tuesday: { start: '10:00', end: '22:00' },
      wednesday: { start: '10:00', end: '22:00' },
      thursday: { start: '10:00', end: '22:00' },
      friday: null,
      saturday: { start: '10:00', end: '22:00' },
    },
  });

  // Fetch existing data if editing
  useEffect(() => {
    const fetchBranch = async () => {
      if (!isEdit || !id || !tenantId) return;
      
      setIsFetching(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('branches')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('id', id)
          .single();
        
        if (fetchError) throw fetchError;
        
        if (data) {
          setFormData({
            name_en: data.name_en || '',
            name_ar: data.name_ar || '',
            address_en: data.address_en || '',
            address_ar: data.address_ar || '',
            phone: data.phone || '',
            email: data.email || '',
            whatsapp: data.whatsapp || '',
            map_link: data.map_link || '',
            is_active: data.is_active ?? true,
            buffer_minutes: data.buffer_minutes ?? 10,
            work_hours: data.work_hours || formData.work_hours,
          });
        }
      } catch (err) {
        console.error('Error fetching branch:', err);
        setError('Failed to load branch');
      } finally {
        setIsFetching(false);
      }
    };
    
    fetchBranch();
  }, [id, isEdit, tenantId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleWorkHoursChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      work_hours: {
        ...prev.work_hours,
        [day]: prev.work_hours[day] 
          ? { ...prev.work_hours[day], [field]: value }
          : { start: '10:00', end: '22:00', [field]: value },
      },
    }));
  };

  const toggleDayOff = (day) => {
    setFormData(prev => ({
      ...prev,
      work_hours: {
        ...prev.work_hours,
        [day]: prev.work_hours[day] ? null : { start: '10:00', end: '22:00' },
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    
    try {
      if (isEdit) {
        const { error: updateError } = await supabase
          .from('branches')
          .update(formData)
          .eq('id', id)
          .eq('tenant_id', tenantId);
        
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('branches')
          .insert({ ...formData, tenant_id: tenantId });
        
        if (insertError) throw insertError;
      }
      
      navigate('/branches');
    } catch (err) {
      console.error('Error saving branch:', err);
      setError(err.message);
      setIsSaving(false);
    }
  };

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  if (isEdit && isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/branches')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Branch' : 'Add New Branch'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEdit ? 'Update branch information' : 'Create a new clinic location'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name (English) *
              </label>
              <input
                type="text"
                name="name_en"
                value={formData.name_en}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., Nasr City Branch"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name (Arabic) *
              </label>
              <input
                type="text"
                name="name_ar"
                value={formData.name_ar}
                onChange={handleChange}
                required
                dir="rtl"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="مثال: فرع مدينة نصر"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address (English)
              </label>
              <input
                type="text"
                name="address_en"
                value={formData.address_en}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., 123 Main St, Nasr City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address (Arabic)
              </label>
              <input
                type="text"
                name="address_ar"
                value={formData.address_ar}
                onChange={handleChange}
                dir="rtl"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="العنوان بالعربية"
              />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="+20 10 1234 5678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp Number
              </label>
              <input
                type="tel"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="+20 10 1234 5678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="branch@clinic.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google Maps Link
              </label>
              <input
                type="url"
                name="map_link"
                value={formData.map_link}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="https://maps.google.com/..."
              />
            </div>
          </div>
        </div>

        {/* Work Hours */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Working Hours</h2>
          
          <div className="space-y-3">
            {days.map((day) => (
              <div 
                key={day}
                className={clsx(
                  'flex items-center gap-4 p-3 rounded-lg',
                  formData.work_hours[day] ? 'bg-gray-50' : 'bg-red-50'
                )}
              >
                <div className="w-28">
                  <span className="font-medium text-gray-700 capitalize">{day}</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!formData.work_hours[day]}
                    onChange={() => toggleDayOff(day)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-600">Open</span>
                </label>
                {formData.work_hours[day] && (
                  <>
                    <input
                      type="time"
                      value={formData.work_hours[day]?.start || '10:00'}
                      onChange={(e) => handleWorkHoursChange(day, 'start', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="time"
                      value={formData.work_hours[day]?.end || '22:00'}
                      onChange={(e) => handleWorkHoursChange(day, 'end', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </>
                )}
                {!formData.work_hours[day] && (
                  <span className="text-red-600 text-sm">Day Off</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Appointment Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Appointment Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buffer Time Between Appointments
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  name="buffer_minutes"
                  value={formData.buffer_minutes}
                  onChange={handleChange}
                  min="0"
                  max="60"
                  step="5"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <span className="text-gray-600">minutes</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Minimum gap between consecutive appointments for preparation/cleaning
              </p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <span className="font-medium text-gray-900">Active Branch</span>
              <p className="text-sm text-gray-500">Inactive branches won't appear on the website</p>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/branches')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEdit ? 'Update Branch' : 'Create Branch'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BranchForm;
