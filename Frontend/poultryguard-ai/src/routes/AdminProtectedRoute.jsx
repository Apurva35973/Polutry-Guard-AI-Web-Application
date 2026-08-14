import React from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function AdminProtectedRoute({ children }) {
  const token = sessionStorage.getItem("token");
  const role = sessionStorage.getItem("role");

  if (!token || role !== "Admin") {
    return <Navigate to="/login" replace />;
  }

  return children || <Outlet />;
}
