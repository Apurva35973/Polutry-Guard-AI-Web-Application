import axios from "axios";

const BASE_URL = "http://localhost:5000";

export const getDashboard = () => {

  return axios.get(
    `${BASE_URL}/vendor/dashboard`,
    {
      headers: {
        Authorization:
          `Bearer ${localStorage.getItem("token")}`
      }
    }
  );
};

export const getProfile = () => {

  return axios.get(
    `${BASE_URL}/vendor/profile`,
    {
      headers: {
        Authorization:
          `Bearer ${localStorage.getItem("token")}`
      }
    }
  );
};

export const getNearbyFarms = () => {

  return axios.get(
    `${BASE_URL}/vendor/nearby-farms`,
    {
      headers: {
        Authorization:
          `Bearer ${localStorage.getItem("token")}`
      }
    }
  );
};