/* React & Firebase Imports */
import React, { useState, useEffect } from "react"; 
import { useNavigate } from "react-router-dom";
import { db, auth, storage } from "../firebase"; 
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/* Style Imports */
import styles from "./drawer_menu.module.css";

const DrawerMenu = () => {
  const navigate = useNavigate();

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportData, setReportData] = useState({ 
    username: "", 
    reason: "", 
    targetUserId: "" 
  });

  const [userSuggestions, setUserSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const searchUsers = async () => {
      if (reportData.username.length < 3) {
        setUserSuggestions([]);
        return;
      }

      setIsSearching(true);
      try {
        const searchTerm = reportData.username.toLowerCase();
        const q = query(
          collection(db, "users"),
          where("email", ">=", searchTerm),
          where("email", "<=", searchTerm + "\uf8ff")
        );

        const querySnapshot = await getDocs(q);
        const users = [];
        querySnapshot.forEach((doc) => {
          if (doc.id !== auth.currentUser?.uid) {
            users.push({ id: doc.id, ...doc.data() });
          }
        });
        setUserSuggestions(users);
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(() => searchUsers(), 500);
    return () => clearTimeout(debounceTimer);
  }, [reportData.username]);

  const handleSelectUser = (user) => {
    setReportData({ 
      ...reportData, 
      username: user.email, 
      targetUserId: user.id 
    });
    setUserSuggestions([]);
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();

    if (!reportData.targetUserId) {
      alert("Please select a valid user from the suggestions list.");
      return;
    }

    if (!imageFile) {
      alert("Please upload an image proof to proceed.");
      return;
    }

    setIsSubmitting(true);

    try {
      const storageRef = ref(storage, `reports/${Date.now()}_${imageFile.name}`);
      const uploadResult = await uploadBytes(storageRef, imageFile);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      await addDoc(collection(db, "reports"), {
        reporterId: auth.currentUser?.uid,
        reporterName: auth.currentUser?.displayName || auth.currentUser?.email,
        reportedUserId: reportData.targetUserId,
        reportedUserEmail: reportData.username,
        reason: reportData.reason,
        proofImageUrl: downloadURL,
        status: "Pending", 
        createdAt: serverTimestamp(),
      });

      setIsReportOpen(false);
      setReportData({ username: "", reason: "", targetUserId: "" });
      setImageFile(null);
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("Failed to submit report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.drawerMenu}>
      <div className={styles.item}>
        <a href="#" className={`${styles.anchor} ${styles.link}`}>
          <span> Our Services </span>
          <svg viewBox="0 0 360 360" className={styles.icon}>
            <g id="SVGRepo_iconCarrier">
              <path d="M325.607,79.393c-5.857-5.857-15.355-5.858-21.213,0.001l-139.39,139.393L25.607,79.393 c-5.857-5.857-15.355-5.858-21.213,0.001c-5.858,5.858-5.858,15.355,0,21.213l150.004,150c2.813,2.813,6.628,4.393,10.606,4.393 s7.794-1.581,10.606-4.394l149.996-150C331.465,94.749,331.465,85.251,325.607,79.393z"></path>
            </g>
          </svg>
        </a>

        <div className={styles.drawerSubmenu}>
          <div className={styles.drawerSubmenuItem}>
            <a href="#" className={`${styles.anchor} ${styles.drawerSubmenuLink}`} onClick={() => navigate("/appguide")}>
              App Guide
            </a>
          </div>

          <div className={styles.drawerSubmenuItem}>
            <a href="#" className={`${styles.anchor} ${styles.drawerSubmenuLink}`}
              onClick={(e) => {
                e.preventDefault();
                setIsReportOpen(true);
              }}
            >
              Report User
            </a>
          </div>

          <div className={styles.drawerSubmenuItem}>
            <a href="#" className={`${styles.anchor} ${styles.drawerSubmenuLink}`} onClick={() => navigate("/contactus")}>
              Contact Us
            </a>
          </div>
          <div className={styles.drawerSubmenuItem}>
            <a href="#" className={`${styles.anchor} ${styles.drawerSubmenuLink}`} onClick={() => navigate("/helpfaq")}>
              Help & FAQ
            </a>
          </div>
          <div className={styles.drawerSubmenuItem}>
            <a href="#" className={`${styles.anchor} ${styles.drawerSubmenuLink}`} onClick={() => navigate("/terms")}>
              Terms & Conditions
            </a>
          </div>
        </div>
      </div>

      {isReportOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsReportOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Report User</h3>
            <form onSubmit={handleReportSubmit} className={styles.reportForm}>
              <div className={styles.modalField}>
                <label>Find User</label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="text"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="Search by email..."
                    value={reportData.username}
                    onChange={(e) => setReportData({ ...reportData, username: e.target.value })}
                    required
                    autoComplete="off"
                  />
                  
                  {userSuggestions.length > 0 && (
                    <ul className={styles.suggestionsList}>
                      {userSuggestions.map((user) => (
                        <li key={user.id} onClick={() => handleSelectUser(user)}>
                          <strong>{user.email}</strong>
                          {user.fullName && <small> ({user.fullName})</small>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {isSearching && <div className={styles.searchingText}>Searching...</div>}
                </div>
              </div>
              <div className={styles.modalField}>
                <label>Reason</label>
                <textarea
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  placeholder="Why are you reporting this user?"
                  value={reportData.reason}
                  onChange={(e) => setReportData({ ...reportData, reason: e.target.value })}
                  required
                />
              </div>

              {/* Added required Image Proof field */}
              <div className={styles.modalField}>
                <label>Image Proof (Required)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  required
                  style={{ width: '100%', marginTop: '5px' }}
                />
              </div>

              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  className={styles.cancelBtn} 
                  onClick={() => setIsReportOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={styles.submitBtn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Send Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrawerMenu;