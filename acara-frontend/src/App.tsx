import { useState} from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import Login from "./pages/Login";
import UserDashboard from './pages/dashboard/UserDashboard';

function App() { 
  return (
    <BrowserRouter>
     <div className="App">
        <nav style={{ display: 'flex', gap: '10px', padding: '1rem' }}>
          <Link to="/login">Login</Link> |
          <Link to="/dashboard">Dashboard</Link> |
          <Link to="/dashboard">Vendor</Link> |
          <Link to="/admin/panel">Admin</Link>
        </nav>
        <hr />

        <Routes>
           <Route path="/" element={<h1>Acara Dashboard</h1>} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/dashboard" element={<div>Vendor Dashboard</div>} />
          <Route path="/crew/jobs" element={<div>Crew Jobs</div>} />
          <Route path="/admin/panel" element={<div>Admin Panel</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}


export default App
