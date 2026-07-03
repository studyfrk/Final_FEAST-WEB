import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth, db, storage } from "../firebase";
import { signOut, signInWithCustomToken } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { AlertCircle, CheckCircle2, Upload, LogOut, X } from "lucide-react";

/* Asset Imports */
import gpcLogo from "../assets/GPC_Logo.png";

/* Style Imports */
import styles from "../components/sign_up.module.css";

const PH_PHONE_REGEX = /^(09)\d{9}$/;
const ALLOWED_ID_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_ID_SIZE = 5 * 1024 * 1024; // 5 MB

const sanitizeFileName = (fileName) => {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
};

const RejectedPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [existingIdUrl, setExistingIdUrl] = useState("");
  const [existingIdPath, setExistingIdPath] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    gender: "",
    dob: "",
    location: "",
    contactNumber: ""
  });

  const [idFile, setIdFile] = useState(null);
  const [fileName, setFileName] = useState("Upload New Valid ID");
  const [fieldErrors, setFieldErrors] = useState({});
  const [alertConfig, setAlertConfig] = useState({ show: false, message: "", type: "" });
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const today = new Date();
  const maxDob = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
    .toISOString()
    .split("T")[0];

  useEffect(() => {
    const initPage = async () => {
      if (token) {
        setLoading(true);
        try {
          await signInWithCustomToken(auth, token);
          console.log("Successfully logged in via rejection email magic link.");
          // Clean the token from the URL to keep it clean and secure
          navigate("/rejected", { replace: true });
        } catch (err) {
          console.error("Failed to login with magic link token:", err);
          setAlertConfig({
            show: true,
            message: "The login link has expired or is invalid. Please sign in with your email and password.",
            type: "error"
          });
          setLoading(false);
          return;
        }
      }

      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            middleName: data.middleName || "",
            gender: data.gender || "",
            dob: data.dob || "",
            location: data.location || "",
            contactNumber: data.phone || ""
          });
          setExistingIdUrl(data.legalIdUrl || "");
          setExistingIdPath(data.legalIdPath || "");
          setRejectionReason(data.rejectionReason || "No rejection reason provided by the administrator.");
        }
      } catch (err) {
        console.error("Error loading user details:", err);
      } finally {
        setLoading(false);
      }
    };
    initPage();
  }, [token]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, ""); // keep digits only
    setFormData(prev => ({ ...prev, contactNumber: val }));
    if (fieldErrors.contactNumber) {
      setFieldErrors(prev => ({ ...prev, contactNumber: "" }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!ALLOWED_ID_TYPES.includes(file.type)) {
      setFieldErrors(prev => ({
        ...prev,
        idFile: 'Only JPG, PNG, or PDF files are accepted.',
      }));
      e.target.value = '';
      setFileName("Upload New Valid ID");
      setIdFile(null);
      return;
    }

    if (file.size > MAX_ID_SIZE) {
      setFieldErrors(prev => ({
        ...prev,
        idFile: 'File must be 5 MB or smaller.',
      }));
      e.target.value = '';
      setFileName("Upload New Valid ID");
      setIdFile(null);
      return;
    }

    setFileName(file.name);
    setIdFile(file);
    if (fieldErrors.idFile) {
      setFieldErrors(prev => ({ ...prev, idFile: "" }));
    }
  };

  const handleLogOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("feast_auth_token");
      localStorage.removeItem("feast_was_admin");
      navigate("/");
    } catch (err) {
      console.error("Log out failed:", err);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.firstName.trim()) errors.firstName = "First name is required.";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required.";
    if (!formData.gender) errors.gender = "Please select a gender.";
    if (!formData.location.trim()) errors.location = "Address is required.";

    if (!PH_PHONE_REGEX.test(formData.contactNumber)) {
      errors.contactNumber = "Enter a valid PH number (e.g. 09171234567).";
    }

    if (!formData.dob) {
      errors.dob = "Date of birth is required.";
    } else if (formData.dob > maxDob) {
      errors.dob = "You must be at least 18 years old to register.";
    }

    // A new valid ID is strictly required for resubmission
    if (!idFile) {
      errors.idFile = "Please upload a new valid ID.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleResubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setAlertConfig({ show: true, message: "Please correct the errors in the form.", type: "error" });
      return;
    }

    setSubmitting(true);
    setAlertConfig({ show: false, message: "", type: "" });

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated user found.");

      let legalIdUrl = existingIdUrl;
      let legalIdPath = existingIdPath;

      if (idFile) {
        const safeName = sanitizeFileName(idFile.name);
        const storagePath = `legal_ids/${user.uid}/${Date.now()}_${safeName}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, idFile);
        legalIdUrl = await getDownloadURL(storageRef);
        legalIdPath = storagePath;
      }

      await updateDoc(doc(db, "users", user.uid), {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        middleName: formData.middleName.trim(),
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        gender: formData.gender,
        dob: formData.dob,
        location: formData.location.trim(),
        phone: formData.contactNumber,
        legalIdUrl,
        legalIdPath,
        status: "unverified", // Back to pending verification
        rejectionReason: null, // Clear rejection reason
        resubmittedAt: serverTimestamp()
      });

      setShowSuccessModal(true);
    } catch (err) {
      console.error("Resubmission error:", err);
      setAlertConfig({ show: true, message: err.message || "An error occurred during resubmission. Please try again.", type: "error" });
      setSubmitting(false);
    }
  };

  const handleModalClose = async () => {
    setShowSuccessModal(false);
    await handleLogOut();
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "Outfit" }}>
        <h2>Loading your registration details...</h2>
      </div>
    );
  }

  return (
    <div className={styles.authContainer}>
      <div className={styles.authFormContainer} style={{ position: 'relative' }}>
        
        {/* Rejection Alert Box */}
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1.5px solid #fca5a5',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          display: 'flex',
          gap: '14px',
          alignItems: 'flex-start'
        }}>
          <AlertCircle size={24} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h3 style={{ margin: '0 0 6px 0', color: '#991b1b', fontSize: '1.05rem', fontWeight: '700', fontFamily: 'Outfit' }}>
              Registration Declined
            </h3>
            <p style={{ margin: '0 0 10px 0', color: '#7f1d1d', fontSize: '0.9rem', lineHeight: '1.5', fontFamily: 'Outfit' }}>
              Your application was declined by the administrator. Please review the reason below, correct your information, and resubmit.
            </p>
            <div style={{
              backgroundColor: '#ffffff',
              borderLeft: '4px solid #ef4444',
              padding: '10px 14px',
              borderRadius: '4px',
              fontSize: '0.9rem',
              color: '#374151',
              fontWeight: '500',
              fontStyle: 'italic',
              fontFamily: 'Outfit'
            }}>
              "{rejectionReason}"
            </div>
          </div>
        </div>

        {alertConfig.show && (
          <div className={`${styles.alertBanner} ${styles[alertConfig.type]}`}>
            <span className={styles.alertIcon}>
              <AlertCircle size={18} />
            </span>
            <p className={styles.alertMessage}>{alertConfig.message}</p>
            <button className={styles.alertClose} onClick={() => setAlertConfig(prev => ({ ...prev, show: false }))} type="button">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Header with Log Out Button */}
        <div className={styles.header} style={{ position: 'relative' }}>
          <button
            onClick={handleLogOut}
            style={{
              position: 'absolute',
              top: '0px',
              right: '0px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'transparent',
              border: '1.5px solid #ef4444',
              color: '#ef4444',
              padding: '6px 12px',
              borderRadius: '8px',
              fontWeight: '600',
              fontFamily: 'Outfit',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '0.8rem',
              zIndex: 10
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fef2f2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <LogOut size={12} /> Log Out
          </button>
          <img src={gpcLogo} alt="GPC Logo" className={styles.gpcLogo} />
          <h2 className={styles.welcomeMessage}>Resubmit Registration</h2>
          <p className={styles.formDescription}>Update your profile details and upload the correct valid ID</p>
        </div>

        <form className={styles.authForm} onSubmit={handleResubmit} noValidate>
          
          <div className={styles.sectionDivider}><span>Personal Information</span></div>

          <div className={styles.formRow}>
            {/* First Name */}
            <div className={styles.authFormInputGroup}>
              <label className={styles.authFormLabel} htmlFor="resubmit-firstName">
                First Name <span className={styles.required}>*</span>
              </label>
              <input
                id="resubmit-firstName"
                name="firstName"
                type="text"
                className={`${styles.authFormInput} ${fieldErrors.firstName ? styles.inputError : ''}`}
                value={formData.firstName}
                onChange={handleInputChange}
                disabled={submitting}
                placeholder="e.g. Juan"
              />
              {fieldErrors.firstName && (
                <span className={styles.fieldError}>
                  <AlertCircle size={11} />{fieldErrors.firstName}
                </span>
              )}
            </div>

            {/* Last Name */}
            <div className={styles.authFormInputGroup}>
              <label className={styles.authFormLabel} htmlFor="resubmit-lastName">
                Last Name <span className={styles.required}>*</span>
              </label>
              <input
                id="resubmit-lastName"
                name="lastName"
                type="text"
                className={`${styles.authFormInput} ${fieldErrors.lastName ? styles.inputError : ''}`}
                value={formData.lastName}
                onChange={handleInputChange}
                disabled={submitting}
                placeholder="e.g. De La Cruz"
              />
              {fieldErrors.lastName && (
                <span className={styles.fieldError}>
                  <AlertCircle size={11} />{fieldErrors.lastName}
                </span>
              )}
            </div>

            {/* Middle Name */}
            <div className={styles.authFormInputGroup}>
              <label className={styles.authFormLabel} htmlFor="resubmit-middleName">
                Middle Name <span className={styles.optional}>(optional)</span>
              </label>
              <input
                id="resubmit-middleName"
                name="middleName"
                type="text"
                className={styles.authFormInput}
                value={formData.middleName}
                onChange={handleInputChange}
                disabled={submitting}
                placeholder="e.g. Santos"
              />
            </div>

            {/* Gender */}
            <div className={styles.authFormInputGroup}>
              <label className={styles.authFormLabel} htmlFor="resubmit-gender">
                Gender <span className={styles.required}>*</span>
              </label>
              <select
                id="resubmit-gender"
                name="gender"
                className={`${styles.authFormInput} ${fieldErrors.gender ? styles.inputError : ''}`}
                value={formData.gender}
                onChange={handleInputChange}
                disabled={submitting}
              >
                <option value="" disabled>Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              {fieldErrors.gender && (
                <span className={styles.fieldError}>
                  <AlertCircle size={11} />{fieldErrors.gender}
                </span>
              )}
            </div>

            {/* Contact Number */}
            <div className={styles.authFormInputGroup}>
              <label className={styles.authFormLabel} htmlFor="resubmit-contactNumber">
                Contact Number <span className={styles.required}>*</span>
              </label>
              <div className={styles.phoneInputWrapper}>
                <span className={styles.phonePrefix}>🇵🇭</span>
                <input
                  id="resubmit-contactNumber"
                  name="contactNumber"
                  type="tel"
                  inputMode="numeric"
                  className={`${styles.authFormInput} ${styles.phoneInput} ${fieldErrors.contactNumber ? styles.inputError : ''}`}
                  placeholder="09XXXXXXXXX"
                  value={formData.contactNumber}
                  onChange={handlePhoneChange}
                  disabled={submitting}
                  maxLength={11}
                />
              </div>
              <span className={styles.fieldHint}>11-digit number starting with 09</span>
              {fieldErrors.contactNumber && (
                <span className={styles.fieldError}>
                  <AlertCircle size={11} />{fieldErrors.contactNumber}
                </span>
              )}
            </div>

            {/* Date of Birth */}
            <div className={styles.authFormInputGroup}>
              <label className={styles.authFormLabel} htmlFor="resubmit-dob">
                Date of Birth <span className={styles.required}>*</span>
              </label>
              <input
                id="resubmit-dob"
                name="dob"
                type="date"
                className={`${styles.authFormInput} ${fieldErrors.dob ? styles.inputError : ''}`}
                value={formData.dob}
                max={maxDob}
                disabled={submitting}
                onChange={handleInputChange}
              />
              <span className={styles.fieldHint}>Must be 18 years old or above</span>
              {fieldErrors.dob && (
                <span className={styles.fieldError}>
                  <AlertCircle size={11} />{fieldErrors.dob}
                </span>
              )}
            </div>

            {/* Address / Location */}
            <div className={`${styles.authFormInputGroup} ${styles.fullWidth}`}>
              <label className={styles.authFormLabel} htmlFor="resubmit-location">
                Address <span className={styles.required}>*</span>
              </label>
              <input
                id="resubmit-location"
                name="location"
                type="text"
                className={`${styles.authFormInput} ${fieldErrors.location ? styles.inputError : ''}`}
                value={formData.location}
                onChange={handleInputChange}
                disabled={submitting}
                placeholder="City, Province"
              />
              {fieldErrors.location && (
                <span className={styles.fieldError}>
                  <AlertCircle size={11} />{fieldErrors.location}
                </span>
              )}
            </div>

            {/* ID File Upload */}
            <div className={`${styles.authFormInputGroup} ${styles.fileUploadGroup} ${styles.fullWidth}`}>
              <label className={styles.authFormLabel}>
                Verification (Valid ID) <span className={styles.required}>*</span>
              </label>

              {/* Show preview link to previously uploaded ID if available */}
              {existingIdUrl && (
                <div style={{ marginBottom: '8px', fontSize: '0.85rem', color: '#4b5563' }}>
                  Previously uploaded:{" "}
                  <a 
                    href={existingIdUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ color: '#28a786', fontWeight: '600', textDecoration: 'underline' }}
                  >
                    View Submitted ID ↗
                  </a>
                  <span style={{ fontSize: '0.8rem', color: '#9ca3af', marginLeft: '6px' }}>
                    (Upload below if you want to replace it)
                  </span>
                </div>
              )}

              <label
                htmlFor="resubmit-validID"
                className={`${styles.fileUploadLabel} ${idFile ? styles.fileUploaded : ''} ${fieldErrors.idFile ? styles.fileUploadError : ''}`}
              >
                {idFile ? <CheckCircle2 size={14} /> : <Upload size={14} />}
                <span>{fileName}</span>
              </label>
              <input
                id="resubmit-validID"
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className={styles.fileUploadInput}
                onChange={handleFileChange}
                disabled={submitting}
              />
              <span className={styles.fieldHint}>Accepted: JPG, PNG, PDF · Max 5 MB</span>
              {fieldErrors.idFile && (
                <span className={styles.fieldError}>
                  <AlertCircle size={11} />{fieldErrors.idFile}
                </span>
              )}

              {/* Accepted Valid IDs panel */}
              <div className={styles.acceptedIdsContainer}>
                <div className={styles.acceptedIdsHeader}>
                  <CheckCircle2 size={14} className={styles.acceptedIdsIcon} />
                  <h4 className={styles.acceptedIdsTitle}>Accepted Valid IDs</h4>
                </div>
                <p className={styles.acceptedIdsText}>
                  Any valid government-issued or official ID that clearly shows your current address (used to verify Resident or Non-Resident status):
                </p>
                <ul className={styles.acceptedIdsList}>
                  <li className={styles.acceptedIdsItem}>
                    <span className={styles.acceptedIdsBullet}></span>
                    National ID / eCard
                  </li>
                  <li className={styles.acceptedIdsItem}>
                    <span className={styles.acceptedIdsBullet}></span>
                    Driver's License
                  </li>
                  <li className={styles.acceptedIdsItem}>
                    <span className={styles.acceptedIdsBullet}></span>
                    Voter's ID / Certificate
                  </li>
                  <li className={styles.acceptedIdsItem}>
                    <span className={styles.acceptedIdsBullet}></span>
                    Passport
                  </li>
                  <li className={styles.acceptedIdsItem}>
                    <span className={styles.acceptedIdsBullet}></span>
                    UMID / SSS ID
                  </li>
                  <li className={styles.acceptedIdsItem}>
                    <span className={styles.acceptedIdsBullet}></span>
                    Postal ID
                  </li>
                  <li className={styles.acceptedIdsItem}>
                    <span className={styles.acceptedIdsBullet}></span>
                    Barangay Certificate
                  </li>
                  <li className={styles.acceptedIdsItem}>
                    <span className={styles.acceptedIdsBullet}></span>
                    Official ID with Address
                  </li>
                </ul>
              </div>
            </div>

          </div>

          {/* Submit Area */}
          <div className={styles.submitArea}>
            <button
              type="submit"
              className={styles.authButton}
              disabled={submitting}
            >
              {submitting ? "Resubmitting…" : "Resubmit Registration"}
              {!submitting && (
                <span className={styles.arrowWrapper}>
                  <span className={styles.arrow} />
                </span>
              )}
            </button>
          </div>

        </form>
      </div>

      {/* Success Confirmation Modal Overlay */}
      {showSuccessModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 20000,
          padding: "16px",
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            width: "100%",
            maxWidth: "460px",
            padding: "32px 24px 24px",
            textAlign: "center",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)"
          }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              backgroundColor: "#d1f7e3",
              color: "#28a786",
              marginBottom: "16px"
            }}>
              <CheckCircle2 size={36} />
            </div>
            <h3 style={{ margin: "0 0 10px 0", color: "#1e293b", fontSize: "1.3rem", fontWeight: "700", fontFamily: "Outfit" }}>
              Resubmitted Successfully!
            </h3>
            <p style={{ margin: "0 0 24px 0", color: "#475569", fontSize: "0.95rem", lineHeight: "1.5", fontFamily: "Outfit" }}>
              Your application details and ID have been resubmitted. Your registration status has returned to pending verification. You will be signed out now while the administrator reviews your request.
            </p>
            <button
              onClick={handleModalClose}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                backgroundColor: "#28a786",
                color: "#ffffff",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: "Outfit",
                transition: "opacity 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              Okay, Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RejectedPage;
