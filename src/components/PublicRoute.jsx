import { Navigate } from "react-router-dom";

const PublicRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem("feast_auth_token");

  if (isAuthenticated) {
    return <Navigate to="/home" replace />; 
  }

  return children;
};

export default PublicRoute;