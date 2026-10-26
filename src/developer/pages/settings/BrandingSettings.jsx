import { useState, useRef } from 'react';
import { 
  Palette, 
  Save,
  RefreshCw,
  Upload,
  Image,
  Type,
  Mail,
  CheckCircle2,
  Eye,
  Smartphone,
  Monitor,
  X,
  Info
} from 'lucide-react';
import clsx from 'clsx';
import { useToast } from '../../../hooks/useToast';
import { supabase } from '../../../lib/supabase';

const BrandingSettings = () => {
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [_showPreview, setShowPreview] = useState(false);
  const logoInputRef = useRef(null);
  const faviconInputRef = useRef(null);

  const [settings, setSettings] = useState({
    // Branding
    systemName: 'Dento',
    systemTagline: 'Dental Clinic Management',
    adminTitle: 'Dento Admin',
    
    // Logos
    logoUrl: '',
    logoDarkUrl: '',
    faviconUrl: '',
    loginBackgroundUrl: '',
    
    // Colors
    primaryColor: '#10b981',
    primaryDark: '#059669',
    accentColor: '#6366f1',
    
    // White-label
    showPoweredBy: true,
    poweredByText: 'Powered by Dento',
    poweredByUrl: 'https://dento.app',
    
    // Email branding
    emailLogoUrl: '',
    emailFromName: 'Dento Clinic',
    emailFooterText: '© 2026 Dento. All rights reserved.',
    emailPrimaryColor: '#10b981',
    
    // Login page
    loginTitle: 'Welcome Back',
    loginSubtitle: 'Sign in to your account',
    showSocialLogin: false,
    customCss: '',
  });

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({ key: 'branding', value: settings }, { onConflict: 'key' });
      if (error) throw error;
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      toast.error(`Failed to save branding settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (e, key) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange(key, reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">White-Label Settings</h1>
          <p className="text-gray-400 mt-1">Customize branding and appearance</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
              savedSuccess 
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-600 text-white hover:bg-emerald-500',
              isSaving && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : savedSuccess ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {savedSuccess ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Branding */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Type className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Basic Branding</h2>
              <p className="text-gray-500 text-sm">System name and titles</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">System Name</label>
              <input
                type="text"
                value={settings.systemName}
                onChange={(e) => handleChange('systemName', e.target.value)}
                placeholder="Your App Name"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tagline</label>
              <input
                type="text"
                value={settings.systemTagline}
                onChange={(e) => handleChange('systemTagline', e.target.value)}
                placeholder="Your tagline"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Admin Panel Title</label>
              <input
                type="text"
                value={settings.adminTitle}
                onChange={(e) => handleChange('adminTitle', e.target.value)}
                placeholder="Admin Panel"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="border-t border-gray-800 pt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white font-medium">Show "Powered by" Badge</p>
                  <p className="text-gray-500 text-sm">Display attribution in footer</p>
                </div>
                <button
                  onClick={() => handleChange('showPoweredBy', !settings.showPoweredBy)}
                  className={clsx(
                    'w-12 h-6 rounded-full transition-colors relative',
                    settings.showPoweredBy ? 'bg-emerald-600' : 'bg-gray-700'
                  )}
                >
                  <div className={clsx(
                    'w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform',
                    settings.showPoweredBy ? 'translate-x-6' : 'translate-x-0.5'
                  )} />
                </button>
              </div>

              {settings.showPoweredBy && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={settings.poweredByText}
                    onChange={(e) => handleChange('poweredByText', e.target.value)}
                    placeholder="Powered by..."
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="url"
                    value={settings.poweredByUrl}
                    onChange={(e) => handleChange('poweredByUrl', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Logo Upload */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Image className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Logos & Images</h2>
              <p className="text-gray-500 text-sm">Upload your brand assets</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Main Logo */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Main Logo (Light)</label>
              <div 
                onClick={() => logoInputRef.current?.click()}
                className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:border-gray-600 transition-colors"
              >
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="max-h-16 mx-auto" />
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 text-gray-500 mx-auto" />
                    <p className="text-gray-400 text-sm">Click to upload logo</p>
                    <p className="text-gray-500 text-xs">PNG, SVG (max 2MB)</p>
                  </div>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleLogoUpload(e, 'logoUrl')}
                className="hidden"
              />
            </div>

            {/* Favicon */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Favicon</label>
              <div 
                onClick={() => faviconInputRef.current?.click()}
                className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:border-gray-600 transition-colors"
              >
                {settings.faviconUrl ? (
                  <img src={settings.faviconUrl} alt="Favicon" className="w-8 h-8 mx-auto" />
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <Upload className="w-5 h-5 text-gray-500" />
                    <p className="text-gray-400 text-sm">Upload favicon (32x32)</p>
                  </div>
                )}
              </div>
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleLogoUpload(e, 'faviconUrl')}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Color Settings */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-pink-500/10 rounded-lg">
              <Palette className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Colors</h2>
              <p className="text-gray-500 text-sm">Customize theme colors</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Primary Color</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                  className="w-12 h-10 rounded border border-gray-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.primaryColor}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Primary Dark</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={settings.primaryDark}
                  onChange={(e) => handleChange('primaryDark', e.target.value)}
                  className="w-12 h-10 rounded border border-gray-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.primaryDark}
                  onChange={(e) => handleChange('primaryDark', e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Accent Color</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => handleChange('accentColor', e.target.value)}
                  className="w-12 h-10 rounded border border-gray-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.accentColor}
                  onChange={(e) => handleChange('accentColor', e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="mt-4 p-4 bg-gray-800 rounded-lg">
              <p className="text-gray-400 text-sm mb-3">Preview:</p>
              <div className="flex gap-2">
                <button 
                  style={{ backgroundColor: settings.primaryColor }}
                  className="px-4 py-2 rounded-lg text-white font-medium"
                >
                  Primary
                </button>
                <button 
                  style={{ backgroundColor: settings.primaryDark }}
                  className="px-4 py-2 rounded-lg text-white font-medium"
                >
                  Hover
                </button>
                <button 
                  style={{ backgroundColor: settings.accentColor }}
                  className="px-4 py-2 rounded-lg text-white font-medium"
                >
                  Accent
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Email Branding */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Mail className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Email Branding</h2>
              <p className="text-gray-500 text-sm">Customize email templates</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">From Name</label>
              <input
                type="text"
                value={settings.emailFromName}
                onChange={(e) => handleChange('emailFromName', e.target.value)}
                placeholder="Your Clinic Name"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Footer Text</label>
              <textarea
                value={settings.emailFooterText}
                onChange={(e) => handleChange('emailFooterText', e.target.value)}
                rows={2}
                placeholder="© 2026 Your Company"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Primary Color</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={settings.emailPrimaryColor}
                  onChange={(e) => handleChange('emailPrimaryColor', e.target.value)}
                  className="w-12 h-10 rounded border border-gray-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.emailPrimaryColor}
                  onChange={(e) => handleChange('emailPrimaryColor', e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Login Page */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Monitor className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Login Page</h2>
              <p className="text-gray-500 text-sm">Customize the login experience</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Login Title</label>
                <input
                  type="text"
                  value={settings.loginTitle}
                  onChange={(e) => handleChange('loginTitle', e.target.value)}
                  placeholder="Welcome Back"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Login Subtitle</label>
                <input
                  type="text"
                  value={settings.loginSubtitle}
                  onChange={(e) => handleChange('loginSubtitle', e.target.value)}
                  placeholder="Sign in to your account"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Custom CSS (Advanced)</label>
                <textarea
                  value={settings.customCss}
                  onChange={(e) => handleChange('customCss', e.target.value)}
                  rows={4}
                  placeholder=".login-form { }"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Login Preview */}
            <div className="bg-gray-800 rounded-lg p-6 flex flex-col items-center justify-center">
              <p className="text-gray-500 text-xs mb-4">LOGIN PREVIEW</p>
              <div className="w-full max-w-sm bg-gray-900 rounded-xl p-6 shadow-xl">
                {settings.logoUrl && (
                  <img src={settings.logoUrl} alt="Logo" className="h-10 mx-auto mb-4" />
                )}
                <h3 className="text-xl font-bold text-white text-center mb-1">
                  {settings.loginTitle || 'Welcome Back'}
                </h3>
                <p className="text-gray-400 text-sm text-center mb-6">
                  {settings.loginSubtitle || 'Sign in to your account'}
                </p>
                <div className="space-y-3">
                  <div className="h-10 bg-gray-800 rounded-lg" />
                  <div className="h-10 bg-gray-800 rounded-lg" />
                  <button 
                    style={{ backgroundColor: settings.primaryColor }}
                    className="w-full h-10 rounded-lg text-white font-medium"
                  >
                    Sign In
                  </button>
                </div>
                {settings.showPoweredBy && (
                  <p className="text-gray-500 text-xs text-center mt-4">
                    {settings.poweredByText}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-400 font-medium">Branding applies per tenant</p>
            <p className="text-blue-400/70 text-sm mt-1">
              Each tenant can have their own branding configured through their tenant settings.
              These settings serve as defaults for new tenants.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandingSettings;
