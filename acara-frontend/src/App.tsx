
import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom"
import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/register/Register";
import UserDashboard from './features/dashboard/pages/UserDashboard';
import ServiceRegister from './features/auth/pages/register/ServiceRegister';
import VendorRegister from './features/auth/pages/register/VendorRegister';
import Navbar from './features/header/pages/navbar';
import Marketplace from './features/marketplace/pages/Marketplace';
import LandingPage from './features/landing_page/pages/LandingPage';
import AdminDashboard from './features/dashboard/pages/AdminDashboard';
import VendorVerificationQueue from './features/dashboard/pages/VendorVerificationQueue';
import Register_admin from './features/register_admin/pages/Register_admin';
import CompleteProfile from './features/auth/pages/CompleteProfile';
import AuthSessionManager from './components/common/AuthSessionManager';
// import AdminDashboard from './features/dashboard/pages/AdminDashboard';

function App() {
  return (
    <BrowserRouter>
      <AuthSessionManager />
      <div className="App">

        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/navbar" element={<Navbar />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/crew/jobs" element={<div>Crew Jobs</div>} />
          <Route path="/admin/panel" element={<div>Admin Panel</div>} />
          <Route path="/admin/register" element={<Register_admin />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          {/* <Route path="/marketplace" element={<Marketplace />} /> */}
          <Route path="/vendor/register" element={<VendorRegister />} />
          <Route path="/service/register" element={<ServiceRegister />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/verifications/vendors" element={<VendorVerificationQueue />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App
