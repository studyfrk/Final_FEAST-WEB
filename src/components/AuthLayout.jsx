import gpcLogo from "../assets/GPC_Logo.png";
import styles from "./AuthStyles";

const AuthLayout = ({ children }) => {
  return (
    <div style={styles.pageContainer}>
      <div style={styles.contentContainer}>
        
        <div style={styles.logoSection}>
          <img src={gpcLogo} alt="Logo" style={styles.logo} />
          <h1 style={styles.appTitle}>
            Charity Management <br /> System
          </h1>
        </div>

        <div style={styles.rightSection}>
          {children}
        </div>

      </div>
    </div>
  );
};

export default AuthLayout;