import React, { useState } from 'react';
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Upload } from "lucide-react";
import { auth, db } from "../firebase"; 
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import "../components/AuthStyles.css";
import gpcLogo from "../assets/GPC_Logo.png";

const SignUp = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("No file chosen");
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    location: '',
    contactNumber: '',
    gender: '',
    dob: '',
    email: '',
    password: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        location: formData.location,
        contactNumber: formData.contactNumber,
        gender: formData.gender,
        dob: formData.dob,
        email: formData.email,
        role: "user", 
        createdAt: new Date().toISOString()
      });

      navigate("/home");
    } catch (error) {
      console.error("Error signing up:", error.message);
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '15px', backgroundColor: '#f4f4f4' }}>
      <div className="auth-form-container" style={{ maxWidth: '650px', width: '100%', padding: '20px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
        
        {/* Header Section with reduced bottom margin */}
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <img src={gpcLogo} alt="GPC Logo" style={{ height: '85px', width: 'auto', marginBottom: '2px' }} />
          <h2 className="welcome-message" style={{ fontSize: '1.2rem', margin: '0' }}>Create an Account</h2>
          <p style={{ fontSize: '0.75rem', color: '#666', margin: '2px 0 0 0' }}>Join the F.E.A.S.T. Charity Management System</p>
        </div>

        {/* Form with reduced gap/padding to header */}
        <form className="auth-form" onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="input-group">
              <label className="label" style={{ fontSize: '0.75rem' }}>Email</label>
              <input name="email" className="input" type="email" required onChange={handleInputChange} style={{ height: '35px', fontSize: '0.85rem' }} />
            </div>
            <div className="input-group">
              <label className="label" style={{ fontSize: '0.75rem' }}>Password</label>
              <div className="password-input-wrapper" style={{ position: 'relative' }}>
                <input name="password" className="input" type={showPassword ? "text" : "password"} required onChange={handleInputChange} style={{ width: '100%', height: '35px', fontSize: '0.85rem' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#666', display: 'flex' }}>
                  {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
            <div className="input-group">
              <label className="label" style={{ fontSize: '0.75rem' }}>First Name</label>
              <input name="firstName" className="input" type="text" required onChange={handleInputChange} style={{ height: '35px', fontSize: '0.85rem' }} />
            </div>
            <div className="input-group">
              <label className="label" style={{ fontSize: '0.75rem' }}>Last Name</label>
              <input name="lastName" className="input" type="text" required onChange={handleInputChange} style={{ height: '35px', fontSize: '0.85rem' }} />
            </div>
            <div className="input-group">
              <label className="label" style={{ fontSize: '0.75rem' }}>Middle Name</label>
              <input name="middleName" className="input" type="text" onChange={handleInputChange} style={{ height: '35px', fontSize: '0.85rem' }} />
            </div>
            <div className="input-group">
              <label className="label" style={{ fontSize: '0.75rem' }}>Gender</label>
              <select name="gender" className="input" required onChange={handleInputChange} style={{ height: '35px', fontSize: '0.85rem', padding: '0 10px' }}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="input-group">
              <label className="label" style={{ fontSize: '0.75rem' }}>Contact Number</label>
              <input name="contactNumber" className="input" type="tel" required onChange={handleInputChange} style={{ height: '35px', fontSize: '0.85rem' }} />
            </div>
            <div className="input-group">
              <label className="label" style={{ fontSize: '0.75rem' }}>Date of Birth</label>
              <input name="dob" className="input" type="date" required onChange={handleInputChange} style={{ height: '35px', fontSize: '0.85rem' }} />
            </div>
            <div className="input-group" style={{ gridColumn: 'span 2' }}>
              <label className="label" style={{ fontSize: '0.75rem' }}>Location</label>
              <input name="location" className="input" type="text" required onChange={handleInputChange} style={{ height: '35px', fontSize: '0.85rem' }} />
            </div>

            <div className="input-group" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '2px' }}>
              <label className="label" style={{ fontSize: '0.75rem', marginBottom: '5px' }}>Verification (Valid ID)</label>
              <label 
                htmlFor="validID" 
                className="input" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '10px', 
                  cursor: 'pointer', 
                  height: '35px', 
                  fontSize: '0.8rem', 
                  maxWidth: '300px', 
                  width: '100%',
                  backgroundColor: '#f9f9f9',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  color: '#555'
                }}
              >
                <Upload size={14} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fileName}
                </span>
              </label>
              <input id="validID" type="file" required onChange={handleFileChange} style={{ display: 'none' }} />
            </div>
          </div>

          <div className="options-container" style={{ marginTop: '2px' }}>
            <div className="checkbox-wrapper-46">
              <input type="checkbox" id="terms-signup" className="inp-cbx" required />
              <label htmlFor="terms-signup" className="cbx" style={{ fontSize: '0.75rem' }}>
                <span><svg viewBox="0 0 12 10" height="10px" width="12px"><polyline points="1.5 6 4.5 9 10.5 1"></polyline></svg></span>
                <span>I agree to the <Link to="/terms-conditions" style={{ color: '#2d6a4f', textDecoration: 'underline', fontWeight: '600' }}>Terms and Conditions</Link></span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '5px' }}>
            <button type="submit" className="auth-button" disabled={isLoading} style={{ padding: '10px 30px', fontSize: '0.85rem' }}>
              {isLoading ? "Creating Account..." : "Sign up"}
              {!isLoading && <div className="arrow-wrapper"><div className="arrow"></div></div>}
            </button>

            <p className="auth-link" style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.75rem' }}>
              Already have an account? <Link to="/">Sign In.</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUp;