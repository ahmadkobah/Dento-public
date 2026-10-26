import { useState, useEffect, useCallback } from 'react';
import { 
  Settings, 
  Save,
  RefreshCw,
  Globe,
  Clock,
  Mail,
  Bell,
  Shield,
  Server,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2
} from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';

// Map flat settings state <-> DB rows (grouped by key)
const toDbRows = (settings) => [
  { key: 'general', value: { appName: settings.appName, language: settings.language, timezone: settings.timezone, currency: settings.currency, dateFormat: settings.dateFormat, timeFormat: settings.timeFormat } },
  { key: 'email', value: { fromName: settings.emailFromName, fromAddress: settings.emailFromAddress, replyTo: settings.emailReplyTo } },
  { key: 'notifications', value: { emailEnabled: settings.enableEmailNotifications, smsEnabled: settings.enableSmsNotifications, pushEnabled: settings.enablePushNotifications, digest: settings.notificationDigest } },
  { key: 'security', value: { sessionTimeout: settings.sessionTimeout, maxLoginAttempts: settings.maxLoginAttempts, requireMfa: settings.requireMfa, ipWhitelist: settings.ipWhitelist } },
  { key: 'performance', value: { cacheEnabled: settings.cacheEnabled, cacheTtl: settings.cacheTtl, rateLimitRequests: settings.rateLimitRequests, rateLimitWindow: settings.rateLimitWindow } },
  { key: 'maintenance', value: { enabled: settings.maintenanceMode, message: settings.maintenanceMessage } },
];

const fromDbRows = (rows) => {
  const byKey = {};
  rows.forEach(r => { byKey[r.key] = r.value; });
  const g = byKey.general || {};
  const e = byKey.email || {};
  const n = byKey.notifications || {};
  const s = byKey.security || {};
  const p = byKey.performance || {};
  const m = byKey.maintenance || {};
  return {
    appName: g.appName ?? 'Dento Clinic',
    language: g.language ?? 'en',
    timezone: g.timezone ?? 'UTC+3',
    currency: g.currency ?? 'SAR',
    dateFormat: g.dateFormat ?? 'DD/MM/YYYY',
    timeFormat: g.timeFormat ?? '24h',
    emailFromName: e.fromName ?? 'Dento Clinic',
    emailFromAddress: e.fromAddress ?? 'noreply@dento.app',
    emailReplyTo: e.replyTo ?? 'support@dento.app',
    enableEmailNotifications: n.emailEnabled ?? true,
    enableSmsNotifications: n.smsEnabled ?? true,
    enablePushNotifications: n.pushEnabled ?? false,
    notificationDigest: n.digest ?? 'realtime',
    sessionTimeout: s.sessionTimeout ?? 60,
    maxLoginAttempts: s.maxLoginAttempts ?? 5,
    requireMfa: s.requireMfa ?? false,
    ipWhitelist: s.ipWhitelist ?? '',
    cacheEnabled: p.cacheEnabled ?? true,
    cacheTtl: p.cacheTtl ?? 3600,
    rateLimitRequests: p.rateLimitRequests ?? 1000,
    rateLimitWindow: p.rateLimitWindow ?? 60,
    maintenanceMode: m.enabled ?? false,
    maintenanceMessage: m.message ?? 'System is under maintenance. Please try again later.',
  };
};

const DEFAULTS = fromDbRows([]);

const SystemSettings = () => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [settings, setSettings] = useState(DEFAULTS);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Load settings from DB
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');
      
      if (error) throw error;
      if (data && data.length > 0) {
        setSettings(fromDbRows(data));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const rows = toDbRows(settings);
      
      // Upsert each settings group
      for (const row of rows) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(
            { key: row.key, value: row.value, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          );
        if (error) throw error;
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      toast.error(`Failed to save settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">System Settings</h1>
          <p className="text-gray-400 mt-1">Configure global application settings</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadSettings}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
            Reset
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

      {/* Loading / Error States */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="ml-3 text-gray-400">Loading settings...</span>
        </div>
      )}

      {loadError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Failed to load settings</p>
            <p className="text-red-400/70 text-sm">{loadError}</p>
          </div>
        </div>
      )}

      {/* Settings Sections */}
      {!isLoading && (
      <div className="space-y-6">
        {/* General Settings */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Globe className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">General</h2>
              <p className="text-gray-500 text-sm">Basic application settings</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Application Name
              </label>
              <input
                type="text"
                value={settings.appName}
                onChange={(e) => handleChange('appName', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Default Language
              </label>
              <select
                value={settings.language}
                onChange={(e) => handleChange('language', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="en">English</option>
                <option value="ar">Arabic</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="tr">Turkish</option>
                <option value="es">Spanish</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Timezone
              </label>
              <select
                value={settings.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="UTC">UTC</option>
                <option value="Africa/Cairo">Africa/Cairo (Egypt, UTC+2)</option>
                <option value="Asia/Riyadh">Asia/Riyadh (Saudi Arabia, UTC+3)</option>
                <option value="Asia/Dubai">Asia/Dubai (UAE, UTC+4)</option>
                <option value="Asia/Kuwait">Asia/Kuwait (UTC+3)</option>
                <option value="Asia/Qatar">Asia/Qatar (UTC+3)</option>
                <option value="Asia/Bahrain">Asia/Bahrain (UTC+3)</option>
                <option value="Asia/Amman">Asia/Amman (Jordan, UTC+3)</option>
                <option value="Asia/Beirut">Asia/Beirut (Lebanon, UTC+2)</option>
                <option value="Asia/Istanbul">Asia/Istanbul (Turkey, UTC+3)</option>
                <option value="Europe/London">Europe/London (UK, UTC+0)</option>
                <option value="Europe/Paris">Europe/Paris (France, UTC+1)</option>
                <option value="Europe/Berlin">Europe/Berlin (Germany, UTC+1)</option>
                <option value="America/New_York">America/New_York (US East, UTC-5)</option>
                <option value="America/Chicago">America/Chicago (US Central, UTC-6)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (US West, UTC-8)</option>
                <option value="Australia/Sydney">Australia/Sydney (UTC+10)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (India, UTC+5:30)</option>
                <option value="Asia/Karachi">Asia/Karachi (Pakistan, UTC+5)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Currency
              </label>
              <select
                value={settings.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="USD">USD - US Dollar ($)</option>
                <option value="EGP">EGP - Egyptian Pound (E£)</option>
                <option value="SAR">SAR - Saudi Riyal (ر.س)</option>
                <option value="AED">AED - UAE Dirham (د.إ)</option>
                <option value="KWD">KWD - Kuwaiti Dinar (د.ك)</option>
                <option value="QAR">QAR - Qatari Riyal (ر.ق)</option>
                <option value="BHD">BHD - Bahraini Dinar (د.ب)</option>
                <option value="OMR">OMR - Omani Rial (ر.ع)</option>
                <option value="JOD">JOD - Jordanian Dinar (د.أ)</option>
                <option value="EUR">EUR - Euro (€)</option>
                <option value="GBP">GBP - British Pound (£)</option>
                <option value="TRY">TRY - Turkish Lira (₺)</option>
                <option value="INR">INR - Indian Rupee (₹)</option>
                <option value="PKR">PKR - Pakistani Rupee (Rs)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date Format
              </label>
              <select
                value={settings.dateFormat}
                onChange={(e) => handleChange('dateFormat', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Time Format
              </label>
              <select
                value={settings.timeFormat}
                onChange={(e) => handleChange('timeFormat', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="12h">12 Hour (AM/PM)</option>
                <option value="24h">24 Hour</option>
              </select>
            </div>
          </div>
        </div>

        {/* Email Settings */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Mail className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Email Configuration</h2>
              <p className="text-gray-500 text-sm">Configure outgoing email settings</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                From Name
              </label>
              <input
                type="text"
                value={settings.emailFromName}
                onChange={(e) => handleChange('emailFromName', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                From Address
              </label>
              <input
                type="email"
                value={settings.emailFromAddress}
                onChange={(e) => handleChange('emailFromAddress', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reply-To Address
              </label>
              <input
                type="email"
                value={settings.emailReplyTo}
                onChange={(e) => handleChange('emailReplyTo', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Bell className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Notifications</h2>
              <p className="text-gray-500 text-sm">Configure notification channels</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg cursor-pointer">
              <div>
                <p className="text-gray-200 font-medium">Email Notifications</p>
                <p className="text-gray-500 text-sm">Send notifications via email</p>
              </div>
              <input
                type="checkbox"
                checked={settings.enableEmailNotifications}
                onChange={(e) => handleChange('enableEmailNotifications', e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-800"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg cursor-pointer">
              <div>
                <p className="text-gray-200 font-medium">SMS Notifications</p>
                <p className="text-gray-500 text-sm">Send notifications via SMS</p>
              </div>
              <input
                type="checkbox"
                checked={settings.enableSmsNotifications}
                onChange={(e) => handleChange('enableSmsNotifications', e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-800"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg cursor-pointer">
              <div>
                <p className="text-gray-200 font-medium">Push Notifications</p>
                <p className="text-gray-500 text-sm">Send browser push notifications</p>
              </div>
              <input
                type="checkbox"
                checked={settings.enablePushNotifications}
                onChange={(e) => handleChange('enablePushNotifications', e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-800"
              />
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notification Digest
              </label>
              <select
                value={settings.notificationDigest}
                onChange={(e) => handleChange('notificationDigest', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="realtime">Real-time</option>
                <option value="hourly">Hourly Digest</option>
                <option value="daily">Daily Digest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Security</h2>
              <p className="text-gray-500 text-sm">Configure security settings</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Login Attempts
              </label>
              <input
                type="number"
                value={settings.maxLoginAttempts}
                onChange={(e) => handleChange('maxLoginAttempts', parseInt(e.target.value))}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <label className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg cursor-pointer md:col-span-2">
              <div>
                <p className="text-gray-200 font-medium">Require MFA</p>
                <p className="text-gray-500 text-sm">Require multi-factor authentication for all users</p>
              </div>
              <input
                type="checkbox"
                checked={settings.requireMfa}
                onChange={(e) => handleChange('requireMfa', e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-800"
              />
            </label>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                IP Whitelist (comma-separated)
              </label>
              <input
                type="text"
                value={settings.ipWhitelist}
                onChange={(e) => handleChange('ipWhitelist', e.target.value)}
                placeholder="e.g., 192.168.1.0/24, 10.0.0.0/8"
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <p className="text-gray-500 text-sm mt-1">Leave empty to allow all IPs</p>
            </div>
          </div>
        </div>

        {/* Performance Settings */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Performance</h2>
              <p className="text-gray-500 text-sm">Configure caching and rate limiting</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg cursor-pointer md:col-span-2">
              <div>
                <p className="text-gray-200 font-medium">Enable Cache</p>
                <p className="text-gray-500 text-sm">Cache API responses for better performance</p>
              </div>
              <input
                type="checkbox"
                checked={settings.cacheEnabled}
                onChange={(e) => handleChange('cacheEnabled', e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-800"
              />
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cache TTL (seconds)
              </label>
              <input
                type="number"
                value={settings.cacheTtl}
                onChange={(e) => handleChange('cacheTtl', parseInt(e.target.value))}
                disabled={!settings.cacheEnabled}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rate Limit (requests)
              </label>
              <input
                type="number"
                value={settings.rateLimitRequests}
                onChange={(e) => handleChange('rateLimitRequests', parseInt(e.target.value))}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rate Limit Window (seconds)
              </label>
              <input
                type="number"
                value={settings.rateLimitWindow}
                onChange={(e) => handleChange('rateLimitWindow', parseInt(e.target.value))}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Maintenance Mode */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Server className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Maintenance</h2>
              <p className="text-gray-500 text-sm">Control application availability</p>
            </div>
          </div>

          <div className="space-y-6">
            <label className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-lg cursor-pointer">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-200 font-medium">Maintenance Mode</p>
                  <p className="text-gray-500 text-sm">
                    Enable to show maintenance page to all users except admins
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-800"
              />
            </label>

            {settings.maintenanceMode && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Maintenance Message
                </label>
                <textarea
                  value={settings.maintenanceMessage}
                  onChange={(e) => handleChange('maintenanceMessage', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default SystemSettings;
