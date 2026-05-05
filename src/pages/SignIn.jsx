import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import styles from "../components/AuthStyles";

import eyeOpen from "../assets/view.png";
import eyeClose from "../assets/close-eye.png";

const SignIn = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <AuthLayout>
      <div style={styles.card}>
        <h2 style={styles.headerText}>Sign In</h2>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Your email</label>
          <input type="email" style={styles.input} />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Your password</label>

          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              style={{ ...styles.input, paddingRight: "40px" }}
            />

            <img
              src={showPassword ? eyeOpen : eyeClose}
              alt="toggle password"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "20px",
                height: "20px",
                cursor: "pointer"
              }}
            />
          </div>
        </div>

        <button 
        style={styles.primaryButton}
        onClick={() => navigate("/home")} 
        >
        Log in
        </button>

        <div style={styles.linkWrapper}>
          <span
            style={styles.forgotLink}
            onClick={() => navigate("/reset")}
          >
            Forgot your password?
          </span>
        </div>
      </div>

      <button
        style={styles.secondaryButton}
        onClick={() => navigate("/signup")}
      >
        Create an account
      </button>
    </AuthLayout>
  );
};

export default SignIn;