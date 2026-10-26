import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Shield, Building2, Plus, Search, Edit, Trash2, 
  RefreshCw, Phone, Mail, FileText
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';
import { useTenant } from '../../contexts/TenantContext';

const InsuranceCompanyList = () => {
  const navigate = useNavigate();
  const { tenantId } = useTenant();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);

  const loadCompanies = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('insurance_companies')
        .select('*')
        .eq('is_active', true)
        .order('name');

      const { data, error } = await query;

      if (error) throw error;

      // Filter by search
      let filtered = data || [];
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        filtered = filtered.filter(c =>
          c.name?.toLowerCase().includes(search) ||
          c.code?.toLowerCase().includes(search)
        );
      }

      setCompanies(filtered);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, tenantId]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this insurance company?')) return;

    try {
      const { error } = await supabase
        .from('insurance_companies')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      loadCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Insurance Companies</h1>
            <p className="text-gray-500 mt-1">Manage insurance providers</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadCompanies}
            disabled={loading}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/insurance/claims"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            View Claims
          </Link>
          <button
            onClick={() => {
              setEditingCompany(null);
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Add Company
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search companies..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Companies Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No insurance companies</h3>
          <p className="text-gray-500 mt-1">Add your first insurance company to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map(company => (
            <div key={company.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {company.logo_url ? (
                    <img 
                      src={company.logo_url} 
                      alt="" 
                      className="w-12 h-12 rounded-lg object-contain border"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{company.name}</h3>
                    {company.code && (
                      <p className="text-sm text-gray-500">Code: {company.code}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingCompany(company);
                      setShowAddModal(true);
                    }}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(company.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                {company.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{company.phone}</span>
                  </div>
                )}
                {company.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{company.email}</span>
                  </div>
                )}
                {company.coverage_percentage && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span>Coverage: {company.coverage_percentage}%</span>
                  </div>
                )}
              </div>

              {company.notes && (
                <p className="mt-3 text-sm text-gray-500 border-t pt-3">{company.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <InsuranceCompanyModal
          company={editingCompany}
          onClose={() => {
            setShowAddModal(false);
            setEditingCompany(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingCompany(null);
            loadCompanies();
          }}
        />
      )}
    </div>
  );
};

// Add/Edit Modal Component
const InsuranceCompanyModal = ({ company, onClose, onSuccess }) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: company?.name || '',
    code: company?.code || '',
    phone: company?.phone || '',
    email: company?.email || '',
    address: company?.address || '',
    coverage_percentage: company?.coverage_percentage || '',
    network_type: company?.network_type || 'standard',
    claim_email: company?.claim_email || '',
    notes: company?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        code: formData.code || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        coverage_percentage: formData.coverage_percentage ? parseInt(formData.coverage_percentage) : null,
        network_type: formData.network_type,
        claim_email: formData.claim_email || null,
        notes: formData.notes || null,
        is_active: true,
      };

      if (company?.id) {
        const { error } = await supabase
          .from('insurance_companies')
          .update(payload)
          .eq('id', company.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('insurance_companies')
          .insert(payload);
        if (error) throw error;
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving company:', error);
      toast.error('Error saving insurance company');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {company ? 'Edit Insurance Company' : 'Add Insurance Company'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder="e.g., INS-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coverage %</label>
              <input
                type="number"
                value={formData.coverage_percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, coverage_percentage: e.target.value }))}
                min="0"
                max="100"
                placeholder="e.g., 80"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Network Type</label>
              <select
                value={formData.network_type}
                onChange={(e) => setFormData(prev => ({ ...prev, network_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="vip">VIP</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Claims Email</label>
              <input
                type="email"
                value={formData.claim_email}
                onChange={(e) => setFormData(prev => ({ ...prev, claim_email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.name || saving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : (company ? 'Update' : 'Add Company')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InsuranceCompanyList;
