import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import styles from "../components/AuthStyles";

const SignUp = () => {
  const navigate = useNavigate();

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
          <div style={styles.labelRow}>
            <label style={styles.label}>Password</label>
            <span style={styles.hideToggle}>👁 Hide</span>
          </div>
          <input type="password" style={styles.input} />
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