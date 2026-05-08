import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase"; // Ensure your firebase config is imported
import { sendPasswordResetEmail } from "firebase/auth";
import "../components/AuthStyles.css";
import gpcLogo from "../assets/GPC_Logo.png";

const ForgotPassword = () => {
  const navigate = useNavigate();
  
  // State management
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleResetRequest = async (e) => {
    e.preventDefault();
    
    if (!agreed) {
      alert("Please accept the terms first.");
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Logic mirrored from auth_service.dart: sendPasswordReset
      // We trim and lowercase the email to match the mobile implementation
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      
      // Mirroring the Dart logic: Always show success to prevent account enumeration
      setMessage("If that email is registered, a password reset link has been sent. Please check your inbox.");
      
      // Optional: Redirect to login after a delay
      setTimeout(() => navigate("/"), 5000);
    } catch (error) {
      console.error("Reset Error:", error);
      // Even on error, we typically show the same message for security
      setMessage("If that email is registered, a password reset link has been sent.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-showcase" id="auth-showcase-2"></div>
      <div className="auth-form-container">
        <img src={gpcLogo} alt="GPC Logo" className="gpc-logo" />
        <h2 className="welcome-message">Forgot Your Password?</h2>
        <p className='form-description'>
          Enter your email address below and we'll send you a link to reset your password.
        </p>

        {message && <div className="success-banner" style={{ color: 'green', marginBottom: '15px', fontSize: '14px' }}>{message}</div>}

        <form className="auth-form" onSubmit={handleResetRequest}>
          <div className="input-group">
            <label className="label" htmlFor="email">Email</label>
            <input 
              autoComplete="off" 
              name="email" 
              id="email" 
              className="input" 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
            />
          </div>

          <div className="options-container">
            <div className="checkbox-wrapper-46">
              <input 
                type="checkbox" 
                id="cbx-46" 
                className="inp-cbx" 
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                required 
              />
              <label htmlFor="cbx-46" className="cbx">
                <span>
                  <svg viewBox="0 0 12 10" height="10px" width="12px">
                    <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
                  </svg>
                </span>
                <span className="auth-link">
                  I agree to the <a href="#!" onClick={(e) => { e.preventDefault(); /* Show Modal Logic */ }}>Terms and Conditions.</a>
                </span>
              </label>
            </div>
          </div>

          <button 
            type="submit" 
            className="auth-button" 
            disabled={loading || !email || !agreed}
            style={{ opacity: (loading || !agreed) ? 0.7 : 1 }}
          >
            {loading ? "Sending..." : "Request Password Reset"}
            {!loading && (
              <div className="arrow-wrapper">
                <div className="arrow"></div>
              </div>
            )}
          </button>
        </form>

        <p className="auth-link">
          Remember your password? <a href="#!" onClick={() => navigate("/")}>Sign In.</a>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;