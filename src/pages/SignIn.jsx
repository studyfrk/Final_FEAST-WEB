import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Eye, EyeOff } from "lucide-react";
import "../components/AuthStyles.css";
import gpcLogo from "../assets/GPC_Logo.png";

const SignIn = () => {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(""); 
    setIsLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.status === "Deactivated") {
          await signOut(auth);
          setError("Your account has been deactivated. Please contact an administrator.");
          setIsLoading(false);
          return;
        }
      }

      navigate("/home"); 
    } catch (err) {
      if (err.code === 'auth/invalid-credential') {
        setError("Invalid email or password. Please try again.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError("An error occurred during sign-in.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-showcase" id="auth-showcase-1"></div>
      <div className="auth-form-container">
        <img src={gpcLogo} alt="GPC Logo" className="gpc-logo" />
        <h2 className="welcome-message">
          Welcome to the F.E.A.S.T.<br />Charity Management System!
        </h2>

        {error && (
          <div className="error-notification">
            <div className="error-content">
              <p>{error}</p>
            </div>
            <button className="close-error" onClick={() => setError("")}>&times;</button>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSignIn}>
          <div className="input-group">
            <label className="label" htmlFor="email">Email</label>
            <input 
              autoComplete="on" 
              name="email" 
              id="email" 
              className="input" 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="input-group">
            <label className="label" htmlFor="password">Password</label>
            <div className="password-input-wrapper" style={{ position: 'relative' }}>
              <input 
                autoComplete="off" 
                name="password" 
                id="password" 
                className="input" 
                type={showPassword ? "text" : "password"} 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                style={{ width: '100%' }}
              />
              <button 
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>

          <div className="options-container">
            <div className="checkbox-wrapper-46">
              <input type="checkbox" id="cbx-46" className="inp-cbx" />
              <label htmlFor="cbx-46" className="cbx">
                <span>
                  <svg viewBox="0 0 12 10" height="10px" width="12px">
                    <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
                  </svg>
                </span>
                <span>Remember me</span>
              </label>
            </div>
            <a 
              href="/forgot-password" 
              className="forgot-password-link" 
              onClick={(e) => { e.preventDefault(); navigate("/forgot-password"); }}
            >
              Forgot Password?
            </a>
          </div>

          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? "Verifying..." : "Sign in"}
            {!isLoading && (
              <div className="arrow-wrapper">
                <div className="arrow"></div>
              </div>
            )}
          </button>
        </form>

        <p className="auth-link">
          Don't have an account yet? <a href="/signup" onClick={(e) => { e.preventDefault(); navigate("/signup"); }}>Sign Up.</a>
        </p>
      </div>
    </div>
  );
};

export default SignIn;