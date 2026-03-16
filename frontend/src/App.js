import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientForm from './pages/PatientForm';
import PatientDetail from './pages/PatientDetail';
import Foods from './pages/Foods';
import DietCharts from './pages/DietCharts';
import DietChartForm from './pages/DietChartForm';
import DietChartDetail from './pages/DietChartDetail';
import Recipes from './pages/Recipes';
import Settings from './pages/Settings';

import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF5]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

// Public Route Component (redirect to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF5]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      <Route 
        path="/register" 
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } 
      />
      
      {/* Protected Routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Patients */}
      <Route 
        path="/patients" 
        element={
          <ProtectedRoute>
            <Patients />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/patients/new" 
        element={
          <ProtectedRoute>
            <PatientForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/patients/:id" 
        element={
          <ProtectedRoute>
            <PatientDetail />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/patients/:id/edit" 
        element={
          <ProtectedRoute>
            <PatientForm />
          </ProtectedRoute>
        } 
      />
      
      {/* Foods */}
      <Route 
        path="/foods" 
        element={
          <ProtectedRoute>
            <Foods />
          </ProtectedRoute>
        } 
      />
      
      {/* Diet Charts */}
      <Route 
        path="/diet-charts" 
        element={
          <ProtectedRoute>
            <DietCharts />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/diet-charts/new" 
        element={
          <ProtectedRoute>
            <DietChartForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/diet-charts/:id" 
        element={
          <ProtectedRoute>
            <DietChartDetail />
          </ProtectedRoute>
        } 
      />
      
      {/* Recipes */}
      <Route 
        path="/recipes" 
        element={
          <ProtectedRoute>
            <Recipes />
          </ProtectedRoute>
        } 
      />
      
      {/* Settings */}
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } 
      />
      
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#2F5233',
              color: 'white',
              border: 'none',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
