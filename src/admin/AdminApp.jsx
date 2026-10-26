import { lazy, Suspense } from 'react';
import { Refine } from '@refinedev/core';
import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import routerBindings from '@refinedev/react-router';
import { AdminErrorBoundary as ErrorBoundary } from '../components/ErrorBoundary';
import { ToastProvider } from '../components/Toast';

// Providers
import { dataProvider } from './providers/dataProvider';
import { authProvider } from './providers/authProvider';

// Layout (always loaded)
import AdminLayout from './layouts/AdminLayout';

// Role-based access control (always loaded)
import AdminRoleGuard from './components/AdminRoleGuard';
import { ROLE_GROUPS } from './config/rolePermissions';

// Loading fallback for lazy-loaded pages
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  </div>
);

// Lazy-loaded Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/profile/Profile'));
const BranchList = lazy(() => import('./pages/branches/BranchList'));
const BranchForm = lazy(() => import('./pages/branches/BranchForm'));
const DoctorList = lazy(() => import('./pages/doctors/DoctorList'));
const DoctorForm = lazy(() => import('./pages/doctors/DoctorForm'));
const PatientList = lazy(() => import('./pages/patients/PatientList'));
const PatientForm = lazy(() => import('./pages/patients/PatientForm'));
const PatientView = lazy(() => import('./pages/patients/PatientView'));
const DentalChart = lazy(() => import('./pages/patients/DentalChart'));
const MedicalHistoryForm = lazy(() => import('./pages/patients/MedicalHistoryForm'));
const TreatmentHistory = lazy(() => import('./pages/patients/TreatmentHistory'));
const AppointmentList = lazy(() => import('./pages/appointments/AppointmentList'));
const AppointmentForm = lazy(() => import('./pages/appointments/AppointmentForm'));
const WalkInQueue = lazy(() => import('./pages/appointments/WalkInQueue'));

const UserList = lazy(() => import('./pages/users/UserList'));
const UserForm = lazy(() => import('./pages/users/UserForm'));
const RoleManagement = lazy(() => import('./pages/users/RoleManagement'));
const UserSessions = lazy(() => import('./pages/users/UserSessions'));

const PrescriptionList = lazy(() => import('./pages/prescriptions/PrescriptionList'));
const PrescriptionForm = lazy(() => import('./pages/prescriptions/PrescriptionForm'));
const PrescriptionView = lazy(() => import('./pages/prescriptions/PrescriptionView'));
const PrescriptionPrint = lazy(() => import('./pages/prescriptions/PrescriptionPrint'));
const LabOrderList = lazy(() => import('./pages/lab-orders/LabOrderList'));
const LabOrderForm = lazy(() => import('./pages/lab-orders/LabOrderForm'));
const LabOrderView = lazy(() => import('./pages/lab-orders/LabOrderView'));
const SiteSettings = lazy(() => import('./pages/settings/SiteSettings'));

const ScheduleList = lazy(() => import('./pages/schedules/ScheduleList'));
const ScheduleCalendar = lazy(() => import('./pages/schedules/ScheduleCalendar'));
const UnifiedScheduleCalendar = lazy(() => import('./pages/schedules/UnifiedScheduleCalendar'));
const ScheduleExceptionForm = lazy(() => import('./pages/schedules/ScheduleExceptionForm'));
const DoctorScheduleForm = lazy(() => import('./pages/schedules/DoctorScheduleForm'));
const InvoiceList = lazy(() => import('./pages/invoices/InvoiceList'));
const InvoiceForm = lazy(() => import('./pages/invoices/InvoiceForm'));
const InvoiceView = lazy(() => import('./pages/invoices/InvoiceView'));
const InvoicePrint = lazy(() => import('./pages/invoices/InvoicePrint'));
const AppointmentCalendar = lazy(() => import('./pages/appointments/AppointmentCalendar'));
const NotificationSettings = lazy(() => import('./pages/notifications/NotificationSettings'));
const MySubscription = lazy(() => import('./pages/subscription/MySubscription'));
const ChairList = lazy(() => import('./pages/branches/ChairList'));

const TreatmentPlanList = lazy(() => import('./pages/treatment-plans/TreatmentPlanList'));
const TreatmentPlanForm = lazy(() => import('./pages/treatment-plans/TreatmentPlanForm'));
const TreatmentPlanView = lazy(() => import('./pages/treatment-plans/TreatmentPlanView'));
const XrayList = lazy(() => import('./pages/xrays/XrayList'));
const XrayForm = lazy(() => import('./pages/xrays/XrayForm'));
const XrayView = lazy(() => import('./pages/xrays/XrayView'));
const CbctList = lazy(() => import('./pages/cbct/CbctList'));
const CbctForm = lazy(() => import('./pages/cbct/CbctForm'));
const CbctView = lazy(() => import('./pages/cbct/CbctView'));
const ConsentFormList = lazy(() => import('./pages/consent-forms/ConsentFormList'));
const ConsentFormForm = lazy(() => import('./pages/consent-forms/ConsentFormForm'));
const ConsentFormView = lazy(() => import('./pages/consent-forms/ConsentFormView'));
const ProcedureNoteList = lazy(() => import('./pages/procedure-notes/ProcedureNoteList'));
const ProcedureNoteForm = lazy(() => import('./pages/procedure-notes/ProcedureNoteForm'));
const ProcedureNoteView = lazy(() => import('./pages/procedure-notes/ProcedureNoteView'));

// Phase 3 Features
const InstallmentList = lazy(() => import('./pages/installments/InstallmentList'));
const InstallmentForm = lazy(() => import('./pages/installments/InstallmentForm'));
const InstallmentView = lazy(() => import('./pages/installments/InstallmentView'));
const CommissionList = lazy(() => import('./pages/commissions/CommissionList'));
const InventoryList = lazy(() => import('./pages/inventory/InventoryList'));
const InventoryForm = lazy(() => import('./pages/inventory/InventoryForm'));
const StaffScheduleList = lazy(() => import('./pages/staff-schedule/StaffScheduleList'));
const InsuranceCompanyList = lazy(() => import('./pages/insurance/InsuranceCompanyList'));
const InsuranceClaimList = lazy(() => import('./pages/insurance/InsuranceClaimList'));
const MaterialUsageReport = lazy(() => import('./pages/reports/MaterialUsageReport'));
const DailyReconciliationList = lazy(() => import('./pages/reconciliation/DailyReconciliationList'));
const DailyReconciliationForm = lazy(() => import('./pages/reconciliation/DailyReconciliationForm'));
const LeaveRequestList = lazy(() => import('./pages/leave/LeaveRequestList'));
const LeaveRequestForm = lazy(() => import('./pages/leave/LeaveRequestForm'));
const LeaveRequestView = lazy(() => import('./pages/leave/LeaveRequestView'));
const AttendanceList = lazy(() => import('./pages/attendance/AttendanceList'));

// Tenant Context for Multi-tenant support
import { TenantProvider } from './contexts/TenantContext';
import TenantSwitcher from './components/TenantSwitcher';

const AdminApp = () => {
  return (
    <ErrorBoundary>
      <TenantProvider mode="admin">
        <Refine
          dataProvider={dataProvider}
          authProvider={authProvider}
          routerProvider={routerBindings}
          resources={[
            {
              name: 'dashboard',
              list: '/',
            },
          {
            name: 'appointments',
            list: '/appointments',
            create: '/appointments/create',
            edit: '/appointments/edit/:id',
          },
          {
            name: 'patients',
            list: '/patients',
            create: '/patients/create',
            edit: '/patients/edit/:id',
          },
          {
            name: 'doctors',
            list: '/doctors',
            create: '/doctors/create',
            edit: '/doctors/edit/:id',
          },
          {
            name: 'branches',
            list: '/branches',
            create: '/branches/create',
            edit: '/branches/edit/:id',
          },
          {
            name: 'users',
            list: '/users',
            create: '/users/create',
            edit: '/users/edit/:id',
          },
          {
            name: 'schedules',
            list: '/schedules',
            create: '/schedules/exception/create',
            edit: '/schedules/exception/edit/:id',
          },
          {
            name: 'chairs',
            list: '/chairs',
          },
          {
            name: 'treatment-plans',
            list: '/treatment-plans',
            create: '/treatment-plans/create',
            edit: '/treatment-plans/edit/:id',
            show: '/treatment-plans/:id',
          },
        ]}
        options={{
          syncWithLocation: true,
          warnWhenUnsavedChanges: true,
        }}
      >
        <Routes>
          <Route
            element={
              <ToastProvider>
                <AdminLayout>
                  <Suspense fallback={<PageLoader />}>
                    <Outlet />
                  </Suspense>
                </AdminLayout>
              </ToastProvider>
            }
          >
            {/* Dashboard */}
            <Route index element={<Dashboard />} />
            
            {/* Profile - Everyone can access their own profile */}
            <Route path="profile" element={<Profile />} />
            
            {/* Branches - Management only */}
            <Route path="branches">
              <Route index element={
                <AdminRoleGuard allowedRoles={ROLE_GROUPS.MANAGEMENT}>
                  <BranchList />
                </AdminRoleGuard>
              } />
              <Route path="create" element={
                <AdminRoleGuard allowedRoles={ROLE_GROUPS.ADMIN_ONLY}>
                  <BranchForm />
                </AdminRoleGuard>
              } />
              <Route path="edit/:id" element={
                <AdminRoleGuard allowedRoles={ROLE_GROUPS.ADMIN_ONLY}>
                  <BranchForm />
                </AdminRoleGuard>
              } />
            </Route>
            
            {/* Chairs - Management only */}
            <Route path="chairs" element={
              <AdminRoleGuard allowedRoles={ROLE_GROUPS.MANAGEMENT}>
                <ChairList />
              </AdminRoleGuard>
            } />
            
            {/* Doctors - Management only */}
            <Route path="doctors">
              <Route index element={
                <AdminRoleGuard allowedRoles={ROLE_GROUPS.MANAGEMENT}>
                  <DoctorList />
                </AdminRoleGuard>
              } />
              <Route path="create" element={
                <AdminRoleGuard allowedRoles={ROLE_GROUPS.ADMIN_ONLY}>
                  <DoctorForm />
                </AdminRoleGuard>
              } />
              <Route path="edit/:id" element={
                <AdminRoleGuard allowedRoles={ROLE_GROUPS.ADMIN_ONLY}>
                  <DoctorForm />
                </AdminRoleGuard>
              } />
            </Route>
            
            {/* Schedules - All staff can view, management can edit */}
            <Route path="schedules">
              <Route index element={<UnifiedScheduleCalendar />} />
              <Route path="calendar-old" element={<ScheduleCalendar />} />
              <Route path="list" element={<ScheduleList />} />
              <Route path="assign" element={
                <AdminRoleGuard allowedRoles={ROLE_GROUPS.MANAGEMENT}>
                  <DoctorScheduleForm />
                </AdminRoleGuard>
              } />
              <Route path="assign/edit/:id" element={
                <AdminRoleGuard allowedRoles={ROLE_GROUPS.MANAGEMENT}>
                  <DoctorScheduleForm />
                </AdminRoleGuard>
              } />
              <Route path="exception/create" element={
                <AdminRoleGuard allowedRoles={ROLE_GROUPS.MANAGEMENT}>
                  <ScheduleExceptionForm />
                </AdminRoleGuard>
              } />
              <Route path="exception/edit/:id" element={
                <AdminRoleGuard allowedRoles={ROLE_GROUPS.MANAGEMENT}>
                  <ScheduleExceptionForm />
                </AdminRoleGuard>
              } />
            </Route>
            
            {/* Patients - All clinical + reception staff */}
            <Route path="patients">
              <Route index element={<PatientList />} />
              <Route path="create" element={<PatientForm />} />
              <Route path="edit/:id" element={<PatientForm />} />
              <Route path=":id/view" element={<PatientView />} />
              <Route path=":id/dental-chart" element={
                <AdminRoleGuard allowedRoles={ROLE_GROUPS.CLINICAL}>
                  <DentalChart />
                </AdminRoleGuard>
              } />
              <Route path=":id/medical-history" element={<MedicalHistoryForm />} />
              <Route path=":id/treatment-history" element={<TreatmentHistory />} />
            </Route>
            
            {/* Appointments - Most staff can access */}
            <Route path="appointments">
              <Route index element={<AppointmentCalendar />} />
              <Route path="list" element={<AppointmentList />} />
              <Route path="create" element={<AppointmentForm />} />
              <Route path="edit/:id" element={<AppointmentForm />} />
              <Route path="walk-in" element={
                <AdminRoleGuard allowedRoles={ROLE_GROUPS.FRONT_OFFICE}>
                  <WalkInQueue />
                </AdminRoleGuard>
              } />
            </Route>
            
            {/* Users - Protected by role */}
            <Route path="users">
              <Route index element={
                <AdminRoleGuard allowedRoles={ROLE_GROUPS.MANAGEMENT}>
                  <UserList />
                </AdminRoleGuard>
              } />
              <Route path="create" element={
                <AdminRoleGuard allowedRoles={ROLE_GROUPS.ADMIN_ONLY}>
                  <UserForm />
                </AdminRoleGuard>
              } />
              <Route path="edit/:id" element={
                <AdminRoleGuard allowedRoles={ROLE_GROUPS.ADMIN_ONLY}>
                  <UserForm />
                </AdminRoleGuard>
              } />
              <Route path="roles" element={
                <AdminRoleGuard allowedRoles={ROLE_GROUPS.ADMIN_ONLY}>
                  <RoleManagement />
                </AdminRoleGuard>
              } />
              <Route path="sessions" element={
                <AdminRoleGuard allowedRoles={ROLE_GROUPS.ADMIN_ONLY}>
                  <UserSessions />
                </AdminRoleGuard>
              } />
            </Route>
            
            {/* Notifications */}
            <Route path="notifications" element={<NotificationSettings />} />
            
            {/* Invoices */}
            <Route path="invoices">
              <Route index element={<InvoiceList />} />
              <Route path="create" element={<InvoiceForm />} />
              <Route path="edit/:id" element={<InvoiceForm />} />
              <Route path=":id" element={<InvoiceView />} />
              <Route path=":id/print" element={<InvoicePrint />} />
            </Route>
            
            {/* Prescriptions */}
            <Route path="prescriptions">
              <Route index element={<PrescriptionList />} />
              <Route path="create" element={<PrescriptionForm />} />
              <Route path="edit/:id" element={<PrescriptionForm />} />
              <Route path=":id" element={<PrescriptionView />} />
              <Route path=":id/print" element={<PrescriptionPrint />} />
            </Route>
            
            {/* Treatment Plans */}
            <Route path="treatment-plans">
              <Route index element={<TreatmentPlanList />} />
              <Route path="create" element={<TreatmentPlanForm />} />
              <Route path="edit/:id" element={<TreatmentPlanForm />} />
              <Route path=":id" element={<TreatmentPlanView />} />
            </Route>
            
            {/* X-Rays */}
            <Route path="xrays">
              <Route index element={<XrayList />} />
              <Route path="create" element={<XrayForm />} />
              <Route path="edit/:id" element={<XrayForm />} />
              <Route path=":id" element={<XrayView />} />
            </Route>
            
            {/* CBCT Scans */}
            <Route path="cbct">
              <Route index element={<CbctList />} />
              <Route path="create" element={<CbctForm />} />
              <Route path="edit/:id" element={<CbctForm />} />
              <Route path=":id" element={<CbctView />} />
            </Route>
            
            {/* Consent Forms */}
            <Route path="consent-forms">
              <Route index element={<ConsentFormList />} />
              <Route path="create" element={<ConsentFormForm />} />
              <Route path=":id/edit" element={<ConsentFormForm />} />
              <Route path=":id" element={<ConsentFormView />} />
            </Route>
            
            {/* Procedure Notes */}
            <Route path="procedure-notes">
              <Route index element={<ProcedureNoteList />} />
              <Route path="create" element={<ProcedureNoteForm />} />
              <Route path=":id/edit" element={<ProcedureNoteForm />} />
              <Route path=":id" element={<ProcedureNoteView />} />
            </Route>
            
            {/* Lab Orders */}
            <Route path="lab-orders">
              <Route index element={<LabOrderList />} />
              <Route path="new" element={<LabOrderForm />} />
              <Route path=":id/edit" element={<LabOrderForm />} />
              <Route path=":id" element={<LabOrderView />} />
            </Route>
            
            {/* Installment Plans */}
            <Route path="installments">
              <Route index element={<InstallmentList />} />
              <Route path="new" element={<InstallmentForm />} />
              <Route path=":id" element={<InstallmentView />} />
            </Route>
            
            {/* Commission Tracking */}
            <Route path="commissions" element={<CommissionList />} />
            
            {/* Inventory Management */}
            <Route path="inventory">
              <Route index element={<InventoryList />} />
              <Route path="new" element={<InventoryForm />} />
              <Route path=":id" element={<InventoryForm />} />
            </Route>
            
            {/* Reports */}
            <Route path="reports">
              <Route path="material-usage" element={<MaterialUsageReport />} />
            </Route>
            
            {/* Staff Scheduling - Redirects to unified schedules */}
            <Route path="staff-schedule" element={<Navigate to="/schedules" replace />} />
            
            {/* Insurance */}
            <Route path="insurance">
              <Route index element={<InsuranceCompanyList />} />
              <Route path="claims" element={<InsuranceClaimList />} />
            </Route>
            
            {/* Daily Reconciliation */}
            <Route path="reconciliation">
              <Route index element={<DailyReconciliationList />} />
              <Route path="new" element={<DailyReconciliationForm />} />
              <Route path=":id" element={<DailyReconciliationForm />} />
            </Route>
            
            {/* Leave Management */}
            <Route path="leave">
              <Route index element={<LeaveRequestList />} />
              <Route path="new" element={<LeaveRequestForm />} />
              <Route path=":id" element={<LeaveRequestView />} />
              <Route path=":id/edit" element={<LeaveRequestForm />} />
            </Route>
            
            {/* Time & Attendance - Management only */}
            <Route path="attendance" element={
              <AdminRoleGuard allowedRoles={ROLE_GROUPS.MANAGEMENT}>
                <AttendanceList />
              </AdminRoleGuard>
            } />
            
            {/* My Subscription - Management only */}
            <Route path="subscription" element={
              <AdminRoleGuard allowedRoles={ROLE_GROUPS.MANAGEMENT}>
                <MySubscription />
              </AdminRoleGuard>
            } />

            {/* Site Settings - Management only */}
            <Route path="settings" element={
              <AdminRoleGuard allowedRoles={ROLE_GROUPS.MANAGEMENT}>
                <SiteSettings />
              </AdminRoleGuard>
            } />
            
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        {/* Dev Tenant Switcher - only shows in development */}
        <TenantSwitcher />
      </Refine>
      </TenantProvider>
    </ErrorBoundary>
  );
};

export default AdminApp;
