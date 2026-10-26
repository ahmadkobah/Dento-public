import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useCreateTenant } from '../../hooks/useDevApi';
import { useToast } from '../../../hooks/useToast';

const subscriptionPlans = [
  {
    id: 'trial',
    name: 'Free Trial',
    price: 0,
    description: '14-day free trial with all features',
    maxUsers: 3,
    maxPatients: 100,
    maxBranches: 1,
    features: ['Basic scheduling', 'Patient records', 'Simple billing'],
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 49,
    description: 'Perfect for small clinics',
    maxUsers: 5,
    maxPatients: 1000,
    maxBranches: 1,
    features: ['Everything in Trial', 'Dental charting', 'Email support'],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 149,
    description: 'For growing practices',
    maxUsers: 15,
    maxPatients: 5000,
    maxBranches: 3,
    features: ['Everything in Basic', 'Inventory management', 'Multi-branch', 'Priority support'],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 399,
    description: 'For large organizations',
    maxUsers: 50,
    maxPatients: 25000,
    maxBranches: 10,
    features: ['Everything in Professional', 'Advanced analytics', 'API access', 'Dedicated support'],
  },
];

const countries = [
  { code: 'EG', name: 'Egypt', currency: 'EGP', timezone: 'Africa/Cairo' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', timezone: 'Asia/Riyadh' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', timezone: 'Asia/Dubai' },
  { code: 'KW', name: 'Kuwait', currency: 'KWD', timezone: 'Asia/Kuwait' },
  { code: 'JO', name: 'Jordan', currency: 'JOD', timezone: 'Asia/Amman' },
  { code: 'LB', name: 'Lebanon', currency: 'LBP', timezone: 'Asia/Beirut' },
  { code: 'US', name: 'United States', currency: 'USD', timezone: 'America/New_York' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', timezone: 'Europe/London' },
];

export default function TenantCreate() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name: '',
    slug: '',
    displayName: '',
    
    // Step 2: Contact
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    ownerPhone: '',
    
    // Step 3: Location
    countryCode: 'EG',
    city: '',
    addressLine1: '',
    
    // Step 4: Plan
    subscriptionPlan: 'trial',
    
    // Auto-generated
    subdomain: '',
  });

  const updateFormData = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Auto-generate slug from name
      if (field === 'name') {
        updated.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        updated.displayName = value;
        updated.subdomain = updated.slug;
      }
      
      return updated;
    });
    
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateStep = (stepNum) => {
    const newErrors = {};
    
    if (stepNum === 1) {
      if (!formData.name.trim()) newErrors.name = 'Clinic name is required';
      if (!formData.slug.trim()) newErrors.slug = 'Slug is required';
      if (formData.slug && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(formData.slug)) {
        newErrors.slug = 'Slug must be lowercase letters, numbers, and hyphens only';
      }
    }
    
    if (stepNum === 2) {
      if (!formData.ownerName.trim()) newErrors.ownerName = 'Owner name is required';
      if (!formData.ownerEmail.trim()) newErrors.ownerEmail = 'Owner email is required';
      if (formData.ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail)) {
        newErrors.ownerEmail = 'Invalid email address';
      }
      if (!formData.ownerPassword.trim()) newErrors.ownerPassword = 'Password is required';
      if (formData.ownerPassword && formData.ownerPassword.length < 8) {
        newErrors.ownerPassword = 'Password must be at least 8 characters';
      }
    }
    
    if (stepNum === 3) {
      if (!formData.countryCode) newErrors.countryCode = 'Country is required';
      if (!formData.city.trim()) newErrors.city = 'City is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  // Issue #41: Use real API instead of setTimeout simulation
  const { mutateAsync: createTenant } = useCreateTenant();

  const handleSubmit = async () => {
    if (!validateStep(step)) return;
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      const selectedCountryData = countries.find((c) => c.code === formData.countryCode);
      const selectedPlanData = subscriptionPlans.find((p) => p.id === formData.subscriptionPlan);
      
      // Call real API to create tenant
      const result = await createTenant({
        name: formData.name,
        slug: formData.slug,
        display_name: formData.displayName,
        subdomain: formData.subdomain,
        owner_name: formData.ownerName,
        owner_email: formData.ownerEmail,
        owner_password: formData.ownerPassword,
        owner_phone: formData.ownerPhone,
        country_code: formData.countryCode,
        city: formData.city,
        address_line1: formData.addressLine1,
        currency: selectedCountryData?.currency || 'USD',
        timezone: selectedCountryData?.timezone || 'UTC',
        subscription_plan: formData.subscriptionPlan,
        max_users: selectedPlanData?.maxUsers || 3,
        max_patients: selectedPlanData?.maxPatients || 100,
        max_branches: selectedPlanData?.maxBranches || 1,
        status: formData.subscriptionPlan === 'trial' ? 'trial' : 'active',
      });
      
      // Show warning if owner creation had issues
      if (result?.warning) {
        toast.success(`Tenant created with warning: ${result.warning}`);
      }
      
      // Navigate to tenant list on success
      navigate('/developer/tenants');
    } catch (error) {
      console.error('Error creating tenant:', error);
      setErrors({ submit: error.message || 'Failed to create tenant. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCountry = countries.find((c) => c.code === formData.countryCode);
  const selectedPlan = subscriptionPlans.find((p) => p.id === formData.subscriptionPlan);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/developer/tenants')}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Create New Tenant</h1>
          <p className="mt-1 text-sm text-gray-400">
            Set up a new clinic instance
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full font-medium ${
                s < step
                  ? 'bg-emerald-500 text-white'
                  : s === step
                  ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {s < step ? <Check className="h-5 w-5" /> : s}
            </div>
            {s < 4 && (
              <div
                className={`h-1 w-24 ${
                  s < step ? 'bg-emerald-500' : 'bg-gray-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Labels */}
      <div className="flex justify-between text-sm">
        <span className={step >= 1 ? 'text-emerald-400' : 'text-gray-500'}>Basic Info</span>
        <span className={step >= 2 ? 'text-emerald-400' : 'text-gray-500'}>Contact</span>
        <span className={step >= 3 ? 'text-emerald-400' : 'text-gray-500'}>Location</span>
        <span className={step >= 4 ? 'text-emerald-400' : 'text-gray-500'}>Plan</span>
      </div>

      {/* Form Card */}
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Basic Information</h3>
              <p className="mt-1 text-sm text-gray-400">Enter the clinic's basic details</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Clinic Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder="e.g., Canine Dental Clinic"
                  className={`w-full rounded-lg border bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-1 ${
                    errors.name
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-700 focus:border-emerald-500 focus:ring-emerald-500'
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  URL Slug *
                </label>
                <div className="flex items-center">
                  <span className="rounded-l-lg border border-r-0 border-gray-700 bg-gray-700 px-4 py-2.5 text-gray-400">
                    https://
                  </span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => updateFormData('slug', e.target.value.toLowerCase())}
                    placeholder="clinic-name"
                    className={`flex-1 border bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-1 ${
                      errors.slug
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-700 focus:border-emerald-500 focus:ring-emerald-500'
                    }`}
                  />
                  <span className="rounded-r-lg border border-l-0 border-gray-700 bg-gray-700 px-4 py-2.5 text-gray-400">
                    .dento.app
                  </span>
                </div>
                {errors.slug && (
                  <p className="mt-1 text-sm text-red-400">{errors.slug}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => updateFormData('displayName', e.target.value)}
                  placeholder="Short display name"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Contact */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Contact Information</h3>
              <p className="mt-1 text-sm text-gray-400">Who is the primary contact for this clinic?</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Owner Name *
                </label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => updateFormData('ownerName', e.target.value)}
                  placeholder="e.g., Dr. Ahmed Hassan"
                  className={`w-full rounded-lg border bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-1 ${
                    errors.ownerName
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-700 focus:border-emerald-500 focus:ring-emerald-500'
                  }`}
                />
                {errors.ownerName && (
                  <p className="mt-1 text-sm text-red-400">{errors.ownerName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Owner Email *
                </label>
                <input
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(e) => updateFormData('ownerEmail', e.target.value)}
                  placeholder="owner@clinic.com"
                  className={`w-full rounded-lg border bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-1 ${
                    errors.ownerEmail
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-700 focus:border-emerald-500 focus:ring-emerald-500'
                  }`}
                />
                {errors.ownerEmail && (
                  <p className="mt-1 text-sm text-red-400">{errors.ownerEmail}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Owner Password *
                </label>
                <input
                  type="password"
                  value={formData.ownerPassword}
                  onChange={(e) => updateFormData('ownerPassword', e.target.value)}
                  placeholder="Minimum 8 characters"
                  className={`w-full rounded-lg border bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-1 ${
                    errors.ownerPassword
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-700 focus:border-emerald-500 focus:ring-emerald-500'
                  }`}
                />
                {errors.ownerPassword && (
                  <p className="mt-1 text-sm text-red-400">{errors.ownerPassword}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  This will be the owner's login password for the admin portal
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.ownerPhone}
                  onChange={(e) => updateFormData('ownerPhone', e.target.value)}
                  placeholder="+20 100 123 4567"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Location */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Location & Regional Settings</h3>
              <p className="mt-1 text-sm text-gray-400">Where is this clinic located?</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Country *
                </label>
                <select
                  value={formData.countryCode}
                  onChange={(e) => updateFormData('countryCode', e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => updateFormData('city', e.target.value)}
                  placeholder="e.g., Cairo"
                  className={`w-full rounded-lg border bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-1 ${
                    errors.city
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-700 focus:border-emerald-500 focus:ring-emerald-500'
                  }`}
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-400">{errors.city}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => updateFormData('addressLine1', e.target.value)}
                  placeholder="Street address"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {selectedCountry && (
                <div className="rounded-lg border border-gray-700 bg-gray-700/50 p-4">
                  <h4 className="text-sm font-medium text-white mb-2">Regional Settings</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Currency:</span>
                      <span className="ml-2 text-white">{selectedCountry.currency}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Timezone:</span>
                      <span className="ml-2 text-white">{selectedCountry.timezone}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Plan Selection */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Select a Plan</h3>
              <p className="mt-1 text-sm text-gray-400">Choose the subscription tier for this clinic</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {subscriptionPlans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => updateFormData('subscriptionPlan', plan.id)}
                  className={`relative cursor-pointer rounded-lg border p-4 transition-all ${
                    formData.subscriptionPlan === plan.id
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-gray-700 bg-gray-700/50 hover:border-gray-600'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-2 right-4 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-medium text-white">
                      Popular
                    </span>
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-white">{plan.name}</h4>
                      <p className="text-sm text-gray-400">{plan.description}</p>
                    </div>
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        formData.subscriptionPlan === plan.id
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-gray-600'
                      }`}
                    >
                      {formData.subscriptionPlan === plan.id && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-bold text-white">${plan.price}</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-gray-400">
                    <p>• Up to {plan.maxUsers} users</p>
                    <p>• Up to {plan.maxPatients.toLocaleString()} patients</p>
                    <p>• {plan.maxBranches} branch{plan.maxBranches > 1 ? 'es' : ''}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="rounded-lg border border-gray-700 bg-gray-700/50 p-4">
              <h4 className="text-sm font-medium text-white mb-3">Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Clinic:</span>
                  <span className="text-white">{formData.name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">URL:</span>
                  <span className="text-emerald-400">{formData.slug || '-'}.dento.app</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Owner:</span>
                  <span className="text-white">{formData.ownerEmail || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Location:</span>
                  <span className="text-white">{formData.city}, {formData.countryCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Plan:</span>
                  <span className="text-white">{selectedPlan?.name} (${selectedPlan?.price}/mo)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-700">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          
          {step < 4 ? (
            <button
              onClick={handleNext}
              className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4" />
                  Create Tenant
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
