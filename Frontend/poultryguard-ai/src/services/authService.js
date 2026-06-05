import axios from "axios";

const API_URL = "http://localhost:5000";

export const loginUser = (data) => {
  return axios.post(
    `${API_URL}/auth/login`,
    data
  ).then((response) => response.data);
};

export const registerFarmer = (data) => {
  return axios.post(
    `${API_URL}/auth/register/farmer`,
    data
  ).then((response) => response.data);
};

export const registerVet = (data) => {
  return axios.post(
    `${API_URL}/auth/register/vet`,
    data
  ).then((response) => response.data);
};

export const registerVendor = (data) => {
  return axios.post(
    `${API_URL}/auth/register/vendor`,
    data
  ).then((response) => response.data);
};
