import { useState, type JSX } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom"
import Login from "./pages/Login";

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* User */}
        <Route path="/dashboard" element={<div>User Dashboard</div>} />

        {/* Vendor */}
        <Route path="/vendor/dashboard" element={<div>Vendor Dashboard</div>} />

        {/* Crew */}
        <Route path="/crew/jobs" element={<div>Crew Jobs</div>} />

        {/* Admin */}
        <Route path="/admin/panel" element={<div>Admin Panel</div>} />
      </Routes>
    </BrowserRouter>
  );
}


export default App
