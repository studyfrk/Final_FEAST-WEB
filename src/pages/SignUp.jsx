/* React & Firebase Imports */
import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Upload, AlertCircle, CheckCircle2, X, Check, Mail } from "lucide-react";
import { auth, db, storage } from "../firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/* Asset Imports */
import gpcLogo from "../assets/GPC_Logo.png";

/* Component Imports */
import TermsConditionsModal from "../components/TermsConditionsModal.jsx";

/* Style Imports */
import styles from "../components/sign_up.module.css";

/* ─────────────────────────────────────────────────────────────
   Validation helpers
───────────────────────────────────────────────────────────── */

/** Password rules — each returns true when the rule passes. */
const PASSWORD_RULES = [
  { id: 'length',  label: 'At least 8 characters',        test: (p) => p.length >= 8 },
  { id: 'upper',   label: 'One uppercase letter (A–Z)',    test: (p) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'One lowercase letter (a–z)',    test: (p) => /[a-z]/.test(p) },
  { id: 'number',  label: 'One number (0–9)',              test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character (!@#…)',  test: (p) => /[^A-Za-z0-9]/.test(p) },
];

/** Philippine mobile numbers: 09XXXXXXXXX — exactly 11 digits starting with 09. */
const PH_PHONE_REGEX = /^09\d{9}$/;

/** Max date allowed for DOB: today minus 18 years (no future dates either). */
const getMaxDob = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().split('T')[0]; // "YYYY-MM-DD"
};

/* ─────────────────────────────────────────────────────────────
   Email Sent Screen
   Shown after a successful registration + verification email.
   Mirrors the UX pattern from ForgotPassword.jsx.
───────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────
   Email Sent Screen
   Shown after a successful registration + verification email.
   The user clicks the link → Firebase redirects to /verify-email
   which upgrades the Firestore status automatically.
───────────────────────────────────────────────────────────── */

const EmailSentScreen = ({ email, onBackToLogin }) => (
  <div className={styles.authContainer}>
    <div className={styles.authFormContainer}>
      <div className={styles.emailSentWrapper}>
        <div className={styles.emailSentIcon}>
          <Mail size={40} strokeWidth={1.5} />
        </div>
        <h2 className={styles.welcomeMessage}>Check Your Email</h2>
        <p className={styles.emailSentBody}>
          We've sent a verification link to{" "}
          <strong className={styles.emailHighlight}>{email}</strong>.
        </p>
        <p className={styles.emailSentBody}>
          Click the link in that email to confirm your address. You'll be
          redirected to a confirmation page, after which an administrator
          will review and activate your account.
        </p>
        <p className={styles.emailSentNote}>
          Didn't receive it? Check your spam or junk folder. The link expires
          after 24 hours.
        </p>
        <button
          type="button"
          className={styles.authButton}
          onClick={onBackToLogin}
          style={{ marginTop: '8px' }}
        >
          Back to Sign In
        </button>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────── */

const SignUp = () => {
  const navigate = useNavigate();

  // After a successful submission we switch to the confirmation screen
  const [emailSent, setEmailSent]           = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const [showPassword, setShowPassword]           = useState(false);
  const [passwordTouched, setPasswordTouched]     = useState(false);
  const [isLoading, setIsLoading]                 = useState(false);
  const [termsAccepted, setTermsAccepted]         = useState(false);
  const [termsError, setTermsError]               = useState(false);
  const [fileName, setFileName]                   = useState("Upload Valid ID");
  const [idFile, setIdFile]                   = useState(null);
  const [alertConfig, setAlertConfig]         = useState({ show: false, message: '', type: '' });
  const [fieldErrors, setFieldErrors]         = useState({});
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [formData, setFormData] = useState({
    firstName:     '',
    middleName:    '',
    lastName:      '',
    location:      '',
    contactNumber: '',
    gender:        '',
    dob:           '',
    email:         '',
    password:      '',
  });

  /* ── Derived values ─────────────────────────────────────── */

  const passwordRuleStatus = useMemo(() =>
    PASSWORD_RULES.map(rule => ({ ...rule, passed: rule.test(formData.password) })),
    [formData.password]
  );
  const passwordValid = passwordRuleStatus.every(r => r.passed);
  const maxDob        = useMemo(getMaxDob, []);

  /* ── Handlers ───────────────────────────────────────────── */

  const clearFieldError = (name) => {
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    clearFieldError(name);
  };

  /** Strip non-digits, clamp to 11 chars — keeps controlled input in sync. */
  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    setFormData(prev => ({ ...prev, contactNumber: digits }));
    clearFieldError('contactNumber');
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
      setIdFile(e.target.files[0]);
      clearFieldError('idFile');
    }
  };

  const showAlert = (message, type) => {
    setAlertConfig({ show: true, message, type });
  };

  const dismissAlert = () =>
    setAlertConfig(prev => ({ ...prev, show: false }));

  /* ── Client-side validation ─────────────────────────────── */

  const validateForm = () => {
    const errors = {};

    if (!formData.firstName.trim())  errors.firstName  = "First name is required.";
    if (!formData.lastName.trim())   errors.lastName   = "Last name is required.";
    if (!formData.gender)            errors.gender     = "Please select a gender.";
    if (!formData.location.trim())   errors.location   = "Location is required.";
    if (!formData.email.trim())      errors.email      = "Email is required.";

    if (!passwordValid)
      errors.password = "Password does not meet all requirements.";

    if (!PH_PHONE_REGEX.test(formData.contactNumber))
      errors.contactNumber = "Enter a valid PH number (e.g. 09171234567).";

    if (!formData.dob) {
      errors.dob = "Date of birth is required.";
    } else if (formData.dob > maxDob) {
      errors.dob = "You must be at least 18 years old to register.";
    }

    if (!idFile)
      errors.idFile = "Please upload a valid ID.";

    if (!termsAccepted)
      setTermsError(true);
    else
      setTermsError(false);

    setFieldErrors(errors);
    return Object.keys(errors).length === 0 && termsAccepted;
  };

  /* ── Submit ─────────────────────────────────────────────── */

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showAlert("Please fix the highlighted errors before continuing.", "error");
      return;
    }

    setIsLoading(true);
    setAlertConfig({ show: false, message: '', type: '' });

    try {
      // 1. Create the Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim().toLowerCase(),
        formData.password
      );
      const user = userCredential.user;

      // 2. Upload legal ID to Firebase Storage
      let legalIdUrl = '';
      try {
        const storageRef = ref(
          storage,
          `legal_ids/${user.uid}/${Date.now()}_${idFile.name}`
        );
        await uploadBytes(storageRef, idFile);
        legalIdUrl = await getDownloadURL(storageRef);
      } catch (uploadErr) {
        console.error("ID upload error:", uploadErr);
        // Registration continues — admin can request re-upload
      }

      // 3. Save user record to Firestore with status "email_unconfirmed".
      //    Clicking the verification link navigates to /verify-email, which
      //    upgrades the status to "unverified" (admin queue entry).
      //    Status flow: email_unconfirmed → unverified → active/deactivated
      await setDoc(doc(db, "users", user.uid), {
        name:       `${formData.firstName} ${formData.lastName}`,
        firstName:  formData.firstName,
        middleName: formData.middleName,
        lastName:   formData.lastName,
        location:   formData.location,
        phone:      formData.contactNumber,
        gender:     formData.gender,
        dob:        formData.dob,
        email:      formData.email.trim().toLowerCase(),
        legalIdUrl,
        role:       "user",
        status:     "email_unconfirmed", // Upgraded to "unverified" once email link is clicked
        createdAt:  new Date().toISOString(),
      });

      // 4. Send the Firebase verification email.
      //    continueUrl lands on /verify-email, which checks emailVerified
      //    and upgrades Firestore status from "email_unconfirmed" → "unverified"
      //    so the account appears in the admin approval queue.
      try {
        const actionCodeSettings = {
          url: `${window.location.origin}/verify-email`,
          handleCodeInApp: false,
        };
        await sendEmailVerification(user, actionCodeSettings);
      } catch (verifyErr) {
        console.error("Verification email error:", verifyErr);
        // Still proceed — user can request a new link later
      }

      // 5. Immediately sign out so the unconfirmed account can't access the app
      await signOut(auth);

      // 6. Switch to the "check your email" confirmation screen
      setSubmittedEmail(formData.email.trim().toLowerCase());
      setEmailSent(true);

    } catch (error) {
      console.error("Sign-up error:", error.message);

      let errorMsg = "An error occurred. Please try again.";
      if (error.code === 'auth/email-already-in-use')
        errorMsg = "This email is already registered. Please sign in.";
      else if (error.code === 'auth/weak-password')
        errorMsg = "Password should be at least 8 characters.";

      showAlert(errorMsg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Screen switches ────────────────────────────────────── */

  if (emailSent) {
    return (
      <EmailSentScreen
        email={submittedEmail}
        onBackToLogin={() => navigate("/")}
      />
    );
  }

  /* ── Registration form ──────────────────────────────────── */

  return (
    <div className={styles.authContainer}>
      <div className={styles.authFormContainer}>

        {/* Alert Banner */}
        {alertConfig.show && (
          <div className={`${styles.alertBanner} ${styles[alertConfig.type]}`}>
            <span className={styles.alertIcon}>
              {alertConfig.type === 'success'
                ? <CheckCircle2 size={18} />
                : <AlertCircle size={18} />}
            </span>
            <p className={styles.alertMessage}>{alertConfig.message}</p>
            <button className={styles.alertClose} onClick={dismissAlert} type="button">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Header */}
        <div className={styles.header}>
          <img src={gpcLogo} alt="GPC Logo" className={styles.gpcLogo} />
          <h2 className={styles.welcomeMessage}>Create Your Account</h2>
          <p className={styles.formDescription}>
            Sign up for the F.E.A.S.T. Charity Management System
          </p>
        </div>

        {/* Form — noValidate so we handle all feedback ourselves */}
        <form className={styles.authForm} onSubmit={handleSignUp} noValidate>

          {/* ── Account Credentials ──────────────────────────── */}
          <div className={styles.sectionDivider}><span>Account Credentials</span></div>

          <div className={styles.formRow}>

            {/* Email */}
            <div className={styles.authFormInputGroup}>
              <label className={styles.authFormLabel} htmlFor="signup-email">
                Email <span className={styles.required}>*</span>
              </label>
              <input
                id="signup-email"
                name="email"
                type="email"
                className={`${styles.authFormInput} ${fieldErrors.email ? styles.inputError : ''}`}
                placeholder="email@example.com"
                onChange={handleInputChange}
              />
              {fieldErrors.email && (
                <span className={styles.fieldError}>
                  <AlertCircle size={11} />{fieldErrors.email}
                </span>
              )}
            </div>

            {/* Password */}
            <div className={styles.authFormInputGroup}>
              <label className={styles.authFormLabel} htmlFor="signup-password">
                Password <span className={styles.required}>*</span>
              </label>
              <div className={styles.passwordInputWrapper}>
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className={`${styles.authFormInput} ${fieldErrors.password ? styles.inputError : ''}`}
                  placeholder="Create a strong password"
                  onChange={handleInputChange}
                  onFocus={() => setPasswordTouched(true)}
                />
                <button
                  type="button"
                  className={styles.passwordToggleBtn}
                  onClick={() => setShowPassword(prev => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>

              {/* Password strength chips */}
              {passwordTouched && (
                <div className={styles.passwordChips}>
                  {passwordRuleStatus.map(rule => (
                    <span
                      key={rule.id}
                      className={`${styles.passwordChip} ${rule.passed ? styles.chipPassed : styles.chipFailed}`}
                    >
                      {rule.passed ? <Check size={9} /> : <X size={9} />}
                      {rule.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ── Personal Information ──────────────────────────── */}
          <div className={styles.sectionDivider}><span>Personal Information</span></div>

          <div className={styles.formRow}>

            {/* First Name */}
            <div className={styles.authFormInputGroup}>
              <label className={styles.authFormLabel} htmlFor="signup-firstName">
                First Name <span className={styles.required}>*</span>
              </label>
              <input
                id="signup-firstName"
                name="firstName"
                type="text"
                className={`${styles.authFormInput} ${fieldErrors.firstName ? styles.inputError : ''}`}
                onChange={handleInputChange}
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
              <label className={styles.authFormLabel} htmlFor="signup-lastName">
                Last Name <span className={styles.required}>*</span>
              </label>
              <input
                id="signup-lastName"
                name="lastName"
                type="text"
                className={`${styles.authFormInput} ${fieldErrors.lastName ? styles.inputError : ''}`}
                onChange={handleInputChange}
                placeholder="e.g. De La Cruz"
              />
              {fieldErrors.lastName && (
                <span className={styles.fieldError}>
                  <AlertCircle size={11} />{fieldErrors.lastName}
                </span>
              )}
            </div>

            {/* Middle Name (optional) */}
            <div className={styles.authFormInputGroup}>
              <label className={styles.authFormLabel} htmlFor="signup-middleName">
                Middle Name{" "}
                <span className={styles.optional}>(optional)</span>
              </label>
              <input
                id="signup-middleName"
                name="middleName"
                type="text"
                className={styles.authFormInput}
                onChange={handleInputChange}
                placeholder="e.g. Santos"
              />
            </div>

            {/* Gender */}
            <div className={styles.authFormInputGroup}>
              <label className={styles.authFormLabel} htmlFor="signup-gender">
                Gender <span className={styles.required}>*</span>
              </label>
              <select
                id="signup-gender"
                name="gender"
                className={`${styles.authFormInput} ${fieldErrors.gender ? styles.inputError : ''}`}
                onChange={handleInputChange}
                defaultValue=""
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
              <label className={styles.authFormLabel} htmlFor="signup-contactNumber">
                Contact Number <span className={styles.required}>*</span>
              </label>
              <div className={styles.phoneInputWrapper}>
                <span className={styles.phonePrefix}>🇵🇭</span>
                <input
                  id="signup-contactNumber"
                  name="contactNumber"
                  type="tel"
                  inputMode="numeric"
                  className={`${styles.authFormInput} ${styles.phoneInput} ${fieldErrors.contactNumber ? styles.inputError : ''}`}
                  placeholder="09XXXXXXXXX"
                  value={formData.contactNumber}
                  onChange={handlePhoneChange}
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
              <label className={styles.authFormLabel} htmlFor="signup-dob">
                Date of Birth <span className={styles.required}>*</span>
              </label>
              <input
                id="signup-dob"
                name="dob"
                type="date"
                className={`${styles.authFormInput} ${fieldErrors.dob ? styles.inputError : ''}`}
                max={maxDob}
                onChange={handleInputChange}
              />
              <span className={styles.fieldHint}>Must be 18 years old or above</span>
              {fieldErrors.dob && (
                <span className={styles.fieldError}>
                  <AlertCircle size={11} />{fieldErrors.dob}
                </span>
              )}
            </div>

            {/* Location */}
            <div className={`${styles.authFormInputGroup} ${styles.fullWidth}`}>
              <label className={styles.authFormLabel} htmlFor="signup-location">
                Location <span className={styles.required}>*</span>
              </label>
              <input
                id="signup-location"
                name="location"
                type="text"
                className={`${styles.authFormInput} ${fieldErrors.location ? styles.inputError : ''}`}
                placeholder="City, Province"
                onChange={handleInputChange}
              />
              {fieldErrors.location && (
                <span className={styles.fieldError}>
                  <AlertCircle size={11} />{fieldErrors.location}
                </span>
              )}
            </div>

            {/* Valid ID Upload */}
            <div className={`${styles.authFormInputGroup} ${styles.fileUploadGroup} ${styles.fullWidth}`}>
              <label className={styles.authFormLabel}>
                Verification (Valid ID) <span className={styles.required}>*</span>
              </label>
              <label
                htmlFor="signup-validID"
                className={`${styles.fileUploadLabel} ${idFile ? styles.fileUploaded : ''} ${fieldErrors.idFile ? styles.fileUploadError : ''}`}
              >
                {idFile ? <CheckCircle2 size={14} /> : <Upload size={14} />}
                <span>{fileName}</span>
              </label>
              <input
                id="signup-validID"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className={styles.fileUploadInput}
                onChange={handleFileChange}
              />
              <span className={styles.fieldHint}>Accepted: JPG, PNG, WEBP</span>
              {fieldErrors.idFile && (
                <span className={styles.fieldError}>
                  <AlertCircle size={11} />{fieldErrors.idFile}
                </span>
              )}
            </div>

          </div>

          {/* Terms & Conditions */}
          <div className={styles.optionsContainer}>
            <div className={styles.checkboxWrapper}>
              <input
                type="checkbox"
                id="terms-signup"
                className={styles.checkboxInput}
                checked={termsAccepted}
                onChange={(e) => { setTermsAccepted(e.target.checked); setTermsError(false); }}
              />
              <label htmlFor="terms-signup" className={styles.checkboxLabel}>
                <span className={`${styles.checkboxBox} ${termsError ? styles.checkboxBoxError : ''}`}>
                  <svg viewBox="0 0 12 10" height="10px" width="12px" className={styles.checkboxSvg}>
                    <polyline points="1.5 6 4.5 9 10.5 1" />
                  </svg>
                </span>
                <span className={styles.checkboxText}>
                  I agree to the{" "}
                  <a onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTermsModal(true); }} className={styles.termsLink}>
                    terms and conditions.
                  </a>
                </span>
              </label>
            </div>
            {termsError && (
              <span className={styles.fieldError} style={{ marginLeft: '26px', marginTop: '4px' }}>
                <AlertCircle size={11} /> You must accept the Terms and Conditions.
              </span>
            )}
          </div>

          {/* Submit */}
          <div className={styles.submitArea}>
            <button
              type="submit"
              className={styles.authButton}
              disabled={isLoading}
            >
              {isLoading ? "Creating Account…" : "Sign Up"}
              {!isLoading && (
                <span className={styles.arrowWrapper}>
                  <span className={styles.arrow} />
                </span>
              )}
            </button>

            <p className={styles.authLink}>
              Already have an account?{" "}
              <Link to="/" className={styles.authLinkAnchor}>Sign In.</Link>
            </p>
          </div>

        </form>
      </div>
      {showTermsModal && (
        <TermsConditionsModal onClose={() => setShowTermsModal(false)} />
      )}
    </div>
  );
};

export default SignUp;
