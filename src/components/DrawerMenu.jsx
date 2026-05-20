/* React & Firebase Imports */
import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import { db, auth, storage } from "../firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/* Style Imports */
import styles from "./drawer_menu.module.css";

const DrawerMenu = ({ mobile = false }) => {
  const navigate = useNavigate();

  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportData, setReportData] = useState({
    username: "",
    reason: "",
    targetUserId: "",
  });
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const submenuRef = useRef(null);
  const triggerRef = useRef(null);

  /* ── Close submenu on outside click (desktop only) ── */
  useEffect(() => {
    if (mobile) return;
    const handleClickOutside = (e) => {
      if (
        submenuRef.current &&
        !submenuRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setIsSubmenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobile]);

  /* ── Debounced user search ── */
  useEffect(() => {
    const searchUsers = async () => {
      if (reportData.username.length < 2) {
        setUserSuggestions([]);
        return;
      }
      setIsSearching(true);
      try {
        const searchTerm = reportData.username.toLowerCase();
        const usersRef = collection(db, "users");
        const makeRangeQuery = (field) => query(
          usersRef,
          where(field, ">=", searchTerm),
          where(field, "<=", searchTerm + "\uf8ff")
        );

        // Run email, firstName, and lastName queries in parallel
        const [emailSnap, firstNameSnap, lastNameSnap] = await Promise.all([
          getDocs(makeRangeQuery("email")),
          getDocs(makeRangeQuery("firstName")),
          getDocs(makeRangeQuery("lastName")),
        ]);

        // Merge and deduplicate by doc id, exclude current user
        const seen = new Set();
        const users = [];
        [...emailSnap.docs, ...firstNameSnap.docs, ...lastNameSnap.docs].forEach((doc) => {
          if (!seen.has(doc.id) && doc.id !== auth.currentUser?.uid) {
            seen.add(doc.id);
            users.push({ id: doc.id, ...doc.data() });
          }
        });
        setUserSuggestions(users);
      } catch (err) {
        console.error("Error searching users:", err);
      } finally {
        setIsSearching(false);
      }
    };
    const timer = setTimeout(searchUsers, 150);
    return () => clearTimeout(timer);
  }, [reportData.username]);

  const handleSelectUser = (user) => {
    setReportData({ ...reportData, username: user.email, targetUserId: user.id });
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
      setSubmitSuccess(true);
      setTimeout(() => {
        setIsReportOpen(false);
        setReportData({ username: "", reason: "", targetUserId: "" });
        setImageFile(null);
        setSubmitSuccess(false);
      }, 1800);
    } catch (err) {
      console.error("Error submitting report:", err);
      alert("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const navItems = [
    { label: "App Guide", path: "/appguide" },
    { label: "Contact Us", path: "/contactus" },
    { label: "Help & FAQ", path: "/helpfaq" },
    { label: "Terms & Conditions", path: "/terms" },
  ];

  /* ── MOBILE layout: flat list of links ── */
  if (mobile) {
    return (
      <>
        <div className={styles.mobileDrawerSection}>
          <p className={styles.mobileDrawerHeading}>Our Services</p>
          <div className={styles.mobileDrawerLinks}>
            {navItems.map((item) => (
              <a
                key={item.path}
                href="#"
                className={styles.mobileDrawerLink}
                onClick={(e) => { e.preventDefault(); navigate(item.path); }}
              >
                {item.label}
              </a>
            ))}
            <a
              href="#"
              className={styles.mobileDrawerLink}
              onClick={(e) => { e.preventDefault(); setIsReportOpen(true); }}
            >
              Report User
            </a>
          </div>
        </div>

        {isReportOpen && ReactDOM.createPortal(
          <ReportModal
            reportData={reportData}
            setReportData={setReportData}
            userSuggestions={userSuggestions}
            isSearching={isSearching}
            imageFile={imageFile}
            setImageFile={setImageFile}
            isSubmitting={isSubmitting}
            submitSuccess={submitSuccess}
            handleSelectUser={handleSelectUser}
            handleReportSubmit={handleReportSubmit}
            onClose={() => setIsReportOpen(false)}
            styles={styles}
          />,
          document.body
        )}
      </>
    );
  }

  /* ── DESKTOP layout: hover dropdown ── */
  return (
    <>
      <div className={styles.drawerWrapper}>
        <button
          ref={triggerRef}
          className={`${styles.drawerTrigger} ${isSubmenuOpen ? styles.drawerTriggerActive : ""}`}
          onClick={() => setIsSubmenuOpen((prev) => !prev)}
          aria-expanded={isSubmenuOpen}
          aria-haspopup="true"
        >
          <span>Our Services</span>
          <svg viewBox="0 0 360 360" className={`${styles.chevron} ${isSubmenuOpen ? styles.chevronUp : ""}`}>
            <path d="M325.607,79.393c-5.857-5.857-15.355-5.858-21.213,0.001l-139.39,139.393L25.607,79.393c-5.857-5.857-15.355-5.858-21.213,0.001c-5.858,5.858-5.858,15.355,0,21.213l150.004,150c2.813,2.813,6.628,4.393,10.606,4.393s7.794-1.581,10.606-4.394l149.996-150C331.465,94.749,331.465,85.251,325.607,79.393z" />
          </svg>
        </button>

        <div
          ref={submenuRef}
          className={`${styles.submenuPanel} ${isSubmenuOpen ? styles.submenuPanelOpen : ""}`}
          role="menu"
        >
          {navItems.map((item) => (
            <button
              key={item.path}
              className={styles.submenuItem}
              role="menuitem"
              onClick={() => { navigate(item.path); setIsSubmenuOpen(false); }}
            >
              {item.label}
            </button>
          ))}
          <button
            className={styles.submenuItem}
            role="menuitem"
            onClick={() => { setIsReportOpen(true); setIsSubmenuOpen(false); }}
          >
            Report User
          </button>
        </div>
      </div>

      {isReportOpen && ReactDOM.createPortal(
        <ReportModal
          reportData={reportData}
          setReportData={setReportData}
          userSuggestions={userSuggestions}
          isSearching={isSearching}
          imageFile={imageFile}
          setImageFile={setImageFile}
          isSubmitting={isSubmitting}
          submitSuccess={submitSuccess}
          handleSelectUser={handleSelectUser}
          handleReportSubmit={handleReportSubmit}
          onClose={() => setIsReportOpen(false)}
          styles={styles}
        />,
        document.body
      )}
    </>
  );
};

/* ── Extracted Report Modal ── */
const ReportModal = ({
  reportData, setReportData, userSuggestions, isSearching,
  imageFile, setImageFile, isSubmitting, submitSuccess,
  handleSelectUser, handleReportSubmit, onClose, styles,
}) => (
  <div className={styles.modalOverlay} onClick={onClose}>
    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
      <div className={styles.modalHeader}>
        <h3 className={styles.modalTitle}>Report a User</h3>
        <button className={styles.modalClose} onClick={onClose} aria-label="Close">✕</button>
      </div>

      {submitSuccess ? (
        <div className={styles.successState}>
          <div className={styles.successIcon}>✓</div>
          <p>Report submitted successfully.</p>
        </div>
      ) : (
        <form onSubmit={handleReportSubmit}>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Search User by Email</label>
            <div className={styles.searchWrapper}>
              <input
                type="text"
                className={styles.modalInput}
                placeholder="Type to search..."
                value={reportData.username}
                onChange={(e) => setReportData({ ...reportData, username: e.target.value })}
                required
                autoComplete="off"
              />
              {isSearching && <span className={styles.searchSpinner} />}
              {userSuggestions.length > 0 && (
                <ul className={styles.suggestionsList}>
                  {userSuggestions.map((user) => (
                    <li key={user.id} onClick={() => handleSelectUser(user)} className={styles.suggestionItem}>
                      <span className={styles.suggestionEmail}>{user.email}</span>
                      {user.fullName && <span className={styles.suggestionName}>{user.fullName}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Reason for Report</label>
            <textarea
              className={styles.modalTextarea}
              placeholder="Describe the issue..."
              value={reportData.reason}
              onChange={(e) => setReportData({ ...reportData, reason: e.target.value })}
              required
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Image Proof <span className={styles.required}>*Required</span></label>
            <label className={styles.fileUploadLabel}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                required
                className={styles.fileInput}
              />
              <span className={styles.fileUploadBtn}>
                {imageFile ? `✓ ${imageFile.name}` : "Choose image…"}
              </span>
            </label>
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? <span className={styles.btnSpinner} /> : null}
              {isSubmitting ? "Submitting…" : "Send Report"}
            </button>
          </div>
        </form>
      )}
    </div>
  </div>
);

export default DrawerMenu;
