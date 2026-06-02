/* React & Firebase Imports */
import React, { useState } from 'react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateProfile } from 'firebase/auth';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import { signOutUser } from '../utils/authUtils.js';
import { auth, db, storage } from '../firebase';
import { Camera, Eye, EyeOff, Loader2 } from 'lucide-react';

/* Asset Imports */
import defaultProfilePic from '../assets/user(1).png';

/* Style Imports */
import styles from './profile_modal.module.css';

const ProfileModal = ({ user, onClose, onSignOut }) => {
  const navigate = useNavigate();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isClosing, setIsClosing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isConfirmClosing, setIsConfirmClosing] = useState(false);

  const fullName = user?.displayName || 'User Profile';
  const profileImage = user?.photoURL || defaultProfilePic;

  // Derive role badge info from user data
  const isResident = user?.isResident === true || user?.role === 'resident';
  const roleLabel = isResident ? 'Resident' : 'Non-Resident';
  const roleBadgeClass = isResident ? styles.resident : styles.nonResident;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose(), 300);
  };

  const handleSignOutRequest = () => {
    setShowConfirm(true);
    setIsConfirmClosing(false);
  };

  const handleConfirmCancel = () => {
    setIsConfirmClosing(true);
    setTimeout(() => setShowConfirm(false), 250);
  };

  const handleSignOut = async () => {
    setIsConfirmClosing(true);
    setTimeout(async () => {
      setShowConfirm(false);
      try {
        if (typeof onSignOut === 'function') {
          await onSignOut();
        } else {
          await signOutUser(auth);
        }
        onClose();
        navigate("/");
      } catch (error) {
        console.error("Error signing out:", error);
      }
    }, 250);
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage({ text: "Please select a valid image file.", type: "error" });
      return;
    }
    setIsUpdating(true);
    setMessage({ text: "Uploading profile picture...", type: "info" });
    try {
      const fileExtension = file.name.split('.').pop();
      const storageRef = ref(storage, `profile_pictures/${user.uid}/profile.${fileExtension}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      await updateProfile(auth.currentUser, { photoURL: downloadURL });
      
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { profilePictureUrl: downloadURL });
      
      setMessage({ text: "Profile picture updated successfully!", type: "success" });
    } catch (error) {
      setMessage({ text: `Upload failed: ${error.message}`, type: "error" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    // Validation rules mirrored from SignUp password criteria
    const hasLength = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

    if (!hasLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setMessage({ 
        text: "Password must be at least 8 characters and include at least one uppercase letter, one lowercase letter, one number, and one special character.", 
        type: "error" 
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }

    setIsUpdating(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      
      const notifPath = `users/${user.uid}/notifications`;
      await addDoc(collection(db, notifPath), {
        title: "Security Update",
        body: "Your account password was successfully updated.",
        type: "Security",
        status: "warning", 
        read: false,
        createdAt: serverTimestamp() 
      });

      setMessage({ text: "Password updated successfully!", type: "success" });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordForm(false);
        setMessage({ text: '', type: '' });
      }, 2000);
    } catch (error) {
      console.error("Password update error details:", error);
      setMessage({ text: "The current password you entered is incorrect.", type: "error" });
    } finally {
      setIsUpdating(false);
    }
  };

  const togglePasswordForm = (show) => {
    setMessage({ text: '', type: '' });
    setShowPasswordForm(show);
  };

  return (
    <>
    <div className={`${styles.modalOverlay} ${isClosing ? styles.modalOverlayClosing : ''}`} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button 
          className={styles.modalCloseX} 
          onClick={handleClose}
          aria-label="Close modal"
        >
          &times;
        </button>
        
        <div className={styles.modalProfileSection}>
          <div className={styles.modalPicContainer}>
            <img 
              src={profileImage} 
              alt="Profile" 
              className={styles.modalProfileImg} 
              onError={(e) => { e.target.src = defaultProfilePic; }}
            />
            <label className={styles.imageUploadOverlay} title="Change profile picture">
              <Camera size={16} color="#fff" />
              <input type="file" hidden accept="image/*" onChange={handleImageChange} disabled={isUpdating} />
            </label>
          </div>
          <h2 className={styles.modalTitle}>{fullName}</h2>
          <p className={styles.modalEmail}>{user?.email}</p>

          {/* Role Badge */}
          <span className={`${styles.roleBadge} ${roleBadgeClass}`}>
            {isResident ? '📍' : '🔵'} {roleLabel}
          </span>
          
          {/* Inline feedback strictly for profile image handling */}
          {!showPasswordForm && message.text && (
            <p className={`${styles.imageStatusText} ${styles[message.type]}`}>{message.text}</p>
          )}
        </div>

        <div className={styles.modalBodyContainer}>
          {!showPasswordForm ? (
            <div className={styles.modalActions}>
              <button className={`${styles.modalSecondaryBtn} ${styles.themed}`} onClick={() => togglePasswordForm(true)}>
                Change Password
              </button>
              <button className={styles.modalSignoutBtn} onClick={handleSignOutRequest}>
                Sign Out
              </button>
            </div>
          ) : (
            <form className={styles.passwordForm} onSubmit={handlePasswordChange}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Current Password</label>
                <div className={styles.passwordInputWrapper}>
                  <input 
                    type={showCurrentPass ? "text" : "password"} 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    className={styles.modalInput} 
                    required 
                  />
                  <button 
                    type="button" 
                    className={styles.eyeIconBtn} 
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    aria-label={showCurrentPass ? "Hide password" : "Show password"}
                  >
                    {showCurrentPass ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>New Password</label>
                <div className={styles.passwordInputWrapper}>
                  <input 
                    type={showNewPass ? "text" : "password"} 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    className={styles.modalInput} 
                    required 
                  />
                  <button 
                    type="button" 
                    className={styles.eyeIconBtn} 
                    onClick={() => setShowNewPass(!showNewPass)}
                    aria-label={showNewPass ? "Hide password" : "Show password"}
                  >
                    {showNewPass ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Confirm New Password</label>
                <div className={styles.passwordInputWrapper}>
                  <input 
                    type={showConfirmPass ? "text" : "password"} 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    className={styles.modalInput} 
                    required 
                  />
                  <button 
                    type="button" 
                    className={styles.eyeIconBtn} 
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    aria-label={showConfirmPass ? "Hide password" : "Show password"}
                  >
                    {showConfirmPass ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>

              {/* Status Alert Banner is safely scoped inside the Password view exclusively */}
              {message.text && (
                <div className={`${styles.modalStatusMsg} ${styles[message.type]}`}>
                  {message.text}
                </div>
              )}

              <div className={styles.formButtons}>
                <button type="button" className={styles.modalCancelBtn} onClick={() => togglePasswordForm(false)} disabled={isUpdating}>
                  Cancel
                </button>
                <button type="submit" className={styles.modalSubmitBtn} disabled={isUpdating}>
                  {isUpdating ? (
                    <span className={styles.btnLoaderWrapper}>
                      <Loader2 size={16} className={styles.spinner} /> Processing...
                    </span>
                  ) : "Update Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>

    {/* Sign-out confirmation modal */}
    {showConfirm && (
      <div className={`${styles.confirmOverlay} ${isConfirmClosing ? styles.closing : ''}`} onClick={handleConfirmCancel}>
        <div className={`${styles.confirmBox} ${isConfirmClosing ? styles.closing : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className={styles.confirmIcon}>🚪</div>
          <h3 className={styles.confirmTitle}>Sign Out?</h3>
          <p className={styles.confirmSubtitle}>Are you sure you want to sign out of your account?</p>
          <div className={styles.confirmButtons}>
            <button className={styles.confirmCancelBtn} onClick={handleConfirmCancel}>Cancel</button>
            <button className={styles.confirmSignOutBtn} onClick={handleSignOut}>Sign Out</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default ProfileModal;
