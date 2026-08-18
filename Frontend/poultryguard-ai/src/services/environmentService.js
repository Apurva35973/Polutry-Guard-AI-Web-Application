import axios from "axios";

const API_URL = "http://localhost:5000";
const authConfig = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } });

export const getCurrentEnvironment = async (farmId) => {
  const response = await axios.get(`${API_URL}/api/environment/current/${farmId}`, authConfig());
  return response.data;
};

export const getEnvironmentHistory = async (farmId, limit = 100, range = null) => {
  const params = { limit };
  if (range) params.range = range;
  const response = await axios.get(`${API_URL}/api/environment/history/${farmId}`, {
    ...authConfig(), params,
  });
  return response.data;
};

export const getEnvironmentAlerts = async (farmId, limit = 20) => {
  const response = await axios.get(`${API_URL}/api/environment/alerts/${farmId}`, {
    ...authConfig(), params: { limit },
  });
  return response.data;
};

export const getRiskPrediction = async (farmId, params) => {
  const response = await axios.get(`${API_URL}/api/risk/${farmId}`, { params });
  return response.data;
};

export const getMlPrediction = async (image, environmental) => {
  const formData = new FormData();
  formData.append("image", image);
  formData.append("environmental", JSON.stringify(environmental));
  const response = await axios.post(`${API_URL}/api/ml/predict`, formData);
  return response.data;
};
