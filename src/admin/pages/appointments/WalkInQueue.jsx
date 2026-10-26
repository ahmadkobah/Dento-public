import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  UserPlus,
  Bell,
  CheckCircle,
  XCircle,
  Phone,
  AlertTriangle,
  Search,
  RefreshCw,
  Timer,
  Volume2,
  Calendar,
  CalendarCheck,
  ArrowRight,
  Armchair,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../../contexts/UnifiedTenantContext';
import { escapeSearchTerm } from '../../../utils/validation';
import { useToast } from '../../../hooks/useToast';

// Priority colors and labels
const PRIORITY_CONFIG = {
  low: { color: 'bg-gray-100 text-gray-700', label: 'Low', icon: '🔵' },
  normal: { color: 'bg-blue-100 text-blue-700', label: 'Normal', icon: '🟢' },
  high: { color: 'bg-orange-100 text-orange-700', label: 'High', icon: '🟠' },
  emergency: { color: 'bg-red-100 text-red-700', label: 'Emergency', icon: '🔴' }
};

// Status colors and labels
const STATUS_CONFIG = {
  waiting: { color: 'bg-yellow-100 text-yellow-700', label: 'Waiting' },
  called: { color: 'bg-purple-100 text-purple-700', label: 'Called' },
  in_progress: { color: 'bg-blue-100 text-blue-700', label: 'In Progress' },
  completed: { color: 'bg-green-100 text-green-700', label: 'Completed' },
  cancelled: { color: 'bg-gray-100 text-gray-700', label: 'Cancelled' },
  no_show: { color: 'bg-red-100 text-red-700', label: 'No Show' }
};

// Appointment status colors
const APPOINTMENT_STATUS_CONFIG = {
  pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
  booked: { color: 'bg-yellow-100 text-yellow-700', label: 'Booked' },
  confirmed: { color: 'bg-blue-100 text-blue-700', label: 'Confirmed' },
  arrived: { color: 'bg-green-100 text-green-700', label: 'Arrived' },
  in_progress: { color: 'bg-purple-100 text-purple-700', label: 'In Progress' },
  completed: { color: 'bg-green-100 text-green-700', label: 'Completed' },
  cancelled: { color: 'bg-gray-100 text-gray-700', label: 'Cancelled' },
  no_show: { color: 'bg-red-100 text-red-700', label: 'No Show' }
};

const WalkInQueue = () => {
  const toast = useToast();
  const { tenantId } = useTenant();
  const [queue, setQueue] = useState([]);
  const [scheduledAppointments, setScheduledAppointments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [chairs, setChairs] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // State for assignment modal when marking appointment as arrived
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [appointmentToAssign, setAppointmentToAssign] = useState(null);
  const [assignmentData, setAssignmentData] = useState({
    doctor_id: '',
    branch_id: '',
    chair_id: ''
  });
  const [stats, setStats] = useState({ waiting: 0, called: 0, in_progress: 0, completed: 0, scheduled: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'walkin', 'scheduled'

  // Form state for adding to queue
  const [newEntry, setNewEntry] = useState({
    patient_name: '',
    phone: '',
    reason: '',
    priority: 'normal',
    branch_id: '',
    patient_id: null
  });

  // Patient search for linking
  const [patientSearch, setPatientSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [existingAppointments, setExistingAppointments] = useState([]);

  // Fetch queue data
  const fetchQueue = useCallback(async () => {
    if (!tenantId) return;
    try {
      // Fetch walk-in queue
      let query = supabase
        .from('walk_in_queue')
        .select(`
          *,
          patients (id, first_name, last_name, phone),
          doctors (id, name_en, name_ar),
          branches (id, name_en)
        `)
        .gte('check_in_time', new Date().toISOString().split('T')[0])
        .order('queue_number', { ascending: true });

      if (selectedBranch !== 'all') {
        query = query.eq('branch_id', selectedBranch);
      }

      const { data, error } = await query;
      if (error) throw error;

      setQueue(data || []);

      // Fetch today's scheduled appointments
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      
      let appointmentQuery = supabase
        .from('appointments')
        .select(`
          *,
          patients (id, name, phone),
          doctors (id, name_en, name_ar),
          branches (id, name_en)
        `)
        .eq('tenant_id', tenantId)
        .gte('datetime_start', todayStart.toISOString())
        .lte('datetime_start', todayEnd.toISOString())
        .in('status', ['pending', 'confirmed', 'booked', 'arrived', 'in_progress'])
        .order('datetime_start', { ascending: true });

      if (selectedBranch !== 'all') {
        appointmentQuery = appointmentQuery.eq('branch_id', selectedBranch);
      }

      const { data: appointments, error: appointmentError } = await appointmentQuery;
      if (appointmentError) throw appointmentError;

      setScheduledAppointments(appointments || []);

      // Calculate stats
      const newStats = { waiting: 0, called: 0, in_progress: 0, completed: 0, cancelled: 0, scheduled: appointments?.length || 0 };
      data?.forEach(item => {
        if (newStats[item.status] !== undefined) newStats[item.status]++;
      });
      setStats(newStats);
    } catch (err) {
      console.error('Error fetching queue:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, tenantId]);

  // Fetch branches and doctors
  useEffect(() => {
    if (!tenantId) return;
    const fetchData = async () => {
      const [branchRes, doctorRes, chairRes] = await Promise.all([
        supabase.from('branches').select('id, name_en').eq('tenant_id', tenantId).eq('is_active', true),
        supabase.from('doctors').select('id, name_en, name_ar').eq('tenant_id', tenantId).eq('is_active', true),
        supabase.from('chairs').select('id, branch_id, chair_number, name_en, chair_type').eq('is_active', true).order('chair_number')
      ]);
      setBranches(branchRes.data || []);
      setDoctors(doctorRes.data || []);
      setChairs(chairRes.data || []);
      
      if (branchRes.data?.length > 0 && !newEntry.branch_id) {
        setNewEntry(prev => ({ ...prev, branch_id: branchRes.data[0].id }));
      }
    };
    fetchData();
  }, [tenantId]);

  useEffect(() => {
    fetchQueue();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  // Search patients
  useEffect(() => {
    if (!patientSearch || patientSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const safeSearch = escapeSearchTerm(patientSearch);
      const { data } = await supabase
        .from('patients')
        .select('id, first_name, last_name, phone')
        .eq('tenant_id', tenantId)
        .or(`first_name.ilike.%${safeSearch}%,last_name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`)
        .limit(5);
      setSearchResults(data || []);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearch]);

  // Check for existing appointments when patient is selected
  const checkExistingAppointments = async (patientId) => {
    if (!patientId) {
      setExistingAppointments([]);
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const { data } = await supabase
      .from('appointments')
      .select(`
        *,
        doctors (id, name_en),
        branches (id, name_en)
      `)
      .eq('tenant_id', tenantId)
      .eq('patient_id', patientId)
      .gte('datetime_start', todayStart.toISOString())
      .lte('datetime_start', todayEnd.toISOString())
      .in('status', ['pending', 'booked', 'confirmed'])
      .order('datetime_start');

    setExistingAppointments(data || []);
  };

  // Mark appointment as arrived
  const markAppointmentArrived = async (appointmentId, forceUpdate = false) => {
    // Find the appointment
    const appointment = scheduledAppointments.find(a => a.id === appointmentId);
    
    // Check if doctor, branch, or chair is missing
    if (!forceUpdate && appointment && (!appointment.doctor_id || !appointment.branch_id || !appointment.chair_id)) {
      // Show assignment modal
      setAppointmentToAssign(appointment);
      setAssignmentData({
        doctor_id: appointment.doctor_id || '',
        branch_id: appointment.branch_id || '',
        chair_id: appointment.chair_id || ''
      });
      // Load chairs for the branch if one is selected
      if (appointment.branch_id) {
        loadChairsForAssignment(appointment.branch_id);
      }
      setShowAssignmentModal(true);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'arrived',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      fetchQueue();
    } catch (err) {
      console.error('Error marking appointment arrived:', err);
    }
  };

  // Load chairs for assignment modal
  const loadChairsForAssignment = async (branchId) => {
    if (!branchId) return;
    const { data, error } = await supabase
      .from('chairs')
      .select('*')
      .eq('branch_id', branchId)
      .eq('is_active', true);
    if (!error && data) {
      // Update chairs state
      setChairs(prevChairs => {
        const otherChairs = prevChairs.filter(c => c.branch_id !== branchId);
        return [...otherChairs, ...data];
      });
    }
  };

  // Handle assignment modal submission
  const handleAssignmentSubmit = async () => {
    if (!appointmentToAssign) return;
    
    try {
      // Update appointment with assignments
      const updateData = {
        status: 'arrived',
        updated_at: new Date().toISOString()
      };
      
      if (assignmentData.doctor_id) updateData.doctor_id = assignmentData.doctor_id;
      if (assignmentData.branch_id) updateData.branch_id = assignmentData.branch_id;
      if (assignmentData.chair_id) updateData.chair_id = assignmentData.chair_id;
      
      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentToAssign.id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      
      setShowAssignmentModal(false);
      setAppointmentToAssign(null);
      setAssignmentData({ doctor_id: '', branch_id: '', chair_id: '' });
      fetchQueue();
    } catch (err) {
      console.error('Error updating appointment with assignments:', err);
      toast.error('Error updating appointment: ' + err.message);
    }
  };

  // Update appointment status
  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error updating appointment status:', error);
        toast.error(`Failed to update status to "${newStatus}": ${error.message}`);
        return;
      }
      fetchQueue();
    } catch (err) {
      console.error('Error updating appointment status:', err);
      toast.error(`Error: ${err.message}`);
    }
  };

  // Add to queue
  const addToQueue = async () => {
    if (!newEntry.patient_name || !newEntry.branch_id) {
      toast.warning('Please enter patient name and select a branch');
      return;
    }

    try {
      // Get next queue number
      const { data: queueNum } = await supabase.rpc('get_next_queue_number', {
        p_branch_id: newEntry.branch_id
      });

      const { error } = await supabase
        .from('walk_in_queue')
        .insert({
          ...newEntry,
          queue_number: queueNum || 1,
          status: 'waiting'
        });

      if (error) throw error;

      setShowAddModal(false);
      setNewEntry({
        patient_name: '',
        phone: '',
        reason: '',
        priority: 'normal',
        branch_id: branches[0]?.id || '',
        patient_id: null
      });
      setPatientSearch('');
      fetchQueue();
    } catch (err) {
      console.error('Error adding to queue:', err);
      toast.error('Failed to add to queue');
    }
  };

  // Update queue status
  const updateStatus = async (id, newStatus) => {
    try {
      const updates = { status: newStatus };
      
      if (newStatus === 'called') {
        updates.called_time = new Date().toISOString();
      } else if (newStatus === 'in_progress') {
        updates.started_time = new Date().toISOString();
      } else if (newStatus === 'completed' || newStatus === 'cancelled' || newStatus === 'no_show') {
        updates.completed_time = new Date().toISOString();
        // Calculate actual wait time
        const entry = queue.find(q => q.id === id);
        if (entry?.check_in_time) {
          updates.actual_wait_minutes = Math.round(
            (new Date() - new Date(entry.check_in_time)) / 60000
          );
        }
      }

      const { error } = await supabase
        .from('walk_in_queue')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      fetchQueue();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Assign doctor
  const assignDoctor = async (queueId, doctorId) => {
    try {
      await supabase
        .from('walk_in_queue')
        .update({ assigned_doctor_id: doctorId })
        .eq('id', queueId);
      fetchQueue();
    } catch (err) {
      console.error('Error assigning doctor:', err);
    }
  };

  // Assign chair
  const assignChair = async (queueId, chairId) => {
    try {
      await supabase
        .from('walk_in_queue')
        .update({ chair_id: chairId || null })
        .eq('id', queueId);
      fetchQueue();
    } catch (err) {
      console.error('Error assigning chair:', err);
    }
  };

  // Get available chairs for a branch
  const getChairsForBranch = (branchId) => {
    return chairs.filter(c => c.branch_id === branchId);
  };

  // Calculate wait time
  const getWaitTime = (checkInTime) => {
    const minutes = Math.round((new Date() - new Date(checkInTime)) / 60000);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  // Filter queue based on search
  const filteredQueue = queue.filter(item => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.patient_name?.toLowerCase().includes(search) ||
      item.phone?.toLowerCase().includes(search) ||
      item.queue_number?.toString().includes(search)
    );
  });

  // Filter scheduled appointments based on search
  const filteredAppointments = scheduledAppointments.filter(item => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const patientName = `${item.patients?.first_name || ''} ${item.patients?.last_name || ''}`.toLowerCase();
    return (
      patientName.includes(search) ||
      item.patients?.phone?.toLowerCase().includes(search)
    );
  });

  // Separate active and completed
  const activeQueue = filteredQueue.filter(q => ['waiting', 'called', 'in_progress'].includes(q.status));
  const completedQueue = filteredQueue.filter(q => ['completed', 'cancelled', 'no_show'].includes(q.status));

  // Active scheduled appointments (not yet completed)
  const activeAppointments = filteredAppointments.filter(a => 
    ['pending', 'confirmed', 'arrived', 'in_progress'].includes(a.status)
  );

  // Format time for display - handles both datetime_start (ISO) and time strings
  const formatTime = (timeInput) => {
    if (!timeInput) return '';
    try {
      // If it's an ISO datetime string, parse it
      if (timeInput.includes('T') || timeInput.includes('-')) {
        const date = new Date(timeInput);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHour = hours % 12 || 12;
        return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      }
      // Otherwise treat as HH:mm string
      const [hours, minutes] = timeInput.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return '';
    }
  };

  // Check if appointment time has passed - handles datetime_start
  const isAppointmentDue = (timeInput) => {
    if (!timeInput) return false;
    try {
      const now = new Date();
      // If it's an ISO datetime string
      if (timeInput.includes('T') || timeInput.includes('-')) {
        const appointmentDate = new Date(timeInput);
        return now >= appointmentDate;
      }
      // Otherwise treat as HH:mm string
      const [hours, minutes] = timeInput.split(':');
      const appointmentDate = new Date();
      appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0);
      return now >= appointmentDate;
    } catch {
      return false;
    }
  };

  const navigate = useNavigate();

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
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-7 h-7 text-primary-500" />
              Walk-in Queue
            </h1>
            <p className="text-gray-500 mt-1">Manage same-day walk-in patients</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchQueue}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Walk-in
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.scheduled}</p>
              <p className="text-sm text-gray-500">Scheduled</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.waiting}</p>
              <p className="text-sm text-gray-500">Waiting</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Bell className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.called}</p>
              <p className="text-sm text-gray-500">Called</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Timer className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.in_progress}</p>
              <p className="text-sm text-gray-500">In Progress</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Users className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{queue.length + scheduledAppointments.length}</p>
              <p className="text-sm text-gray-500">Total Today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or queue number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'all' 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                activeTab === 'scheduled' 
                  ? 'bg-indigo-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Scheduled ({activeAppointments.length})
            </button>
            <button
              onClick={() => setActiveTab('walkin')}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                activeTab === 'walkin' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Walk-ins ({activeQueue.length})
            </button>
          </div>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Branches</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name_en}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Scheduled Appointments Section */}
      {(activeTab === 'all' || activeTab === 'scheduled') && activeAppointments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-indigo-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-indigo-100 bg-indigo-50">
            <h2 className="text-lg font-semibold text-indigo-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Today's Scheduled Appointments
            </h2>
          </div>
          
          <div className="divide-y divide-gray-100">
            {activeAppointments.map(appointment => {
              const isDue = isAppointmentDue(appointment.datetime_start);
              return (
                <div 
                  key={appointment.id} 
                  className={`p-4 hover:bg-gray-50 ${isDue ? 'bg-yellow-50' : ''}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Time */}
                    <div className="flex items-center gap-4">
                      <div className={`w-20 h-12 rounded-lg flex flex-col items-center justify-center ${
                        isDue ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        <span className="text-sm font-bold">{formatTime(appointment.datetime_start)}</span>
                        {isDue && <span className="text-xs">DUE</span>}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 flex items-center gap-2">
                          {appointment.patients?.name || `${appointment.patients?.first_name || ''} ${appointment.patients?.last_name || ''}`}
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">Scheduled</span>
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          {appointment.patients?.phone && (
                            <>
                              <Phone className="w-3 h-3" />
                              {appointment.patients.phone}
                            </>
                          )}
                          {appointment.service_type && (
                            <span className="ml-2">• {appointment.service_type}</span>
                          )}
                        </div>
                        {appointment.doctors && (
                          <p className="text-xs text-gray-500 mt-1">
                            Dr. {appointment.doctors.name_en}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        APPOINTMENT_STATUS_CONFIG[appointment.status]?.color || 'bg-gray-100 text-gray-700'
                      }`}>
                        {APPOINTMENT_STATUS_CONFIG[appointment.status]?.label || appointment.status}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {(appointment.status === 'pending' || appointment.status === 'booked') && (
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-1 text-sm"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Confirm
                        </button>
                      )}
                      {(appointment.status === 'pending' || appointment.status === 'booked' || appointment.status === 'confirmed') && (
                        <button
                          onClick={() => markAppointmentArrived(appointment.id)}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1 text-sm"
                        >
                          <CalendarCheck className="w-4 h-4" />
                          Arrived
                        </button>
                      )}
                      {appointment.status === 'arrived' && (
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'in_progress')}
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center gap-1 text-sm"
                        >
                          <Timer className="w-4 h-4" />
                          Start
                        </button>
                      )}
                      {appointment.status === 'in_progress' && (
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1 text-sm"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Complete
                        </button>
                      )}
                      {['pending', 'booked', 'confirmed'].includes(appointment.status) && (
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'no_show')}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1 text-sm"
                        >
                          <XCircle className="w-4 h-4" />
                          No Show
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Walk-in Queue */}
      {(activeTab === 'all' || activeTab === 'walkin') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              Walk-in Queue
            </h2>
          </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : activeQueue.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No patients in queue</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activeQueue.map(item => (
              <div 
                key={item.id} 
                className={`p-4 hover:bg-gray-50 ${
                  item.priority === 'emergency' ? 'bg-red-50' : 
                  item.priority === 'high' ? 'bg-orange-50' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Queue Number */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xl font-bold">
                      {item.queue_number}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 flex items-center gap-2">
                        {item.patient_name}
                        {item.patient_id && (
                          <span className="text-xs text-primary-600">(Registered)</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {item.phone && (
                          <>
                            <Phone className="w-3 h-3" />
                            {item.phone}
                          </>
                        )}
                      </div>
                      {item.reason && (
                        <p className="text-xs text-gray-500 mt-1">{item.reason}</p>
                      )}
                    </div>
                  </div>

                  {/* Priority & Status */}
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_CONFIG[item.priority]?.color}`}>
                      {PRIORITY_CONFIG[item.priority]?.icon} {PRIORITY_CONFIG[item.priority]?.label}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[item.status]?.color}`}>
                      {STATUS_CONFIG[item.status]?.label}
                    </span>
                  </div>

                  {/* Wait Time */}
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{getWaitTime(item.check_in_time)}</p>
                    <p className="text-xs text-gray-500">Wait Time</p>
                  </div>

                  {/* Doctor */}
                  <div className="w-40">
                    <select
                      value={item.assigned_doctor_id || ''}
                      onChange={(e) => assignDoctor(item.id, e.target.value || null)}
                      className="w-full text-sm px-2 py-1 border border-gray-200 rounded-lg"
                    >
                      <option value="">Assign Doctor</option>
                      {doctors.map(doc => (
                        <option key={doc.id} value={doc.id}>{doc.name_en}</option>
                      ))}
                    </select>
                  </div>

                  {/* Chair */}
                  <div className="w-32">
                    <select
                      value={item.chair_id || ''}
                      onChange={(e) => assignChair(item.id, e.target.value || null)}
                      className="w-full text-sm px-2 py-1 border border-gray-200 rounded-lg"
                    >
                      <option value="">Chair</option>
                      {getChairsForBranch(item.branch_id).map(chair => (
                        <option key={chair.id} value={chair.id}>
                          #{chair.chair_number} {chair.name_en ? `- ${chair.name_en}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {item.status === 'waiting' && (
                      <button
                        onClick={() => updateStatus(item.id, 'called')}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center gap-1 text-sm"
                      >
                        <Volume2 className="w-4 h-4" />
                        Call
                      </button>
                    )}
                    {item.status === 'called' && (
                      <button
                        onClick={() => updateStatus(item.id, 'in_progress')}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-1 text-sm"
                      >
                        <Timer className="w-4 h-4" />
                        Start
                      </button>
                    )}
                    {item.status === 'in_progress' && (
                      <button
                        onClick={() => updateStatus(item.id, 'completed')}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1 text-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Complete
                      </button>
                    )}
                    {['waiting', 'called'].includes(item.status) && (
                      <button
                        onClick={() => updateStatus(item.id, 'no_show')}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1 text-sm"
                      >
                        <XCircle className="w-4 h-4" />
                        No Show
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      )}

      {/* Completed Today */}
      {completedQueue.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Completed Today ({completedQueue.length})</h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {completedQueue.map(item => (
              <div key={item.id} className="p-4 flex items-center justify-between text-sm opacity-75">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-gray-500">#{item.queue_number}</span>
                  <span className="font-medium">{item.patient_name}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${STATUS_CONFIG[item.status]?.color}`}>
                  {STATUS_CONFIG[item.status]?.label}
                </span>
                {item.actual_wait_minutes && (
                  <span className="text-gray-500">{item.actual_wait_minutes}m total</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assignment Modal for Arrived Appointments */}
      {showAssignmentModal && appointmentToAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Assign Before Marking Arrived</h3>
              <button 
                onClick={() => {
                  setShowAssignmentModal(false);
                  setAppointmentToAssign(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <p className="font-medium text-gray-900">
                  {appointmentToAssign.patients?.name || 
                    `${appointmentToAssign.patients?.first_name || ''} ${appointmentToAssign.patients?.last_name || ''}`}
                </p>
                <p className="text-sm text-gray-500">
                  Appointment at {formatTime(appointmentToAssign.datetime_start)}
                  {appointmentToAssign.service_type && ` - ${appointmentToAssign.service_type}`}
                </p>
              </div>
              
              {/* Branch Selection */}
              {!appointmentToAssign.branch_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={assignmentData.branch_id}
                    onChange={(e) => {
                      const branchId = e.target.value;
                      setAssignmentData(prev => ({ ...prev, branch_id: branchId, chair_id: '' }));
                      if (branchId) loadChairsForAssignment(branchId);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Branch</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name_en}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Doctor Selection */}
              {!appointmentToAssign.doctor_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Doctor <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={assignmentData.doctor_id}
                    onChange={(e) => setAssignmentData(prev => ({ ...prev, doctor_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map(doctor => (
                      <option key={doctor.id} value={doctor.id}>{doctor.name_en}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Chair Selection */}
              {!appointmentToAssign.chair_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chair <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={assignmentData.chair_id}
                    onChange={(e) => setAssignmentData(prev => ({ ...prev, chair_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    disabled={!appointmentToAssign.branch_id && !assignmentData.branch_id}
                  >
                    <option value="">Select Chair</option>
                    {getChairsForBranch(appointmentToAssign.branch_id || assignmentData.branch_id).map(chair => (
                      <option key={chair.id} value={chair.id}>
                        {chair.name || `Chair ${chair.chair_number}`}
                      </option>
                    ))}
                  </select>
                  {!appointmentToAssign.branch_id && !assignmentData.branch_id && (
                    <p className="text-xs text-gray-500 mt-1">Select a branch first to see available chairs</p>
                  )}
                </div>
              )}

              {/* Show what's already assigned */}
              <div className="text-sm text-gray-600 space-y-1">
                {appointmentToAssign.branch_id && appointmentToAssign.branches && (
                  <p>✓ Branch: {appointmentToAssign.branches.name_en}</p>
                )}
                {appointmentToAssign.doctor_id && appointmentToAssign.doctors && (
                  <p>✓ Doctor: Dr. {appointmentToAssign.doctors.name_en}</p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAssignmentModal(false);
                  setAppointmentToAssign(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => markAppointmentArrived(appointmentToAssign.id, true)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
              >
                Skip & Mark Arrived
              </button>
              <button
                onClick={handleAssignmentSubmit}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Assign & Mark Arrived
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Walk-in Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Add Walk-in Patient</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Search existing patient */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Existing Patient (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg divide-y">
                    {searchResults.map(patient => (
                      <button
                        key={patient.id}
                        onClick={() => {
                          setNewEntry(prev => ({
                            ...prev,
                            patient_id: patient.id,
                            patient_name: `${patient.first_name} ${patient.last_name}`,
                            phone: patient.phone || ''
                          }));
                          setPatientSearch('');
                          setSearchResults([]);
                          checkExistingAppointments(patient.id);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex justify-between"
                      >
                        <span>{patient.first_name} {patient.last_name}</span>
                        <span className="text-gray-500 text-sm">{patient.phone}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Show existing appointments for selected patient */}
                {existingAppointments.length > 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800 flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      This patient already has {existingAppointments.length} appointment(s) today:
                    </p>
                    {existingAppointments.map(apt => (
                      <div key={apt.id} className="flex items-center justify-between bg-white p-2 rounded mt-2">
                        <div>
                          <span className="text-sm font-medium">{formatTime(apt.datetime_start)}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            Dr. {apt.doctors?.name_en}
                          </span>
                          {apt.service_type && (
                            <span className="text-xs text-gray-500 ml-2">({apt.service_type})</span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            markAppointmentArrived(apt.id);
                            setShowAddModal(false);
                            setExistingAppointments([]);
                          }}
                          className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                        >
                          Mark Arrived
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Patient Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name *</label>
                <input
                  type="text"
                  value={newEntry.patient_name}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, patient_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter patient name"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newEntry.phone}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="+20 123 456 7890"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Visit</label>
                <input
                  type="text"
                  value={newEntry.reason}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Toothache, Cleaning"
                />
              </div>

              {/* Branch & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
                  <select
                    value={newEntry.branch_id}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, branch_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name_en}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newEntry.priority}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setExistingAppointments([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addToQueue}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add to Queue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalkInQueue;
