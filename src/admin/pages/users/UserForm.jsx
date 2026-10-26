import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save,
  User,
  Mail,
  Phone,
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';

// Default avatar URLs
const defaultAvatars = {
  male: 'https://api.dicebear.com/9.x/micah/svg?seed=Avery',
  female: 'https://api.dicebear.com/9.x/micah/svg?seed=Amaya',
};

const UserForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { tenantId } = useTenant();

  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    role: 'receptionist',
    gender: 'male',
    avatar_url: '',
    is_active: true,
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user data when editing
  useEffect(() => {
    const fetchUser = async () => {
      if (!isEdit || !id || !tenantId) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('id', id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setFormData({
            email: data.email || '',
            full_name: data.full_name || '',
            phone: data.phone || '',
            role: data.role || 'receptionist',
            gender: data.gender || 'male',
            avatar_url: data.avatar_url || '',
            is_active: data.is_active ?? true,
          });
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        setErrors({ submit: 'Failed to load user data' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [id, isEdit, tenantId]);

  const roles = [
    { value: 'developer', label: 'Developer', description: 'Full system access' },
    { value: 'admin', label: 'Admin', description: 'Manage clinic operations' },
    { value: 'doctor', label: 'Doctor', description: 'Patient care and records' },
    { value: 'receptionist', label: 'Receptionist', description: 'Appointments and front desk' },
    { value: 'cbct_tech', label: 'CBCT Technician', description: 'Imaging and scans' },
    { value: 'assistant', label: 'Dental Assistant', description: 'Support dental procedures' },
    { value: 'patient', label: 'Patient', description: 'View own records only' },
  ];

  const validate = () => {
    const newErrors = {};
    if (!formData.email?.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.full_name?.trim()) newErrors.full_name = 'Name is required';
    if (!isEdit && !password) newErrors.password = 'Password is required for new users';
    if (password && password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    setErrors({});

    // Set avatar_url based on gender if no custom avatar
    const avatarUrl = formData.avatar_url || defaultAvatars[formData.gender];

    try {
      if (isEdit) {
        // Update existing user in users table
        const { error: updateError } = await supabase
          .from('users')
          .update({
            full_name: formData.full_name,
            phone: formData.phone || null,
            role: formData.role,
            gender: formData.gender,
            avatar_url: avatarUrl,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('tenant_id', tenantId)
          .eq('id', id);

        if (updateError) throw updateError;

        // If role is doctor, update or create doctor record
        if (formData.role === 'doctor') {
          const { data: existingDoctor } = await supabase
            .from('doctors')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('user_id', id)
            .single();

          if (existingDoctor) {
            // Update existing doctor
            await supabase
              .from('doctors')
              .update({
                name_en: formData.full_name,
                name_ar: formData.full_name,
                phone: formData.phone,
                email: formData.email,
                photo_url: avatarUrl,
                gender: formData.gender,
                is_active: formData.is_active,
                updated_at: new Date().toISOString(),
              })
              .eq('tenant_id', tenantId)
              .eq('user_id', id);
          } else {
            // Create new doctor record
            await supabase
              .from('doctors')
              .insert({
                tenant_id: tenantId,
                user_id: id,
                name_en: formData.full_name,
                name_ar: formData.full_name,
                phone: formData.phone,
                email: formData.email,
                photo_url: avatarUrl,
                gender: formData.gender,
                is_active: formData.is_active,
              });
          }
        }
        
        navigate('/users');
      } else {
        // Create new user via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: password,
          options: {
            data: {
              full_name: formData.full_name,
              role: formData.role,
              gender: formData.gender,
              avatar_url: avatarUrl,
            },
          },
        });

        if (authError) throw authError;

        // Insert into users table with the auth user's ID
        if (authData.user) {
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              tenant_id: tenantId,
              email: formData.email,
              full_name: formData.full_name,
              phone: formData.phone || null,
              role: formData.role,
              gender: formData.gender,
              avatar_url: avatarUrl,
              is_active: formData.is_active,
            });

          if (insertError) throw insertError;

          // If role is doctor, also create a doctor record
          if (formData.role === 'doctor') {
            const { error: doctorError } = await supabase
              .from('doctors')
              .insert({
                tenant_id: tenantId,
                user_id: authData.user.id,
                name_en: formData.full_name,
                name_ar: formData.full_name,
                phone: formData.phone || null,
                email: formData.email,
                photo_url: avatarUrl,
                gender: formData.gender,
                is_active: formData.is_active,
              });

            if (doctorError) {
              console.error('Error creating doctor record:', doctorError);
              // Don't throw - user was created successfully
            }
          }
        }

        navigate('/users');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setErrors({ submit: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      developer: 'border-purple-500 bg-purple-50',
      admin: 'border-red-500 bg-red-50',
      doctor: 'border-blue-500 bg-blue-50',
      receptionist: 'border-green-500 bg-green-50',
      cbct_tech: 'border-yellow-500 bg-yellow-50',
      assistant: 'border-orange-500 bg-orange-50',
      patient: 'border-gray-400 bg-gray-50',
    };
    return formData.role === role ? colors[role] : 'border-gray-200 bg-white';
  };

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit User' : 'Add User'}
          </h1>
          <p className="text-gray-500">
            {isEdit ? 'Update user information and permissions' : 'Create a new staff account'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {errors.submit}
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-500" />
            Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                  errors.full_name ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="Dr. John Smith"
              />
              {errors.full_name && (
                <p className="text-red-500 text-sm mt-1">{errors.full_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="john@dentoclinic.com"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="+90 555 123 4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Default Avatar
              </label>
              <div className="flex gap-4">
                <label className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.gender === 'male' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <img 
                    src={defaultAvatars.male} 
                    alt="Male avatar" 
                    className="w-14 h-14 rounded-full"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={formData.gender === 'male'}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium">Male</span>
                  </div>
                </label>
                <label className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.gender === 'female' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <img 
                    src={defaultAvatars.female} 
                    alt="Female avatar" 
                    className="w-14 h-14 rounded-full"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={formData.gender === 'female'}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium">Female</span>
                  </div>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">User can update their profile photo later from their profile settings</p>
            </div>

            {!isEdit && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 pr-10 ${
                      errors.password ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
                <div className="flex items-start gap-2 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-700 text-sm">
                    A confirmation email will be sent to the user. They must verify their email before logging in.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Role Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-500" />
            Role & Permissions
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {roles.map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() => setFormData({ ...formData, role: role.value })}
                className={`p-4 border-2 rounded-xl text-left transition-all ${getRoleColor(role.value)} ${
                  formData.role === role.value ? 'ring-2 ring-offset-2 ring-primary-500' : ''
                }`}
              >
                <p className="font-medium text-gray-900">{role.label}</p>
                <p className="text-sm text-gray-500">{role.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h2>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <p className="font-medium text-gray-900">Active Account</p>
              <p className="text-sm text-gray-500">
                Inactive accounts cannot log in to the system
              </p>
            </div>
          </label>
        </div>

        {/* Avatar Preview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Avatar Preview</h2>
          <div className="flex items-center gap-4">
            <img
              src={formData.avatar_url || defaultAvatars[formData.gender]}
              alt="Avatar preview"
              className="w-20 h-20 rounded-full object-cover border-4 border-gray-100 bg-gray-50"
            />
            <div>
              <p className="font-medium text-gray-900">{formData.full_name || 'User Name'}</p>
              <p className="text-sm text-gray-500 capitalize">{formData.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {isSubmitting ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;
