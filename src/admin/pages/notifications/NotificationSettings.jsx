import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell,
  Send,
  MessageCircle,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Settings,
  Loader2,
  Users,
  Play,
  Pause,
  Save,
  Edit,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';

// Default templates as fallback
const DEFAULT_TEMPLATES = {
  appointment_reminder: {
    name: 'Appointment Reminder',
    description: 'Sent 24h before appointment',
    whatsapp: 'مرحباً {patient_name}! 🦷\n\nنذكرك بموعدك غداً في {branch_name}:\n📅 {date}\n⏰ {time}\nدكتور: {doctor_name}\n\nللتأكيد أو التعديل، اتصل بنا على {clinic_phone}',
    email: {
      subject: 'تذكير بموعدك - {clinic_name}',
      body: 'مرحباً {patient_name},\n\nنود تذكيرك بموعدك القادم:\n\nالتاريخ: {date}\nالوقت: {time}\nالطبيب: {doctor_name}\nالفرع: {branch_name}\n\nللتأكيد أو إلغاء الموعد، يرجى الاتصال على {clinic_phone}.\n\nمع تحيات فريق {clinic_name}'
    }
  },
  appointment_confirmation: {
    name: 'Appointment Confirmation',
    description: 'Sent when appointment is booked',
    whatsapp: 'تم تأكيد موعدك! ✅\n\n📅 {date}\n⏰ {time}\n👨‍⚕️ دكتور {doctor_name}\n📍 {branch_name}\n\nنتطلع لرؤيتك! 🦷',
    email: {
      subject: 'تأكيد موعدك - {clinic_name}',
      body: 'مرحباً {patient_name},\n\nتم تأكيد موعدك بنجاح!\n\nالتفاصيل:\nالتاريخ: {date}\nالوقت: {time}\nالطبيب: {doctor_name}\nالفرع: {branch_name}\n\nمع تحيات فريق {clinic_name}'
    }
  },
  appointment_cancelled: {
    name: 'Appointment Cancelled',
    description: 'Sent when appointment is cancelled',
    whatsapp: 'تم إلغاء موعدك ❌\n\nكان الموعد:\n📅 {date}\n⏰ {time}\n\nلحجز موعد جديد، يرجى الاتصال بنا على {clinic_phone}',
    email: {
      subject: 'تم إلغاء موعدك - {clinic_name}',
      body: 'مرحباً {patient_name},\n\nنود إبلاغك بإلغاء موعدك:\n\nالتاريخ: {date}\nالوقت: {time}\n\nإذا كنت ترغب في إعادة جدولة الموعد، يرجى الاتصال بنا.\n\nمع تحيات فريق {clinic_name}'
    }
  },
  follow_up: {
    name: 'Follow-up Reminder',
    description: 'Sent after treatment completion',
    whatsapp: 'مرحباً {patient_name}! 👋\n\nنأمل أنك بخير بعد زيارتك الأخيرة.\n\nللمتابعة أو في حالة أي استفسار، لا تتردد في التواصل معنا على {clinic_phone}.\n\nصحتك تهمنا! 🦷',
    email: {
      subject: 'متابعة بعد الزيارة - {clinic_name}',
      body: 'مرحباً {patient_name},\n\nنأمل أنك بخير بعد زيارتك الأخيرة لعيادتنا.\n\nإذا كان لديك أي استفسار أو تحتاج إلى متابعة، لا تتردد في الاتصال بنا.\n\nمع تحيات فريق {clinic_name}'
    }
  }
};

const NotificationSettings = () => {
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const [activeTab, setActiveTab] = useState('queue'); // queue, logs, templates, settings
  const [notifications, setNotifications] = useState([]);
  const [logs, setLogs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [settings, setSettings] = useState({
    whatsapp_enabled: true,
    email_enabled: true,
    sms_enabled: false,
    reminder_hours_before: 24,
    auto_confirm: true,
    follow_up_days_after: 7,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch notification templates from database
  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch {
      // Use default templates as fallback on error
      setTemplates(Object.entries(DEFAULT_TEMPLATES).map(([key, value]) => ({
        key,
        name: value.name,
        description: value.description,
        whatsapp_template: value.whatsapp,
        email_subject: value.email.subject,
        email_body: value.email.body,
        is_active: true
      })));
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // Get template by key (from DB or fallback)
  const getTemplate = (key) => {
    const dbTemplate = templates.find(t => t.key === key);
    if (dbTemplate) {
      return {
        name: dbTemplate.name,
        description: dbTemplate.description,
        whatsapp: dbTemplate.whatsapp_template,
        email: {
          subject: dbTemplate.email_subject,
          body: dbTemplate.email_body
        }
      };
    }
    return DEFAULT_TEMPLATES[key] || null;
  };

  // Fetch pending notifications
  const fetchNotifications = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Get appointments for the next 2 days that need reminders
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      const { data: appointments, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          notes,
          reminder_sent,
          patients:patient_id (id, name, first_name, last_name, phone, email),
          doctors:doctor_id (id, name_en, name_ar, phone),
          branches:branch_id (id, name_en, name_ar, phone)
        `)
        .eq('tenant_id', tenantId)
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .lte('appointment_date', dayAfter.toISOString().split('T')[0])
        .in('status', ['confirmed', 'pending'])
        .order('appointment_date', { ascending: true });

      if (appointmentError) throw appointmentError;

      // Transform to notification queue
      const queue = (appointments || []).map(apt => ({
        id: apt.id,
        type: 'appointment_reminder',
        patient_name: apt.patients?.name || `${apt.patients?.first_name} ${apt.patients?.last_name}`,
        patient_phone: apt.patients?.phone,
        patient_email: apt.patients?.email,
        doctor_name: apt.doctors?.name_en || apt.doctors?.name_ar,
        branch_name: apt.branches?.name_en || apt.branches?.name_ar,
        branch_phone: apt.branches?.phone,
        date: apt.appointment_date,
        time: apt.start_time,
        status: apt.reminder_sent ? 'sent' : 'pending',
        appointment_status: apt.status
      }));

      setNotifications(queue);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  // Fetch notification logs
  const fetchLogs = useCallback(async () => {
    try {
      const { data, error: logError } = await supabase
        .from('notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logError && logError.code !== 'PGRST116') {
        // Notification logs table may not exist - silent fail
      }
      setLogs(data || []);
    } catch {
      // Silent fail for logs - not critical
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchLogs();
    fetchTemplates();
  }, [fetchNotifications, fetchLogs, fetchTemplates]);

  // Save template to database
  const saveTemplate = async (template) => {
    setSavingTemplate(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('notification_templates')
        .upsert({
          id: template.id,
          key: template.key,
          name: template.name,
          description: template.description,
          whatsapp_template: template.whatsapp_template,
          email_subject: template.email_subject,
          email_body: template.email_body,
          is_active: template.is_active,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;
      setSuccess('Template saved successfully!');
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err) {
      setError('Failed to save template: ' + err.message);
    } finally {
      setSavingTemplate(false);
    }
  };

  // Send single notification
  const sendNotification = async (notification) => {
    setIsSending(true);
    setError(null);
    setSuccess(null);

    try {
      const template = getTemplate(notification.type);
      
      // Call Supabase Edge Function
      const { data: _data, error: fnError } = await supabase.functions.invoke('send-notification', {
        body: {
          type: notification.type,
          channel: 'whatsapp', // or 'email'
          recipient: notification.patient_phone,
          template: template?.whatsapp,
          variables: {
            patient_name: notification.patient_name,
            doctor_name: notification.doctor_name,
            branch_name: notification.branch_name,
            date: new Date(notification.date).toLocaleDateString('ar-EG'),
            time: notification.time,
            clinic_phone: notification.branch_phone
          }
        }
      });

      if (fnError) throw fnError;

      // Update appointment reminder_sent status
      await supabase
        .from('appointments')
        .update({ reminder_sent: true })
        .eq('id', notification.id)
        .eq('tenant_id', tenantId);

      setSuccess(`Notification sent to ${notification.patient_name}`);
      fetchNotifications();
      fetchLogs();
    } catch (err) {
      console.error('Error sending notification:', err);
      setError(`Failed to send: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  // Send all pending notifications
  const sendAllPending = async () => {
    const pending = notifications.filter(n => n.status === 'pending');
    setIsSending(true);
    setError(null);

    let sent = 0;
    let failed = 0;

    for (const notification of pending) {
      try {
        await sendNotification(notification);
        sent++;
      } catch {
        failed++;
      }
    }

    setIsSending(false);
    setSuccess(`Sent ${sent} notifications${failed > 0 ? `, ${failed} failed` : ''}`);
    fetchNotifications();
  };

  const saveSettings = async () => {
    setIsSending(true);
    setError(null);
    try {
      // Save to site_settings or a dedicated notification_settings table
      const { error: saveError } = await supabase
        .from('site_settings')
        .upsert({
          key: 'notification_settings',
          value: settings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (saveError) throw saveError;
      setSuccess('Settings saved successfully!');
    } catch (err) {
      setError('Failed to save settings: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesFilter = filterStatus === 'all' || n.status === filterStatus;
    const matchesSearch = !searchTerm || 
      n.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.patient_phone?.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: notifications.length,
    pending: notifications.filter(n => n.status === 'pending').length,
    sent: notifications.filter(n => n.status === 'sent').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-7 h-7 text-primary-600" />
              Notifications
            </h1>
            <p className="text-gray-500 mt-1">Manage appointment reminders and notifications</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchNotifications}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {activeTab === 'queue' && stats.pending > 0 && (
            <button
              onClick={sendAllPending}
              disabled={isSending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              Send All ({stats.pending})
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Upcoming</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Sent</p>
              <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MessageCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Logs Today</p>
              <p className="text-2xl font-bold text-purple-600">{logs.filter(l => {
                const today = new Date().toISOString().split('T')[0];
                return l.created_at?.startsWith(today);
              }).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { id: 'queue', label: 'Notification Queue', icon: Bell },
            { id: 'logs', label: 'Sent Logs', icon: Clock },
            { id: 'templates', label: 'Templates', icon: MessageCircle },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 px-1 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'queue' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {/* Filters */}
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by patient name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
            </select>
          </div>

          {/* Queue List */}
          <div className="divide-y divide-gray-100">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>No notifications in queue</p>
              </div>
            ) : (
              filteredNotifications.map(notification => (
                <div key={notification.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    notification.status === 'sent' ? 'bg-green-100' : 'bg-amber-100'
                  }`}>
                    {notification.status === 'sent' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{notification.patient_name}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(notification.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {notification.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {notification.patient_phone || 'No phone'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      notification.status === 'sent' 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {notification.status}
                    </span>
                    {notification.status === 'pending' && (
                      <button
                        onClick={() => sendNotification(notification)}
                        disabled={isSending}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                        title="Send now"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>No notification logs yet</p>
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={log.id || index} className="p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    log.status === 'delivered' ? 'bg-green-100' : 
                    log.status === 'failed' ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    {log.channel === 'whatsapp' ? (
                      <MessageCircle className={`w-5 h-5 ${
                        log.status === 'delivered' ? 'text-green-600' : 
                        log.status === 'failed' ? 'text-red-600' : 'text-gray-600'
                      }`} />
                    ) : (
                      <Mail className={`w-5 h-5 ${
                        log.status === 'delivered' ? 'text-green-600' : 
                        log.status === 'failed' ? 'text-red-600' : 'text-gray-600'
                      }`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{log.recipient}</p>
                    <p className="text-sm text-gray-500">{log.type} • {log.channel}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      log.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      log.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {log.status}
                    </span>
                    <p className="text-sm text-gray-400 mt-1">
                      {log.created_at && new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-4">
          {/* Template Editor Modal */}
          {editingTemplate && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold">Edit Template: {editingTemplate.name}</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                    <input
                      type="text"
                      value={editingTemplate.name}
                      onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={editingTemplate.description || ''}
                      onChange={(e) => setEditingTemplate({...editingTemplate, description: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Template</label>
                    <textarea
                      value={editingTemplate.whatsapp_template || ''}
                      onChange={(e) => setEditingTemplate({...editingTemplate, whatsapp_template: e.target.value})}
                      rows={5}
                      dir="rtl"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Subject</label>
                    <input
                      type="text"
                      value={editingTemplate.email_subject || ''}
                      onChange={(e) => setEditingTemplate({...editingTemplate, email_subject: e.target.value})}
                      dir="rtl"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Body</label>
                    <textarea
                      value={editingTemplate.email_body || ''}
                      onChange={(e) => setEditingTemplate({...editingTemplate, email_body: e.target.value})}
                      rows={5}
                      dir="rtl"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingTemplate.is_active !== false}
                      onChange={(e) => setEditingTemplate({...editingTemplate, is_active: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <label className="text-sm text-gray-700">Active</label>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-500">
                    <p className="font-medium mb-1">Available Variables:</p>
                    <p>{'{patient_name}, {doctor_name}, {branch_name}, {date}, {time}, {clinic_phone}, {clinic_name}'}</p>
                  </div>
                </div>
                <div className="p-6 border-t flex justify-end gap-3">
                  <button
                    onClick={() => setEditingTemplate(null)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveTemplate(editingTemplate)}
                    disabled={savingTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {savingTemplate && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Save className="w-4 h-4" />
                    Save Template
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Templates Grid */}
          {loadingTemplates ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.length > 0 ? templates.map((template) => (
                <div key={template.id || template.key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-500">{template.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${template.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {template.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => setEditingTemplate(template)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-700">WhatsApp</span>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg text-sm text-gray-700 whitespace-pre-wrap line-clamp-4" dir="rtl">
                        {template.whatsapp_template}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">Email</span>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-1">{template.email_subject}</p>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-3" dir="rtl">{template.email_body}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-2 text-center py-12 bg-white rounded-xl">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No templates found. Templates will be created from defaults.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Settings</h3>
          
          <div className="space-y-6">
            {/* Channels */}
            <div>
              <h4 className="font-medium text-gray-800 mb-3">Notification Channels</h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-green-600" />
                    <span>WhatsApp Notifications</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.whatsapp_enabled}
                    onChange={(e) => setSettings(s => ({ ...s, whatsapp_enabled: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 text-primary-600"
                  />
                </label>
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <span>Email Notifications</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.email_enabled}
                    onChange={(e) => setSettings(s => ({ ...s, email_enabled: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 text-primary-600"
                  />
                </label>
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-purple-600" />
                    <span>SMS Notifications (Fallback)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.sms_enabled}
                    onChange={(e) => setSettings(s => ({ ...s, sms_enabled: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 text-primary-600"
                  />
                </label>
              </div>
            </div>

            {/* Timing */}
            <div>
              <h4 className="font-medium text-gray-800 mb-3">Timing</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Reminder Hours Before
                  </label>
                  <select
                    value={settings.reminder_hours_before}
                    onChange={(e) => setSettings(s => ({ ...s, reminder_hours_before: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={48}>48 hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Follow-up Days After
                  </label>
                  <select
                    value={settings.follow_up_days_after}
                    onChange={(e) => setSettings(s => ({ ...s, follow_up_days_after: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value={3}>3 days</option>
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Auto Settings */}
            <div>
              <h4 className="font-medium text-gray-800 mb-3">Automation</h4>
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">Auto-send Confirmations</span>
                  <p className="text-sm text-gray-500">Send confirmation when appointment is booked</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.auto_confirm}
                  onChange={(e) => setSettings(s => ({ ...s, auto_confirm: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600"
                />
              </label>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={saveSettings}
                disabled={isSending}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;
