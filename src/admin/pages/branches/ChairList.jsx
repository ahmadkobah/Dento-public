import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  Armchair, 
  Building2,
  Save,
  X,
  ArrowLeft
} from 'lucide-react';

const chairTypes = [
  { value: 'standard', label: 'Standard' },
  { value: 'pediatric', label: 'Pediatric' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'hygiene', label: 'Hygiene' },
];

const ChairList = () => {
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const [chairs, setChairs] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingChair, setEditingChair] = useState(null);
  const [message, setMessage] = useState(null);
  
  const [formData, setFormData] = useState({
    branch_id: '',
    name_en: '',
    name_ar: '',
    chair_number: '',
    chair_type: 'standard',
    is_active: true,
    notes: '',
  });

  const loadData = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      // Load branches
      const { data: branchesData } = await supabase
        .from('branches')
        .select('id, name_en, name_ar')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name_en');
      
      setBranches(branchesData || []);

      // Load chairs
      let query = supabase
        .from('chairs')
        .select(`
          *,
          branches (name_en, name_ar)
        `)
        .order('branch_id')
        .order('chair_number');

      if (selectedBranch) {
        query = query.eq('branch_id', selectedBranch);
      }

      const { data: chairsData, error } = await query;
      
      if (error) throw error;
      setChairs(chairsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranch, tenantId]);

  const openModal = (chair = null) => {
    if (chair) {
      setEditingChair(chair);
      setFormData({
        branch_id: chair.branch_id,
        name_en: chair.name_en || '',
        name_ar: chair.name_ar || '',
        chair_number: chair.chair_number,
        chair_type: chair.chair_type || 'standard',
        is_active: chair.is_active,
        notes: chair.notes || '',
      });
    } else {
      setEditingChair(null);
      setFormData({
        branch_id: selectedBranch || '',
        name_en: '',
        name_ar: '',
        chair_number: '',
        chair_type: 'standard',
        is_active: true,
        notes: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingChair(null);
    setFormData({
      branch_id: '',
      name_en: '',
      name_ar: '',
      chair_number: '',
      chair_type: 'standard',
      is_active: true,
      notes: '',
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.branch_id || !formData.chair_number) {
      setMessage({ type: 'error', text: 'Branch and chair number are required' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const dataToSave = {
        ...formData,
        chair_number: parseInt(formData.chair_number),
        notes: formData.notes || null,
        name_ar: formData.name_ar || null,
      };

      if (editingChair) {
        const { error } = await supabase
          .from('chairs')
          .update(dataToSave)
          .eq('id', editingChair.id);
        
        if (error) throw error;
        setMessage({ type: 'success', text: 'Chair updated successfully!' });
      } else {
        const { error } = await supabase
          .from('chairs')
          .insert(dataToSave);
        
        if (error) throw error;
        setMessage({ type: 'success', text: 'Chair created successfully!' });
      }

      closeModal();
      loadData();
    } catch (error) {
      console.error('Error saving chair:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save chair' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (chair) => {
    if (!confirm(`Delete ${chair.name_en || `Chair ${chair.chair_number}`}?`)) return;

    try {
      const { error } = await supabase
        .from('chairs')
        .delete()
        .eq('id', chair.id);
      
      if (error) throw error;
      setMessage({ type: 'success', text: 'Chair deleted successfully!' });
      loadData();
    } catch (error) {
      console.error('Error deleting chair:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to delete chair' });
    }
  };

  const getChairTypeColor = (type) => {
    switch (type) {
      case 'pediatric': return 'bg-pink-100 text-pink-700';
      case 'surgery': return 'bg-red-100 text-red-700';
      case 'hygiene': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chairs & Rooms</h1>
            <p className="text-gray-500 mt-1">Manage dental chairs and treatment rooms</p>
          </div>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Chair
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Branch Filter */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filter by Branch:</span>
        </div>
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">All Branches</option>
          {branches.map(branch => (
            <option key={branch.id} value={branch.id}>
              {branch.name_en}
            </option>
          ))}
        </select>
      </div>

      {/* Chairs Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : chairs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Armchair className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No chairs found</h3>
          <p className="text-gray-500 mb-4">
            {selectedBranch ? 'No chairs in this branch. ' : ''}
            Get started by adding your first dental chair.
          </p>
          <button
            onClick={() => openModal()}
            className="text-primary-500 hover:text-primary-600 font-medium"
          >
            + Add Chair
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chairs.map(chair => (
            <div
              key={chair.id}
              className={`bg-white rounded-xl shadow-sm border p-4 ${
                chair.is_active ? 'border-gray-100' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    chair.is_active ? 'bg-primary-100' : 'bg-gray-100'
                  }`}>
                    <Armchair className={`w-5 h-5 ${
                      chair.is_active ? 'text-primary-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {chair.name_en || `Chair ${chair.chair_number}`}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {chair.branches?.name_en || 'Unknown Branch'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openModal(chair)}
                    className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(chair)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                  #{chair.chair_number}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded ${getChairTypeColor(chair.chair_type)}`}>
                  {chair.chair_type}
                </span>
                {!chair.is_active && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                    Inactive
                  </span>
                )}
              </div>
              
              {chair.notes && (
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">{chair.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingChair ? 'Edit Chair' : 'Add New Chair'}
              </h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch *
                </label>
                <select
                  name="branch_id"
                  value={formData.branch_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select Branch</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name_en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chair Number *
                  </label>
                  <input
                    type="number"
                    name="chair_number"
                    value={formData.chair_number}
                    onChange={handleChange}
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    name="chair_type"
                    value={formData.chair_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {chairTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name (English)
                </label>
                <input
                  type="text"
                  name="name_en"
                  value={formData.name_en}
                  onChange={handleChange}
                  placeholder="e.g., Main Treatment Room"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name (Arabic)
                </label>
                <input
                  type="text"
                  name="name_ar"
                  value={formData.name_ar}
                  onChange={handleChange}
                  placeholder="مثال: غرفة العلاج الرئيسية"
                  dir="rtl"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingChair ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChairList;
