import { Navigate } from "react-router-dom";

function ProtectedRoute({
  children,
  role
}) {

  const token =
    localStorage.getItem(
      "token"
    );

  const userRole =
    localStorage.getItem(
      "role"
    );

  if(!token){

    return <Navigate to="/" />;
  }

  if(role &&
     role !== userRole){

    return <Navigate to="/" />;
  }

  return children;
}

export default ProtectedRoute;