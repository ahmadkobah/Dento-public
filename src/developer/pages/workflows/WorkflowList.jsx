import { useState } from 'react';
import { 
  Workflow,
  Plus,
  Trash2,
  Play,
  Pause,
  Edit,
  Copy,
  ChevronRight,
  ChevronDown,
  Zap,
  Clock,
  Calendar,
  Mail,
  MessageSquare,
  Bell,
  Webhook,
  Database,
  Settings,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Save,
  X,
  ArrowRight,
  Filter,
  Target,
  Users
} from 'lucide-react';
import clsx from 'clsx';

const triggerTypes = [
  { value: 'event', label: 'Event Trigger', icon: Zap, description: 'Triggered by system events' },
  { value: 'schedule', label: 'Schedule', icon: Clock, description: 'Run on a schedule' },
  { value: 'manual', label: 'Manual', icon: Play, description: 'Triggered manually' },
];

const eventTypes = [
  { value: 'patient.created', label: 'Patient Created' },
  { value: 'patient.updated', label: 'Patient Updated' },
  { value: 'appointment.created', label: 'Appointment Created' },
  { value: 'appointment.confirmed', label: 'Appointment Confirmed' },
  { value: 'appointment.cancelled', label: 'Appointment Cancelled' },
  { value: 'appointment.completed', label: 'Appointment Completed' },
  { value: 'invoice.created', label: 'Invoice Created' },
  { value: 'invoice.paid', label: 'Invoice Paid' },
  { value: 'treatment.completed', label: 'Treatment Completed' },
];

const actionTypes = [
  { value: 'send_email', label: 'Send Email', icon: Mail },
  { value: 'send_sms', label: 'Send SMS', icon: MessageSquare },
  { value: 'push_notification', label: 'Push Notification', icon: Bell },
  { value: 'webhook', label: 'Call Webhook', icon: Webhook },
  { value: 'update_record', label: 'Update Record', icon: Database },
  { value: 'create_task', label: 'Create Task', icon: CheckCircle2 },
  { value: 'delay', label: 'Wait/Delay', icon: Clock },
];

// Mock workflows
const mockWorkflows = [
  {
    id: 1,
    name: 'New Patient Welcome',
    description: 'Send welcome email and SMS when a new patient registers',
    trigger: { type: 'event', event: 'patient.created' },
    conditions: [{ field: 'email', operator: 'is_not_empty' }],
    actions: [
      { type: 'send_email', template: 'welcome_email', delay: 0 },
      { type: 'delay', duration: 300 },
      { type: 'send_sms', template: 'welcome_sms', delay: 0 },
    ],
    active: true,
    runs: 156,
    lastRun: '2026-02-03T10:30:00Z',
    errors: 2,
  },
  {
    id: 2,
    name: 'Appointment Reminder',
    description: 'Send reminder 24 hours before appointment',
    trigger: { type: 'schedule', cron: '0 9 * * *' },
    conditions: [{ field: 'status', operator: 'equals', value: 'confirmed' }],
    actions: [
      { type: 'send_email', template: 'appointment_reminder', delay: 0 },
      { type: 'send_sms', template: 'appointment_reminder_sms', delay: 0 },
    ],
    active: true,
    runs: 423,
    lastRun: '2026-02-03T09:00:00Z',
    errors: 0,
  },
  {
    id: 3,
    name: 'Payment Follow-up',
    description: 'Send payment reminder for unpaid invoices',
    trigger: { type: 'schedule', cron: '0 10 * * 1' },
    conditions: [
      { field: 'status', operator: 'equals', value: 'unpaid' },
      { field: 'days_overdue', operator: 'greater_than', value: 7 },
    ],
    actions: [
      { type: 'send_email', template: 'payment_reminder', delay: 0 },
    ],
    active: false,
    runs: 89,
    lastRun: '2026-01-27T10:00:00Z',
    errors: 5,
  },
  {
    id: 4,
    name: 'Post-Treatment Survey',
    description: 'Send feedback survey 2 days after treatment',
    trigger: { type: 'event', event: 'treatment.completed' },
    conditions: [],
    actions: [
      { type: 'delay', duration: 172800 },
      { type: 'send_email', template: 'feedback_survey', delay: 0 },
    ],
    active: true,
    runs: 67,
    lastRun: '2026-02-02T14:00:00Z',
    errors: 0,
  },
];

const WorkflowList = () => {
  const [workflows, setWorkflows] = useState(mockWorkflows);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [expandedWorkflow, setExpandedWorkflow] = useState(null);
  const [filter, setFilter] = useState('all'); // all, active, inactive

  const filteredWorkflows = workflows.filter(w => {
    if (filter === 'active') return w.active;
    if (filter === 'inactive') return !w.active;
    return true;
  });

  const handleToggleActive = (id) => {
    setWorkflows(prev => prev.map(w => 
      w.id === id ? { ...w, active: !w.active } : w
    ));
  };

  const handleDelete = (id) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    setWorkflows(prev => prev.filter(w => w.id !== id));
  };

  const handleDuplicate = (workflow) => {
    const newWorkflow = {
      ...workflow,
      id: Date.now(),
      name: `${workflow.name} (Copy)`,
      runs: 0,
      lastRun: null,
      errors: 0,
      active: false,
    };
    setWorkflows(prev => [...prev, newWorkflow]);
  };

  const handleRunNow = (id) => {
    setWorkflows(prev => prev.map(w => 
      w.id === id ? { ...w, runs: w.runs + 1, lastRun: new Date().toISOString() } : w
    ));
  };

  const handleSaveWorkflow = (data) => {
    if (editingWorkflow) {
      setWorkflows(prev => prev.map(w => 
        w.id === editingWorkflow.id ? { ...w, ...data } : w
      ));
    } else {
      setWorkflows(prev => [...prev, {
        ...data,
        id: Date.now(),
        runs: 0,
        lastRun: null,
        errors: 0,
      }]);
    }
    setShowCreateModal(false);
    setEditingWorkflow(null);
  };

  const getActionIcon = (type) => {
    return actionTypes.find(a => a.value === type)?.icon || Zap;
  };

  const stats = {
    total: workflows.length,
    active: workflows.filter(w => w.active).length,
    totalRuns: workflows.reduce((sum, w) => sum + w.runs, 0),
    totalErrors: workflows.reduce((sum, w) => sum + w.errors, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Workflow Automation</h1>
          <p className="text-gray-400 mt-1">Automate tasks with triggers and actions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Workflow
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Workflow className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-sm text-gray-400">Total Workflows</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.active}</p>
              <p className="text-sm text-gray-400">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalRuns.toLocaleString()}</p>
              <p className="text-sm text-gray-400">Total Runs</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalErrors}</p>
              <p className="text-sm text-gray-400">Total Errors</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'active', 'inactive'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'px-4 py-2 rounded-lg capitalize transition-colors',
              filter === f
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Workflows List */}
      <div className="space-y-4">
        {filteredWorkflows.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <Workflow className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No workflows found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-emerald-400 hover:text-emerald-300"
            >
              Create your first workflow
            </button>
          </div>
        ) : (
          filteredWorkflows.map(workflow => {
            const isExpanded = expandedWorkflow === workflow.id;
            const TriggerIcon = triggerTypes.find(t => t.value === workflow.trigger.type)?.icon || Zap;
            
            return (
              <div
                key={workflow.id}
                className={clsx(
                  'bg-gray-900 border rounded-xl transition-colors',
                  workflow.active ? 'border-gray-800' : 'border-gray-800/50 opacity-75'
                )}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={clsx(
                        'p-3 rounded-xl',
                        workflow.active ? 'bg-emerald-500/10' : 'bg-gray-800'
                      )}>
                        <Workflow className={clsx(
                          'w-6 h-6',
                          workflow.active ? 'text-emerald-400' : 'text-gray-500'
                        )} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className={clsx(
                            'font-semibold',
                            workflow.active ? 'text-white' : 'text-gray-400'
                          )}>
                            {workflow.name}
                          </h3>
                          {workflow.active ? (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-700 text-gray-500 text-xs rounded-full">
                              Inactive
                            </span>
                          )}
                          {workflow.errors > 0 && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {workflow.errors} errors
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-sm mt-1">{workflow.description}</p>
                        
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-2 text-sm">
                            <TriggerIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400">
                              {workflow.trigger.type === 'event' && workflow.trigger.event}
                              {workflow.trigger.type === 'schedule' && workflow.trigger.cron}
                              {workflow.trigger.type === 'manual' && 'Manual trigger'}
                            </span>
                          </div>
                          <span className="text-gray-600">•</span>
                          <span className="text-sm text-gray-500">{workflow.runs} runs</span>
                          {workflow.lastRun && (
                            <>
                              <span className="text-gray-600">•</span>
                              <span className="text-sm text-gray-500">
                                Last run: {new Date(workflow.lastRun).toLocaleString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRunNow(workflow.id)}
                        className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
                        title="Run Now"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(workflow.id)}
                        className={clsx(
                          'p-2 rounded-lg',
                          workflow.active 
                            ? 'text-emerald-400 hover:bg-emerald-500/10' 
                            : 'text-gray-500 hover:bg-gray-700'
                        )}
                        title={workflow.active ? 'Pause' : 'Activate'}
                      >
                        {workflow.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => { setEditingWorkflow(workflow); setShowCreateModal(true); }}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(workflow)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setExpandedWorkflow(isExpanded ? null : workflow.id)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(workflow.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-800 pt-4">
                    {/* Visual Flow */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {/* Trigger */}
                      <div className="flex-shrink-0 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center gap-2">
                        <TriggerIcon className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-400 text-sm whitespace-nowrap">
                          {workflow.trigger.type === 'event' && workflow.trigger.event}
                          {workflow.trigger.type === 'schedule' && `Cron: ${workflow.trigger.cron}`}
                          {workflow.trigger.type === 'manual' && 'Manual'}
                        </span>
                      </div>

                      <ArrowRight className="w-4 h-4 text-gray-600 flex-shrink-0" />

                      {/* Conditions */}
                      {workflow.conditions.length > 0 && (
                        <>
                          <div className="flex-shrink-0 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2">
                            <Filter className="w-4 h-4 text-amber-400" />
                            <span className="text-amber-400 text-sm whitespace-nowrap">
                              {workflow.conditions.length} condition{workflow.conditions.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        </>
                      )}

                      {/* Actions */}
                      {workflow.actions.map((action, index) => {
                        const ActionIcon = getActionIcon(action.type);
                        return (
                          <div key={index} className="contents">
                            {index > 0 && <ArrowRight className="w-4 h-4 text-gray-600 flex-shrink-0" />}
                            <div className="flex-shrink-0 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2">
                              <ActionIcon className="w-4 h-4 text-emerald-400" />
                              <span className="text-emerald-400 text-sm whitespace-nowrap capitalize">
                                {action.type.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Conditions Detail */}
                    {workflow.conditions.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-400 mb-2">Conditions</h4>
                        <div className="space-y-1">
                          {workflow.conditions.map((cond, index) => (
                            <div key={index} className="text-sm text-gray-500">
                              <code className="text-amber-400">{cond.field}</code>
                              {' '}<span className="text-gray-600">{cond.operator.replace('_', ' ')}</span>
                              {cond.value && <> <code className="text-emerald-400">{cond.value}</code></>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <WorkflowModal
          workflow={editingWorkflow}
          onClose={() => { setShowCreateModal(false); setEditingWorkflow(null); }}
          onSave={handleSaveWorkflow}
        />
      )}
    </div>
  );
};

// Workflow Modal Component
const WorkflowModal = ({ workflow, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: workflow?.name || '',
    description: workflow?.description || '',
    trigger: workflow?.trigger || { type: 'event', event: 'patient.created' },
    conditions: workflow?.conditions || [],
    actions: workflow?.actions || [{ type: 'send_email', template: '' }],
    active: workflow?.active ?? true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, { type: 'send_email', template: '' }]
    }));
  };

  const removeAction = (index) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const updateAction = (index, updates) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((a, i) => i === index ? { ...a, ...updates } : a)
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-gray-900 rounded-xl shadow-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 z-10 bg-gray-900 flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">
              {workflow ? 'Edit Workflow' : 'Create Workflow'}
            </h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Workflow Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. New Patient Welcome"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this workflow does..."
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  rows={2}
                />
              </div>
            </div>

            {/* Trigger */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Trigger</label>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {triggerTypes.map(type => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        trigger: { ...prev.trigger, type: type.value } 
                      }))}
                      className={clsx(
                        'flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors',
                        formData.trigger.type === type.value
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      )}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-sm">{type.label}</span>
                    </button>
                  );
                })}
              </div>

              {formData.trigger.type === 'event' && (
                <select
                  value={formData.trigger.event || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    trigger: { ...prev.trigger, event: e.target.value } 
                  }))}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select event...</option>
                  {eventTypes.map(event => (
                    <option key={event.value} value={event.value}>{event.label}</option>
                  ))}
                </select>
              )}

              {formData.trigger.type === 'schedule' && (
                <input
                  type="text"
                  value={formData.trigger.cron || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    trigger: { ...prev.trigger, cron: e.target.value } 
                  }))}
                  placeholder="Cron expression (e.g. 0 9 * * *)"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              )}
            </div>

            {/* Actions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">Actions</label>
                <button
                  type="button"
                  onClick={addAction}
                  className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Action
                </button>
              </div>
              <div className="space-y-3">
                {formData.actions.map((action, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                    <span className="text-gray-500 text-sm">{index + 1}.</span>
                    <select
                      value={action.type}
                      onChange={(e) => updateAction(index, { type: e.target.value })}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    >
                      {actionTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    {action.type === 'delay' ? (
                      <input
                        type="number"
                        value={action.duration || 0}
                        onChange={(e) => updateAction(index, { duration: parseInt(e.target.value) })}
                        placeholder="Seconds"
                        className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={action.template || ''}
                        onChange={(e) => updateAction(index, { template: e.target.value })}
                        placeholder="Template name"
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      />
                    )}
                    {formData.actions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAction(index)}
                        className="p-2 text-gray-400 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Active Toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-gray-300">Activate workflow immediately</span>
            </label>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {workflow ? 'Update' : 'Create'} Workflow
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WorkflowList;
