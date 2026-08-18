import axios from "axios";

const API_URL = "http://localhost:5000";

const unwrap = (response) => response.data;
const authConfig = () => ({
  headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
});

export const getVeterinarianDashboard = () =>
  axios.get(`${API_URL}/vet/dashboard`, authConfig()).then(unwrap);

export const getVetCases = (params = {}) =>
  axios.get(`${API_URL}/vet/cases`, { ...authConfig(), params }).then(unwrap);

export const getVetCaseDetails = (caseId) =>
  axios.get(`${API_URL}/vet/cases/${caseId}`, authConfig()).then(unwrap);

export const createVetCase = (data) =>
  axios.post(`${API_URL}/vet/cases`, data, authConfig()).then(unwrap);

export const updateVetCase = (caseId, data) =>
  axios.patch(`${API_URL}/vet/cases/${caseId}`, data, authConfig()).then(unwrap);

export const getVetAlerts = (params = {}) =>
  axios.get(`${API_URL}/vet/alerts`, { ...authConfig(), params }).then(unwrap);

export const updateVetAlert = (alertId, data) =>
  axios.patch(`${API_URL}/vet/alerts/${alertId}`, data, authConfig()).then(unwrap);

export const getVetFarmers = (params = {}) =>
  axios.get(`${API_URL}/vet/farmers`, { ...authConfig(), params }).then(unwrap);

export const getVetFarmerDetails = (farmerId) =>
  axios.get(`${API_URL}/vet/farmers/${farmerId}`, authConfig()).then(unwrap);

export const getVetConsultations = (params = {}) =>
  axios.get(`${API_URL}/vet/consultations`, { ...authConfig(), params }).then(unwrap);

export const createVetConsultation = (data) =>
  axios.post(`${API_URL}/vet/consultations`, data, authConfig()).then(unwrap);

export const updateVetConsultation = (consultationId, data) =>
  axios.patch(`${API_URL}/vet/consultations/${consultationId}`, data, authConfig()).then(unwrap);

export const getVetReports = (params = {}) =>
  axios.get(`${API_URL}/vet/reports`, { ...authConfig(), params }).then(unwrap);
