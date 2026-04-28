import './App.css'
import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import AuthSessionManager from './components/common/AuthSessionManager';
import ComingSoon from './components/common/ComingSoon';
import ProtectedRoute from './components/common/ProtectedRoute';

import UserLayout from './components/layouts/UserLayout';
import AdminLayout from './components/layouts/AdminLayout';

const Login = lazy(() => import("./features/auth/pages/Login"));
const Register = lazy(() => import("./features/auth/pages/register/Register"));
const UserDashboard = lazy(() => import('./features/dashboard/pages/UserDashboard'));
const ServiceRegister = lazy(() => import('./features/auth/pages/register/ServiceRegister'));
const VendorRegister = lazy(() => import('./features/auth/pages/register/VendorRegister'));
const Marketplace = lazy(() => import('./features/marketplace/pages/Marketplace'));
const LandingPage = lazy(() => import('./features/landing_page/pages/LandingPage'));
const AdminDashboard = lazy(() => import('./features/dashboard/pages/AdminDashboard'));
const VendorVerificationQueue = lazy(() => import('./features/dashboard/pages/VendorVerificationQueue'));
const ServiceVerificationQueue = lazy(() => import('./features/dashboard/pages/ServiceVerificationQueue'));
const Register_admin = lazy(() => import('./features/register_admin/pages/Register_admin'));
const CompleteProfile = lazy(() => import('./features/auth/pages/CompleteProfile'));

function App() {
  return (
    <BrowserRouter>
      <AuthSessionManager />
      <div className="App">
        <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/admin/register" element={<Register_admin />} />

            <Route path="/about" element={<ComingSoon isPublic={true} title="About ACARA" description="Learn about our mission to revolutionize event planning in Malaysia. Meet the team behind the platform." />} />
            <Route path="/contact" element={<ComingSoon isPublic={true} title="Contact Us" description="Have questions or need support? Reach out to our team - we'd love to hear from you." />} />

            <Route element={<ProtectedRoute><UserLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/vendor/register" element={<VendorRegister />} />
              <Route path="/service/register" element={<ServiceRegister />} />
              <Route path="/events" element={<ComingSoon title="My Events" description="Manage all your upcoming and past events in one place. Create, edit, and track event status seamlessly." />} />
              <Route path="/bookings" element={<ComingSoon title="My Bookings" description="View and manage your vendor bookings, check payment status, and coordinate with service providers." />} />
              <Route path="/reviews" element={<ComingSoon title="Reviews" description="Write and read reviews for vendors. Help the community by sharing your experience." />} />
              <Route path="/notifications" element={<ComingSoon title="Notifications" description="Stay on top of updates - booking confirmations, vendor replies, and platform announcements." />} />
              <Route path="/profile" element={<ComingSoon title="My Profile" description="Update your personal information, profile picture, and account preferences." />} />
              <Route path="/settings" element={<ComingSoon title="Settings" description="Manage your account settings, notification preferences, and security options." />} />
              <Route path="/crew/jobs" element={<ComingSoon title="Crew Job Board" description="Browse available event crew positions, submit applications, and manage your active assignments." />} />
            </Route>

            <Route element={<ProtectedRoute requiredRole={["admin", "super_admin"]}><AdminLayout /></ProtectedRoute>}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/verifications/services" element={<ServiceVerificationQueue />} />
              <Route path="/admin/verifications/vendors" element={<VendorVerificationQueue />} />
              <Route path="/admin/verifications/crew" element={<ComingSoon title="Crew Verification Queue" description="Review and process IC verification documents submitted by event crew members." />} />
              <Route path="/admin/users" element={<ComingSoon title="User Management" description="View, manage, and moderate all registered users, organizers, vendors, and crew members." />} />
              <Route path="/admin/conflicts" element={<ComingSoon title="Conflict Monitor" description="Monitor and resolve conflicts between organizers, vendors, and crew members on the platform." />} />
              <Route path="/admin/disputes" element={<ComingSoon title="Dispute Resolution" description="Review and mediate financial disputes between organizers and service providers." />} />
              <Route path="/admin/escrow/releases" element={<ComingSoon title="Escrow Releases" description="Approve, freeze, or release escrow funds tied to completed or disputed bookings." />} />
              <Route path="/admin/audit-logs" element={<ComingSoon title="Audit Logs" description="View a complete history of all admin actions taken on the platform for compliance and accountability." />} />
              <Route path="/admin/settings" element={<ComingSoon title="Admin Settings" description="Configure platform-wide settings, fee structures, and notification rules." />} />
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
