import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Context
import { AuthProvider } from "./context/AuthContext";

// Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

// Dashboards
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import FarmerDashboard from "./pages/dashboards/FarmerDashboard";
import VetDashboard from "./pages/dashboards/VetDashboard";

// Vendor
import VendorProtectedRoute from "./routes/VendorProtectedRoute";
import VendorLayout from "./layouts/VendorLayout";
import VendorDashboard from "./pages/vendor/VendorDashboard";
import VendorProfile from "./pages/vendor/VendorProfile";
import NearbyFarms from "./pages/vendor/NearbyFarms";
import Alerts from "./pages/vendor/Alerts";
import OutbreakAlerts from "./pages/vendor/OutbreakAlerts";
import MapView from "./pages/vendor/MapView";

import ProtectedRoute from "./pages/routes/ProtectedRoute";

function App() {
  return (
    <AuthProvider>   {/* ← Must wrap everything */}
      <BrowserRouter>
        <Routes>
          {/* Auth Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute role="Admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/dashboard"
            element={
              <ProtectedRoute role="Farmer">
                <FarmerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vet/dashboard"
            element={
              <ProtectedRoute role="Veterinarian">
                <VetDashboard />
              </ProtectedRoute>
            }
          />

          {/* Vendor Routes */}
          <Route
            path="/vendor"
            element={
              <VendorProtectedRoute>
                <VendorLayout />
              </VendorProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<VendorDashboard />} />
            <Route path="profile" element={<VendorProfile />} />
            <Route path="nearby-farms" element={<NearbyFarms />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="outbreak-alerts" element={<OutbreakAlerts />} />
            <Route path="map-view" element={<MapView />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>

        <ToastContainer 
          position="top-right" 
          autoClose={3000} 
          hideProgressBar={false}
          newestOnTop
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;