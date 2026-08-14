import axios from "axios";

const API_URL = "http://localhost:5000";

export const getCurrentEnvironment = async (farmId) => {
  const response = await axios.get(`${API_URL}/api/environment/current/${farmId}`);
  return response.data;
};

export const getEnvironmentHistory = async (farmId, limit = 50) => {
  const response = await axios.get(`${API_URL}/api/environment/history/${farmId}`, {
    params: { limit },
  });
  return response.data;
};

export const getEnvironmentAlerts = async (farmId, limit = 20) => {
  const response = await axios.get(`${API_URL}/api/environment/alerts/${farmId}`, {
    params: { limit },
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
