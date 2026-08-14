import axios from "axios";
import { toast } from "react-toastify";

const BASE_URL = "http://localhost:5000";

// ─── Axios Instance ───────────────────────────────────────────────────────────
const adminApi = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// ─── Request Interceptor: Attach JWT ─────────────────────────────────────────
adminApi.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Handle Errors ─────────────────────────────────────
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      toast.error("Network error. Please check your connection.");
    } else if (error.response.status === 401) {
      toast.error("Session expired. Please log in again.");
      sessionStorage.clear();
      window.location.href = "/login";
    } else if (error.response.status === 500) {
      toast.error("Server error. Please try again later.");
    } else if (error.response.status === 403) {
      toast.error("Access denied. Admin privileges required.");
    }
    return Promise.reject(error);
  }
);

const unwrap = (res) => res.data;

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboardStats = () =>
  adminApi.get("/admin/dashboard/stats").then(unwrap);

// ─── Farmers ─────────────────────────────────────────────────────────────────
export const getAllFarmers = () =>
  adminApi.get("/admin/farmers/all").then(unwrap);

export const addFarmer = (data) =>
  adminApi.post("/admin/farmer/add", data).then(unwrap);

export const updateFarmer = (farmer_id, data) =>
  adminApi.put(`/admin/farmer/update?farmer_id=${farmer_id}`, data).then(unwrap);

export const deleteFarmer = (farmer_id) =>
  adminApi.delete(`/admin/farmer/delete?farmer_id=${farmer_id}`).then(unwrap);

// ─── Veterinarians ────────────────────────────────────────────────────────────
export const getAllVets = () =>
  adminApi.get("/admin/vets/all").then(unwrap);

export const addVet = (data) =>
  adminApi.post("/admin/vet/add", data).then(unwrap);

export const updateVet = (vet_id, data) =>
  adminApi.put(`/admin/vet/update?vet_id=${vet_id}`, data).then(unwrap);

export const deleteVet = (vet_id) =>
  adminApi.delete(`/admin/vet/delete?vet_id=${vet_id}`).then(unwrap);

// ─── Vendors ─────────────────────────────────────────────────────────────────
export const getAllVendors = () =>
  adminApi.get("/admin/vendors/all").then(unwrap);

export const addVendor = (data) =>
  adminApi.post("/admin/vendor/add", data).then(unwrap);

export const updateVendor = (vendor_id, data) =>
  adminApi.put(`/admin/vendor/update?vendor_id=${vendor_id}`, data).then(unwrap);

export const deleteVendor = (vendor_id) =>
  adminApi.delete(`/admin/vendor/delete?vendor_id=${vendor_id}`).then(unwrap);

// ─── Devices ─────────────────────────────────────────────────────────────────
export const getAllDevices = () =>
  adminApi.get("/admin/devices/all").then(unwrap);

export const addDevice = (data) =>
  adminApi.post("/admin/device/add", data).then(unwrap);

export const updateDevice = (device_id, data) =>
  adminApi.put(`/admin/device/update?device_id=${device_id}`, data).then(unwrap);

export const deleteDevice = (device_id) =>
  adminApi.delete(`/admin/device/delete?device_id=${device_id}`).then(unwrap);

// ─── Alerts ───────────────────────────────────────────────────────────────────
export const getAllAlerts = () =>
  adminApi.get("/admin/alerts/all").then(unwrap);

// ─── Outbreaks ────────────────────────────────────────────────────────────────
export const getAllOutbreaks = () =>
  adminApi.get("/admin/outbreaks/all").then(unwrap);

// ─── Predictions ─────────────────────────────────────────────────────────────
export const getAllPredictions = () =>
  adminApi.get("/admin/predictions/all").then(unwrap);

// ─── Profile ─────────────────────────────────────────────────────────────────
export const getAdminProfile = () =>
  adminApi.get("/admin/profile").then(unwrap);

export const updateAdminProfile = (data) =>
  adminApi.put("/admin/profile/update", data).then(unwrap);

export default adminApi;
