/* React & Database Imports */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Eye, EyeOff } from "lucide-react";

/* Asset Imports */
import gpcLogo from "../assets/GPC_Logo.png";

/* Style Imports */
import styles from "../components/auth_styles.module.css";

/* Component Imports */
import TermsConditionsModal from "../components/TermsConditionsModal.jsx";

const SignIn = () => {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // On mount, pre-fill email if previously remembered
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedRemember = localStorage.getItem("rememberMe") === "true";
    if (savedRemember && savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(""); 
    setIsLoading(true);
    
    try {
      // 1. Set Firebase Auth persistence based on Remember Me
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

      // 2. Authenticate with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 3. Handle Remember Me — save or clear email
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberMe");
      }

      // 4. Fetch User Data from Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        const userStatus = (userData.status || "").toLowerCase();
        const userRole = (userData.role || "").toLowerCase();

        // 5. Block access based on account status
        if (userStatus === "email_unconfirmed") {
          navigate("/verify-email");
          setIsLoading(false);
          return;
        }

        if (userStatus === "unverified") {
          await signOut(auth);
          setError("Your account is pending administrator approval. You'll be notified once it's activated.");
          setIsLoading(false);
          return;
        }

        if (userStatus === "deactivated") {
          await signOut(auth);
          setError("Your account has been deactivated. Please contact an administrator.");
          setIsLoading(false);
          return;
        }

        // 6. Role-Based Redirection
        if (userRole === "admin") {
          navigate("/admin/requests");
        } else {
          navigate("/home");
        }
      } else {
        // No Firestore record — block access
        await signOut(auth);
        setError("Account data not found. Please contact an administrator.");
      }

    } catch (err) {
      console.error("Sign-in error:", err);
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
    <div className={styles.authContainer}>
      <div className={`${styles.authShowcase} ${styles.bgSignIn}`}></div>
      <div className={styles.authFormContainer}>
        <img src={gpcLogo} alt="GPC Logo" className={styles.gpcLogo} />
        <h2 className={styles.welcomeMessage}>
          Welcome to the F.E.A.S.T.<br />Charity Management System!
        </h2>

        {error && (
          <div className={styles.errorNotification}>
            <div className={styles.errorContent}>
              <p className={styles.errorText}>{error}</p>
            </div>
            <button className={styles.closeNotification} onClick={() => setError("")}>&times;</button>
          </div>
        )}

        <form className={styles.authForm} onSubmit={handleSignIn}>
          <div className={styles.authFormInputGroup}>
            <label className={styles.authFormLabel} htmlFor="email">Email</label>
            <input 
              autoComplete="on" 
              name="email" 
              id="email" 
              className={styles.authFormInput} 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              placeholder="example@email.com"
            />
          </div>

          <div className={styles.authFormInputGroup}>
            <label className={styles.authFormLabel} htmlFor="password">Password</label>
            <div className={styles.passwordInputWrapper}>
              <input 
                autoComplete="off" 
                name="password" 
                id="password" 
                className={`${styles.authFormInput} ${styles.passwordInput}`} 
                type={showPassword ? "text" : "password"} 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                placeholder="••••••••"
              />
              <button 
                type="button"
                className={styles.passwordToggleBtn}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>

          <div className={styles.optionsContainer}>
            <div className={styles.checkboxWrapper}>
              <input
                type="checkbox"
                id="rememberMe"
                className={styles.checkboxInput}
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="rememberMe" className={styles.checkboxLabel}>
                <span className={styles.checkboxBox}>
                  <svg viewBox="0 0 12 10" height="10px" width="12px" className={styles.checkboxSvg}>
                    <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
                  </svg>
                </span>
                <span className={styles.checkboxText}>Remember Me</span>
              </label>
            </div>
            <a 
              href="/forgot-password" 
              className={styles.forgotPasswordLink} 
              onClick={(e) => { e.preventDefault(); navigate("/forgot-password"); }}
            >
              Forgot Password?
            </a>
          </div>

          <button type="submit" className={styles.authButton} disabled={isLoading}>
            {isLoading ? "Verifying..." : "Sign in"}
            {!isLoading && (
              <div className={styles.arrowWrapper}>
                <div className={styles.arrow}></div>
              </div>
            )}
          </button>
        </form>

        <p>
          Don't have an account yet? <a href="/signup" className={styles.authLink} onClick={(e) => { e.preventDefault(); navigate("/signup"); }}>Sign Up.</a>
        </p>
      </div>

      {showTermsModal && (
        <TermsConditionsModal onClose={() => setShowTermsModal(false)} />
      )}
    </div>
  );
};

export default SignIn;
