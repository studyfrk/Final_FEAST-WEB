import { useNavigate } from "react-router-dom";
import { useState } from "react";
import AuthLayout from "../components/AuthLayout";
import styles from "../components/AuthStyles";

const ResetPassword = () => {
  const [step, setStep] = useState("email");
  const navigate = useNavigate();

  return (
    <AuthLayout>
      <div style={styles.card}>
        {step === "email" ? (
          <>
            <h2 style={styles.headerText}>
              Reset Password
            </h2>

            <input
              placeholder="Email"
              style={styles.input}
            />

            <button
              style={styles.primaryButton}
              onClick={() => setStep("password")}
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <h2 style={styles.headerText}>
              New Password
            </h2>

            <input
              placeholder="New Password"
              style={styles.input}
            />

            <input
              placeholder="Confirm Password"
              style={styles.input}
            />

            <button
              style={styles.primaryButton}
              onClick={() => navigate("/")}
            >
              Confirm
            </button>
          </>
        )}
      </div>

      <button
        style={styles.secondaryButton}
        onClick={() => navigate("/")}
      >
        Back to login
      </button>
    </AuthLayout>
  );
};

export default ResetPassword;