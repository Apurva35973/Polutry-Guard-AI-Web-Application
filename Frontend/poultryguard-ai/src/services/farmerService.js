import axios from "axios";

const API_URL = "http://localhost:5000";

const unwrap = (response) => response.data;
const authConfig = () => ({
  headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
});

export const getHardwareKitStatus = () => axios.get(`${API_URL}/farmer/hardware-kit`, authConfig()).then(unwrap);
export const requestHardwareKit = (data = {}) => axios.post(`${API_URL}/farmer/hardware-kit/request`, data, authConfig()).then(unwrap);
export const getFarmerDashboard = () => axios.get(`${API_URL}/farmer/dashboard`, authConfig()).then(unwrap);
export const getMortality = () => axios.get(`${API_URL}/farmer/mortality`, authConfig()).then(unwrap);
export const logMortality = (data) => axios.post(`${API_URL}/farmer/mortality`, data, authConfig()).then(unwrap);
export const getMortalityAnalytics = () => axios.get(`${API_URL}/farmer/mortality/analytics`, authConfig()).then(unwrap);
export const getVaccinations = () => axios.get(`${API_URL}/farmer/vaccinations`, authConfig()).then(unwrap);
export const createVaccination = (data) => axios.post(`${API_URL}/farmer/vaccinations`, data, authConfig()).then(unwrap);
export const updateVaccination = (id, data) => axios.patch(`${API_URL}/farmer/vaccinations/${id}`, data, authConfig()).then(unwrap);
export const getFarmerAlerts = (params = {}) => axios.get(`${API_URL}/farmer/alerts`, { ...authConfig(), params }).then(unwrap);
export const updateFarmerAlert = (id, data) => axios.patch(`${API_URL}/farmer/alerts/${id}`, data, authConfig()).then(unwrap);
export const createSupportRequest = (data) => axios.post(`${API_URL}/farmer/support-requests`, data, authConfig()).then(unwrap);
export const createVeterinarianRequest = (data) => axios.post(`${API_URL}/farmer/veterinarian-requests`, data, authConfig()).then(unwrap);
export const screenChickenImage = (image) => { const body = new FormData(); body.append("image", image); return axios.post(`${API_URL}/farmer/disease-prediction`, body, authConfig()).then(unwrap); };
export const getReminders = () => axios.get(`${API_URL}/farmer/reminders`, authConfig()).then(unwrap);
export const createReminder = (data) => axios.post(`${API_URL}/farmer/reminders`, data, authConfig()).then(unwrap);
export const updateReminder = (id, data) => axios.put(`${API_URL}/farmer/reminders/${id}`, data, authConfig()).then(unwrap);
export const deleteReminder = (id) => axios.delete(`${API_URL}/farmer/reminders/${id}`, authConfig()).then(unwrap);
export const getFarmerProfile = () => axios.get(`${API_URL}/farmer/profile`, authConfig()).then(unwrap);
export const updateFarmerProfile = (data) => axios.put(`${API_URL}/farmer/profile`, data, authConfig()).then(unwrap);
export const getMyDevices = () => axios.get(`${API_URL}/farmer/devices`, authConfig()).then(unwrap);
export const generateFarmReport = (data) => axios.post(`${API_URL}/farmer/reports/generate`, data, authConfig()).then(unwrap);
export const getFarmerTelemetry = () => axios.get(`${API_URL}/farmer/telemetry`, authConfig()).then(unwrap);
export const getFarmerDeviceStatus = () => axios.get(`${API_URL}/farmer/device-status`, authConfig()).then(unwrap);
export const getFarmerDiseaseStatus = () => axios.get(`${API_URL}/farmer/disease-status`, authConfig()).then(unwrap);
export const getFarmerWifi = () => axios.get(`${API_URL}/farmer/wifi`, authConfig()).then(unwrap);
export const saveFarmerWifi = (data) => axios.post(`${API_URL}/farmer/wifi`, data, authConfig()).then(unwrap);
export const getHardwareKitSummary = () => axios.get(`${API_URL}/farmer/hardware-kit/summary`, authConfig()).then(unwrap);
