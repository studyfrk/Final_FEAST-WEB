/* React & Firebase Imports */
import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

/* Asset Imports */
import gpcLogo from "../assets/GPC_Logo.png";

/* Component Imports */
import TermsConditionsModal from "../components/TermsConditionsModal.jsx";

/* Style Imports */
import styles from "../components/auth_styles.module.css";

const functions = getFunctions(undefined, "asia-southeast1");
const checkEmailExists = httpsCallable(functions, "checkEmailExists");

const ForgotPassword = () => {
  const navigate = useNavigate();

  // State management
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleResetRequest = async (e) => {
    e.preventDefault();

    // Clear previous messages
    setMessage('');
    setError('');

    // Guard: email must be filled
    if (!email.trim()) {
      setError("Please enter your email address before requesting a reset.");
      return;
    }

    // Guard: must agree to terms
    if (!agreed) {
      setError("Please accept the terms and conditions first.");
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Step 1: Check if the email exists in Firebase Auth
      await checkEmailExists({ email: normalizedEmail });

      // Step 2: Email exists — send the reset email via Firebase client SDK
      const auth = getAuth();
      await sendPasswordResetEmail(auth, normalizedEmail);

      setMessage("A password reset link has been sent to your email. Please check your inbox.");
      setTimeout(() => navigate("/"), 5000);
    } catch (err) {
      console.error("Reset Error:", err);
      switch (err.code) {
        case "functions/not-found":
          setError("No account is associated with this email address. Please check and try again.");
          break;
        case "functions/invalid-argument":
          setError("The email address you entered is not valid. Please check and try again.");
          break;
        case "functions/too-many-requests":
          setError("Too many attempts. Please wait a moment before trying again.");
          break;
        default:
          setError("Something went wrong while sending the reset link. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.authContainer} ${styles.pageEnter}`}>
      <div className={`${styles.authShowcase} ${styles.bgForgotPassword}`}></div>
      <div className={styles.authFormContainer}>
        <img src={gpcLogo} alt="GPC Logo" className={styles.gpcLogo} />
        <h2 className={styles.welcomeMessage}>Forgot Your Password?</h2>
        <p className={styles.formDescription}>
          Enter your email address below and we'll send you a link to reset your password.
        </p>

        {message && (
          <div className={styles.successNotification}>
            <div className={styles.successContent}>
              <p className={styles.successText}>{message}</p>
            </div>
            <button className={styles.closeNotification} onClick={() => setMessage("")}>&times;</button>
          </div>
        )}

        {error && (
          <div className={styles.errorNotification}>
            <div className={styles.errorContent}>
              <p className={styles.errorText}>{error}</p>
            </div>
            <button className={styles.closeNotification} onClick={() => setError("")}>&times;</button>
          </div>
        )}

        <form className={styles.authForm} onSubmit={handleResetRequest}>
          <div className={styles.authFormInputGroup}>
            <label className={styles.authFormLabel} htmlFor="email">Email</label>
            <input
              autoComplete="off"
              name="email"
              id="email"
              className={styles.authFormInput}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
            />
          </div>

          <div className={styles.optionsContainer}>
            <div className={styles.checkboxWrapper}>
              <input
                type="checkbox"
                id="agreeCheckbox"
                className={styles.checkboxInput}
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <label htmlFor="agreeCheckbox" className={styles.checkboxLabel}>
                <span className={styles.checkboxBox}>
                  <svg viewBox="0 0 12 10" height="10px" width="12px" className={styles.checkboxSvg}>
                    <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
                  </svg>
                </span>
                <span className={styles.checkboxText}>
                  I agree to the{" "}
                  <button
                    type="button"
                    className={styles.authLinkButton}
                    onClick={() => setShowTermsModal(true)}
                  >
                    terms and conditions.
                  </button>
                </span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className={styles.authButton}
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1 }}
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
          Remember your password?{" "}
          <a href="#!" className={styles.authLink} onClick={() => navigate("/")}>Sign In.</a>
        </p>
      </div>

      {showTermsModal && (
        <TermsConditionsModal onClose={() => setShowTermsModal(false)} />
      )}
    </div>
  );
};

export default ForgotPassword;
