/* React & Firebase Imports */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInAnonymously,
  deleteUser,
  sendEmailVerification,
} from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

/* Asset Imports */
import gpcLogo from "../assets/GPC_Logo.png";

/* Component Imports */
import TermsConditionsModal from "../components/TermsConditionsModal.jsx";

/* Style Imports */
import styles from "../components/auth_styles.module.css";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Naive input sanitizer — strips leading/trailing whitespace and removes
 * characters that have no place in an email or password field.
 * This is defence-in-depth; Firebase already validates emails server-side.
 */
const sanitizeInput = (value) => value.trim().replace(/[<>"'`]/g, "");

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SignIn = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // FIX (High): rememberMe now persists only a boolean flag, never the raw email.
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestClosing, setGuestClosing] = useState(false);

  // -------------------------------------------------------------------------
  // On mount: restore rememberMe flag (no PII stored)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const savedRemember = localStorage.getItem("rememberMe") === "true";
    setRememberMe(savedRemember);
    if (savedRemember) {
      const savedEmail = localStorage.getItem("rememberedEmail") || "";
      setEmail(savedEmail);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Guest modal helpers
  // -------------------------------------------------------------------------
  const handleGuestModalClose = () => {
    if (isLoading) return;
    setGuestClosing(true);
    setTimeout(() => {
      setShowGuestModal(false);
      setGuestClosing(false);
    }, 200);
  };

  // -------------------------------------------------------------------------
  // Sign-in handler
  // -------------------------------------------------------------------------
  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Basic client-side sanitization
    const cleanEmail = sanitizeInput(email);
    const cleanPassword = sanitizeInput(password);

    if (!cleanEmail || !cleanPassword) {
      setError("Please enter a valid email and password.");
      setIsLoading(false);
      return;
    }

    try {
      // 1. Enforce session persistence based on Remember Me
      const persistenceType = rememberMe
        ? browserLocalPersistence
        : browserSessionPersistence;
      await setPersistence(auth, persistenceType);

      // 2. Authenticate with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        cleanPassword
      );
      const user = userCredential.user;

      // 3. Handle Remember Me — store email in localStorage to pre-fill the form
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("rememberedEmail", cleanEmail);
      } else {
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("rememberedEmail");
      }

      // 4. Fetch User Data from Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRole = (userData.role || "").toLowerCase();
        let currentStatus = (userData.status || "").toLowerCase();

        // 5. Block access based on account status
        if (currentStatus === "email_unconfirmed") {
          await user.reload();
          if (user.emailVerified) {
            // Self-heal: upgrade their status in Firestore
            await updateDoc(userDocRef, {
              status: "unverified",
              emailVerifiedAt: new Date().toISOString(),
            });
            currentStatus = "unverified";
          } else {
            // Resend verification email before signing out
            try {
              const actionCodeSettings = {
                url: `${window.location.origin}/verify-email`,
                handleCodeInApp: true,
              };
              await sendEmailVerification(user, actionCodeSettings);
              console.log("Resent verification email with ActionCodeSettings.");
            } catch (resendErr) {
              console.error("Resending verification email with ActionCodeSettings failed:", resendErr);
              // Fallback to standard email verification
              try {
                console.warn("Attempting resend fallback: sending standard verification email without ActionCodeSettings...");
                await sendEmailVerification(user);
                console.log("Resent fallback verification email successfully.");
              } catch (fallbackErr) {
                console.error("Fallback resend failed:", fallbackErr);
              }
            }
            await signOut(auth);
            setError(
              "Please verify your email first. A new verification link has been sent to your email."
            );
            setIsLoading(false);
            return;
          }
        }

        if (currentStatus === "unverified") {
          await signOut(auth);
          setError(
            "Your account is pending administrator approval. You'll have access once it's activated."
          );
          setIsLoading(false);
          return;
        }

        if (currentStatus === "deactivated") {
          await signOut(auth);
          setError(
            "Your account has been deactivated. Please contact an administrator."
          );
          setIsLoading(false);
          return;
        }

        // FIX (Critical): Removed localStorage.setItem("feast_auth_token", user.uid)
        // The Firebase SDK already persists the authenticated session securely in
        // IndexedDB. Writing the UID to localStorage creates an XSS attack surface
        // where any injected script can read or forge the token, bypassing route
        // guards entirely. Route guards should use auth.currentUser or
        // onAuthStateChanged instead of reading this localStorage key.

        // 6. Role-based redirection
        if (userRole === "admin" || userRole === "administrator") {
          navigate("/admin/users");
        } else {
          navigate("/home");
        }
      } else {
        // No Firestore record — block access
        await signOut(auth);
        setError(
          "Account data not found. Please contact an administrator."
        );
      }
    } catch (err) {
      console.error("Sign-in error:", err.code, err.message);
      if (err.code === "auth/invalid-credential") {
        setError("Invalid email or password. Please try again.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else if (err.code === "auth/user-disabled") {
        setError(
          "This account has been disabled. Please contact an administrator."
        );
      } else {
        setError("An error occurred during sign-in. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Guest sign-in handler
  // -------------------------------------------------------------------------
  const handleGuestSignIn = async () => {
    setIsLoading(true);
    try {
      await setPersistence(auth, browserSessionPersistence);
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;

      // FIX (Medium): Write a Firestore document for the guest with a TTL
      // timestamp. A scheduled Cloud Function (see cleanupGuestAccounts.js)
      // deletes anonymous accounts older than 30 days as a reliable backstop.
      //
      // The primary cleanup path is deleteUser() called from:
      //   • header.jsx  → explicit sign-out via signOutUser()
      //   • ProfileModal → explicit sign-out
      // Both of those call the helper below before signing out.
      //
      // beforeunload is kept as a best-effort fallback for hard closes but
      // must NOT be relied upon (unreliable on mobile / crash scenarios).
      await setDoc(doc(db, "guestSessions", user.uid), {
        uid: user.uid,
        createdAt: serverTimestamp(),
        // Cloud Function checks this field to find stale sessions
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isAnonymous: true,
      });

      navigate("/home");
    } catch (err) {
      console.error("Guest sign-in error:", err.code, err.message);
      if (err.code === "auth/operation-not-allowed") {
        setError(
          "Anonymous sign-in is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method."
        );
      } else {
        setError("Could not sign in as a guest. Please try again.");
      }
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className={styles.authContainer}>
      <div className={`${styles.authShowcase} ${styles.bgSignIn}`}></div>
      <div className={styles.authFormContainer}>
        <img src={gpcLogo} alt="GPC Logo" className={styles.gpcLogo} />
        <h2 className={styles.welcomeMessage}>
          Welcome to the F.E.A.S.T.
          <br />
          Charity Management System!
        </h2>

        {error && (
          <div className={styles.errorNotification}>
            <div className={styles.errorContent}>
              <p className={styles.errorText}>{error}</p>
            </div>
            <button
              className={styles.closeNotification}
              onClick={() => setError("")}
            >
              &times;
            </button>
          </div>
        )}

        <form className={styles.authForm} onSubmit={handleSignIn}>
          <div className={styles.authFormInputGroup}>
            <label className={styles.authFormLabel} htmlFor="email">
              Email
            </label>
            <input
              autoComplete="email"
              name="email"
              id="email"
              className={styles.authFormInput}
              type="email"
              required
              maxLength={254} // RFC 5321 max email length
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              placeholder="example@email.com"
            />
          </div>

          <div className={styles.authFormInputGroup}>
            <label className={styles.authFormLabel} htmlFor="password">
              Password
            </label>
            <div className={styles.passwordInputWrapper}>
              <input
                autoComplete="current-password"
                name="password"
                id="password"
                className={`${styles.authFormInput} ${styles.passwordInput}`}
                type={showPassword ? "text" : "password"}
                required
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                placeholder="••••••••"
              />
              <button
                type="button"
                className={styles.passwordToggleBtn}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
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
                  <svg
                    viewBox="0 0 12 10"
                    height="10px"
                    width="12px"
                    className={styles.checkboxSvg}
                  >
                    <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
                  </svg>
                </span>
                <span className={styles.checkboxText}>Remember Me</span>
              </label>
            </div>
            <a
              href="/forgot-password"
              className={styles.forgotPasswordLink}
              onClick={(e) => {
                e.preventDefault();
                navigate("/forgot-password");
              }}
            >
              Forgot Password?
            </a>
          </div>

          <button
            type="submit"
            className={styles.authButton}
            disabled={isLoading}
          >
            {isLoading ? "Verifying..." : "Sign In"}
            {!isLoading && (
              <div className={styles.arrowWrapper}>
                <div className={styles.arrow}></div>
              </div>
            )}
          </button>
        </form>

        <p style={{ marginBottom: "12px" }}>
          Don't have an account yet?{" "}
          <a
            href="/signup"
            className={styles.authLink}
            onClick={(e) => {
              e.preventDefault();
              navigate("/signup");
            }}
          >
            Sign Up.
          </a>
        </p>
        <p>
          Want to look around first?{" "}
          <a
            href="#"
            className={styles.authLink}
            onClick={(e) => {
              e.preventDefault();
              setShowGuestModal(true);
            }}
          >
            Continue as Guest.
          </a>
        </p>
      </div>

      {showTermsModal && (
        <TermsConditionsModal onClose={() => setShowTermsModal(false)} />
      )}

      {showGuestModal && (
        <div
          className={`${styles.guestOverlay} ${
            guestClosing ? styles.guestOverlayClosing : ""
          }`}
          onClick={handleGuestModalClose}
        >
          <div
            className={`${styles.guestContent} ${
              guestClosing ? styles.guestContentClosing : ""
            }`}
            onClick={(e) => e.stopPropagation()}
            style={{ position: "relative" }}
          >
            <button
              className={styles.guestCloseBtn}
              onClick={handleGuestModalClose}
              aria-label="Close modal"
              disabled={isLoading}
            >
              &times;
            </button>
            <div style={{ marginBottom: "16px" }}>
              <AlertCircle
                size={48}
                color="#f5a623"
                style={{ margin: "0 auto" }}
              />
            </div>
            <h3
              style={{
                marginBottom: "12px",
                fontSize: "1.25rem",
                color: "#333",
              }}
            >
              Continue as Guest?
            </h3>
            <p
              style={{ marginBottom: "24px", color: "#666", lineHeight: "1.5" }}
            >
              By continuing as a guest, you will <strong>not</strong> be able to
              access important functions such as messaging and notifications.
              Your session will be temporary.
            </p>
            <div
              style={{ display: "flex", gap: "12px", justifyContent: "center" }}
            >
              <button
                className={styles.guestCancelBtn}
                onClick={handleGuestModalClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className={styles.authButton}
                style={{
                  padding: "10px 20px",
                  width: "auto",
                  margin: "0",
                  borderRadius: "8px",
                }}
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
