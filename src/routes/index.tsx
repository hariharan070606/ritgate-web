import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const NotFound = lazy(() => import('../pages/NotFound'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const OTPVerifyPage = lazy(() => import('../pages/auth/OTPVerifyPage'));
const SplashPage = lazy(() => import('../pages/auth/SplashPage'));
const LoginScanner = lazy(() => import('../pages/auth/LoginScanner'));

// Student
const StudentHome = lazy(() => import('../pages/student/StudentHome'));
const StudentRequests = lazy(() => import('../pages/student/StudentRequests'));
const StudentHistory = lazy(() => import('../pages/student/StudentHistory'));
const StudentQRCodes = lazy(() => import('../pages/student/StudentQRCodes'));
const NewRequest = lazy(() => import('../pages/student/NewRequest'));

// Staff
const StaffDashboard = lazy(() => import('../pages/staff/StaffDashboard'));
const StaffMyRequests = lazy(() => import('../pages/staff/StaffMyRequests'));
const StaffNewPass = lazy(() => import('../pages/staff/StaffNewPass'));
const StaffBulkPassPage = lazy(() => import('../pages/staff/StaffBulkPassPage'));
const StaffEventCSV = lazy(() => import('../pages/staff/StaffEventCSV'));

// NCI
const NCIDashboard = lazy(() => import('../pages/nci/NCIDashboard'));
const NCIMyRequests = lazy(() => import('../pages/nci/NCIMyRequests'));
const NCIGateLogs = lazy(() => import('../pages/nci/NCIGateLogs'));

// NTF
const NTFDashboard = lazy(() => import('../pages/ntf/NTFDashboard'));
const NTFMyRequests = lazy(() => import('../pages/ntf/NTFMyRequests'));

// HOD
const HODDashboard = lazy(() => import('../pages/hod/HODDashboard'));
const HODMyRequests = lazy(() => import('../pages/hod/HODMyRequests'));
const HODNewPass = lazy(() => import('../pages/hod/HODNewPass'));
const HODBulkPass = lazy(() => import('../pages/hod/HODBulkPass'));
const HODEvents = lazy(() => import('../pages/hod/HODEvents'));

// HR
const HRDashboard = lazy(() => import('../pages/hr/HRDashboard'));
const HRMyRequests = lazy(() => import('../pages/hr/HRMyRequests'));
const HRGateLogs = lazy(() => import('../pages/hr/HRGateLogs'));
const HRNewPass = lazy(() => import('../pages/hr/HRNewPass'));
const HRExits = lazy(() => import('../pages/hr/HRExits'));

// Admin
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const AdminMyRequests = lazy(() => import('../pages/admin/AdminMyRequests'));
const AdminNewPass = lazy(() => import('../pages/admin/AdminNewPass'));
const AdminScanHistory = lazy(() => import('../pages/admin/AdminScanHistory'));

// Security
const SecurityDashboard = lazy(() => import('../pages/security/SecurityDashboard'));
const SecurityScanner = lazy(() => import('../pages/security/SecurityScanner'));
const SecurityActivePersons = lazy(() => import('../pages/security/SecurityActivePersons'));
const SecurityVehicles = lazy(() => import('../pages/security/SecurityVehicles'));
const SecurityHistory = lazy(() => import('../pages/security/SecurityHistory'));
const SecurityVisitorReg = lazy(() => import('../pages/security/SecurityVisitorReg'));
const SecurityVisitorQR = lazy(() => import('../pages/security/SecurityVisitorQR'));
const SecurityHODContacts = lazy(() => import('../pages/security/SecurityHODContacts'));

// Shared
const ProfilePage = lazy(() => import('../pages/shared/ProfilePage'));
const NotificationsPage = lazy(() => import('../pages/shared/NotificationsPage'));
const GuestPreRequest = lazy(() => import('../pages/shared/GuestPreRequest'));
const ParticipantsPage = lazy(() => import('../pages/shared/ParticipantsPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function AppRoutes() {
  const { isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  const handleBack = () => navigate(-1);

  const getDashboard = () => {
    switch (role) {
      case 'STUDENT': return <StudentHome />;
      case 'STAFF': return <StaffDashboard />;
      case 'NON_TEACHING': return <NTFDashboard />;
      case 'NON_CLASS_INCHARGE': return <NCIDashboard />;
      case 'HOD': return <HODDashboard />;
      case 'HR': return <HRDashboard />;
      case 'SECURITY': return <SecurityDashboard />;
      case 'ADMIN_OFFICER': return <AdminDashboard />;
      default: return <StudentHome />;
    }
  };

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/verify-otp" element={<OTPVerifyPage />} />
        <Route path="/splash" element={<SplashPage />} />
        <Route path="/login-scan" element={<LoginScanner />} />

        {/* Protected */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={getDashboard()} />

          {/* Student */}
          <Route path="/requests" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentRequests /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentHistory /></ProtectedRoute>} />
          <Route path="/qr-codes" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentQRCodes /></ProtectedRoute>} />
          <Route path="/new-request" element={<ProtectedRoute allowedRoles={['STUDENT']}><NewRequest /></ProtectedRoute>} />

          {/* Staff / NTF / NCI / HOD / HR / Admin — New Pass */}
          <Route path="/new-pass" element={
            <ProtectedRoute allowedRoles={['STAFF', 'NON_TEACHING', 'NON_CLASS_INCHARGE', 'HOD', 'HR', 'ADMIN_OFFICER']}>
              {role === 'HOD' ? <HODNewPass /> : <StaffNewPass />}
            </ProtectedRoute>
          } />

          {/* My Requests */}
          <Route path="/my-requests" element={
            <ProtectedRoute allowedRoles={['STAFF', 'NON_TEACHING', 'NON_CLASS_INCHARGE', 'HOD', 'HR', 'ADMIN_OFFICER']}>
              {role === 'HOD' ? <HODMyRequests />
                : role === 'HR' ? <HRMyRequests />
                : role === 'NON_CLASS_INCHARGE' ? <NCIMyRequests />
                : role === 'NON_TEACHING' ? <NTFMyRequests />
                : role === 'ADMIN_OFFICER' ? <AdminMyRequests />
                : <StaffMyRequests />}
            </ProtectedRoute>
          } />

          {/* Bulk Pass — HOD (department-wide) */}
          <Route path="/bulk-pass" element={
            <ProtectedRoute allowedRoles={['HOD', 'STAFF']}>
              {role === 'HOD'
                ? <HODBulkPass onBack={handleBack} />
                : <StaffBulkPassPage />}
            </ProtectedRoute>
          } />

          {/* HOD Events */}
          <Route path="/hod-events" element={<ProtectedRoute allowedRoles={['HOD']}><HODEvents /></ProtectedRoute>} />

          {/* Staff Event CSV */}
          <Route path="/event-csv" element={<ProtectedRoute allowedRoles={['STAFF']}><StaffEventCSV /></ProtectedRoute>} />

          {/* Gate Logs — HR, NCI, Admin */}
          <Route path="/gate-logs" element={
            <ProtectedRoute allowedRoles={['HR', 'NON_CLASS_INCHARGE', 'ADMIN_OFFICER']}>
              {role === 'NON_CLASS_INCHARGE' ? <NCIGateLogs />
                : role === 'ADMIN_OFFICER' ? <AdminScanHistory />
                : <HRGateLogs />}
            </ProtectedRoute>
          } />

          {/* Exits — HR, NCI (shared HRExits view) */}
          <Route path="/exits" element={
            <ProtectedRoute allowedRoles={['HR', 'NON_CLASS_INCHARGE']}>
              <HRExits />
            </ProtectedRoute>
          } />

          {/* Guest Pre-Registration */}
          <Route path="/guest-register" element={
            <ProtectedRoute allowedRoles={['STAFF', 'NON_TEACHING', 'NON_CLASS_INCHARGE', 'HOD', 'HR', 'ADMIN_OFFICER']}>
              <GuestPreRequest />
            </ProtectedRoute>
          } />

          {/* Security */}
          <Route path="/scanner" element={<ProtectedRoute allowedRoles={['SECURITY']}><SecurityScanner /></ProtectedRoute>} />
          <Route path="/active-persons" element={<ProtectedRoute allowedRoles={['SECURITY']}><SecurityActivePersons /></ProtectedRoute>} />
          <Route path="/vehicles" element={<ProtectedRoute allowedRoles={['SECURITY']}><SecurityVehicles /></ProtectedRoute>} />
          <Route path="/scan-history" element={<ProtectedRoute allowedRoles={['SECURITY']}><SecurityHistory /></ProtectedRoute>} />
          <Route path="/visitor-register" element={<ProtectedRoute allowedRoles={['SECURITY']}><SecurityVisitorReg /></ProtectedRoute>} />
          <Route path="/visitor-qr" element={<ProtectedRoute allowedRoles={['SECURITY']}><SecurityVisitorQR /></ProtectedRoute>} />
          <Route path="/hod-contacts" element={<ProtectedRoute allowedRoles={['SECURITY']}><SecurityHODContacts /></ProtectedRoute>} />

          {/* Shared */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/participants" element={<ParticipantsPage />} />
        </Route>

        {/* 404 — authenticated users see NotFound, unauthenticated go to login */}
        <Route path="*" element={isAuthenticated ? <NotFound /> : <Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
