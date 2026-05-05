import React from 'react';
import { useNavigate } from "react-router-dom";
import "../components/AuthStyles.css";
import gpcLogo from "../assets/GPC_Logo.png";

const ForgotPassword = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-container">
      <div className="auth-showcase" id="auth-showcase-2">
      </div>
      <div className="auth-form-container">
        <img src={gpcLogo} alt="GPC Logo" className="gpc-logo" />
        <h2 className="welcome-message">Forgot Your Password?</h2>
        <p className='form-description'>Enter your email address below and we'll send you a link to reset your password.</p>
        <form className="auth-form">
          <div className="input-group">
            <label className="label" htmlFor="email">Email</label>
            <input autocomplete="off" name="email" id="email" className="input" type="email" required />
          </div>
          <div className="options-container">
            <div className="checkbox-wrapper-46">
              <input type="checkbox" id="cbx-46" className="inp-cbx" required />
              <label for="cbx-46" className="cbx"
                ><span>
                  <svg viewBox="0 0 12 10" height="10px" width="12px">
                    <polyline points="1.5 6 4.5 9 10.5 1"></polyline></svg></span
                ><span className="auth-link">I agree to the <a href="/" target="_blank" rel="noopener noreferrer" onClick={() => navigate("/")}>Terms and Conditions.</a></span>
              </label>
            </div>
          </div>
          <button type="submit" className="auth-button" onClick={() => navigate("/reset")}>
              Request Password Reset
              <div className="arrow-wrapper">
                  <div className="arrow"></div>
              </div>
          </button>
        </form>
        <p className="auth-link">Remember your password? <a href="/" onClick={() => navigate("/")}>Sign In.</a></p>
      </div>
    </div>
  );
};

export default ForgotPassword;