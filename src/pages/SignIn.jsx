import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
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

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    setError("");
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().status === "Deactivated") {
        await signOut(auth);
        setError("This account is deactivated.");
      } else {
        navigate("/home");
      }
    } catch (err) {
      setError("Could not sign in with Google.");
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

        <div className="divider"><span>or</span></div>

        <button className="google-button" onClick={handleGoogleSignIn} disabled={isLoading}>
          <svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" viewBox="0 0 256 262">
            <path fill="#4285F4" d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"></path>
            <path fill="#34A853" d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"></path>
            <path fill="#FBBC05" d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"></path>
            <path fill="#EB4335" d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"></path>
          </svg>
          Continue with Google
        </button>
        <p className="auth-link">
          Don't have an account yet? <a href="/signup" onClick={(e) => { e.preventDefault(); navigate("/signup"); }}>Sign Up.</a>
        </p>
      </div>
    </div>
  );
};

export default SignIn;