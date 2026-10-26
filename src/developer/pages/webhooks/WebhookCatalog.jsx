import { useState, useMemo } from 'react';
import { 
  Users, 
  Calendar, 
  FileText, 
  Heart, 
  User, 
  Settings,
  ChevronDown,
  ChevronRight,
  Copy,
  CheckCircle2,
  Zap,
  Code,
  Info,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Database
} from 'lucide-react';
import clsx from 'clsx';
import { useWebhookEventTypes } from '../../hooks/useDevApi';

// Icon mapping for dynamic categories
const categoryIcons = {
  patient: Users,
  appointment: Calendar,
  invoice: FileText,
  treatment: Heart,
  user: User,
  system: Settings,
};

// Color mapping for dynamic categories  
const categoryColors = {
  patient: 'emerald',
  appointment: 'blue',
  invoice: 'yellow',
  treatment: 'pink',
  user: 'purple',
  system: 'gray',
};

// Complete Webhook Event Catalog - from database seeds
const WEBHOOK_EVENTS = {
  patient: {
    name: 'Patient Events',
    icon: Users,
    color: 'emerald',
    description: 'Triggered when patient records change',
    events: [
      {
        name: 'patient.created',
        description: 'Triggered when a new patient is created',
        payload: {
          event: 'patient.created',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            patient_id: 'uuid',
            first_name: 'string',
            last_name: 'string',
            email: 'string',
            phone: 'string',
            tenant_id: 'uuid'
          }
        },
        useCase: 'Sync new patients to CRM, send welcome emails',
        retryPolicy: '3 attempts with exponential backoff'
      },
      {
        name: 'patient.updated',
        description: 'Triggered when patient information is updated',
        payload: {
          event: 'patient.updated',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            patient_id: 'uuid',
            updated_fields: ['email', 'phone'],
            previous: { email: 'old@example.com' },
            current: { email: 'new@example.com' }
          }
        },
        useCase: 'Keep external systems in sync with patient data',
        retryPolicy: '3 attempts with exponential backoff'
      },
      {
        name: 'patient.deleted',
        description: 'Triggered when a patient is deleted',
        payload: {
          event: 'patient.deleted',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            patient_id: 'uuid',
            deleted_by: 'uuid',
            reason: 'string'
          }
        },
        useCase: 'GDPR compliance, cleanup in external systems',
        retryPolicy: '5 attempts with exponential backoff'
      }
    ]
  },
  appointment: {
    name: 'Appointment Events',
    icon: Calendar,
    color: 'blue',
    description: 'Triggered on appointment lifecycle changes',
    events: [
      {
        name: 'appointment.created',
        description: 'Triggered when an appointment is scheduled',
        payload: {
          event: 'appointment.created',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            appointment_id: 'uuid',
            patient_id: 'uuid',
            practitioner_id: 'uuid',
            start_time: 'datetime',
            end_time: 'datetime',
            service_type: 'string',
            status: 'scheduled'
          }
        },
        useCase: 'Sync to external calendar, send confirmation SMS',
        retryPolicy: '3 attempts with exponential backoff'
      },
      {
        name: 'appointment.updated',
        description: 'Triggered when an appointment is modified',
        payload: {
          event: 'appointment.updated',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            appointment_id: 'uuid',
            updated_fields: ['start_time', 'practitioner_id'],
            previous: {},
            current: {}
          }
        },
        useCase: 'Update calendar integrations, notify affected parties',
        retryPolicy: '3 attempts with exponential backoff'
      },
      {
        name: 'appointment.cancelled',
        description: 'Triggered when an appointment is cancelled',
        payload: {
          event: 'appointment.cancelled',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            appointment_id: 'uuid',
            cancelled_by: 'uuid',
            reason: 'string',
            refund_amount: 'number'
          }
        },
        useCase: 'Process refunds, send cancellation notifications',
        retryPolicy: '5 attempts with exponential backoff'
      },
      {
        name: 'appointment.completed',
        description: 'Triggered when an appointment is marked complete',
        payload: {
          event: 'appointment.completed',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            appointment_id: 'uuid',
            patient_id: 'uuid',
            practitioner_id: 'uuid',
            services_rendered: [],
            notes_added: true
          }
        },
        useCase: 'Trigger follow-up workflows, update analytics',
        retryPolicy: '3 attempts with exponential backoff'
      },
      {
        name: 'appointment.reminder',
        description: 'Triggered when appointment reminder is due',
        payload: {
          event: 'appointment.reminder',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            appointment_id: 'uuid',
            patient_id: 'uuid',
            reminder_type: '24h | 1h',
            appointment_time: 'datetime'
          }
        },
        useCase: 'Send custom reminder via preferred channel',
        retryPolicy: '3 attempts with exponential backoff'
      },
      {
        name: 'appointment.no_show',
        description: 'Triggered when patient is marked as no-show',
        payload: {
          event: 'appointment.no_show',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            appointment_id: 'uuid',
            patient_id: 'uuid',
            no_show_count: 'number',
            fee_charged: 'number'
          }
        },
        useCase: 'Track no-show patterns, apply fee policies',
        retryPolicy: '3 attempts with exponential backoff'
      }
    ]
  },
  invoice: {
    name: 'Invoice Events',
    icon: FileText,
    color: 'yellow',
    description: 'Triggered on invoice and billing changes',
    events: [
      {
        name: 'invoice.created',
        description: 'Triggered when an invoice is created',
        payload: {
          event: 'invoice.created',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            invoice_id: 'uuid',
            patient_id: 'uuid',
            amount: 'number',
            currency: 'string',
            line_items: [],
            due_date: 'date'
          }
        },
        useCase: 'Sync to accounting software, generate PDF',
        retryPolicy: '3 attempts with exponential backoff'
      },
      {
        name: 'invoice.paid',
        description: 'Triggered when an invoice is paid',
        payload: {
          event: 'invoice.paid',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            invoice_id: 'uuid',
            patient_id: 'uuid',
            amount_paid: 'number',
            payment_method: 'string',
            transaction_id: 'string'
          }
        },
        useCase: 'Update accounting, send receipt, update patient balance',
        retryPolicy: '5 attempts with exponential backoff'
      },
      {
        name: 'invoice.overdue',
        description: 'Triggered when an invoice becomes overdue',
        payload: {
          event: 'invoice.overdue',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            invoice_id: 'uuid',
            patient_id: 'uuid',
            days_overdue: 'number',
            amount_due: 'number'
          }
        },
        useCase: 'Send payment reminders, escalate to collections',
        retryPolicy: '3 attempts with exponential backoff'
      },
      {
        name: 'invoice.cancelled',
        description: 'Triggered when an invoice is cancelled',
        payload: {
          event: 'invoice.cancelled',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            invoice_id: 'uuid',
            cancelled_by: 'uuid',
            reason: 'string'
          }
        },
        useCase: 'Reverse accounting entries, update reports',
        retryPolicy: '3 attempts with exponential backoff'
      }
    ]
  },
  treatment: {
    name: 'Treatment Events',
    icon: Heart,
    color: 'pink',
    description: 'Triggered on treatment plan changes',
    events: [
      {
        name: 'treatment.started',
        description: 'Triggered when a treatment plan is started',
        payload: {
          event: 'treatment.started',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            treatment_id: 'uuid',
            patient_id: 'uuid',
            treatment_type: 'string',
            estimated_cost: 'number',
            planned_sessions: 'number'
          }
        },
        useCase: 'Initialize treatment tracking, setup reminders',
        retryPolicy: '3 attempts with exponential backoff'
      },
      {
        name: 'treatment.completed',
        description: 'Triggered when a treatment plan is completed',
        payload: {
          event: 'treatment.completed',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            treatment_id: 'uuid',
            patient_id: 'uuid',
            total_cost: 'number',
            sessions_completed: 'number',
            outcome: 'string'
          }
        },
        useCase: 'Generate final invoice, request review, update records',
        retryPolicy: '3 attempts with exponential backoff'
      },
      {
        name: 'treatment.updated',
        description: 'Triggered when a treatment plan is modified',
        payload: {
          event: 'treatment.updated',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            treatment_id: 'uuid',
            updated_fields: [],
            updated_by: 'uuid'
          }
        },
        useCase: 'Notify patient of plan changes, update cost estimates',
        retryPolicy: '3 attempts with exponential backoff'
      }
    ]
  },
  user: {
    name: 'User Events',
    icon: User,
    color: 'purple',
    description: 'Triggered on user account activities',
    events: [
      {
        name: 'user.created',
        description: 'Triggered when a new user is created',
        payload: {
          event: 'user.created',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            user_id: 'uuid',
            email: 'string',
            role: 'string',
            tenant_id: 'uuid'
          }
        },
        useCase: 'Send onboarding emails, provision accounts',
        retryPolicy: '3 attempts with exponential backoff'
      },
      {
        name: 'user.updated',
        description: 'Triggered when user information is updated',
        payload: {
          event: 'user.updated',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            user_id: 'uuid',
            updated_fields: [],
            updated_by: 'uuid'
          }
        },
        useCase: 'Sync profile changes, update permissions',
        retryPolicy: '3 attempts with exponential backoff'
      },
      {
        name: 'user.login',
        description: 'Triggered on user login',
        payload: {
          event: 'user.login',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            user_id: 'uuid',
            ip_address: 'string',
            user_agent: 'string',
            location: { country: 'string', city: 'string' }
          }
        },
        useCase: 'Security monitoring, analytics, session tracking',
        retryPolicy: '1 attempt (best effort)'
      },
      {
        name: 'user.logout',
        description: 'Triggered on user logout',
        payload: {
          event: 'user.logout',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            user_id: 'uuid',
            session_duration_minutes: 'number'
          }
        },
        useCase: 'Session analytics, usage tracking',
        retryPolicy: '1 attempt (best effort)'
      }
    ]
  },
  system: {
    name: 'System Events',
    icon: Settings,
    color: 'gray',
    description: 'Triggered on system-level operations',
    events: [
      {
        name: 'system.backup_completed',
        description: 'Triggered when a backup is completed',
        payload: {
          event: 'system.backup_completed',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            backup_id: 'string',
            size_bytes: 'number',
            duration_seconds: 'number',
            storage_location: 'string'
          }
        },
        useCase: 'Notify admins, trigger secondary backups, compliance logs',
        retryPolicy: '5 attempts with exponential backoff'
      },
      {
        name: 'system.maintenance',
        description: 'Triggered for maintenance notifications',
        payload: {
          event: 'system.maintenance',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            maintenance_type: 'scheduled | emergency',
            start_time: 'datetime',
            estimated_duration_minutes: 'number',
            affected_services: []
          }
        },
        useCase: 'Alert stakeholders, update status page',
        retryPolicy: '5 attempts with exponential backoff'
      },
      {
        name: 'system.error',
        description: 'Triggered on system errors',
        payload: {
          event: 'system.error',
          timestamp: '2024-01-15T10:30:00Z',
          data: {
            error_id: 'string',
            severity: 'warning | error | critical',
            service: 'string',
            message: 'string',
            stack_trace: 'string'
          }
        },
        useCase: 'PagerDuty integration, Slack alerts, incident management',
        retryPolicy: '5 attempts with exponential backoff'
      }
    ]
  }
};

const colorClasses = {
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300'
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-300'
  },
  yellow: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    text: 'text-yellow-400',
    badge: 'bg-yellow-500/20 text-yellow-300'
  },
  pink: {
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    text: 'text-pink-400',
    badge: 'bg-pink-500/20 text-pink-300'
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    text: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300'
  },
  gray: {
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
    text: 'text-gray-400',
    badge: 'bg-gray-500/20 text-gray-300'
  }
};

const WebhookCatalog = () => {
  const { data: apiData, loading, error, refetch } = useWebhookEventTypes();
  const [expandedCategories, setExpandedCategories] = useState(['patient', 'appointment']);
  const [expandedEvents, setExpandedEvents] = useState([]);
  const [copiedEvent, setCopiedEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Transform API data into component format, fallback to static data
  const webhookEvents = useMemo(() => {
    if (apiData?.byCategory && Object.keys(apiData.byCategory).length > 0) {
      // Use dynamic data from API
      const result = {};
      Object.entries(apiData.byCategory).forEach(([catName, events]) => {
        result[catName] = {
          name: catName.charAt(0).toUpperCase() + catName.slice(1) + ' Events',
          icon: categoryIcons[catName] || Settings,
          color: categoryColors[catName] || 'gray',
          description: `Triggered on ${catName} changes`,
          events: events.map(event => ({
            name: event.event_name,
            description: event.description || '',
            payload: event.example_payload || { event: event.event_name, timestamp: new Date().toISOString(), data: {} },
            useCase: event.use_case || '',
            retryPolicy: event.retry_policy || '3 attempts with exponential backoff'
          }))
        };
      });
      return result;
    }
    // Fallback to static data
    return WEBHOOK_EVENTS;
  }, [apiData]);

  const toggleCategory = (category) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleEvent = (eventName) => {
    setExpandedEvents(prev => 
      prev.includes(eventName) 
        ? prev.filter(e => e !== eventName)
        : [...prev, eventName]
    );
  };

  const copyEventName = async (eventName) => {
    await navigator.clipboard.writeText(eventName);
    setCopiedEvent(eventName);
    setTimeout(() => setCopiedEvent(null), 2000);
  };

  const copyPayload = async (payload) => {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedEvent(payload.event + '-payload');
    setTimeout(() => setCopiedEvent(null), 2000);
  };

  // Filter events based on search
  const filterEvents = (events) => {
    if (!searchQuery) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(event => 
      event.name.toLowerCase().includes(query) ||
      event.description.toLowerCase().includes(query) ||
      (event.useCase || '').toLowerCase().includes(query)
    );
  };

  const totalEvents = Object.values(webhookEvents).reduce(
    (acc, cat) => acc + cat.events.length, 0
  );

  const isFromDatabase = apiData?.byCategory && Object.keys(apiData.byCategory).length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Webhook Event Catalog
            {isFromDatabase && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 rounded-full text-xs text-emerald-400">
                <Database className="w-3 h-3" />
                Live
              </span>
            )}
          </h2>
          <p className="text-gray-400 mt-1">
            {totalEvents} events available across {Object.keys(webhookEvents).length} categories
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refetch}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="relative">
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-center gap-2 text-yellow-400 text-sm">
          <AlertTriangle className="w-4 h-4" />
          Using cached data. {error}
        </div>
      )}

      {/* Quick Info */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-400">
            <p className="mb-2">
              Webhooks are HTTP callbacks that notify your systems when events occur in Dento. 
              Each event includes a signed payload with relevant data.
            </p>
            <div className="flex flex-wrap gap-4 text-xs">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                HTTPS required
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                HMAC-SHA256 signatures
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Automatic retries
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Delivery logs
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Event Categories */}
      <div className="space-y-4">
        {Object.entries(webhookEvents).map(([key, category]) => {
          const Icon = category.icon || categoryIcons[key] || Settings;
          const colors = colorClasses[category.color] || colorClasses.gray;
          const filteredEvents = filterEvents(category.events);
          const isExpanded = expandedCategories.includes(key);

          if (searchQuery && filteredEvents.length === 0) return null;

          return (
            <div 
              key={key}
              className={clsx(
                'border rounded-xl overflow-hidden transition-all',
                colors.border,
                isExpanded ? colors.bg : 'bg-gray-900/30'
              )}
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(key)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={clsx('p-2 rounded-lg', colors.bg)}>
                    <Icon className={clsx('w-5 h-5', colors.text)} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{category.name}</h3>
                    <p className="text-sm text-gray-500">{category.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', colors.badge)}>
                    {filteredEvents.length} events
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Events List */}
              {isExpanded && (
                <div className="border-t border-gray-800 divide-y divide-gray-800">
                  {filteredEvents.map((event) => {
                    const isEventExpanded = expandedEvents.includes(event.name);

                    return (
                      <div key={event.name} className="bg-gray-900/50">
                        {/* Event Row */}
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <button
                              onClick={() => toggleEvent(event.name)}
                              className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                            >
                              {isEventExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <code className={clsx(
                                  'text-sm font-mono px-2 py-0.5 rounded',
                                  colors.badge
                                )}>
                                  {event.name}
                                </code>
                              </div>
                              <p className="text-sm text-gray-400 mt-1 truncate">
                                {event.description}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => copyEventName(event.name)}
                            className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
                            title="Copy event name"
                          >
                            {copiedEvent === event.name ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* Expanded Event Details */}
                        {isEventExpanded && (
                          <div className="px-4 pb-4 pt-0 border-t border-gray-800 bg-gray-950/30">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                              {/* Use Case */}
                              <div className="bg-gray-800/50 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                                  <Zap className="w-4 h-4 text-yellow-400" />
                                  Use Case
                                </h4>
                                <p className="text-sm text-gray-400">{event.useCase}</p>
                              </div>

                              {/* Retry Policy */}
                              <div className="bg-gray-800/50 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                                  Retry Policy
                                </h4>
                                <p className="text-sm text-gray-400">{event.retryPolicy}</p>
                              </div>
                            </div>

                            {/* Example Payload */}
                            <div className="mt-4 bg-gray-950 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                  <Code className="w-4 h-4 text-blue-400" />
                                  Example Payload
                                </h4>
                                <button
                                  onClick={() => copyPayload(event.payload)}
                                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 bg-gray-800 rounded transition-colors"
                                >
                                  {copiedEvent === event.name + '-payload' ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                      Copied!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      Copy
                                    </>
                                  )}
                                </button>
                              </div>
                              <pre className="text-xs text-gray-400 font-mono overflow-x-auto">
                                {JSON.stringify(event.payload, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Integration Guide */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Integration Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-emerald-400 font-medium mb-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">1</span>
              Create Webhook
            </div>
            <p className="text-sm text-gray-400">
              Configure your endpoint URL and select events to subscribe to.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-400 font-medium mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs">2</span>
              Verify Signatures
            </div>
            <p className="text-sm text-gray-400">
              Validate the X-Webhook-Signature header using your webhook secret.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-400 font-medium mb-2">
              <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs">3</span>
              Respond Quickly
            </div>
            <p className="text-sm text-gray-400">
              Return 2xx within 30 seconds. Process async if needed.
            </p>
          </div>
        </div>
        
        {/* Code Example */}
        <div className="mt-4 bg-gray-950 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Signature Verification (Node.js)</h4>
          <pre className="text-xs text-gray-400 font-mono overflow-x-auto">
{`const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default WebhookCatalog;
