import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AdminPanel from './components/AdminPanel';
import ContestPage from './components/ContestPage';
import LoginPage from './components/LoginPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Toaster position="top-right" />
        <Routes>
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/contest" element={<ContestPage />} />
          <Route path="/" element={<LoginPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;