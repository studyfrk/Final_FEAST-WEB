/* React & Database Imports */
import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";

/* Asset Imports */
import gpcLogo from "../assets/GPC_Logo.png";

/* Style Imports */
import styles from "../components/auth_styles.module.css";

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
    <div className={styles.authContainer}>
      <div className={`${styles.authShowcase} ${styles.bgForgotPassword}`}></div>
      <div className={styles.authFormContainer}>
        <img src={gpcLogo} alt="GPC Logo" className={styles.gpcLogo} />
        <h2 className={styles.welcomeMessage}>Forgot Your Password?</h2>
        <p className={styles.formDescription}>
          Enter your email address below and we'll send you a link to reset your password.
        </p>

        {message && <div className={styles.successBanner}>{message}</div>}

        <form className={styles.authForm} onSubmit={handleResetRequest}>
          <div className={styles.authFormInputGroup}>
            <label className={styles.authFormLabel} htmlFor="email">Email</label>
            <input 
              autoComplete="off" 
              name="email" 
              id="email" 
              className={styles.authFormInput} 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
            />
          </div>

          <div className={styles.optionsContainer}>
            <div className={styles.checkboxWrapper}>
              <input 
                type="checkbox" 
                id="checkbox" 
                className={styles.checkboxInput} 
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                required 
              />
              <label htmlFor="checkbox" className={styles.checkboxLabel}>
                <span className={styles.checkboxBox}>
                  <svg viewBox="0 0 12 10" height="10px" width="12px" className={styles.checkboxSvg}>
                    <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
                  </svg>
                </span>
                <span className={`${styles.checkboxText}`}>
                  I agree to the <a href="#!" className={styles.authLink} onClick={(e) => { e.preventDefault(); }}>terms and conditions.</a>
                </span>
              </label>
            </div>
          </div>

          <button 
            type="submit" 
            className={styles.authButton} 
            disabled={loading || !email || !agreed}
            style={{ opacity: (loading || !agreed) ? 0.7 : 1 }}
          >
            {loading ? "Sending..." : "Request Password Reset"}
            {!loading && (
              <div className={styles.arrowWrapper}>
                <div className={styles.arrow}></div>
              </div>
            )}
          </button>
        </form>

        <p>
          Remember your password? <a href="#!" className={styles.authLink} onClick={() => navigate("/")}>Sign In.</a>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
