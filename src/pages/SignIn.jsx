/* React & Firebase Imports */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence, browserSessionPersistence, signInAnonymously } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

/* Asset Imports */
import gpcLogo from "../assets/GPC_Logo.png";

/* Component Imports */
import TermsConditionsModal from "../components/TermsConditionsModal.jsx";

/* Style Imports */
import styles from "../components/auth_styles.module.css";

const SignIn = () => {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);

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
      // 1. Enforce Persistence depending on Remember Me
      const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceType);

      // 2. Authenticate with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 3. Handle Remember Me — save or clear email for the input field
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
        if (userStatus === "email_unconfirmed" && user.emailVerified) {
          await updateDoc(userDocRef, {
            status: "unverified",
            emailVerifiedAt: new Date().toISOString(),
          });
          await signOut(auth);
          setError("Your email has been verified. Your account is now pending administrator approval — please try again later.");
          setIsLoading(false);
          return;
        }

        if (userStatus === "email_unconfirmed") {
          await signOut(auth);
          setError("Please verify your email first. Check your inbox for the verification link we sent you.");
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

        // 6. Set the Route Guard Token
        localStorage.setItem("feast_auth_token", user.uid);

        // 7. Role-Based Redirection
        if (userRole === "admin") {
          navigate("/admin/users");
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

  const handleGuestSignIn = async () => {
    setIsLoading(true);
    try {
      await setPersistence(auth, browserSessionPersistence);
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;
      
      await setDoc(doc(db, "users", user.uid), {
        role:       "guest",
        status:     "verified",
        email:      "guest@feast.app",
        firstName:  "",
        lastName:   "",
        createdAt:  serverTimestamp(),
      });
      
      navigate("/home");
    } catch (err) {
      console.error("Guest sign-in error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError("Error: Anonymous Sign-In is not enabled in your Firebase Console. Please go to Authentication -> Sign-in method and enable Anonymous providers.");
      } else {
        setError(`Could not sign in as a guest: ${err.message}`);
      }
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
            {isLoading ? "Verifying..." : "Sign In"}
            {!isLoading && (
              <div className={styles.arrowWrapper}>
                <div className={styles.arrow}></div>
              </div>
            )}
          </button>
        </form>

        <p style={{ marginBottom: '12px' }}>
          Don't have an account yet? <a href="/signup" className={styles.authLink} onClick={(e) => { e.preventDefault(); navigate("/signup"); }}>Sign Up.</a>
        </p>
        <p>
          Want to look around first?{" "}
          <a href="#" className={styles.authLink} onClick={(e) => { e.preventDefault(); setShowGuestModal(true); }}>
            Continue as Guest.
          </a>
        </p>
      </div>

      {showTermsModal && (
        <TermsConditionsModal onClose={() => setShowTermsModal(false)} />
      )}

      {showGuestModal && (
        <div onClick={() => !isLoading && setShowGuestModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: '#fff', padding: '32px', borderRadius: '12px',
            maxWidth: '400px', width: '90%', textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            fontFamily: '"Outfit", sans-serif'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <AlertCircle size={48} color="#f5a623" style={{ margin: '0 auto' }} />
            </div>
            <h3 style={{ marginBottom: '12px', fontSize: '1.25rem', color: '#333' }}>Continue as Guest?</h3>
            <p style={{ marginBottom: '24px', color: '#666', lineHeight: '1.5' }}>
              By continuing as a guest, you will <strong>not</strong> be able to access important functions such as messaging and notifications. Your account will also be temporary.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                style={{ padding: '10px 20px', background: '#f1f1f1', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer', color: '#333', fontWeight: 'bold' }}
                onClick={() => setShowGuestModal(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                className={styles.authButton} 
                style={{ padding: '10px 20px', width: 'auto', margin: '0', borderRadius: '8px' }}
                onClick={handleGuestSignIn}
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Proceed as Guest"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignIn;