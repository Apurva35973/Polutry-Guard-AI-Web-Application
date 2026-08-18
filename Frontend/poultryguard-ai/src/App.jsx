// import {
//   BrowserRouter,
//   Routes,
//   Route,
//   Navigate
// } from "react-router-dom";
// import { ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// // Context
// import { AuthProvider } from "./context/AuthContext";

// // Pages
// import Login from "./pages/auth/Login";
// import Register from "./pages/auth/Register";

// // Dashboards
// import AdminDashboard from "./pages/admin/AdminDashboard";
// import FarmerDashboard from "./pages/dashboards/FarmerDashboard";
// import VetDashboard from "./pages/dashboards/VetDashboard";

// // Vendor
// import VendorProtectedRoute from "./routes/VendorProtectedRoute";
// import VendorLayout from "./layouts/VendorLayout";
// import VendorDashboard from "./pages/vendor/VendorDashboard";
// import VendorProfile from "./pages/vendor/VendorProfile";
// import NearbyFarms from "./pages/vendor/NearbyFarms";
// import Alerts from "./pages/vendor/Alerts";
// import OutbreakAlerts from "./pages/vendor/OutbreakAlerts";
// import MapView from "./pages/vendor/MapView";

// import ProtectedRoute from "./pages/routes/ProtectedRoute";

// function App() {
//   return (
//     <AuthProvider>   {/* ← Must wrap everything */}
//       <BrowserRouter>
//         <Routes>
//           {/* Auth Routes */}
//           <Route path="/" element={<Login />} />
//           <Route path="/login" element={<Login />} />
//           <Route path="/register" element={<Register />} />

//           {/* Protected Routes */}
//           <Route
//             path="/admin/dashboard"
//             element={
//               <ProtectedRoute role="Admin">
//                 <AdminDashboard />
//               </ProtectedRoute>
//             }
//           />
//           <Route
//             path="/farmer/dashboard"
//             element={
//               <ProtectedRoute role="Farmer">
//                 <FarmerDashboard />
//               </ProtectedRoute>
//             }
//           />
//           <Route
//             path="/vet/dashboard"
//             element={
//               <ProtectedRoute role="Veterinarian">
//                 <VetDashboard />
//               </ProtectedRoute>
//             }
//           />

//           {/* Vendor Routes */}
//           <Route
//             path="/vendor"
//             element={
//               <VendorProtectedRoute>
//                 <VendorLayout />
//               </VendorProtectedRoute>
//             }
//           >
//             <Route index element={<Navigate to="dashboard" replace />} />
//             <Route path="dashboard" element={<VendorDashboard />} />
//             <Route path="profile" element={<VendorProfile />} />
//             <Route path="nearby-farms" element={<NearbyFarms />} />
//             <Route path="alerts" element={<Alerts />} />
//             <Route path="outbreak-alerts" element={<OutbreakAlerts />} />
//             <Route path="map-view" element={<MapView />} />
//           </Route>

//           <Route path="*" element={<Navigate to="/login" replace />} />
//         </Routes>

//         <ToastContainer 
//           position="top-right" 
//           autoClose={3000} 
//           hideProgressBar={false}
//           newestOnTop
//         />
//       </BrowserRouter>
//     </AuthProvider>
//   );
// }

// export default App;

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Context
import { AuthProvider } from "./context/AuthContext";

// Auth Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

// Protected Routes
import ProtectedRoute from "./pages/routes/ProtectedRoute";
import VendorProtectedRoute from "./routes/VendorProtectedRoute";
import AdminProtectedRoute from "./routes/AdminProtectedRoute";

// Admin Layout
import AdminLayout from "./layouts/AdminLayout";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageFarmers from "./pages/admin/ManageFarmers";
import ManageVeterinarians from "./pages/admin/ManageVeterinarians";
import ManageVendors from "./pages/admin/ManageVendors";
import ManageDevices from "./pages/admin/ManageDevices";
import AlertsMonitoring from "./pages/admin/AlertsMonitoring";
import OutbreakMonitoring from "./pages/admin/OutbreakMonitoring";
import Analytics from "./pages/admin/Analytics";
import Profile from "./pages/admin/Profile";
import AdminOperations from "./pages/admin/AdminOperations";

// Farmer & Vet
import FarmerDashboard from "./pages/dashboards/FarmerDashboard";
import FarmerProfileCompletion from "./pages/farmer/FarmerProfileCompletion";
import FarmerOperations from "./pages/farmer/FarmerOperations";
import FarmerLayout from "./layouts/FarmerLayout";
import VetDashboard from "./pages/dashboards/VetDashboard";
import VetProfileCompletion from "./pages/vet/VetProfileCompletion";
import VetLayout from "./layouts/VetLayout";
import VetCases from "./pages/vet/VetCases";
import VetAlerts from "./pages/vet/VetAlerts";
import VetFarmers from "./pages/vet/VetFarmers";
import VetConsultations from "./pages/vet/VetConsultations";
import VetReports from "./pages/vet/VetReports";

// Vendor Layout
import VendorLayout from "./layouts/VendorLayout";

// Vendor Pages
import VendorDashboard from "./pages/vendor/VendorDashboard";
import VendorProfile from "./pages/vendor/VendorProfile";
import NearbyFarms from "./pages/vendor/NearbyFarms";
import Alerts from "./pages/vendor/Alerts";
import OutbreakAlerts from "./pages/vendor/OutbreakAlerts";
import MapView from "./pages/vendor/MapView";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ================= AUTH ================= */}

          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ================= ADMIN ================= */}

          <Route
            path="/admin"
            element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }
          >
            <Route
              index
              element={<Navigate to="dashboard" replace />}
            />

            <Route
              path="dashboard"
              element={<AdminDashboard />}
            />

            <Route
              path="farmers"
              element={<ManageFarmers />}
            />
            <Route path="people" element={<AdminOperations initialTab="people" />} />
            <Route path="hardware" element={<AdminOperations initialTab="hardware" />} />
            <Route path="support" element={<AdminOperations initialTab="support" />} />

            <Route
              path="vets"
              element={<ManageVeterinarians />}
            />

            <Route
              path="veterinarians"
              element={<ManageVeterinarians />}
            />

            <Route
              path="vendors"
              element={<ManageVendors />}
            />

            <Route
              path="devices"
              element={<ManageDevices />}
            />

            <Route
              path="alerts"
              element={<AlertsMonitoring />}
            />

            <Route
              path="outbreaks"
              element={<OutbreakMonitoring />}
            />

            <Route
              path="analytics"
              element={<Analytics />}
            />

            <Route
              path="profile"
              element={<Profile />}
            />
          </Route>

          {/* ================= FARMER ================= */}

          <Route
            path="/farmer/complete-profile"
            element={
              <ProtectedRoute role="Farmer">
                <FarmerProfileCompletion />
              </ProtectedRoute>
            }
          />

          <Route path="/farmer" element={<ProtectedRoute role="Farmer"><FarmerLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<FarmerDashboard />} />
            <Route path="monitoring" element={<FarmerOperations page="monitoring" />} />
            <Route path="health" element={<FarmerOperations page="health" />} />
            <Route path="mortality" element={<FarmerOperations page="mortality" />} />
            <Route path="alerts" element={<FarmerOperations page="alerts" />} />
            <Route path="reminders" element={<FarmerOperations page="reminders" />} />
            <Route path="reports" element={<FarmerOperations page="reports" />} />
            <Route path="devices" element={<FarmerOperations page="devices" />} />
            <Route path="profile" element={<FarmerOperations page="profile" />} />
          </Route>

          {/* ================= VET ================= */}

          <Route path="/vet/complete-profile" element={<ProtectedRoute role="Veterinarian"><VetProfileCompletion /></ProtectedRoute>} />

          <Route path="/vet" element={<ProtectedRoute role="Veterinarian"><VetLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<VetDashboard />} />
            <Route path="cases" element={<VetCases />} />
            <Route path="alerts" element={<VetAlerts />} />
            <Route path="farmers" element={<VetFarmers />} />
            <Route path="consultations" element={<VetConsultations />} />
            <Route path="reports" element={<VetReports />} />
          </Route>

          {/* ================= VENDOR ================= */}

          <Route
            path="/vendor"
            element={
              <VendorProtectedRoute>
                <VendorLayout />
              </VendorProtectedRoute>
            }
          >
            <Route
              index
              element={<Navigate to="dashboard" replace />}
            />

            <Route
              path="dashboard"
              element={<VendorDashboard />}
            />

            <Route
              path="profile"
              element={<VendorProfile />}
            />

            <Route
              path="nearby-farms"
              element={<NearbyFarms />}
            />

            <Route
              path="alerts"
              element={<Alerts />}
            />

            <Route
              path="outbreak-alerts"
              element={<OutbreakAlerts />}
            />

            <Route
              path="map-view"
              element={<MapView />}
            />
          </Route>

          {/* ================= FALLBACK ================= */}

          <Route
            path="*"
            element={<Navigate to="/login" replace />}
          />

        </Routes>

        <ToastContainer
          position="top-right"
          autoClose={3000}
          newestOnTop
          hideProgressBar={false}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
