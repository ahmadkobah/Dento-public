import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../../contexts/UnifiedTenantContext';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Calendar,
  Clock,
  User,
  Stethoscope,
  Filter,
  ChevronDown,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import clsx from 'clsx';
import { useToast } from '../../../hooks/useToast';

const statusColors = {
  booked: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  no_show: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const statusLabels = {
  booked: 'Booked',
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  no_show: 'No Show',
  cancelled: 'Cancelled',
};

const AppointmentList = () => {
  const toast = useToast();
  const { tenantId } = useTenant();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState({});
  const [doctors, setDoctors] = useState({});
  const [branches, setBranches] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAppointments = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Fetch appointments
      const { data: appointmentsData, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('datetime_start', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      // Fetch related data
      const patientIds = [...new Set(appointmentsData.map(a => a.patient_id).filter(Boolean))];
      const doctorIds = [...new Set(appointmentsData.map(a => a.doctor_id).filter(Boolean))];
      const branchIds = [...new Set(appointmentsData.map(a => a.branch_id).filter(Boolean))];

      // Fetch patients
      if (patientIds.length > 0) {
        const { data: patientsData } = await supabase
          .from('patients')
          .select('id, name, phone')
          .eq('tenant_id', tenantId)
          .in('id', patientIds);
        const patientMap = {};
        (patientsData || []).forEach(p => { patientMap[p.id] = p; });
        setPatients(patientMap);
      }

      // Fetch doctors
      if (doctorIds.length > 0) {
        const { data: doctorsData } = await supabase
          .from('doctors')
          .select('id, name_en, name_ar')
          .eq('tenant_id', tenantId)
          .in('id', doctorIds);
        const doctorMap = {};
        (doctorsData || []).forEach(d => { doctorMap[d.id] = d; });
        setDoctors(doctorMap);
      }

      // Fetch branches
      if (branchIds.length > 0) {
        const { data: branchesData } = await supabase
          .from('branches')
          .select('id, name_en')
          .eq('tenant_id', tenantId)
          .in('id', branchIds);
        const branchMap = {};
        (branchesData || []).forEach(b => { branchMap[b.id] = b; });
        setBranches(branchMap);
      }

      setAppointments(appointmentsData || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const filteredAppointments = appointments.filter(apt => {
    const patient = patients[apt.patient_id];
    const doctor = doctors[apt.doctor_id];
    const patientName = patient?.name?.toLowerCase() || '';
    const matchesSearch = 
      patientName.includes(searchTerm.toLowerCase()) ||
      doctor?.name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient?.phone?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this appointment?')) {
      try {
        const { error } = await supabase.from('appointments').delete().eq('id', id).eq('tenant_id', tenantId);
        if (error) throw error;
        fetchAppointments();
      } catch (err) {
        console.error('Error deleting appointment:', err);
        toast.error('Failed to delete appointment');
      }
    }
  };

  const getDateLabel = (dateStr) => {
    if (!dateStr) return 'No date';
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d, yyyy');
  };

  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
            <p className="text-gray-500 mt-1">Manage patient appointments</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAppointments}
            disabled={isLoading}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={clsx('w-4 h-4 text-gray-500', isLoading && 'animate-spin')} />
          </button>
          <Link 
            to="/appointments/create"
            className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Appointment
          </Link>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 flex-1">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by patient or doctor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm flex-1"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Statuses</option>
              <option value="booked">Booked</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="no_show">No Show</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appointments Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
          <p className="text-gray-500 mb-4">Schedule a new appointment to get started.</p>
          <Link 
            to="/appointments/create"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Appointment
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date & Time</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Patient</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Doctor</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Branch</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAppointments.map((appointment) => {
                const appointmentDate = appointment.datetime_start ? new Date(appointment.datetime_start) : new Date();
                const appointmentEnd = appointment.datetime_end ? new Date(appointment.datetime_end) : null;
                const isPastAppointment = isPast(appointmentDate) && appointment.status === 'booked';
                
                return (
                  <tr 
                    key={appointment.id} 
                    className={clsx(
                      'hover:bg-gray-50 transition-colors',
                      isPastAppointment && 'bg-red-50'
                    )}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className={clsx(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          isToday(appointmentDate) ? 'bg-primary-100' : 'bg-gray-100'
                        )}>
                          <Calendar className={clsx(
                            'w-5 h-5',
                            isToday(appointmentDate) ? 'text-primary-600' : 'text-gray-400'
                          )} />
                        </div>
                        <div>
                          <p className={clsx(
                            'font-medium',
                            isToday(appointmentDate) ? 'text-primary-600' : 'text-gray-900'
                          )}>
                            {getDateLabel(appointment.datetime_start)}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(appointmentDate, 'HH:mm')}
                            {appointmentEnd && (
                              <> - {format(appointmentEnd, 'HH:mm')}</>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {patients[appointment.patient_id]?.name || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {patients[appointment.patient_id]?.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">
                          {doctors[appointment.doctor_id]?.name_en || 'Unassigned'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-700">
                        {branches[appointment.branch_id]?.name_en || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={clsx(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        statusColors[appointment.status] || statusColors.pending
                      )}>
                        {statusLabels[appointment.status] || appointment.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/appointments/edit/${appointment.id}`}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-gray-500" />
                        </Link>
                        <button
                          onClick={() => handleDelete(appointment.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AppointmentList;
