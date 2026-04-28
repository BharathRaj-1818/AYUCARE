import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PatientPortalProvider, usePatientPortal } from './context/PatientPortalContext';
import Layout from './components/Layout';

// ── Dietitian pages ──────────────────────────────────────────
import Login           from './pages/Login';
import Register        from './pages/Register';
import Dashboard       from './pages/Dashboard';
import Patients        from './pages/Patients';
import PatientForm     from './pages/PatientForm';
import PatientDetail   from './pages/PatientDetail';
import Foods           from './pages/Foods';
import DietCharts      from './pages/DietCharts';
import DietChartForm   from './pages/DietChartForm';
import DietChartDetail from './pages/DietChartDetail';
import Recipes         from './pages/Recipes';
import RecipeForm      from './pages/RecipeForm';
import RecipeDetail    from './pages/RecipeDetail';
import Settings        from './pages/Settings';
import PrakritiQuiz    from './pages/PrakritiQuiz';
import Appointments    from './pages/Appointments';
import Herbs           from './pages/Herbs';

// ── Patient portal pages ─────────────────────────────────────
import PatientLogin        from './pages/patient-portal/PatientLogin';
import PatientRegister     from './pages/patient-portal/PatientRegister';
import PatientDashboard    from './pages/patient-portal/PatientDashboard';
import { PatientDietCharts, PatientDietChartDetail } from './pages/patient-portal/PatientDietCharts';
import PatientPrakriti     from './pages/patient-portal/PatientPrakriti';
import PatientProgress     from './pages/patient-portal/PatientProgress';
import PatientAppointments from './pages/patient-portal/PatientAppointments';
import PatientLayout       from './components/patient/PatientLayout';

import './App.css';

// ============================================================
// SHARED SPINNER
// ============================================================
const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#FAFAF5]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700" />
  </div>
);

// ============================================================
// ROUTE GUARDS
// ============================================================

/** Dietitian protected — redirects to /login if not authenticated */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
};

/** Dietitian public — redirects to /dashboard if already logged in */
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Spinner />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};

/** Patient public — redirects to /patient/dashboard if already logged in */
const PatientPublicRoute = ({ children }) => {
  const { patientUser, loading } = usePatientPortal();
  if (loading) return <Spinner />;
  if (patientUser) return <Navigate to="/patient/dashboard" replace />;
  return children;
};

/** Patient protected — redirects to /patient/login if not authenticated */
const PatientProtectedRoute = ({ children }) => {
  const { patientUser, loading } = usePatientPortal();
  if (loading) return <Spinner />;
  if (!patientUser) return <Navigate to="/patient/login" replace />;
  return <PatientLayout>{children}</PatientLayout>;
};

// ============================================================
// ROUTES
// ============================================================
function AppRoutes() {
  return (
    <Routes>

      {/* ── Dietitian public ── */}
      <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* ── Dietitian protected ── */}
      <Route path="/dashboard"                  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/patients"                   element={<ProtectedRoute><Patients /></ProtectedRoute>} />
      <Route path="/patients/new"               element={<ProtectedRoute><PatientForm /></ProtectedRoute>} />
      <Route path="/patients/:id"               element={<ProtectedRoute><PatientDetail /></ProtectedRoute>} />
      <Route path="/patients/:id/edit"          element={<ProtectedRoute><PatientForm /></ProtectedRoute>} />
      <Route path="/patients/:id/prakriti-quiz" element={<ProtectedRoute><PrakritiQuiz /></ProtectedRoute>} />
      <Route path="/foods"                      element={<ProtectedRoute><Foods /></ProtectedRoute>} />
      <Route path="/diet-charts"                element={<ProtectedRoute><DietCharts /></ProtectedRoute>} />
      <Route path="/diet-charts/new"            element={<ProtectedRoute><DietChartForm /></ProtectedRoute>} />
      <Route path="/diet-charts/:id"            element={<ProtectedRoute><DietChartDetail /></ProtectedRoute>} />
      <Route path="/recipes"                    element={<ProtectedRoute><Recipes /></ProtectedRoute>} />
      <Route path="/recipes/new"                element={<ProtectedRoute><RecipeForm /></ProtectedRoute>} />
      <Route path="/recipes/:id"                element={<ProtectedRoute><RecipeDetail /></ProtectedRoute>} />
      <Route path="/settings"                   element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/herbs"                      element={<ProtectedRoute><Herbs /></ProtectedRoute>} />
      <Route path="/appointments"               element={<ProtectedRoute><Appointments /></ProtectedRoute>} />

      {/* ── Patient portal public ── */}
      <Route path="/patient/login"    element={<PatientPublicRoute><PatientLogin /></PatientPublicRoute>} />
      <Route path="/patient/register" element={<PatientPublicRoute><PatientRegister /></PatientPublicRoute>} />

      {/* ── Patient portal protected ── */}
      <Route path="/patient/dashboard"       element={<PatientProtectedRoute><PatientDashboard /></PatientProtectedRoute>} />
      <Route path="/patient/diet-charts"     element={<PatientProtectedRoute><PatientDietCharts /></PatientProtectedRoute>} />
      <Route path="/patient/diet-charts/:id" element={<PatientProtectedRoute><PatientDietChartDetail /></PatientProtectedRoute>} />
      <Route path="/patient/prakriti"        element={<PatientProtectedRoute><PatientPrakriti /></PatientProtectedRoute>} />
      <Route path="/patient/progress"        element={<PatientProtectedRoute><PatientProgress /></PatientProtectedRoute>} />
      <Route path="/patient/appointments"    element={<PatientProtectedRoute><PatientAppointments /></PatientProtectedRoute>} />

      {/* ── Fallbacks ── */}
      <Route path="/"  element={<Navigate to="/dashboard" replace />} />
      <Route path="*"  element={<Navigate to="/dashboard" replace />} />

    </Routes>
  );
}

// ============================================================
// APP ROOT
// ============================================================
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PatientPortalProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#2F5233', color: 'white', border: 'none' },
            }}
          />
        </PatientPortalProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;