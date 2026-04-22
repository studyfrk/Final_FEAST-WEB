const styles = {
pageContainer: {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(to right, #cbd5c0, #d8dfc8)",
},

  contentContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "60px",
    maxWidth: "1000px",
    width: "100%",
  },

  logoSection: {
    textAlign: "center",
    flex: 1,
  },

  logo: {
    width: "45vh",
    marginBottom: "20px",
  },

  appTitle: {
    fontSize: "36px",
    fontWeight: "900",
    color: "white",
    margin: 0,
    lineHeight: "1.2",
    textShadow:
      "-1px -1px 0 #3a86ff, 1px -1px 0 #3a86ff, -1px 1px 0 #3a86ff, 1px 1px 0 #3a86ff",
  },

  rightSection: {
    display: "flex",
    flexDirection: "column",
    width: "400px",
  },

  card: {
    backgroundColor: "white",
    padding: "30px",
    borderRadius: "15px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
    marginBottom: "20px",
  },

  headerText: {
    textAlign: "center",
    fontSize: "24px",
    marginTop: 0,
    marginBottom: "25px",
    fontFamily: "serif",
    fontWeight: "bold",
  },

  inputGroup: {
    marginBottom: "15px",
  },

  labelRow: {
    display: "flex",
    justifyContent: "space-between",
  },

  label: {
    display: "block",
    fontSize: "13px",
    color: "#777",
    marginBottom: "5px",
  },

  hideToggle: {
    fontSize: "12px",
    color: "#999",
    cursor: "pointer",
  },

  input: {
    width: "100%",
    padding: "10px",
    boxSizing: "border-box",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px",
  },

  primaryButton: {
    width: "100%",
    padding: "14px",
    backgroundColor: "#2e7d32",
    color: "white",
    border: "none",
    borderRadius: "28px",
    fontWeight: "bold",
    fontSize: "16px",
    cursor: "pointer",
    marginTop: "10px",
  },

  secondaryButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "transparent",
    border: "1px solid #333",
    borderRadius: "28px",
    fontWeight: "600",
    cursor: "pointer",
  },

  linkWrapper: {
    textAlign: "center",
    marginTop: "15px",
  },

  forgotLink: {
    fontSize: "13px",
    color: "#666",
    textDecoration: "underline",
    cursor: "pointer",
  },
};

export default styles;