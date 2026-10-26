import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  MapPin, 
  Phone, 
  Clock,
  MoreHorizontal,
  Building2,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import clsx from 'clsx';
import { useToast } from '../../../hooks/useToast';
import { useTenant } from '../../contexts/TenantContext';

const BranchList = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const [searchTerm, setSearchTerm] = useState('');
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBranches = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('branches')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name_en', { ascending: true });
      
      if (fetchError) throw fetchError;
      setBranches(data || []);
    } catch (err) {
      console.error('Error fetching branches:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const filteredBranches = branches.filter(branch => 
    branch.name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.name_ar?.includes(searchTerm) ||
    branch.address_en?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this branch?')) {
      try {
        const { error } = await supabase.from('branches').delete().eq('id', id).eq('tenant_id', tenantId);
        if (error) throw error;
        fetchBranches();
      } catch (err) {
        console.error('Error deleting branch:', err);
        toast.error('Failed to delete branch');
      }
    }
  };

  const formatWorkHours = (workHours) => {
    if (!workHours) return 'Not set';
    const sunday = workHours.sunday;
    if (!sunday) return 'Closed';
    return `${sunday.start} - ${sunday.end}`;
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
            <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
            <p className="text-gray-500 mt-1">Manage your clinic locations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchBranches}
            disabled={isLoading}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={clsx('w-4 h-4 text-gray-500', isLoading && 'animate-spin')} />
          </button>
          <Link 
            to="/branches/create"
            className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Branch
          </Link>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 max-w-md">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search branches..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-sm flex-1"
          />
        </div>
      </div>

      {/* Branches Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No branches found</h3>
          <p className="text-gray-500 mb-4">Get started by adding your first branch.</p>
          <Link 
            to="/branches/create"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Branch
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBranches.map((branch) => (
            <div 
              key={branch.id} 
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      branch.is_active ? 'bg-primary-100' : 'bg-gray-100'
                    )}>
                      <Building2 className={clsx(
                        'w-6 h-6',
                        branch.is_active ? 'text-primary-600' : 'text-gray-400'
                      )} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{branch.name_en}</h3>
                      <p className="text-sm text-gray-500">{branch.name_ar}</p>
                    </div>
                  </div>
                  <span className={clsx(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    branch.is_active 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-500'
                  )}>
                    {branch.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  {branch.address_en && (
                    <div className="flex items-start gap-2 text-gray-600">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{branch.address_en}</span>
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span>{branch.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>{formatWorkHours(branch.work_hours)}</span>
                  </div>
                </div>
              </div>

              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
                <Link
                  to={`/branches/edit/${branch.id}`}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit className="w-4 h-4 text-gray-500" />
                </Link>
                <button
                  onClick={() => handleDelete(branch.id)}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BranchList;
