
import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom"
import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/register/Register";
import UserDashboard from './features/dashboard/pages/UserDashboard';
import Navbar from './features/header/pages/navbar';
import Marketplace from './features/marketplace/pages/marketplace';

function App() {
  return (
    <BrowserRouter>
      <div className="App">

        <Routes>
          <Route path="/" element={<h1>Acara Dashboard</h1>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/navbar" element={<Navbar />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/dashboard" element={<div>Vendor Dashboard</div>} />
          <Route path="/crew/jobs" element={<div>Crew Jobs</div>} />
          <Route path="/admin/panel" element={<div>Admin Panel</div>} />
          <Route path="/marketplace" element={<Marketplace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App
