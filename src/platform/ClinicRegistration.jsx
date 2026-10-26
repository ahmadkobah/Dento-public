import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * ClinicRegistration Component
 * Multi-step wizard for new clinic registration
 * 
 * Steps:
 * 1. Admin account (email, password)
 * 2. Clinic info (name, phone, specialty)
 * 3. Subscription selection
 * 4. Confirmation
 */
const ClinicRegistration = () => {
  const _navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Account
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    
    // Step 2: Clinic
    clinicName: '',
    clinicPhone: '',
    clinicEmail: '',
    specialty: 'general',
    country: 'AE',
    
    // Step 3: Plan
    plan: 'professional',
    billingCycle: 'monthly',
  });

  const updateForm = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Step 1: Validate account info
  const validateStep1 = () => {
    if (!formData.email || !formData.password || !formData.fullName) {
      setError('Please fill in all required fields');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  // Step 2: Validate clinic info
  const validateStep2 = () => {
    if (!formData.clinicName) {
      setError('Please enter your clinic name');
      return false;
    }
    return true;
  };

  // Handle form submission
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Generate slug from clinic name
      const slug = formData.clinicName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Check if slug is available
      const { data: existing } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', slug)
        .single();

      if (existing) {
        setError('This clinic name is already taken. Please choose a different name.');
        return;
      }

      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
          },
        },
      });

      if (authError) throw authError;

      // Create tenant via edge function (handles all related records)
      const { data: _tenant, error: tenantError } = await supabase.functions.invoke(
        'create-tenant',
        {
          body: {
            name: formData.clinicName,
            slug,
            owner_user_id: authData.user.id,
            contact_email: formData.clinicEmail || formData.email,
            contact_phone: formData.clinicPhone,
            specialty: formData.specialty,
            country: formData.country,
            plan: formData.plan,
            billing_cycle: formData.billingCycle,
          },
        }
      );

      if (tenantError) throw tenantError;

      // Success - redirect to clinic admin
      window.location.href = `https://${slug}.dento.app/admin/onboarding`;

    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Specialty options
  const specialties = [
    { value: 'general', label: 'General Dentistry' },
    { value: 'orthodontics', label: 'Orthodontics' },
    { value: 'pediatric', label: 'Pediatric Dentistry' },
    { value: 'cosmetic', label: 'Cosmetic Dentistry' },
    { value: 'oral_surgery', label: 'Oral Surgery' },
    { value: 'periodontics', label: 'Periodontics' },
    { value: 'endodontics', label: 'Endodontics' },
    { value: 'prosthodontics', label: 'Prosthodontics' },
    { value: 'multi_specialty', label: 'Multi-Specialty' },
  ];

  // Plan options
  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      priceMonthly: 49,
      priceYearly: 470,
      features: ['Up to 2 users', 'Basic scheduling', 'Patient records'],
    },
    {
      id: 'professional',
      name: 'Professional',
      priceMonthly: 99,
      priceYearly: 950,
      features: ['Up to 10 users', 'Full clinical features', 'Billing & invoicing', 'Public website'],
      recommended: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      priceMonthly: 199,
      priceYearly: 1900,
      features: ['Unlimited users', 'Multi-branch', 'API access', 'Custom branding', 'Priority support'],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Register Your Clinic</h1>
          <p className="text-gray-600 mt-2">Set up your dental practice on Dento in minutes</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                  step >= s
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step > s ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s
                )}
              </div>
              {s < 3 && (
                <div className={`w-20 h-1 ${step > s ? 'bg-primary-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Account */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Create your account</h2>
              
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => updateForm('fullName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Dr. John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateForm('phone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="+971 50 123 4567"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => updateForm('password', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm *</label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => updateForm('confirmPassword', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => validateStep1() && setStep(2)}
                className="w-full py-3 px-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Clinic Info */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Clinic Information</h2>
              
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Name *</label>
                  <input
                    type="text"
                    value={formData.clinicName}
                    onChange={(e) => updateForm('clinicName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Smile Dental Clinic"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Your clinic URL will be: {formData.clinicName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'your-clinic'}.dento.app
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Phone</label>
                    <input
                      type="tel"
                      value={formData.clinicPhone}
                      onChange={(e) => updateForm('clinicPhone', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="+971 4 123 4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Email</label>
                    <input
                      type="email"
                      value={formData.clinicEmail}
                      onChange={(e) => updateForm('clinicEmail', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="info@yourClinic.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                  <select
                    value={formData.specialty}
                    onChange={(e) => updateForm('specialty', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {specialties.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <select
                    value={formData.country}
                    onChange={(e) => updateForm('country', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="AE">United Arab Emirates</option>
                    <option value="SA">Saudi Arabia</option>
                    <option value="KW">Kuwait</option>
                    <option value="QA">Qatar</option>
                    <option value="BH">Bahrain</option>
                    <option value="OM">Oman</option>
                    <option value="EG">Egypt</option>
                    <option value="JO">Jordan</option>
                    <option value="LB">Lebanon</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => validateStep2() && setStep(3)}
                  className="flex-1 py-3 px-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Plan Selection */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Choose your plan</h2>

              {/* Billing Toggle */}
              <div className="flex items-center justify-center gap-4">
                <span className={formData.billingCycle === 'monthly' ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                  Monthly
                </span>
                <button
                  onClick={() => updateForm('billingCycle', formData.billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    formData.billingCycle === 'yearly' ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                >
                  <div className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-transform ${
                    formData.billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-1'
                  }`} />
                </button>
                <span className={formData.billingCycle === 'yearly' ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                  Yearly <span className="text-green-600 text-sm">(Save 20%)</span>
                </span>
              </div>

              {/* Plans */}
              <div className="grid gap-4">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => updateForm('plan', plan.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-colors ${
                      formData.plan === plan.id
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                          {plan.recommended && (
                            <span className="px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full">
                              Recommended
                            </span>
                          )}
                        </div>
                        <div className="mt-1">
                          <span className="text-2xl font-bold text-gray-900">
                            ${formData.billingCycle === 'monthly' ? plan.priceMonthly : Math.round(plan.priceYearly / 12)}
                          </span>
                          <span className="text-gray-500">/month</span>
                        </div>
                        <ul className="mt-2 space-y-1">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        formData.plan === plan.id ? 'border-primary-600 bg-primary-600' : 'border-gray-300'
                      }`}>
                        {formData.plan === plan.id && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Clinic'}
                </button>
              </div>

              <p className="text-center text-sm text-gray-500">
                14-day free trial. No credit card required.
              </p>
            </div>
          )}
        </div>

        {/* Login link */}
        <p className="mt-6 text-center text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
};

export default ClinicRegistration;
