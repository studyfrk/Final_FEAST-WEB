import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import styles from "../components/AuthStyles";

const SignIn = () => {
  const navigate = useNavigate();

  return (
    <AuthLayout>
      <div style={styles.card}>
        <h2 style={styles.headerText}>Sign In</h2>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Your email</label>
          <input type="email" style={styles.input} />
        </div>

        <div style={styles.inputGroup}>
          <div style={styles.labelRow}>
            <label style={styles.label}>Your password</label>
            <span style={styles.hideToggle}>👁 Hide</span>
          </div>
          <input type="password" style={styles.input} />
        </div>

        <button style={styles.primaryButton}>
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