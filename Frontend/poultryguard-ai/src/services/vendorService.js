import axios from "axios";

const BASE_URL = "http://localhost:5000";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const unwrapData = (response) => response.data?.data;

export const getDashboard = () => {

  return axios.get(
    `${BASE_URL}/vendor/dashboard`,
    {
      headers: authHeaders()
    }
  ).then(unwrapData);
};

export const getProfile = () => {

  return axios.get(
    `${BASE_URL}/vendor/profile`,
    {
      headers: authHeaders()
    }
  ).then(unwrapData);
};

export const getNearbyFarms = () => {

  return axios.get(
    `${BASE_URL}/vendor/nearby-farms`,
    {
      headers: authHeaders()
    }
  ).then(unwrapData);
};

export const getOutbreakAlerts = () => {
  return axios.get(
    `${BASE_URL}/vendor/outbreak-alerts`,
    {
      headers: authHeaders()
    }
  ).then(unwrapData);
};

export const getAlerts = () => {
  return axios.get(
    `${BASE_URL}/vendor/alerts`,
    {
      headers: authHeaders()
    }
  ).then(unwrapData);
};

export const updateProfile = (data) => {
  return axios.put(
    `${BASE_URL}/vendor/profile/update`,
    data,
    {
      headers: authHeaders()
    }
  ).then(unwrapData);
};
