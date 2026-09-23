import axios from "axios";

const API_URL = "http://localhost:5000";

// LOGIN
export const loginUser = async (data) => {
  const response = await axios.post(
    `${API_URL}/auth/login`,
    data
  );

  return response.data;
};

// FARMER REGISTER
export const registerFarmer = async (data) => {
  const response = await axios.post(
    `${API_URL}/auth/register/farmer`,
    data
  );

  return response.data;
};

// VET REGISTER — supports FormData (with certificate file) or plain JSON
export const registerVet = async (data) => {
  const isFormData = data instanceof FormData;
  const response = await axios.post(
    `${API_URL}/auth/register/vet`,
    data,
    isFormData ? { headers: { "Content-Type": "multipart/form-data" } } : {}
  );

  return response.data;
};

// VENDOR REGISTER
export const registerVendor = async (data) => {
  const response = await axios.post(
    `${API_URL}/auth/register/vendor`,
    data
  );

  return response.data;
};

export const completeFarmerProfile = async (data) => {
  const response = await axios.put(
    `${API_URL}/farmer/profile/complete`,
    data,
    { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } }
  );

  return response.data;
};

export const completeVeterinarianProfile = async (data) => {
  const response = await axios.put(
    `${API_URL}/vet/profile/complete`, data,
    { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } }
  );
  return response.data;
};
