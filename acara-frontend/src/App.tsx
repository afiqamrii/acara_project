import './App.css'
import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/register/Register";
import UserDashboard from './features/dashboard/pages/UserDashboard';
import ServiceRegister from './features/auth/pages/register/ServiceRegister';
import VendorRegister from './features/auth/pages/register/VendorRegister';
import Marketplace from './features/marketplace/pages/Marketplace';
import LandingPage from './features/landing_page/pages/LandingPage';
import AdminDashboard from './features/dashboard/pages/AdminDashboard';
import VendorVerificationQueue from './features/dashboard/pages/VendorVerificationQueue';
import Register_admin from './features/register_admin/pages/Register_admin';
import CompleteProfile from './features/auth/pages/CompleteProfile';
// import AdminDashboard from './features/dashboard/pages/AdminDashboard';
import AuthSessionManager from './components/common/AuthSessionManager';
import ComingSoon from './components/common/ComingSoon';
import Loader from './components/common/Loader';
import ProtectedRoute from './components/common/ProtectedRoute';

import UserLayout from './components/layouts/UserLayout';
import AdminLayout from './components/layouts/AdminLayout';
const ServiceDetail = lazy(() => import('./features/marketplace/pages/ServiceDetail'));
const VendorAvailability = lazy(() => import('./features/vendor/pages/VendorAvailability'));
const VendorBookings = lazy(() => import('./features/vendor/pages/VendorBookings'));
const VendorServices = lazy(() => import('./features/vendor/pages/VendorServices'));
const ServiceVerificationQueue = lazy(() => import('./features/dashboard/pages/ServiceVerificationQueue'));
const UserProfile = lazy(() => import('./features/profile/pages/UserProfile'));
const VendorDashboard = lazy(() => import('./features/dashboard/pages/VendorDashboard'));
const CustomerBookings = lazy(() => import('./features/bookings/pages/CustomerBookings'));
const AdminBookings = lazy(() => import('./features/bookings/pages/AdminBookings'));
const AdminBookingDetail = lazy(() => import('./features/bookings/pages/AdminBookingDetail'));
const NotificationCenter = lazy(() => import('./features/notifications/pages/NotificationCenter'));
const ReviewsPage = lazy(() => import('./features/reviews/pages/ReviewsPage'));
const NotificationSettings = lazy(() => import('./features/settings/pages/NotificationSettings'));
const AdminUsers = lazy(() => import('./features/admin_users/pages/AdminUsers'));
const AdminUserDetail = lazy(() => import('./features/admin_users/pages/AdminUserDetail'));
const AdminAuditLogs = lazy(() => import('./features/admin_audits/pages/AdminAuditLogs'));
const AdminAuditDetail = lazy(() => import('./features/admin_audits/pages/AdminAuditDetail'));
const AdminOperationsReport = lazy(() => import('./features/admin_reports/pages/AdminOperationsReport'));
const ForgotPassword = lazy(() => import('./features/auth/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./features/auth/pages/ResetPassword'));
const AdminSettings = lazy(() => import('./features/admin_settings/pages/AdminSettings'));


function App() {
  return (
    <BrowserRouter>
      <AuthSessionManager />
      <div className="App">
        <Suspense fallback={<Loader fullScreen message="Loading page..." />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/register" element={<Register />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/admin/register" element={<Register_admin />} />
            <Route path="/about" element={<ComingSoon isPublic={true} title="About ACARA" description="Learn about our mission to revolutionize event planning in Malaysia. Meet the team behind the platform." />} />
            <Route path="/contact" element={<ComingSoon isPublic={true} title="Contact Us" description="Have questions or need support? Reach out to our team - we'd love to hear from you." />} />

            <Route element={<ProtectedRoute><UserLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<ProtectedRoute requiredRole={["user", "vendor"]}><UserDashboard /></ProtectedRoute>} />
              <Route path="/vendor/dashboard" element={<ProtectedRoute requiredRole={["vendor"]}><VendorDashboard /></ProtectedRoute>} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/marketplace/:serviceId" element={<ServiceDetail />} />
              <Route path="/vendor/register" element={<ProtectedRoute requiredRole={["vendor"]}><VendorRegister /></ProtectedRoute>} />
              <Route path="/vendor/availability" element={<ProtectedRoute requiredRole={["vendor"]}><VendorAvailability /></ProtectedRoute>} />
              <Route path="/vendor/bookings" element={<ProtectedRoute requiredRole={["vendor"]}><VendorBookings /></ProtectedRoute>} />
              <Route path="/vendor/bookings/:bookingId" element={<ProtectedRoute requiredRole={["vendor"]}><VendorBookings /></ProtectedRoute>} />
              <Route path="/vendor/services" element={<ProtectedRoute requiredRole={["vendor"]}><VendorServices /></ProtectedRoute>} />
              <Route path="/service/register" element={<ProtectedRoute requiredRole={["vendor"]}><ServiceRegister /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute requiredRole={["user", "vendor"]}><ComingSoon title="My Events" description="Manage all your upcoming and past events in one place. Create, edit, and track event status seamlessly." /></ProtectedRoute>} />
              <Route path="/bookings" element={<ProtectedRoute requiredRole={["user", "vendor"]}><CustomerBookings /></ProtectedRoute>} />
              <Route path="/bookings/:bookingId" element={<ProtectedRoute requiredRole={["user", "vendor"]}><CustomerBookings /></ProtectedRoute>} />
              <Route path="/reviews" element={<ProtectedRoute requiredRole={["user", "vendor"]}><ReviewsPage /></ProtectedRoute>} />
              <Route path="/notifications" element={<NotificationCenter />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/settings" element={<NotificationSettings />} />
              <Route path="/crew/jobs" element={<ProtectedRoute requiredRole={["crew"]}><ComingSoon title="Crew Job Board" description="Browse available event crew positions, submit applications, and manage your active assignments." /></ProtectedRoute>} />
            </Route>

            <Route element={<ProtectedRoute requiredRole={["admin", "super_admin"]}><AdminLayout /></ProtectedRoute>}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/verifications/services" element={<ServiceVerificationQueue />} />
              <Route path="/admin/verifications/vendors" element={<VendorVerificationQueue />} />
              <Route path="/admin/bookings" element={<AdminBookings />} />
              <Route path="/admin/bookings/:bookingId" element={<AdminBookingDetail />} />
              <Route path="/admin/verifications/crew" element={<ComingSoon title="Crew Verification Queue" description="Review and process IC verification documents submitted by event crew members." />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/users/:userId" element={<AdminUserDetail />} />
              <Route path="/admin/conflicts" element={<ComingSoon title="Conflict Monitor" description="Monitor and resolve conflicts between organizers, vendors, and crew members on the platform." />} />
              <Route path="/admin/disputes" element={<ComingSoon title="Dispute Resolution" description="Review and mediate financial disputes between organizers and service providers." />} />
              <Route path="/admin/escrow/releases" element={<ComingSoon title="Escrow Releases" description="Approve, freeze, or release escrow funds tied to completed or disputed bookings." />} />
              <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
              <Route path="/admin/audit-logs/:auditLogId" element={<AdminAuditDetail />} />
              <Route path="/admin/reports" element={<AdminOperationsReport />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>

            <Route path="/admin/panel" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="*" element={<ComingSoon title="Page Not Found" description="The page you're looking for doesn't exist or has been moved." />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}

export default App
