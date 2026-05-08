import React, { useState } from 'react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../firebase';
import { Camera, Eye, EyeOff } from 'lucide-react';
import defaultProfilePic from '../assets/user(1).png';
import './ProfileModal.css';

const ProfileModal = ({ user, onClose }) => {
  const navigate = useNavigate();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Visibility States
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fullName = user?.displayName || 'User Profile';
  const profileImage = user?.photoURL || defaultProfilePic;

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onClose();
      navigate("/");
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage({ text: "Please select an image file.", type: "error" });
      return;
    }
    setIsUpdating(true);
    setMessage({ text: "Uploading image...", type: "success" });
    try {
      const fileExtension = file.name.split('.').pop();
      const storageRef = ref(storage, `profile_pictures/${user.uid}/profile.${fileExtension}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { profilePictureUrl: downloadURL });
      setMessage({ text: "Profile picture updated!", type: "success" });
    } catch (error) {
      setMessage({ text: `Upload failed: ${error.message}`, type: "error" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (newPassword.length < 8) {
      setMessage({ text: "New password must be at least 8 characters.", type: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ text: "New password does not match", type: "error" });
      return;
    }

    setIsUpdating(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      
      setMessage({ text: "Password updated successfully!", type: "success" });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setShowPasswordForm(false), 2000);
    } catch (error) {
      setMessage({ text: "The current inputted password is incorrect", type: "error" });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-x" onClick={onClose}>&times;</button>
        
        <div className="modal-profile-section">
          <div className="modal-pic-container">
            <img 
              src={profileImage} 
              alt="Profile" 
              className="modal-profile-img" 
              onError={(e) => { e.target.src = defaultProfilePic; }}
            />
            <label className="image-upload-overlay">
              <Camera size={16} color="#fff" />
              <input type="file" hidden accept="image/*" onChange={handleImageChange} disabled={isUpdating} />
            </label>
          </div>
          <h2 className="modal-title">{fullName}</h2>
          <p className="modal-email">{user?.email}</p>
        </div>

        <div className="modal-body-container">
          {!showPasswordForm ? (
            <div className="modal-actions">
              <button className="modal-secondary-btn themed" onClick={() => setShowPasswordForm(true)}>
                Change Password
              </button>
              <button className="modal-signout-btn" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          ) : (
            <form className="password-form" onSubmit={handlePasswordChange}>
              <div className="input-group">
                <label className="input-label">Current Password</label>
                <div className="password-input-wrapper">
                  <input 
                    type={showCurrentPass ? "text" : "password"} 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    className="modal-input" 
                    required 
                  />
                  <button type="button" className="eye-icon-btn" onClick={() => setShowCurrentPass(!showCurrentPass)}>
                    {showCurrentPass ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">New Password</label>
                <div className="password-input-wrapper">
                  <input 
                    type={showNewPass ? "text" : "password"} 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    className="modal-input" 
                    required 
                  />
                  <button type="button" className="eye-icon-btn" onClick={() => setShowNewPass(!showNewPass)}>
                    {showNewPass ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Confirm New Password</label>
                <div className="password-input-wrapper">
                  <input 
                    type={showConfirmPass ? "text" : "password"} 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    className="modal-input" 
                    required 
                  />
                  <button type="button" className="eye-icon-btn" onClick={() => setShowConfirmPass(!showConfirmPass)}>
                    {showConfirmPass ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-buttons">
                <button type="submit" className="modal-submit-btn" disabled={isUpdating}>
                  {isUpdating ? "Processing..." : "Update Password"}
                </button>
                <button type="button" className="modal-cancel-btn" onClick={() => setShowPasswordForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {message.text && (
          <p className={`modal-status-msg ${message.type}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;