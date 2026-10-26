import { useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useGetIdentity, useLogout } from '@refinedev/core';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Stethoscope, 
  Calendar, 
  CalendarClock,
  Settings, 
  LogOut,
  Menu,
  X,
  ChevronDown,
  Bell,
  Search,
  FileText,
  Package,
  ImageIcon,
  Globe,
  CreditCard,
  Pill,
  FlaskConical,
  UserCog,
  UserCheck,
  Home,
  Receipt,
  ClipboardList,
  Armchair,
  Plane,
  Shield,
  ScanLine,
  Box,
  FileCheck,
  ClipboardPen,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  DollarSign,
  BarChart3,
  Headphones,
  Monitor,
  Eye,
  MessageCircle,
  Paintbrush,
  Inbox,
} from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../contexts/TenantContext';
import { useAdminSupport } from '../hooks/useAdminSupport';
import { useSupportNotifications } from '../../hooks/useSupportNotifications';
import SupportSessionWidget from '../components/SupportSessionWidget';
import SupportHistoryModal from '../components/SupportHistoryModal';
import ScreenShareSession from '../components/ScreenShareSession';
import { MENU_PERMISSIONS } from '../config/rolePermissions';
import { useToast } from '../../hooks/useToast';

const menuItems = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    path: '/',
    // All roles can see dashboard
  },
  {
    name: 'divider',
    label: 'Scheduling',
    requiredModule: 'core-scheduling',
    requiredRoles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'hygienist', 'assistant'],
  },
  {
    name: 'Appointments',
    icon: Calendar,
    path: '/appointments',
    requiredModule: 'core-scheduling',
    requiredRoles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'hygienist', 'assistant'],
  },
  {
    name: 'Walk-in Queue',
    icon: ClipboardList,
    path: '/appointments/walk-in',
    requiredModule: 'core-scheduling',
    requiredRoles: ['developer', 'admin', 'manager', 'receptionist'],
  },
  {
    name: 'Schedule Management',
    icon: CalendarClock,
    path: '/schedules',
    requiredModule: 'core-scheduling',
    requiredRoles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'hygienist', 'assistant'],
  },
  {
    name: 'divider',
    label: 'People',
    requiredModule: 'patient-records',
    requiredRoles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'hygienist', 'assistant'],
  },
  {
    name: 'Patients',
    icon: Users,
    path: '/patients',
    requiredModule: 'patient-records',
    requiredRoles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'hygienist', 'assistant'],
  },
  {
    name: 'Doctors',
    icon: Stethoscope,
    path: '/doctors',
    requiredModule: 'patient-records',
    requiredRoles: ['developer', 'admin', 'manager'], // Only admin/manager can see doctors list
  },
  {
    name: 'divider',
    label: 'Clinical',
    requiredModule: 'dental-charting',
    requiredRoles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'hygienist', 'assistant'],
  },
  {
    name: 'Treatment Plans',
    icon: FileText,
    path: '/treatment-plans',
    requiredModule: 'dental-charting',
    requiredRoles: ['developer', 'admin', 'manager', 'doctor', 'assistant'],
  },
  {
    name: 'Procedure Notes',
    icon: ClipboardPen,
    path: '/procedure-notes',
    requiredModule: 'dental-charting',
    requiredRoles: ['developer', 'admin', 'manager', 'doctor', 'assistant'],
  },
  {
    name: 'Prescriptions',
    icon: Pill,
    path: '/prescriptions',
    requiredModule: 'dental-charting',
    requiredRoles: ['developer', 'admin', 'manager', 'doctor'], // Only doctors can prescribe
  },
  {
    name: 'X-Rays',
    icon: ScanLine,
    path: '/xrays',
    requiredModule: 'dental-charting',
    requiredRoles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'hygienist', 'assistant'],
  },
  {
    name: 'CBCT Scans',
    icon: Box,
    path: '/cbct',
    requiredModule: 'dental-charting',
    requiredRoles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'hygienist', 'assistant'],
  },
  {
    name: 'Lab Orders',
    icon: FlaskConical,
    path: '/lab-orders',
    requiredModule: 'dental-charting',
    requiredRoles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'assistant'],
  },
  {
    name: 'Consent Forms',
    icon: FileCheck,
    path: '/consent-forms',
    requiredModule: 'dental-charting',
    requiredRoles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'assistant'],
  },
  {
    name: 'divider',
    label: 'Finance',
    requiredModule: 'basic-billing',
    requiredRoles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'accountant'],
  },
  {
    name: 'Invoices',
    icon: Receipt,
    path: '/invoices',
    requiredModule: 'basic-billing',
    requiredRoles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'accountant'],
  },
  {
    name: 'Installment Plans',
    icon: CreditCard,
    path: '/installments',
    requiredModule: 'basic-billing',
    requiredRoles: ['developer', 'admin', 'manager', 'receptionist', 'accountant'],
  },
  {
    name: 'Insurance',
    icon: Shield,
    path: '/insurance',
    requiredModule: 'basic-billing',
    requiredRoles: ['developer', 'admin', 'manager', 'receptionist', 'accountant'],
  },
  {
    name: 'Commissions',
    icon: DollarSign,
    path: '/commissions',
    requiredModule: 'basic-billing',
    requiredRoles: ['developer', 'admin', 'manager', 'doctor', 'accountant'],
  },
  {
    name: 'divider',
    label: 'Inventory',
    requiredModule: 'inventory',
    requiredRoles: ['developer', 'admin', 'manager', 'hygienist', 'assistant'],
  },
  {
    name: 'Inventory Items',
    icon: Box,
    path: '/inventory',
    requiredModule: 'inventory',
    requiredRoles: ['developer', 'admin', 'manager', 'hygienist', 'assistant'],
  },
  {
    name: 'Material Usage',
    icon: BarChart3,
    path: '/reports/material-usage',
    requiredModule: 'inventory',
    requiredRoles: ['developer', 'admin', 'manager'],
  },
  {
    name: 'divider',
    label: 'Facilities',
    requiredModule: 'multi-branch',
    requiredRoles: ['developer', 'admin', 'manager'],
  },
  {
    name: 'Branches',
    icon: Building2,
    path: '/branches',
    requiredModule: 'multi-branch',
    requiredRoles: ['developer', 'admin', 'manager'],
  },
  {
    name: 'Chairs',
    icon: Armchair,
    path: '/chairs',
    requiredModule: 'multi-branch',
    requiredRoles: ['developer', 'admin', 'manager'],
  },
  {
    name: 'divider',
    label: 'Staff Management',
    requiredRoles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'accountant', 'hygienist', 'assistant'],
  },
  {
    name: 'Staff Schedule',
    icon: CalendarClock,
    path: '/staff-schedule',
    requiredRoles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'hygienist', 'assistant'],
  },
  {
    name: 'Leave Requests',
    icon: Clock,
    path: '/leave-requests',
    requiredRoles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'accountant', 'hygienist', 'assistant'],
  },
  {
    name: 'Attendance',
    icon: UserCheck,
    path: '/attendance',
    requiredRoles: ['developer', 'admin', 'manager'],
  },
  {
    name: 'divider',
    label: 'Notifications',
    // All roles can manage their notifications
    requiredRoles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'accountant', 'hygienist', 'assistant'],
  },
  {
    name: 'Notifications',
    icon: Bell,
    path: '/notifications',
    requiredRoles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'accountant', 'hygienist', 'assistant'],
  },
  {
    name: 'divider',
    label: 'Settings',
    requiredRoles: ['developer', 'admin', 'manager'], // Only admin/manager see this section
  },
  {
    name: 'Users',
    icon: UserCog,
    path: '/users',
    requiredRoles: ['developer', 'admin', 'manager'], // Manager can view staff
  },
  {
    name: 'Role Permissions',
    icon: Shield,
    path: '/users/roles',
    requiredRoles: ['developer', 'admin'], // ONLY admin and developer can configure roles
  },
  {
    name: 'Site Settings',
    icon: Settings,
    path: '/settings',
    requiredRoles: ['developer', 'admin', 'manager'],
  },
  {
    name: 'My Subscription',
    icon: CreditCard,
    path: '/subscription',
    requiredRoles: ['developer', 'admin', 'manager'],
  },
  {
    name: 'divider',
    label: 'Account',
    // All roles can see their profile
  },
  {
    name: 'My Profile',
    icon: UserCog,
    path: '/profile',
    // All roles can access their own profile
  },
];

const AdminLayout = () => {
  const toast = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportHistoryOpen, setSupportHistoryOpen] = useState(false);
  const [screenShareOpen, setScreenShareOpen] = useState(false);
  const [screenShareSessionId, setScreenShareSessionId] = useState(null);
  const [supportRequest, setSupportRequest] = useState({ type: 'chat', reason: '' });
  const [sendingSupportRequest, setSendingSupportRequest] = useState(false);
  const [supportError, setSupportError] = useState(null);
  
  // Listen for screen share open event from widget
  useEffect(() => {
    const handleOpenScreenShare = (event) => {
      setScreenShareSessionId(event.detail.sessionId);
      setScreenShareOpen(true);
    };
    
    window.addEventListener('open-screen-share', handleOpenScreenShare);
    return () => window.removeEventListener('open-screen-share', handleOpenScreenShare);
  }, []);
  
  const location = useLocation();
  const _navigate = useNavigate();
  
  const { data: identity } = useGetIdentity();
  const { mutate: logout } = useLogout();
  
  // Get active modules for current tenant (must be before useAdminSupport to pass tenantId)
  const { activeModuleSlugs = [], modulesLoading, tenantId, tenantName } = useTenant();
  
  // Admin support session hook - only enabled when support module is active
  const supportEnabled = activeModuleSlugs.includes('support');
  const {
    session: activeSupport,
    messages: supportMessages,
    history: supportHistory,
    sending: sendingMessage,
    loadingHistory: loadingSupportHistory,
    error: supportSessionError,
    sendMessage: sendSupportMessage,
    cancelSession: cancelSupport,
    rateSession: rateSupportSession,
    fetchHistory: fetchSupportHistory,
    setSession: setActiveSupport,
    incomingSession,
    clearIncomingSession,
  } = useAdminSupport(tenantId, supportEnabled);
  
  // Support notifications (toasts and browser notifications)
  useSupportNotifications({
    session: activeSupport,
    messages: supportMessages,
    enableBrowserNotifications: true,
    role: 'admin',
  });

  // Handle incoming developer-initiated sessions
  useEffect(() => {
    if (incomingSession && !activeSupport) {
      // Auto-set incoming session as active if no current session
      setActiveSupport(incomingSession);
      clearIncomingSession();
    }
  }, [incomingSession, activeSupport, setActiveSupport, clearIncomingSession]);
  
  // Get user role from identity
  const userRole = identity?.role || 'receptionist'; // Default to most restricted role
  
  // Debug log for modules
  
  // Filter menu items based on active modules AND user role
  const filteredMenuItems = useMemo(() => {
    // First, filter based on modules and roles
    const filtered = menuItems.filter(item => {
      // Dividers - check if any subsequent items (until next divider) would be visible
      if (item.name === 'divider') {
        // Dividers with role restrictions
        if (item.requiredRoles && item.requiredRoles.length > 0) {
          if (!item.requiredRoles.includes(userRole)) {
            return false;
          }
        }
        // Module check for dividers - if loading, show all dividers
        if (!modulesLoading && item.requiredModule && !activeModuleSlugs.includes(item.requiredModule)) {
          return false;
        }
        return true;
      }
      
      // Check module requirement (skip if still loading)
      if (!modulesLoading && item.requiredModule && !activeModuleSlugs.includes(item.requiredModule)) {
        return false;
      }
      
      // Check role requirement - items without requiredRoles are visible to all
      if (item.requiredRoles && item.requiredRoles.length > 0) {
        if (!item.requiredRoles.includes(userRole)) {
          return false;
        }
      }
      
      return true;
    });
    
    // Remove orphan dividers (dividers with no items after them)
    const result = [];
    for (let i = 0; i < filtered.length; i++) {
      const item = filtered[i];
      if (item.name === 'divider') {
        // Check if there's at least one non-divider item after this divider
        let hasFollowingItem = false;
        for (let j = i + 1; j < filtered.length; j++) {
          if (filtered[j].name === 'divider') break;
          if (filtered[j].name !== 'divider') {
            hasFollowingItem = true;
            break;
          }
        }
        if (hasFollowingItem) {
          result.push(item);
        }
      } else {
        result.push(item);
      }
    }
    
    return result;
  }, [activeModuleSlugs, modulesLoading, userRole]);

  // Scale admin panel to 75% by setting root font-size
  useEffect(() => {
    document.documentElement.style.fontSize = '12px'; // 75% of 16px
    return () => {
      document.documentElement.style.fontSize = ''; // Reset when leaving admin
    };
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!tenantId) return;
    setLoadingNotifications(true);
    try {
      // Get upcoming appointments for today and tomorrow that need attention
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          status,
          patients:patient_id (first_name, last_name)
        `)
        .eq('tenant_id', tenantId)
        .gte('appointment_date', today)
        .lte('appointment_date', tomorrowStr)
        .in('status', ['pending', 'confirmed'])
        .order('appointment_date', { ascending: true })
        .limit(10);

      const notifs = (appointments || []).map(apt => ({
        id: apt.id,
        type: 'appointment',
        title: `${apt.patients?.first_name} ${apt.patients?.last_name}`,
        message: `Appointment ${apt.appointment_date === today ? 'today' : 'tomorrow'} at ${apt.start_time?.slice(0, 5)}`,
        time: apt.appointment_date,
        status: apt.status,
        link: `/appointments`
      }));

      setNotifications(notifs);
      setNotificationCount(notifs.filter(n => n.status === 'pending').length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) fetchNotifications();
    // Refresh every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNotifications, tenantId]);

  // Global search function
  const handleSearch = useCallback(async (query) => {
    if (!query || query.length < 2 || !tenantId) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    setSearching(true);
    setSearchOpen(true);

    try {
      const searchTerm = `%${query}%`;
      
      // Search patients
      const { data: patients } = await supabase
        .from('patients')
        .select('id, first_name, last_name, phone')
        .eq('tenant_id', tenantId)
        .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},phone.ilike.${searchTerm}`)
        .limit(5);

      // Search doctors
      const { data: doctors } = await supabase
        .from('doctors')
        .select('id, name_en, name_ar, specialty_en')
        .eq('tenant_id', tenantId)
        .or(`name_en.ilike.${searchTerm},name_ar.ilike.${searchTerm}`)
        .limit(3);

      // Search services
      const { data: services } = await supabase
        .from('services')
        .select('id, name_en, name_ar')
        .eq('tenant_id', tenantId)
        .or(`name_en.ilike.${searchTerm},name_ar.ilike.${searchTerm}`)
        .limit(3);

      // Search lab orders by order number or work type
      const { data: labOrders } = await supabase
        .from('lab_orders')
        .select('id, order_number, work_type, status, patients:patient_id (first_name, last_name)')
        .eq('tenant_id', tenantId)
        .or(`order_number.ilike.${searchTerm},work_type.ilike.${searchTerm}`)
        .limit(3);

      // Search invoices by invoice number
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, status, patients:patient_id (first_name, last_name)')
        .eq('tenant_id', tenantId)
        .ilike('invoice_number', searchTerm)
        .limit(3);

      // Search appointments (by patient name via join)
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, appointment_date, status, patients:patient_id (first_name, last_name), doctors:doctor_id (name_en)')
        .eq('tenant_id', tenantId)
        .limit(3);

      // Filter appointments by patient name client-side
      const filteredAppointments = (appointments || []).filter(apt => {
        const patientName = `${apt.patients?.first_name || ''} ${apt.patients?.last_name || ''}`.toLowerCase();
        return patientName.includes(query.toLowerCase());
      }).slice(0, 3);

      // Search xrays
      const { data: xrays } = await supabase
        .from('xrays')
        .select('id, status, xray_types:xray_type_id (name), patients:patient_id (first_name, last_name)')
        .eq('tenant_id', tenantId)
        .limit(5);

      // Filter xrays by patient name
      const filteredXrays = (xrays || []).filter(xray => {
        const patientName = `${xray.patients?.first_name || ''} ${xray.patients?.last_name || ''}`.toLowerCase();
        const typeName = (xray.xray_types?.name || '').toLowerCase();
        return patientName.includes(query.toLowerCase()) || typeName.includes(query.toLowerCase());
      }).slice(0, 3);

      // Search treatment plans
      const { data: treatmentPlans } = await supabase
        .from('treatment_plans')
        .select('id, plan_name, status, patients:patient_id (first_name, last_name)')
        .eq('tenant_id', tenantId)
        .ilike('plan_name', searchTerm)
        .limit(3);

      // Search prescriptions
      const { data: prescriptions } = await supabase
        .from('prescriptions')
        .select('id, prescription_number, status, patients:patient_id (first_name, last_name)')
        .eq('tenant_id', tenantId)
        .ilike('prescription_number', searchTerm)
        .limit(3);

      const results = [
        ...(patients || []).map(p => ({
          id: p.id,
          type: 'patient',
          title: `${p.first_name} ${p.last_name}`,
          subtitle: p.phone || 'Patient',
          link: `/patients/${p.id}/view`,
          icon: Users
        })),
        ...(doctors || []).map(d => ({
          id: d.id,
          type: 'doctor',
          title: d.name_en || d.name_ar,
          subtitle: d.specialty_en || 'Doctor',
          link: `/doctors/edit/${d.id}`,
          icon: Stethoscope
        })),
        ...(services || []).map(s => ({
          id: s.id,
          type: 'service',
          title: s.name_en || s.name_ar,
          subtitle: 'Service',
          link: `/services/edit/${s.id}`,
          icon: Package
        })),
        ...(labOrders || []).map(lo => ({
          id: lo.id,
          type: 'lab order',
          title: lo.order_number || `Lab Order #${lo.id}`,
          subtitle: `${lo.work_type || 'Lab Work'} - ${lo.patients?.first_name || ''} ${lo.patients?.last_name || ''}`.trim(),
          link: `/lab-orders/${lo.id}`,
          icon: FlaskConical
        })),
        ...(invoices || []).map(inv => ({
          id: inv.id,
          type: 'invoice',
          title: inv.invoice_number || `Invoice #${inv.id}`,
          subtitle: `$${inv.total_amount || 0} - ${inv.patients?.first_name || ''} ${inv.patients?.last_name || ''}`.trim(),
          link: `/invoices/${inv.id}`,
          icon: DollarSign
        })),
        ...filteredAppointments.map(apt => ({
          id: apt.id,
          type: 'appointment',
          title: `${apt.patients?.first_name || ''} ${apt.patients?.last_name || ''}`.trim() || 'Appointment',
          subtitle: `${apt.appointment_date || ''} - ${apt.doctors?.name_en || 'Doctor'}`,
          link: `/appointments/edit/${apt.id}`,
          icon: Calendar
        })),
        ...filteredXrays.map(xray => ({
          id: xray.id,
          type: 'x-ray',
          title: xray.xray_types?.name || 'X-Ray',
          subtitle: `${xray.patients?.first_name || ''} ${xray.patients?.last_name || ''}`.trim() || 'Patient',
          link: `/xrays/${xray.id}`,
          icon: ScanLine
        })),
        ...(treatmentPlans || []).map(tp => ({
          id: tp.id,
          type: 'treatment plan',
          title: tp.plan_name || `Treatment Plan #${tp.id}`,
          subtitle: `${tp.patients?.first_name || ''} ${tp.patients?.last_name || ''}`.trim() || 'Patient',
          link: `/treatment-plans/${tp.id}`,
          icon: ClipboardList
        })),
        ...(prescriptions || []).map(rx => ({
          id: rx.id,
          type: 'prescription',
          title: rx.prescription_number || `Prescription #${rx.id}`,
          subtitle: `${rx.patients?.first_name || ''} ${rx.patients?.last_name || ''}`.trim() || 'Patient',
          link: `/prescriptions/${rx.id}`,
          icon: Pill
        }))
      ];

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const handleLogout = () => {
    logout();
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={clsx(
          'fixed top-0 left-0 z-50 h-full bg-white shadow-lg transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-20',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">D</span>
            </div>
            {sidebarOpen && (
              <span className="text-xl font-bold text-gray-800">Dento</span>
            )}
          </Link>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:block p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-5 h-5 text-gray-500" />
          </button>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          {filteredMenuItems.map((item, index) => {
            if (item.name === 'divider') {
              return (
                <div key={index} className="py-3">
                  {sidebarOpen && (
                    <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {item.label}
                    </p>
                  )}
                  {!sidebarOpen && <hr className="border-gray-200" />}
                </div>
              );
            }

            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  active 
                    ? 'bg-primary-50 text-primary-600' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className={clsx('w-5 h-5 flex-shrink-0', active && 'text-primary-600')} />
                {sidebarOpen && (
                  <span className="font-medium">{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content area */}
      <div className={clsx(
        'transition-all duration-300',
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
      )}>
        {/* Top header */}
        <header className="h-16 bg-white shadow-sm sticky top-0 z-30">
          <div className="h-full px-4 flex items-center gap-4">
            {/* Left side - Mobile menu + Clinic name */}
            <div className="flex items-center gap-3 min-w-0 shrink-0">
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-5 h-5 text-gray-500" />
              </button>
              
              {/* Clinic Name */}
              {tenantName && (
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {tenantName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-gray-800 truncate max-w-[160px]">{tenantName}</span>
                </div>
              )}
            </div>
              
            {/* Center - Search */}
            <div className="hidden md:block relative flex-1 max-w-xl mx-auto">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 w-full">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search patients, doctors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery.length >= 2 && setSearchOpen(true)}
                    className="bg-transparent border-none outline-none text-sm flex-1"
                  />
                  {searching && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                </div>
                
                {/* Search Results Dropdown */}
                {searchOpen && searchResults.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setSearchOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto">
                      {searchResults.map((result) => {
                        const Icon = result.icon;
                        return (
                          <Link
                            key={`${result.type}-${result.id}`}
                            to={result.link}
                            onClick={() => {
                              setSearchOpen(false);
                              setSearchQuery('');
                            }}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
                          >
                            <div className={clsx(
                              'w-8 h-8 rounded-full flex items-center justify-center',
                              result.type === 'patient' && 'bg-blue-100 text-blue-600',
                              result.type === 'doctor' && 'bg-green-100 text-green-600',
                              result.type === 'service' && 'bg-purple-100 text-purple-600',
                              result.type === 'lab order' && 'bg-orange-100 text-orange-600',
                              result.type === 'invoice' && 'bg-emerald-100 text-emerald-600',
                              result.type === 'appointment' && 'bg-indigo-100 text-indigo-600',
                              result.type === 'x-ray' && 'bg-cyan-100 text-cyan-600',
                              result.type === 'treatment plan' && 'bg-amber-100 text-amber-600',
                              result.type === 'prescription' && 'bg-pink-100 text-pink-600'
                            )}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{result.title}</p>
                              <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                            </div>
                            <span className="ml-auto text-xs text-gray-400 capitalize whitespace-nowrap">{result.type}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </>
                )}
                
                {searchOpen && searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setSearchOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 p-4 text-center text-gray-500 text-sm">
                      No results found for "{searchQuery}"
                    </div>
                  </>
                )}
              </div>

            {/* Right side - pushed to end */}
            <div className="flex items-center gap-3">
              {/* Support Request Button */}
              <button 
                onClick={() => {
                  setSupportError(null);
                  setSupportRequest({ type: 'chat', reason: '' });
                  setSupportModalOpen(true);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg relative"
                title="Request Support"
              >
                <Headphones className="w-5 h-5 text-gray-500" />
                {/* Show indicator if there's an active support session */}
                {activeSupport && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setNotificationOpen(!notificationOpen)}
                  className="p-2 hover:bg-gray-100 rounded-lg relative"
                >
                  <Bell className="w-5 h-5 text-gray-500" />
                  {notificationCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {notificationOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotificationOpen(false)} />
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
                      <div className="p-3 border-b flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        <Link 
                          to="/notifications"
                          onClick={() => setNotificationOpen(false)}
                          className="text-xs text-primary-600 hover:underline"
                        >
                          View All
                        </Link>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {loadingNotifications ? (
                          <div className="p-4 text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            No new notifications
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <Link
                              key={notif.id}
                              to={notif.link}
                              onClick={() => setNotificationOpen(false)}
                              className="flex items-start gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0"
                            >
                              <div className={clsx(
                                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                                notif.status === 'pending' ? 'bg-yellow-100' : 'bg-green-100'
                              )}>
                                {notif.status === 'pending' ? (
                                  <Clock className="w-4 h-4 text-yellow-600" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{notif.title}</p>
                                <p className="text-xs text-gray-500">{notif.message}</p>
                              </div>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* User menu */}
              <div className="relative">
                <button 
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-semibold text-sm">
                      {identity?.name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-700">{identity?.name || 'User'}</p>
                    <p className="text-xs text-gray-500 capitalize">{identity?.role || 'Admin'}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-1 z-50">
                      <Link 
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Users className="w-4 h-4" />
                        Profile
                      </Link>
                      <Link 
                        to="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                      <hr className="my-1" />
                      <button 
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>

      {/* Support Request Modal */}
      {supportModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Request Support</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSupportModalOpen(false);
                    setSupportHistoryOpen(true);
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
                >
                  View History
                </button>
                <button
                  onClick={() => setSupportModalOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!supportRequest.reason.trim()) return;
                setSendingSupportRequest(true);
                setSupportError(null);
                try {
                  // Get auth session for explicit header
                  const { data: { session: authSession } } = await supabase.auth.getSession();
                  if (!authSession?.access_token) {
                    throw new Error('You must be logged in to request support');
                  }
                  
                  // Use fetch directly with explicit auth header
                  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                  const response = await fetch(`${supabaseUrl}/functions/v1/admin-support-request`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${authSession.access_token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      session_type: supportRequest.type,
                      reason: supportRequest.reason.trim(),
                      priority: 'normal',
                    }),
                  });

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to submit request');
                  }

                  const data = await response.json();
                  if (data?.error) {
                    throw new Error(data.error);
                  }

                  // Store active session for widget
                  if (data?.session) {
                    setActiveSupport(data.session);
                  }

                  // Close modal and reset form
                  setSupportModalOpen(false);
                  setSupportRequest({ type: 'chat', reason: '' });
                  
                  // Show success feedback
                  toast.error('Support request submitted! Our team will contact you shortly.');
                } catch (err) {
                  console.error('Failed to submit support request:', err);
                  setSupportError(err.message || 'Failed to submit request. Please try again.');
                } finally {
                  setSendingSupportRequest(false);
                }
              }} 
              className="space-y-4"
            >
              {/* Error message */}
              {supportError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{supportError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Support Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'screen_share', label: 'Screen Share', icon: Monitor, tooltip: 'Share your screen with our support team who can guide you remotely' },
                    { value: 'view_only', label: 'View Only', icon: Eye, tooltip: 'Share your screen for observation only - no remote control' },
                    { value: 'chat', label: 'Chat', icon: MessageCircle, tooltip: 'Text-based support conversation with our team' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      title={option.tooltip}
                      onClick={() => setSupportRequest(prev => ({ ...prev, type: option.value }))}
                      className={clsx(
                        'flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors',
                        supportRequest.type === option.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      <option.icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What do you need help with? <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={supportRequest.reason}
                  onChange={(e) => setSupportRequest(prev => ({ ...prev, reason: e.target.value }))}
                  required
                  rows={4}
                  placeholder="Describe your issue or question..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 placeholder-gray-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSupportModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingSupportRequest || !supportRequest.reason.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingSupportRequest ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Headphones className="h-4 w-4" />
                      Request Support
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Support Session Widget - shows when there's an active session */}
      <SupportSessionWidget
        session={activeSupport}
        messages={supportMessages}
        sending={sendingMessage}
        onSendMessage={sendSupportMessage}
        onCancel={cancelSupport}
        onRate={rateSupportSession}
        error={supportSessionError}
      />

      {/* Support History Modal */}
      <SupportHistoryModal
        isOpen={supportHistoryOpen}
        onClose={() => setSupportHistoryOpen(false)}
        history={supportHistory}
        loading={loadingSupportHistory}
        onRefresh={fetchSupportHistory}
      />

      {/* Screen Share Session Modal */}
      {screenShareOpen && screenShareSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-w-4xl w-full mx-4">
            <ScreenShareSession
              sessionId={screenShareSessionId}
              onClose={() => {
                setScreenShareOpen(false);
                setScreenShareSessionId(null);
              }}
              sessionType="screen_share"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
