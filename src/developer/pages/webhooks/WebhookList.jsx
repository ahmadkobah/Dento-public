import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Webhook, 
  Plus, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Activity,
  MoreVertical,
  Trash2,
  Edit,
  Play,
  Pause,
  Eye,
  ExternalLink,
  Send,
  Zap,
  List
} from 'lucide-react';
import clsx from 'clsx';
import { useWebhooks, useUpdateWebhook, useDeleteWebhook, useTestWebhook } from '../../hooks/useDevApi';
import WebhookCatalog from './WebhookCatalog';
import { useToast } from '../../../hooks/useToast';

// Map API webhook data to expected format
const mapWebhook = (webhook) => ({
  id: webhook.id,
  name: webhook.name,
  url: webhook.endpoint_url || webhook.url,
  status: webhook.is_active ? 'active' : 'paused',
  events: webhook.event_types || webhook.events || [],
  secret: webhook.secret ? `whsec_${webhook.secret.substring(0, 8)}...` : null,
  lastTriggered: webhook.last_triggered_at || webhook.updated_at,
  successRate: webhook.success_rate ?? 100,
  totalDeliveries: webhook.total_deliveries ?? 0,
  failedDeliveries: webhook.failed_deliveries ?? 0,
  createdAt: webhook.created_at,
  version: 'v1',
  lastError: webhook.last_error,
});

const _eventCategories = {
  appointment: ['appointment.created', 'appointment.updated', 'appointment.cancelled', 'appointment.reminder'],
  patient: ['patient.created', 'patient.updated', 'patient.deleted'],
  payment: ['payment.completed', 'payment.failed', 'payment.refunded'],
  invoice: ['invoice.created', 'invoice.paid', 'invoice.overdue'],
  inventory: ['inventory.low_stock', 'inventory.expired', 'inventory.restocked'],
  schedule: ['schedule.created', 'schedule.updated', 'leave.approved', 'leave.rejected'],
};

const WebhookList = () => {
  const toast = useToast();
  const { data: webhooksData, loading: isLoading, error, refetch } = useWebhooks();
  const { mutate: updateWebhook } = useUpdateWebhook();
  const { mutate: _deleteWebhook } = useDeleteWebhook();
  const { mutate: testWebhook } = useTestWebhook();
  // eslint-disable-next-line no-unused-vars
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('webhooks');

  const webhooks = (webhooksData?.webhooks || []).map(mapWebhook);

  const filteredWebhooks = webhooks.filter(webhook => {
    if (filterStatus === 'all') return true;
    return webhook.status === filterStatus;
  });

  const toggleWebhookStatus = async (webhookId) => {
    const webhook = webhooks.find(w => w.id === webhookId);
    if (webhook) {
      try {
        await updateWebhook(webhookId, { is_active: webhook.status !== 'active' });
        refetch();
      } catch (err) {
        console.error('Failed to toggle webhook status:', err);
      }
    }
    setActiveMenu(null);
  };

  const handleTestWebhook = async (webhookId) => {
    try {
      await testWebhook(webhookId);
      toast.success('Test webhook sent successfully!');
    } catch (err) {
      console.error('Failed to test webhook:', err);
    }
  };

  const formatLastTriggered = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return CheckCircle2;
      case 'paused': return Pause;
      case 'failing': return AlertTriangle;
      default: return XCircle;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-emerald-400 bg-emerald-500/10';
      case 'paused': return 'text-yellow-400 bg-yellow-500/10';
      case 'failing': return 'text-red-400 bg-red-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  const getSuccessRateColor = (rate) => {
    if (rate >= 99) return 'text-emerald-400';
    if (rate >= 95) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-red-400 mb-4">Error loading webhooks: {error}</p>
        <button onClick={refetch} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Webhooks</h1>
          <p className="text-gray-400 mt-1">Configure webhook endpoints for real-time event notifications</p>
        </div>
        <div className="flex gap-3">
          {activeTab === 'webhooks' && (
            <>
              <button
                onClick={refetch}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <Link
                to="/developer/webhooks/logs"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
              >
                <Activity className="w-4 h-4" />
                View Logs
              </Link>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Webhook
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('webhooks')}
            className={clsx(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'webhooks'
                ? 'text-emerald-400 border-emerald-400'
                : 'text-gray-400 border-transparent hover:text-gray-300 hover:border-gray-700'
            )}
          >
            <List className="w-4 h-4" />
            My Webhooks
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={clsx(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'catalog'
                ? 'text-emerald-400 border-emerald-400'
                : 'text-gray-400 border-transparent hover:text-gray-300 hover:border-gray-700'
            )}
          >
            <Zap className="w-4 h-4" />
            Event Catalog
          </button>
        </div>
      </div>

      {/* Event Catalog Tab */}
      {activeTab === 'catalog' && <WebhookCatalog />}

      {/* My Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Webhooks</p>
          <p className="text-2xl font-bold text-white mt-1">{webhooks.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Active</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{webhooks.filter(w => w.status === 'active').length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Paused</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{webhooks.filter(w => w.status === 'paused').length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Failing</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{webhooks.filter(w => w.status === 'failing').length}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="failing">Failing</option>
        </select>
      </div>

      {/* Webhooks List */}
      <div className="space-y-4">
        {filteredWebhooks.map((webhook) => {
          const StatusIcon = getStatusIcon(webhook.status);
          return (
            <div 
              key={webhook.id}
              className={clsx(
                'bg-gray-900 border rounded-xl p-5 transition-colors',
                webhook.status === 'failing' 
                  ? 'border-red-500/20' 
                  : 'border-gray-800 hover:border-gray-700'
              )}
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    <div className={clsx(
                      'p-2 rounded-lg',
                      webhook.status === 'active' 
                        ? 'bg-emerald-500/10' 
                        : webhook.status === 'failing'
                          ? 'bg-red-500/10'
                          : 'bg-gray-800'
                    )}>
                      <Webhook className={clsx(
                        'w-5 h-5',
                        webhook.status === 'active' 
                          ? 'text-emerald-400' 
                          : webhook.status === 'failing'
                            ? 'text-red-400'
                            : 'text-gray-400'
                      )} />
                    </div>
                    <h3 className="font-semibold text-white">{webhook.name}</h3>
                    <span className={clsx(
                      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                      getStatusColor(webhook.status)
                    )}>
                      <StatusIcon className="w-3 h-3" />
                      {webhook.status}
                    </span>
                  </div>

                  {/* URL */}
                  <div className="flex items-center gap-2 mb-4">
                    <code className="flex-1 text-sm text-gray-400 font-mono bg-gray-800 px-3 py-2 rounded-lg truncate">
                      {webhook.url}
                    </code>
                    <a
                      href={webhook.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  {/* Events */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Subscribed Events</p>
                    <div className="flex flex-wrap gap-1.5">
                      {webhook.events.includes('*') ? (
                        <span className="px-2 py-1 bg-emerald-500/10 rounded text-xs text-emerald-400">
                          All Events
                        </span>
                      ) : (
                        webhook.events.map(event => (
                          <span 
                            key={event}
                            className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400"
                          >
                            {event}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Error Message */}
                  {webhook.status === 'failing' && webhook.lastError && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-sm text-red-400">
                        <AlertTriangle className="w-4 h-4 inline mr-2" />
                        {webhook.lastError}
                      </p>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      Last triggered {formatLastTriggered(webhook.lastTriggered)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-4 h-4" />
                      {webhook.totalDeliveries.toLocaleString()} deliveries
                    </span>
                    <span className={clsx(
                      'flex items-center gap-1.5',
                      getSuccessRateColor(webhook.successRate)
                    )}>
                      <CheckCircle2 className="w-4 h-4" />
                      {webhook.successRate}% success rate
                    </span>
                    {webhook.failedDeliveries > 0 && (
                      <span className="flex items-center gap-1.5 text-red-400">
                        <XCircle className="w-4 h-4" />
                        {webhook.failedDeliveries} failed
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => handleTestWebhook(webhook.id)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors text-sm"
                  >
                    <Send className="w-4 h-4" />
                    Test
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === webhook.id ? null : webhook.id)}
                      className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {activeMenu === webhook.id && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-10">
                        <Link
                          to={`/webhooks/${webhook.id}`}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </Link>
                        <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors">
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => toggleWebhookStatus(webhook.id)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                        >
                          {webhook.status === 'active' ? (
                            <>
                              <Pause className="w-4 h-4" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              Activate
                            </>
                          )}
                        </button>
                        <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors">
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredWebhooks.length === 0 && (
        <div className="text-center py-12">
          <Webhook className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No webhooks found matching your criteria</p>
          <button
            onClick={() => setFilterStatus('all')}
            className="mt-4 text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Clear filter
          </button>
        </div>
      )}

        </>
      )}
    </div>
  );
};

export default WebhookList;
