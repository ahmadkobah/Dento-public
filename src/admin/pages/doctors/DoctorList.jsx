import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Stethoscope,
  Mail,
  Phone,
  Building2,
  Star,
  Award,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';

// Default avatar URLs
const defaultAvatars = {
  male: 'https://api.dicebear.com/9.x/micah/svg?seed=Avery',
  female: 'https://api.dicebear.com/9.x/micah/svg?seed=Amaya',
};

const DoctorList = () => {
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const [searchTerm, setSearchTerm] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [branches, setBranches] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDoctors = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Fetch branches first for lookup
      const { data: branchesData } = await supabase
        .from('branches')
        .select('id, name_en')
        .eq('tenant_id', tenantId);
      
      const branchMap = {};
      (branchesData || []).forEach(b => { branchMap[b.id] = b.name_en; });
      setBranches(branchMap);

      // Fetch doctors
      const { data, error: fetchError } = await supabase
        .from('doctors')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_order', { ascending: true })
        .order('name_en', { ascending: true });
      
      if (fetchError) throw fetchError;
      setDoctors(data || []);
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [tenantId]);

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this doctor?')) {
      try {
        const { error } = await supabase.from('doctors').delete().eq('tenant_id', tenantId).eq('id', id);
        if (!error) {
          fetchDoctors();
        }
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  const filteredDoctors = doctors.filter(doctor => 
    doctor.name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.name_ar?.includes(searchTerm) ||
    doctor.title_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specializations?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
            <h1 className="text-2xl font-bold text-gray-900">Doctors</h1>
            <p className="text-gray-500 mt-1">Manage your medical staff</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDoctors}
            disabled={isLoading}
            className="border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link 
            to="/doctors/create"
            className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Doctor
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading doctors</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 max-w-md">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search doctors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-sm flex-1"
          />
        </div>
      </div>

      {/* Doctors Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Stethoscope className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No doctors found</h3>
          <p className="text-gray-500 mb-4">Get started by adding your first doctor.</p>
          <Link 
            to="/doctors/create"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Doctor
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doctor) => (
            <div 
              key={doctor.id} 
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img 
                      src={doctor.photo_url || defaultAvatars[doctor.gender] || defaultAvatars.male} 
                      alt={doctor.name_en}
                      className="w-14 h-14 rounded-full object-cover bg-gray-100"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">{doctor.name_en}</h3>
                      <p className="text-sm text-gray-500">{doctor.name_ar}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doctor.is_featured && (
                      <span className="p-1 bg-yellow-100 text-yellow-600 rounded-full" title="Featured">
                        <Star className="w-3 h-3 fill-current" />
                      </span>
                    )}
                    <span className={clsx(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      doctor.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-500'
                    )}>
                      {doctor.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {doctor.title_en && (
                  <p className="text-sm text-primary-600 font-medium mb-2">{doctor.title_en}</p>
                )}

                {doctor.specializations?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {doctor.specializations.slice(0, 2).map((spec, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        <Award className="w-3 h-3" />
                        {spec}
                      </span>
                    ))}
                    {doctor.specializations.length > 2 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                        +{doctor.specializations.length - 2} more
                      </span>
                    )}
                  </div>
                )}

                {doctor.experience_years && (
                  <p className="text-xs text-gray-500 mb-3">{doctor.experience_years} years experience</p>
                )}

                <div className="space-y-2 text-sm">
                  {doctor.branch_id && branches[doctor.branch_id] && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building2 className="w-4 h-4 flex-shrink-0" />
                      <span>{branches[doctor.branch_id]}</span>
                    </div>
                  )}
                  {doctor.consultation_fee && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="text-xs font-medium">Fee:</span>
                      <span>AED {doctor.consultation_fee}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
                <Link
                  to={`/doctors/edit/${doctor.id}`}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit className="w-4 h-4 text-gray-500" />
                </Link>
                <button
                  onClick={() => handleDelete(doctor.id)}
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

export default DoctorList;
