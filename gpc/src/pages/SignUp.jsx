import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import styles from "../components/AuthStyles";
import eyeOpen from "../assets/view.png";
import eyeClose from "../assets/close-eye.png";

const SignUp = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <AuthLayout>
      <div style={styles.card}>
        <h2 style={styles.headerText}>Sign Up</h2>

        <div style={styles.inputGroup}>
          <label style={styles.label}>First Name</label>
          <input type="text" style={styles.input} />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Last Name</label>
          <input type="text" style={styles.input} />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Your email</label>
          <input type="email" style={styles.input} />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Password</label>

          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              style={{ ...styles.input, paddingRight: "40px" }}
            />

            <img
              src={showPassword ? eyeClose : eyeOpen}
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

        <div style={styles.inputGroup}>
          <label style={styles.label}>Contact Number</label>
          <input type="tel" style={styles.input} />
        </div>

        <button style={styles.primaryButton}>
          Sign Up
        </button>

        <div style={styles.linkWrapper}>
          <span
            style={styles.forgotLink}
            onClick={() => navigate("/")}
          >
            Already have an account? Log in
          </span>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SignUp;