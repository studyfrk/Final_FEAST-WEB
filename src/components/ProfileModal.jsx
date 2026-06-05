/* React & Firebase Imports */
import React, { useState, useEffect } from 'react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateProfile } from 'firebase/auth';
import { doc, updateDoc, collection, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import { signOutUser } from '../utils/signOutUser.js';
import { auth, db, storage } from '../firebase';
import { Camera, Eye, EyeOff, Loader2 } from 'lucide-react';

/* Asset Imports */
import defaultProfilePic from '../assets/user(1).png';

/* Style Imports */
import styles from './profile_modal.module.css';

// --- FIX 1: Strict MIME-type whitelist and file-size ceiling ---
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ProfileModal = ({ user, onClose, onSignOut }) => {
  const navigate = useNavigate();
  const [firestoreData, setFirestoreData] = useState(null);
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

  // Sync with Firestore data to capture custom fields like isResident
  useEffect(() => {
    const userId = user?.uid || auth.currentUser?.uid;
    if (!userId) return;

    const userDocRef = doc(db, "users", userId);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setFirestoreData(docSnap.data());
      }
    }, (error) => {
      console.warn("Error listening to user Firestore document:", error);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Fallback cascade: Firestore values take priority, Auth values act as secondary fallbacks
  const firestoreFullName = firestoreData?.name || `${firestoreData?.firstName || ''} ${firestoreData?.lastName || ''}`.trim();
  const fullName = firestoreFullName || user?.displayName || 'User Profile';
  const profileImage = firestoreData?.profilePictureUrl || user?.photoURL || defaultProfilePic;

  const role = (firestoreData?.role || user?.role || '').toLowerCase();
  const isAdmin = role === 'admin' || role === 'administrator' || role === 'superadmin';
  const isResident = !isAdmin && (firestoreData
    ? (firestoreData.isResident === true || role === 'resident')
    : (user?.isResident === true || user?.role === 'resident'));

  const roleLabel = isAdmin ? 'Administrator' : isResident ? 'Resident' : 'Non-Resident';
  const roleBadgeClass = isAdmin ? styles.admin : isResident ? styles.resident : styles.nonResident;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose(), 200);
  };

  const handleSignOutRequest = () => {
    setShowConfirm(true);
    setIsConfirmClosing(false);
  };

  const handleConfirmCancel = () => {
    setIsConfirmClosing(true);
    setTimeout(() => setShowConfirm(false), 150);
  };

  const handleSignOut = async () => {
    setIsConfirmClosing(true);
    setTimeout(async () => {
      setShowConfirm(false);
      try {
        if (typeof onSignOut === 'function') {
          await onSignOut();
        } else {
          await signOutUser(navigate);
        }
        onClose();
      } catch (error) {
        console.error("Error signing out:", error);
      }
    }, 150);
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // --- FIX 1a: Strict MIME-type whitelist (replaces loose startsWith('image/')) ---
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setMessage({ text: 'Only JPG and PNG images are accepted.', type: 'error' });
      return;
    }

    // --- FIX 1b: File-size ceiling (5 MB) ---
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setMessage({ text: 'File must be under 5 MB.', type: 'error' });
      return;
    }

    setIsUpdating(true);
    try {
      const fileExtension = file.type === 'image/png' ? 'png' : 'jpg';
      const storageRef = ref(storage, `profile_pictures/${user.uid}/profile.${fileExtension}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      await updateProfile(auth.currentUser, { photoURL: downloadURL });
      
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { profilePictureUrl: downloadURL });

      setMessage({ text: 'Profile picture updated successfully!', type: 'success' });
    } catch (error) {
      // --- FIX 2: Silent catch replaced — errors now surface to the user ---
      console.error("Profile picture upload error:", error);
      setMessage({ text: 'Failed to upload image. Please try again.', type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    // --- FIX 3: Per-rule password feedback instead of one monolithic message ---
    const rules = [
      { test: newPassword.length >= 8,            msg: "at least 8 characters" },
      { test: /[A-Z]/.test(newPassword),           msg: "an uppercase letter" },
      { test: /[a-z]/.test(newPassword),           msg: "a lowercase letter" },
      { test: /[0-9]/.test(newPassword),           msg: "a number" },
      { test: /[^A-Za-z0-9]/.test(newPassword),   msg: "a special character" },
    ];
    const failed = rules.filter(r => !r.test).map(r => r.msg);
    if (failed.length > 0) {
      setMessage({
        text: `Password must include: ${failed.join(', ')}.`,
        type: 'error',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }

    // Guard: new password must differ from current password
    if (newPassword === currentPassword) {
      setMessage({ text: "New password must be different from your current password.", type: "error" });
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
      // Distinguish wrong-password from other Firebase errors
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setMessage({ text: "The current password you entered is incorrect.", type: "error" });
      } else {
        setMessage({ text: "Failed to update password. Please try again.", type: "error" });
      }
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
              <input
                type="file"
                hidden
                accept="image/jpeg,image/png"
                onChange={handleImageChange}
                disabled={isUpdating}
              />
            </label>
          </div>
          <h2 className={styles.modalTitle}>{fullName}</h2>
          <p className={styles.modalEmail}>{user?.email}</p>

          <span className={`${styles.roleBadge} ${roleBadgeClass}`}>
            {isAdmin ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            ) : isResident ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <circle cx="12" cy="12" r="8" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="8" />
              </svg>
            )}
            {roleLabel}
          </span>
          
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
          <div className={styles.confirmIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
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
