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
const ServiceVerificationQueue = lazy(() => import('./features/dashboard/pages/ServiceVerificationQueue'));
const UserProfile = lazy(() => import('./features/profile/pages/UserProfile'));
const CustomerBookings = lazy(() => import('./features/bookings/pages/CustomerBookings'));
const AdminBookings = lazy(() => import('./features/bookings/pages/AdminBookings'));


function App() {
  return (
    <BrowserRouter>
      <AuthSessionManager />
      <div className="App">
        <Suspense fallback={<Loader fullScreen message="Loading page..." />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/admin/register" element={<Register_admin />} />
            <Route path="/about" element={<ComingSoon isPublic={true} title="About ACARA" description="Learn about our mission to revolutionize event planning in Malaysia. Meet the team behind the platform." />} />
            <Route path="/contact" element={<ComingSoon isPublic={true} title="Contact Us" description="Have questions or need support? Reach out to our team - we'd love to hear from you." />} />

            <Route element={<ProtectedRoute><UserLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<ProtectedRoute requiredRole={["user"]}><UserDashboard /></ProtectedRoute>} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/marketplace/:serviceId" element={<ServiceDetail />} />
              <Route path="/vendor/register" element={<ProtectedRoute requiredRole={["vendor"]}><VendorRegister /></ProtectedRoute>} />
              <Route path="/vendor/availability" element={<ProtectedRoute requiredRole={["vendor"]}><VendorAvailability /></ProtectedRoute>} />
              <Route path="/vendor/bookings" element={<ProtectedRoute requiredRole={["vendor"]}><VendorBookings /></ProtectedRoute>} />
              <Route path="/service/register" element={<ProtectedRoute requiredRole={["vendor"]}><ServiceRegister /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute requiredRole={["user"]}><ComingSoon title="My Events" description="Manage all your upcoming and past events in one place. Create, edit, and track event status seamlessly." /></ProtectedRoute>} />
              <Route path="/bookings" element={<ProtectedRoute requiredRole={["user"]}><CustomerBookings /></ProtectedRoute>} />
              <Route path="/reviews" element={<ComingSoon title="Reviews" description="Write and read reviews for vendors. Help the community by sharing your experience." />} />
              <Route path="/notifications" element={<ComingSoon title="Notifications" description="Stay on top of updates - booking confirmations, vendor replies, and platform announcements." />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/settings" element={<ComingSoon title="Settings" description="Manage your account settings, notification preferences, and security options." />} />
              <Route path="/crew/jobs" element={<ProtectedRoute requiredRole={["crew"]}><ComingSoon title="Crew Job Board" description="Browse available event crew positions, submit applications, and manage your active assignments." /></ProtectedRoute>} />
            </Route>

            <Route element={<ProtectedRoute requiredRole={["admin", "super_admin"]}><AdminLayout /></ProtectedRoute>}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/verifications/services" element={<ServiceVerificationQueue />} />
              <Route path="/admin/verifications/vendors" element={<VendorVerificationQueue />} />
              <Route path="/admin/bookings" element={<AdminBookings />} />
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
