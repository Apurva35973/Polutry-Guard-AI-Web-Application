/**
 * Centralized API Configuration for Poultry Guard AI Frontend
 *
 * Configured via VITE_API_BASE_URL (or VITE_API_URL fallback).
 * Production default: https://polutry-guard-ai-web-application.onrender.com
 */

const rawBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "https://polutry-guard-ai-web-application.onrender.com";

// Normalize URL by removing any trailing slashes
export const API_BASE_URL = String(rawBaseUrl).trim().replace(/\/+$/, "");

/**
 * Helper to build full URL from a relative path
 * @param {string} path - e.g. "/auth/login" or "farmer/dashboard"
 * @returns {string} Fully qualified endpoint URL
 */
export const getApiUrl = (path = "") => {
  if (!path) return API_BASE_URL;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

export default API_BASE_URL;
