import axios from "axios";
import { supabase } from "./supabaseClient";
import { API_BASE_URL as API_URL } from "../config/api";


// Supabase Direct Auth Helpers
export const supabaseSignIn = async (email, password) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

export const supabaseSignUp = async (email, password, metadata = {}) => {
  return await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata }
  });
};

export const supabaseSignOut = async () => {
  await supabase.auth.signOut();
  sessionStorage.clear();
  localStorage.clear();
};

export const supabaseResetPassword = async (email) => {
  return await supabase.auth.resetPasswordForEmail(email);
};

// LOGIN: Authenticates via Supabase Auth, then resolves user profile and permissions from Flask API
export const loginUser = async ({ email, password, role }) => {
  let accessToken = null;
  let supabaseUser = null;

  // 1. Sign in via Supabase Auth client
  try {
    const { data: authData, error: authError } = await supabaseSignIn(email, password);
    if (!authError && authData?.session) {
      accessToken = authData.session.access_token;
      supabaseUser = authData.user;
    }
  } catch (err) {
    console.warn("Supabase client sign-in exception, falling back to API:", err);
  }

  // 2. Exchange token or authenticate with Flask Backend (include credentials and access_token if available)
  const payload = {
    email,
    password,
    role,
    ...(accessToken ? { access_token: accessToken } : {})
  };

  const response = await axios.post(`${API_URL}/auth/login`, payload, {
    timeout: 30000,
  });
  return response.data;
};


// FARMER REGISTER: Registers user in Supabase Auth first, then creates MySQL profile and triggers cloud sync
export const registerFarmer = async (data) => {
  let supabaseUserId = null;

  if (data.email && data.password) {
    try {
      const { data: authData, error: authError } = await supabaseSignUp(
        data.email,
        data.password,
        { role: "Farmer", full_name: data.full_name }
      );
      if (!authError && authData?.user) {
        supabaseUserId = authData.user.id;
      }
    } catch (err) {
      console.warn("Supabase registration warning:", err);
    }
  }

  const payload = {
    ...data,
    supabase_user_id: supabaseUserId
  };

  const response = await axios.post(
    `${API_URL}/auth/register/farmer`,
    payload
  );

  return response.data;
};

// VET REGISTER: Registers in Supabase Auth, then posts form/multipart data to Backend
export const registerVet = async (data) => {
  const isFormData = data instanceof FormData;
  let email = isFormData ? data.get("email") : data.email;
  let password = isFormData ? data.get("password") : data.password;
  let name = isFormData ? data.get("full_name") : data.full_name;

  let supabaseUserId = null;
  if (email && password) {
    try {
      const { data: authData, error: authError } = await supabaseSignUp(
        email,
        password,
        { role: "Veterinarian", full_name: name }
      );
      if (!authError && authData?.user) {
        supabaseUserId = authData.user.id;
      }
    } catch (err) {
      console.warn("Supabase vet registration warning:", err);
    }
  }

  if (isFormData) {
    if (supabaseUserId) {
      data.append("supabase_user_id", supabaseUserId);
    }
    const response = await axios.post(
      `${API_URL}/auth/register/vet`,
      data,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  } else {
    const payload = { ...data, supabase_user_id: supabaseUserId };
    const response = await axios.post(`${API_URL}/auth/register/vet`, payload);
    return response.data;
  }
};

// VENDOR REGISTER: Registers in Supabase Auth, then posts profile to Backend
export const registerVendor = async (data) => {
  let supabaseUserId = null;

  if (data.email && data.password) {
    try {
      const { data: authData, error: authError } = await supabaseSignUp(
        data.email,
        data.password,
        { role: "Vendor", full_name: data.full_name }
      );
      if (!authError && authData?.user) {
        supabaseUserId = authData.user.id;
      }
    } catch (err) {
      console.warn("Supabase vendor registration warning:", err);
    }
  }

  const payload = {
    ...data,
    supabase_user_id: supabaseUserId
  };

  const response = await axios.post(
    `${API_URL}/auth/register/vendor`,
    payload
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
    `${API_URL}/vet/profile/complete`,
    data,
    { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } }
  );
  return response.data;
};
