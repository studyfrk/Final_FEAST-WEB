import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

const ProtectedRoute = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    // This listener waits for Firebase to finish checking local storage
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false); // Authentication check is complete
    });

    // Cleanup the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  // Show a loading state while Firebase is checking the session
  if (isAuthLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2>Loading your session...</h2>
      </div>
    );
  }

  // If no user is found after loading, redirect them to the Sign In page
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If the user exists, render the requested page (like Home)
  return children;
};

export default ProtectedRoute;