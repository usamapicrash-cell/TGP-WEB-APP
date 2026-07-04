import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ProtectedRoute from './components/ProtectedRoute';

// --- Global Voice Call Context & Component ---
import { CallProvider } from './context/CallingContext';
import GlobalCallWidget from './components/GlobalCallWidget'; // Yeh aapka call panel component hai

// Layouts
import AdminLayout from './layouts/AdminLayout';
import GlazierLayout from './layouts/GlazierLayout';
import ExecutiveLayout from './layouts/ExecutiveLayout';

// Pages
import Login from './components/Login';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminLeads from './pages/admin/Leads';
import WorkOrder from './pages/admin/WorkOrder';
import AdminPurchaseOrder from './pages/admin/PurchaseOrder';
import AdminCalendar from './pages/admin/Calendar';
import Messages from './pages/admin/Messages';

// --- New Admin Pages ---
import AdminGlaziers from './pages/admin/Glaziers'; // New
import AdminSuppliers from './pages/admin/Suppliers'; // New
import AdminAppointments from './pages/admin/Appointments'; // New
import AdminProfile from './pages/admin/Profile'; // New

// Executive Pages
import ExecutiveDashboard from './pages/executive/Dashboard';

// Glazier Pages
import GlazierDashboard from './pages/glazier/Dashboard';
import Tasks from './pages/glazier/Tasks';
import Schedule from './pages/glazier/Schedule';
import Drawing from './pages/glazier/Drawing';
import Files from './pages/glazier/Files';
import Profile from './pages/glazier/Profile';
import JobDetails from './pages/glazier/JobDetails';

import NotFoundPage from './pages/NotFoundPage';
import { Toaster } from 'react-hot-toast';

// --- Helper Component to Set Document Title ---
const PageTitle = ({ title, children }) => {
  useEffect(() => {
    document.title = `The Glass People | ${title}`;
  }, [title]);
  return children;
};

const AuthRedirectWrapper = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <>
    <CallProvider> {/* Poori app ko Voice Channel ke pipeline se wrap kiya */}
      <Toaster position="top-right" reverseOrder={false} />
      {/* Dynamic Voice Call overlay hamesha routes ke baahar background me run karegi */}
      <GlobalCallWidget />
      <Routes>
        <Route path="/login" element={<PageTitle title="Login"><Login /></PageTitle>} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* --- 1. Executive PANEL --- */}
        <Route element={<ProtectedRoute allowedRoles={['executive']} />}>
          <Route path="/executive" element={<ExecutiveLayout />}>
            <Route index element={<Navigate to="/executive/dashboard" />} />
            <Route path="dashboard" element={
              <PageTitle title="Executive Dashboard"><ExecutiveDashboard /></PageTitle>
            } />
          </Route>
        </Route>

        {/* --- 2. ADMIN PANEL --- */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" />} />
            <Route path="dashboard" element={
              <PageTitle title="Dashboard"><AdminDashboard /></PageTitle>
            } />
            <Route path="leads" element={
              <PageTitle title="Leads"><AdminLeads /></PageTitle>
            } />
            <Route path="work-order" element={
              <PageTitle title="Work Orders"><WorkOrder /></PageTitle>
            } />
            <Route path="purchase-order" element={
              <PageTitle title="Purchase Orders"><AdminPurchaseOrder /></PageTitle>
            } />
            <Route path="calendar" element={
              <PageTitle title="Calendar"><AdminCalendar /></PageTitle>
            } />
            
            {/* --- Added Routes --- */}
            <Route path="glaziers" element={
              <PageTitle title="Glaziers"><AdminGlaziers /></PageTitle>
            } />
            <Route path="suppliers" element={
              <PageTitle title="Suppliers"><AdminSuppliers /></PageTitle>
            } />
            <Route path="appointments" element={
              <PageTitle title="Appointments"><AdminAppointments /></PageTitle>
            } />
            <Route path="profile" element={
              <PageTitle title="Admin Profile"><AdminProfile /></PageTitle>
            } />
             <Route path="messages" element={
              <PageTitle title="Messages"><Messages /></PageTitle>
            } />
          </Route>
        </Route>

        {/* --- ADMIN PANEL (Path changed from /admin to /glazier) --- */}
      <Route element={<ProtectedRoute allowedRoles={['glazier']} />}>
        {/* Path ko yahan 'glazier' kar dein */}
        <Route path="/glazier" element={<GlazierLayout />}> 
          <Route index element={<Navigate to="/glazier/dashboard" />} />

          <Route path="dashboard" element={
            <PageTitle title="Dashboard"><GlazierDashboard /></PageTitle>
          } />
          <Route path="tasks" element={
            <PageTitle title="Tasks"><Tasks /></PageTitle>
          } />
          <Route path="schedule" element={
            <PageTitle title="Schedule"><Schedule /></PageTitle>
          } />
           <Route path="drawing/:jobId?" element={
            <PageTitle title="Drawing"><Drawing /></PageTitle>
          } />
          <Route path="files" element={
            <PageTitle title="Files"><Files /></PageTitle>
          } />

          <Route path="job-details/:id" element={
            <PageTitle title="Job Detail"><JobDetails /></PageTitle>
          } />

          <Route path="profile" element={
            <PageTitle title="Profile"><Profile /></PageTitle>
          } />
        </Route>
      </Route>

        <Route path="*" element={
          <AuthRedirectWrapper>
            <NotFoundPage />
          </AuthRedirectWrapper>
        } />
      </Routes>
      </CallProvider>
    </>
  );
}

export default App;