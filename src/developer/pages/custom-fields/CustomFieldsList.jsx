import { useState } from 'react';
import { 
  FormInput,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Save,
  RefreshCw,
  CheckCircle2,
  Type,
  Hash,
  Calendar,
  List,
  CheckSquare,
  Mail,
  Phone,
  Upload,
  Link,
  ToggleLeft,
  Clock,
  X,
  Copy,
  Edit,
  Eye,
  Settings,
  Building2
} from 'lucide-react';
import clsx from 'clsx';

const fieldTypes = [
  { value: 'text', label: 'Text', icon: Type, description: 'Single line text' },
  { value: 'textarea', label: 'Long Text', icon: Type, description: 'Multi-line text' },
  { value: 'number', label: 'Number', icon: Hash, description: 'Numeric value' },
  { value: 'date', label: 'Date', icon: Calendar, description: 'Date picker' },
  { value: 'datetime', label: 'Date & Time', icon: Clock, description: 'Date and time picker' },
  { value: 'select', label: 'Dropdown', icon: List, description: 'Single selection' },
  { value: 'multiselect', label: 'Multi-Select', icon: CheckSquare, description: 'Multiple selections' },
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare, description: 'Yes/No toggle' },
  { value: 'email', label: 'Email', icon: Mail, description: 'Email address' },
  { value: 'phone', label: 'Phone', icon: Phone, description: 'Phone number' },
  { value: 'url', label: 'URL', icon: Link, description: 'Web address' },
  { value: 'file', label: 'File Upload', icon: Upload, description: 'File attachment' },
];

const entities = [
  { value: 'patients', label: 'Patients', icon: Building2, count: 3 },
  { value: 'appointments', label: 'Appointments', icon: Calendar, count: 2 },
  { value: 'doctors', label: 'Doctors', icon: Building2, count: 1 },
  { value: 'invoices', label: 'Invoices', icon: Hash, count: 0 },
  { value: 'treatments', label: 'Treatments', icon: Type, count: 1 },
];

// Mock existing custom fields
const mockFields = {
  patients: [
    { id: 1, name: 'Insurance ID', key: 'insurance_id', type: 'text', required: true, active: true, order: 1 },
    { id: 2, name: 'Preferred Contact', key: 'preferred_contact', type: 'select', required: false, active: true, order: 2, options: ['Phone', 'Email', 'WhatsApp'] },
    { id: 3, name: 'Referral Source', key: 'referral_source', type: 'select', required: false, active: false, order: 3, options: ['Social Media', 'Friend', 'Google', 'Other'] },
  ],
  appointments: [
    { id: 4, name: 'Follow-up Required', key: 'follow_up_required', type: 'checkbox', required: false, active: true, order: 1 },
    { id: 5, name: 'Notes for Patient', key: 'patient_notes', type: 'textarea', required: false, active: true, order: 2 },
  ],
  doctors: [
    { id: 6, name: 'Medical License', key: 'medical_license', type: 'text', required: true, active: true, order: 1 },
  ],
  invoices: [],
  treatments: [
    { id: 7, name: 'Warranty Period', key: 'warranty_period', type: 'number', required: false, active: true, order: 1 },
  ],
};

const CustomFieldsList = () => {
  const [selectedEntity, setSelectedEntity] = useState('patients');
  const [fields, setFields] = useState(mockFields);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [expandedField, setExpandedField] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentFields = fields[selectedEntity] || [];

  const handleCreateField = (fieldData) => {
    const newField = {
      id: Date.now(),
      ...fieldData,
      key: fieldData.name.toLowerCase().replace(/\s+/g, '_'),
      order: currentFields.length + 1,
    };
    setFields(prev => ({
      ...prev,
      [selectedEntity]: [...(prev[selectedEntity] || []), newField]
    }));
    setShowCreateModal(false);
  };

  const handleUpdateField = (fieldData) => {
    setFields(prev => ({
      ...prev,
      [selectedEntity]: prev[selectedEntity].map(f => 
        f.id === editingField.id ? { ...f, ...fieldData } : f
      )
    }));
    setEditingField(null);
  };

  const handleDeleteField = (fieldId) => {
    if (!confirm('Are you sure you want to delete this field?')) return;
    setFields(prev => ({
      ...prev,
      [selectedEntity]: prev[selectedEntity].filter(f => f.id !== fieldId)
    }));
  };

  const handleToggleActive = (fieldId) => {
    setFields(prev => ({
      ...prev,
      [selectedEntity]: prev[selectedEntity].map(f => 
        f.id === fieldId ? { ...f, active: !f.active } : f
      )
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Custom Fields</h1>
          <p className="text-gray-400 mt-1">Add custom fields to entities</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Field
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Entity List */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-4">Entities</h3>
          <div className="space-y-2">
            {entities.map(entity => {
              const Icon = entity.icon;
              const isSelected = selectedEntity === entity.value;
              const fieldCount = (fields[entity.value] || []).length;
              
              return (
                <button
                  key={entity.value}
                  onClick={() => setSelectedEntity(entity.value)}
                  className={clsx(
                    'w-full flex items-center justify-between p-3 rounded-lg transition-colors',
                    isSelected
                      ? 'bg-emerald-500/20 border border-emerald-500/30'
                      : 'bg-gray-800 hover:bg-gray-700'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={clsx('w-5 h-5', isSelected ? 'text-emerald-400' : 'text-gray-400')} />
                    <span className={clsx('font-medium', isSelected ? 'text-white' : 'text-gray-300')}>
                      {entity.label}
                    </span>
                  </div>
                  <span className={clsx(
                    'px-2 py-0.5 rounded text-xs',
                    fieldCount > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-500'
                  )}>
                    {fieldCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fields List */}
        <div className="lg:col-span-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">
              Fields for <span className="text-emerald-400 capitalize">{selectedEntity}</span>
            </h3>
            <span className="text-gray-500 text-sm">{currentFields.length} fields</span>
          </div>

          {currentFields.length === 0 ? (
            <div className="text-center py-12">
              <FormInput className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No custom fields for {selectedEntity}</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 text-emerald-400 hover:text-emerald-300"
              >
                Add your first field
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {currentFields.map(field => {
                const FieldIcon = fieldTypes.find(t => t.value === field.type)?.icon || Type;
                const isExpanded = expandedField === field.id;
                
                return (
                  <div
                    key={field.id}
                    className={clsx(
                      'border rounded-lg transition-colors',
                      field.active ? 'bg-gray-800 border-gray-700' : 'bg-gray-800/50 border-gray-800'
                    )}
                  >
                    <div className="flex items-center gap-4 p-4">
                      <GripVertical className="w-5 h-5 text-gray-600 cursor-move" />
                      
                      <div className={clsx(
                        'p-2 rounded-lg',
                        field.active ? 'bg-emerald-500/10' : 'bg-gray-700'
                      )}>
                        <FieldIcon className={clsx(
                          'w-4 h-4',
                          field.active ? 'text-emerald-400' : 'text-gray-500'
                        )} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={clsx(
                            'font-medium',
                            field.active ? 'text-white' : 'text-gray-500'
                          )}>
                            {field.name}
                          </span>
                          {field.required && (
                            <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                              Required
                            </span>
                          )}
                          {!field.active && (
                            <span className="px-1.5 py-0.5 bg-gray-700 text-gray-500 text-xs rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <code className="text-sm text-gray-500 font-mono">{field.key}</code>
                      </div>

                      <span className="text-sm text-gray-400 capitalize">{field.type}</span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleActive(field.id)}
                          className={clsx(
                            'p-2 rounded-lg transition-colors',
                            field.active 
                              ? 'text-emerald-400 hover:bg-emerald-500/10' 
                              : 'text-gray-500 hover:bg-gray-700'
                          )}
                        >
                          <ToggleLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingField(field)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setExpandedField(isExpanded ? null : field.id)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteField(field.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-700 pt-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Type:</span>
                            <span className="ml-2 text-white capitalize">{field.type}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Required:</span>
                            <span className="ml-2 text-white">{field.required ? 'Yes' : 'No'}</span>
                          </div>
                          {field.options && (
                            <div className="col-span-2">
                              <span className="text-gray-500">Options:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {field.options.map((opt, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">
                                    {opt}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Field Modal */}
      {(showCreateModal || editingField) && (
        <FieldModal
          field={editingField}
          onClose={() => { setShowCreateModal(false); setEditingField(null); }}
          onSave={editingField ? handleUpdateField : handleCreateField}
        />
      )}
    </div>
  );
};

// Field Modal Component
const FieldModal = ({ field, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: field?.name || '',
    type: field?.type || 'text',
    required: field?.required || false,
    active: field?.active ?? true,
    placeholder: field?.placeholder || '',
    helpText: field?.helpText || '',
    options: field?.options || [],
    validation: field?.validation || {},
  });

  const [newOption, setNewOption] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const addOption = () => {
    if (newOption.trim()) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, newOption.trim()]
      }));
      setNewOption('');
    }
  };

  const removeOption = (index) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const showOptions = ['select', 'multiselect'].includes(formData.type);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-gray-900 rounded-xl shadow-2xl border border-gray-700">
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">
              {field ? 'Edit Field' : 'Create Custom Field'}
            </h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Field Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Insurance ID"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Field Type</label>
              <div className="grid grid-cols-3 gap-2">
                {fieldTypes.map(type => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                      className={clsx(
                        'flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors',
                        formData.type === type.value
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {showOptions && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Options</label>
                <div className="space-y-2">
                  {formData.options.map((opt, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="flex-1 px-3 py-2 bg-gray-800 rounded-lg text-white">{opt}</span>
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="p-2 text-gray-400 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      placeholder="Add option..."
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                    />
                    <button
                      type="button"
                      onClick={addOption}
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Placeholder</label>
              <input
                type="text"
                value={formData.placeholder}
                onChange={(e) => setFormData(prev => ({ ...prev, placeholder: e.target.value }))}
                placeholder="Enter placeholder text..."
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Help Text</label>
              <input
                type="text"
                value={formData.helpText}
                onChange={(e) => setFormData(prev => ({ ...prev, helpText: e.target.value }))}
                placeholder="Additional instructions..."
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.required}
                  onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-gray-300">Required field</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-gray-300">Active</span>
              </label>
            </div>

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
                {field ? 'Update' : 'Create'} Field
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomFieldsList;
