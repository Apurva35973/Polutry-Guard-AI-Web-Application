import React from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function VendorProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token || role !== "Vendor") {
    return <Navigate to="/login" replace />;
  }

  return children || <Outlet />;
}
