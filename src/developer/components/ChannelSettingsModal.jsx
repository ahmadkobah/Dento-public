import { useState, useEffect } from 'react';
import {
  X,
  Mail,
  MessageCircle,
  Globe,
  Key,
  Save,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Copy,
  Clock,
  ExternalLink,
  Loader2,
} from 'lucide-react';

// Modal wrapper component
function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className={`relative w-full ${sizeClasses[size]} rounded-xl bg-gray-800 border border-gray-700 shadow-2xl`}>
          <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

// Email Configuration Modal
export function EmailConfigModal({ isOpen, onClose, tenant, settings, onSave }) {
  const [formData, setFormData] = useState({
    email_sender: '',
    email_reply_to: '',
    email_provider: 'default',
    email_domain: '',
    notifications: {
      appointment_reminders: true,
      new_patient: true,
      treatment_confirm: true,
      billing: true,
      recall: false,
      marketing: false,
    },
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        email_sender: settings.email_sender || '',
        email_reply_to: settings.email_reply_to || tenant?.ownerEmail || '',
        email_provider: settings.email_provider || 'default',
        email_domain: settings.email_domain || '',
        notifications: {
          appointment_reminders: settings.notifications?.appointment_reminders ?? true,
          new_patient: settings.notifications?.new_patient ?? true,
          treatment_confirm: settings.notifications?.treatment_confirm ?? true,
          billing: settings.notifications?.billing ?? true,
          recall: settings.notifications?.recall ?? false,
          marketing: settings.notifications?.marketing ?? false,
        },
      });
    }
  }, [settings, tenant]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save email settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Email Configuration" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Sender Email</label>
            <input
              type="email"
              value={formData.email_sender}
              onChange={(e) => setFormData({ ...formData, email_sender: e.target.value })}
              placeholder={`noreply@${tenant?.slug || 'clinic'}.dento.app`}
              className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Reply-To Address</label>
            <input
              type="email"
              value={formData.email_reply_to}
              onChange={(e) => setFormData({ ...formData, email_reply_to: e.target.value })}
              placeholder={tenant?.ownerEmail || 'contact@clinic.com'}
              className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email Provider</label>
            <select
              value={formData.email_provider}
              onChange={(e) => setFormData({ ...formData, email_provider: e.target.value })}
              className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="default">Default (Resend)</option>
              <option value="sendgrid">SendGrid</option>
              <option value="mailgun">Mailgun</option>
              <option value="ses">Amazon SES</option>
              <option value="smtp">Custom SMTP</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Custom Email Domain</label>
            <input
              type="text"
              value={formData.email_domain}
              onChange={(e) => setFormData({ ...formData, email_domain: e.target.value })}
              placeholder="mail.yourClinic.com"
              className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-white mb-3">Email Notifications</h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'appointment_reminders', label: 'Appointment Reminders' },
              { key: 'new_patient', label: 'New Patient Welcome' },
              { key: 'treatment_confirm', label: 'Treatment Confirmations' },
              { key: 'billing', label: 'Invoice & Receipts' },
              { key: 'recall', label: 'Recall Reminders' },
              { key: 'marketing', label: 'Marketing Campaigns' },
            ].map((notif) => (
              <label key={notif.key} className="flex items-center gap-3 p-3 rounded-lg bg-gray-700/50 cursor-pointer hover:bg-gray-700 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.notifications[notif.key]}
                  onChange={(e) => setFormData({
                    ...formData,
                    notifications: { ...formData.notifications, [notif.key]: e.target.checked }
                  })}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-300">{notif.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}

// WhatsApp Configuration Modal
export function WhatsAppConfigModal({ isOpen, onClose, tenant, settings, onSave }) {
  const [formData, setFormData] = useState({
    whatsapp_enabled: false,
    whatsapp_phone: '',
    whatsapp_business_id: '',
    whatsapp_api_key: '',
    whatsapp_webhook_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        whatsapp_enabled: settings.whatsapp_enabled || false,
        whatsapp_phone: settings.whatsapp_phone || '',
        whatsapp_business_id: settings.whatsapp_business_id || '',
        whatsapp_api_key: settings.whatsapp_api_key || '',
        whatsapp_webhook_url: settings.whatsapp_webhook_url || '',
      });
    }
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...formData, whatsapp_enabled: true });
      onClose();
    } catch (error) {
      console.error('Failed to save WhatsApp settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setSaving(true);
    try {
      await onSave({
        whatsapp_enabled: false,
        whatsapp_phone: '',
        whatsapp_business_id: '',
        whatsapp_api_key: '',
        whatsapp_webhook_url: '',
      });
      onClose();
    } catch (error) {
      console.error('Failed to disconnect WhatsApp:', error);
    } finally {
      setSaving(false);
    }
  };

  const webhookUrl = `https://ooxikkllencozgnoparw.supabase.co/functions/v1/whatsapp-webhook?tenant=${tenant?.id}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="WhatsApp Business Configuration" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
          <div className="flex items-start gap-3">
            <MessageCircle className="h-5 w-5 text-green-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-green-400">WhatsApp Business API</h4>
              <p className="text-sm text-gray-400 mt-1">
                Connect your WhatsApp Business account to send automated appointment reminders and communicate with patients.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
            <input
              type="tel"
              value={formData.whatsapp_phone}
              onChange={(e) => setFormData({ ...formData, whatsapp_phone: e.target.value })}
              placeholder="+20 10 1234 5678"
              className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Business Account ID</label>
            <input
              type="text"
              value={formData.whatsapp_business_id}
              onChange={(e) => setFormData({ ...formData, whatsapp_business_id: e.target.value })}
              placeholder="123456789012345"
              className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">API Access Token</label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={formData.whatsapp_api_key}
              onChange={(e) => setFormData({ ...formData, whatsapp_api_key: e.target.value })}
              placeholder="EAAxxxxxxxxxxxxxxx..."
              className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-2 pr-10 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Webhook URL (for incoming messages)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={webhookUrl}
              readOnly
              className="flex-1 rounded-lg bg-gray-700/50 border border-gray-600 px-4 py-2 text-gray-400 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(webhookUrl)}
              className="px-3 py-2 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Copy this URL and configure it in your WhatsApp Business Dashboard</p>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-700/50">
          <a
            href="https://developers.facebook.com/docs/whatsapp/business-management-api"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
          >
            <ExternalLink className="h-4 w-4" />
            WhatsApp Business API Documentation
          </a>
        </div>

        <div className="flex justify-between gap-3 pt-4 border-t border-gray-700">
          {formData.whatsapp_enabled && (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30 transition-colors disabled:opacity-50"
            >
              Disconnect WhatsApp
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.whatsapp_phone || !formData.whatsapp_business_id}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-500 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              {settings?.whatsapp_enabled ? 'Update Connection' : 'Connect WhatsApp'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// Domain Configuration Modal
export function DomainConfigModal({ isOpen, onClose, tenant, _onSave, onAddDomain }) {
  const [newDomain, setNewDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  const handleAddDomain = async (e) => {
    e.preventDefault();
    if (!newDomain) return;
    
    setSaving(true);
    try {
      const result = await onAddDomain(newDomain);
      setVerificationResult({
        domain: newDomain,
        instructions: result?.verification_instructions || {
          type: 'TXT',
          name: `_dento-verify.${newDomain}`,
          value: result?.domain?.dns_verification_token || 'token-unavailable',
        },
      });
      setNewDomain('');
    } catch (error) {
      console.error('Failed to add domain:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setVerificationResult(null);
    setNewDomain('');
    onClose();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Domain Configuration" size="md">
      <div className="space-y-6">
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-start gap-3">
            <Globe className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-400">Custom Domain</h4>
              <p className="text-sm text-gray-400 mt-1">
                Add a custom domain to give your clinic a professional web presence.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Default Subdomain</label>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-700/50 border border-gray-600">
            <Globe className="h-4 w-4 text-gray-400" />
            <span className="text-white">{tenant?.slug || 'clinic'}.dento.app</span>
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5" />
              Active
            </span>
          </div>
        </div>

        {/* Verification Instructions - shown after domain is added */}
        {verificationResult && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-amber-400">Verify Domain: {verificationResult.domain}</h4>
                <p className="text-sm text-gray-400 mt-1 mb-3">
                  Add the following DNS TXT record to verify ownership of your domain:
                </p>
                <div className="space-y-2">
                  <div className="p-2 rounded bg-gray-800 font-mono text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-400">Type</span>
                      <span className="text-white">{verificationResult.instructions.type}</span>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-400">Name</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white">{verificationResult.instructions.name}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(verificationResult.instructions.name)}
                          className="text-gray-500 hover:text-white transition-colors"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Value</span>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 break-all">{verificationResult.instructions.value}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(verificationResult.instructions.value)}
                          className="text-gray-500 hover:text-white transition-colors"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  After adding the TXT record, click &quot;Verify DNS&quot; on the Channels tab to complete verification.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleAddDomain}>
          <label className="block text-sm font-medium text-gray-300 mb-2">Add Custom Domain</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="www.yourclinic.com"
              className="flex-1 rounded-lg bg-gray-700 border border-gray-600 px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={saving || !newDomain}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
            </button>
          </div>
        </form>

        <div className="p-4 rounded-lg border border-dashed border-gray-700">
          <h4 className="text-sm font-medium text-white mb-2">DNS Configuration</h4>
          <p className="text-sm text-gray-400 mb-3">
            After verification, point your domain to Dento by adding these DNS records:
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded bg-gray-800 font-mono text-xs">
              <span className="text-gray-400">CNAME</span>
              <span className="text-white">@ → {tenant?.slug || 'clinic'}.dento.app</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-gray-800 font-mono text-xs">
              <span className="text-gray-400">CNAME</span>
              <span className="text-white">www → {tenant?.slug || 'clinic'}.dento.app</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

// API Keys Modal
export function ApiKeysModal({ isOpen, onClose, _tenant, apiKeys = [], onCreateKey, onRevokeKey }) {
  const [keyName, setKeyName] = useState('');
  const [keyScopes, setKeyScopes] = useState(['read']);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState(null);

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!keyName) return;

    setCreating(true);
    try {
      const result = await onCreateKey({ name: keyName, scopes: keyScopes });
      setNewKey(result?.key);
      setKeyName('');
    } catch (error) {
      console.error('Failed to create API key:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="API Keys" size="lg">
      <div className="space-y-6">
        {newKey && (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-emerald-400">API Key Created</h4>
                <p className="text-sm text-gray-400 mt-1 mb-2">
                  Copy this key now. You won't be able to see it again.
                </p>
                <div className="flex gap-2">
                  <code className="flex-1 p-2 rounded bg-gray-800 text-emerald-400 font-mono text-sm break-all">
                    {newKey}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(newKey)}
                    className="px-3 py-2 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleCreateKey} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Key Name</label>
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="My API Key"
              className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Permissions</label>
            <div className="flex gap-3">
              {['read', 'write', 'delete'].map((scope) => (
                <label key={scope} className="flex items-center gap-2 p-3 rounded-lg bg-gray-700/50 cursor-pointer hover:bg-gray-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={keyScopes.includes(scope)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setKeyScopes([...keyScopes, scope]);
                      } else {
                        setKeyScopes(keyScopes.filter((s) => s !== scope));
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-300 capitalize">{scope}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={creating || !keyName}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
            Create API Key
          </button>
        </form>

        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-white mb-3">Existing Keys</h4>
          {apiKeys.length === 0 ? (
            <p className="text-sm text-gray-500">No API keys created yet</p>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
                  <div>
                    <p className="text-white font-medium">{key.name}</p>
                    <p className="text-xs text-gray-500">
                      {key.key_prefix}...{key.key_hint} • Created {new Date(key.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => onRevokeKey(key.id)}
                    className="px-3 py-1 rounded text-xs text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Integration Connect Modal
export function IntegrationModal({ isOpen, onClose, integration, _tenant, settings, onSave }) {
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (integration && settings) {
      // Load integration-specific settings
      if (integration.name === 'Stripe') {
        setFormData({
          stripe_secret_key: settings.stripe_secret_key || '',
          stripe_publishable_key: settings.stripe_publishable_key || '',
        });
      } else if (integration.name === 'Google Calendar') {
        setFormData({
          google_calendar_enabled: settings.google_calendar || false,
          google_calendar_id: settings.google_calendar_id || '',
        });
      } else if (integration.name === 'Twilio SMS') {
        setFormData({
          twilio_enabled: settings.twilio_enabled || false,
          twilio_account_sid: settings.twilio_account_sid || '',
          twilio_auth_token: settings.twilio_auth_token || '',
          twilio_phone_number: settings.twilio_phone_number || '',
        });
      }
    }
  }, [integration, settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let updates = {};
      if (integration.name === 'Stripe') {
        updates = {
          stripe_secret_key: formData.stripe_secret_key,
          stripe_publishable_key: formData.stripe_publishable_key,
        };
      } else if (integration.name === 'Google Calendar') {
        updates = {
          google_calendar: true,
          google_calendar_id: formData.google_calendar_id,
        };
      } else if (integration.name === 'Twilio SMS') {
        updates = {
          twilio_enabled: true,
          twilio_account_sid: formData.twilio_account_sid,
          twilio_auth_token: formData.twilio_auth_token,
          twilio_phone_number: formData.twilio_phone_number,
        };
      }
      await onSave(updates);
      onClose();
    } catch (error) {
      console.error('Failed to save integration:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!integration) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Connect ${integration.name}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {integration.name === 'Stripe' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Secret Key</label>
              <input
                type="password"
                value={formData.stripe_secret_key || ''}
                onChange={(e) => setFormData({ ...formData, stripe_secret_key: e.target.value })}
                placeholder="sk_live_..."
                className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Publishable Key</label>
              <input
                type="text"
                value={formData.stripe_publishable_key || ''}
                onChange={(e) => setFormData({ ...formData, stripe_publishable_key: e.target.value })}
                placeholder="pk_live_..."
                className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </>
        )}

        {integration.name === 'Google Calendar' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Calendar ID</label>
            <input
              type="text"
              value={formData.google_calendar_id || ''}
              onChange={(e) => setFormData({ ...formData, google_calendar_id: e.target.value })}
              placeholder="calendar@group.calendar.google.com"
              className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        )}

        {integration.name === 'Twilio SMS' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Account SID</label>
              <input
                type="text"
                value={formData.twilio_account_sid || ''}
                onChange={(e) => setFormData({ ...formData, twilio_account_sid: e.target.value })}
                placeholder="ACxxxxxxxxxxxxxxxx"
                className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Auth Token</label>
              <input
                type="password"
                value={formData.twilio_auth_token || ''}
                onChange={(e) => setFormData({ ...formData, twilio_auth_token: e.target.value })}
                placeholder="Your auth token"
                className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
              <input
                type="tel"
                value={formData.twilio_phone_number || ''}
                onChange={(e) => setFormData({ ...formData, twilio_phone_number: e.target.value })}
                placeholder="+1 234 567 8900"
                className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Connect
          </button>
        </div>
      </form>
    </Modal>
  );
}
