/* React & Firebase Imports */
import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import { db, auth, storage } from "../firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/* Style Imports */
import styles from "./drawer_menu.module.css";

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */

/** Firestore prefix-range query for one field + one term (two casing variants). */
const prefixQuery = async (usersRef, field, term) => {
  const lower  = term.toLowerCase();
  const titled = lower.charAt(0).toUpperCase() + lower.slice(1);
  const variants = lower === titled ? [lower] : [lower, titled];
  const snaps = await Promise.all(
    variants.map((v) =>
      getDocs(query(usersRef, where(field, ">=", v), where(field, "<=", v + "\uf8ff")))
    )
  );
  const ids = new Set();
  const docs = {};
  snaps.forEach((snap) =>
    snap.docs.forEach((doc) => { ids.add(doc.id); docs[doc.id] = doc; })
  );
  return { ids, docs };
};

/**
 * Search users by any combination of name parts or email.
 * Strategy:
 *   - Single token  → union across email + firstName + middleName + lastName
 *   - Multi-token   → each token must match at least one name field on the same user
 *                     (intersection of per-token unions), handles first/middle/last in any order
 */
const searchUsers = async (rawQuery) => {
  const q = rawQuery.trim();
  if (q.length < 2) return [];

  const usersRef = collection(db, "users");
  const nameFields = ["firstName", "middleName", "lastName"];
  const parts = q.split(/\s+/).filter(Boolean);
  const currentUid = auth.currentUser?.uid;

  if (parts.length === 1) {
    // Single token — union email + all name fields
    const [emailRes, ...nameRes] = await Promise.all([
      prefixQuery(usersRef, "email", parts[0]),
      ...nameFields.map((f) => prefixQuery(usersRef, f, parts[0])),
    ]);
    const allDocs = Object.assign({}, emailRes.docs, ...nameRes.map((r) => r.docs));
    const allIds  = new Set([emailRes.ids, ...nameRes.map((r) => r.ids)].flatMap((s) => [...s]));
    return [...allIds]
      .filter((id) => id !== currentUid)
      .map((id) => ({ id, ...allDocs[id].data() }));
  }

  // Multi-token: for each token, get the set of user IDs that match any name field
  // Then intersect across tokens → user must match every typed word somewhere in their name
  const perPartIds = await Promise.all(
    parts.map(async (part) => {
      const results = await Promise.all(nameFields.map((f) => prefixQuery(usersRef, f, part)));
      const merged = {};
      const ids = new Set();
      results.forEach(({ ids: rIds, docs }) => {
        rIds.forEach((id) => { ids.add(id); merged[id] = docs[id]; });
      });
      return { ids, docs: merged };
    })
  );

  // Intersect: keep only IDs present in every part's result set
  const [first, ...rest] = perPartIds;
  const intersectedIds = [...first.ids].filter((id) =>
    rest.every((r) => r.ids.has(id))
  );

  const allDocs = Object.assign({}, ...perPartIds.map((r) => r.docs));
  return intersectedIds
    .filter((id) => id !== currentUid)
    .map((id) => ({ id, ...allDocs[id].data() }));
};

/* ─────────────────────────────────────────
   Alert Modal
───────────────────────────────────────── */
const AlertModal = memo(({ message, onClose }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(id); }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 250);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      className={`${styles.modalOverlay} ${visible ? styles.modalOverlayVisible : ""}`}
      onClick={handleClose}
    >
      <div
        className={`${styles.alertContent} ${visible ? styles.modalContentVisible : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.alertIconWrap}>
          <svg viewBox="0 0 24 24" className={styles.alertIcon}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
        <p className={styles.alertMessage}>{message}</p>
        <button className={styles.alertOkBtn} onClick={handleClose}>Got it</button>
      </div>
    </div>,
    document.body
  );
});

/* ─────────────────────────────────────────
   Report Modal
───────────────────────────────────────── */
const ReportModal = memo(({
  reportData, onSearchChange, onSelectUser, onReasonChange,
  onFileChange, onSubmit, onClose,
  userSuggestions, isSearching, imageFile,
  isSubmitting, submitSuccess, isVisible, fieldErrors,
}) => (
  <div
    className={`${styles.modalOverlay} ${isVisible ? styles.modalOverlayVisible : ""}`}
    onClick={onClose}
  >
    <div
      className={`${styles.modalContent} ${isVisible ? styles.modalContentVisible : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
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
        <form onSubmit={onSubmit} noValidate>

          {/* Search */}
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Search User by Name or Email</label>
            <div className={styles.searchWrapper}>
              <input
                type="text"
                className={`${styles.modalInput} ${fieldErrors.user ? styles.inputError : ""}`}
                placeholder="Type a name or email…"
                value={reportData.searchQuery}
                onChange={onSearchChange}
                autoComplete="off"
              />
              {isSearching && <span className={styles.searchSpinner} />}
              {userSuggestions.length > 0 && (
                <ul className={styles.suggestionsList}>
                  {userSuggestions.map((user) => {
                    const fullName = [user.firstName, user.middleName, user.lastName]
                      .filter(Boolean).join(" ") || user.fullName || "";
                    return (
                      <li key={user.id} onClick={() => onSelectUser(user)} className={styles.suggestionItem}>
                        <span className={styles.suggestionEmail}>{user.email}</span>
                        {fullName && <span className={styles.suggestionName}>{fullName}</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {reportData.targetUserId && (
              <div className={styles.selectedUserChip}>
                <span className={styles.chipDot} />
                <span className={styles.chipText}>
                  {reportData.targetUserName
                    ? `${reportData.targetUserName} · ${reportData.targetUserEmail}`
                    : reportData.targetUserEmail}
                </span>
              </div>
            )}
            {fieldErrors.user && <span className={styles.fieldError}>{fieldErrors.user}</span>}
          </div>

          {/* Reason */}
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Reason for Reporting User</label>
            <textarea
              className={`${styles.modalTextarea} ${fieldErrors.reason ? styles.inputError : ""}`}
              placeholder="Describe the issue…"
              value={reportData.reason}
              onChange={onReasonChange}
            />
            {fieldErrors.reason && <span className={styles.fieldError}>{fieldErrors.reason}</span>}
          </div>

          {/* Image proof */}
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>
              Image Proof <span className={styles.required}>*Required</span>
            </label>
            <label className={`${styles.fileUploadLabel} ${fieldErrors.image ? styles.fileUploadLabelError : ""}`}>
              <input type="file" accept="image/*" onChange={onFileChange} className={styles.fileInput} />
              <span className={`${styles.fileUploadBtn} ${imageFile ? styles.fileUploadBtnSelected : ""}`}>
                {imageFile ? `✓ ${imageFile.name}` : "Choose Image…"}
              </span>
            </label>
            {fieldErrors.image && <span className={styles.fieldError}>{fieldErrors.image}</span>}
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting && <span className={styles.btnSpinner} />}
              {isSubmitting ? "Submitting…" : "Send Report"}
            </button>
          </div>
        </form>
      )}
    </div>
  </div>
));

/* ─────────────────────────────────────────
   DrawerMenu (main)
───────────────────────────────────────── */
const DrawerMenu = ({ mobile = false }) => {
  const navigate = useNavigate();

  const [isSubmenuOpen,  setIsSubmenuOpen]  = useState(false);
  const [isReportOpen,   setIsReportOpen]   = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [reportData, setReportData] = useState({
    searchQuery: "", reason: "",
    targetUserId: "", targetUserEmail: "", targetUserName: "",
  });
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [isSearching,   setIsSearching]   = useState(false);
  const [imageFile,     setImageFile]     = useState(null);
  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [fieldErrors,   setFieldErrors]   = useState({});
  const [alertMessage,  setAlertMessage]  = useState(null);

  const submenuRef      = useRef(null);
  const triggerRef      = useRef(null);
  const skipNextSearch  = useRef(false);

  /* Outside-click for desktop dropdown */
  useEffect(() => {
    if (mobile) return;
    const handler = (e) => {
      if (
        submenuRef.current && !submenuRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) setIsSubmenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobile]);

  /* Debounced search */
  useEffect(() => {
    if (skipNextSearch.current) { skipNextSearch.current = false; return; }
    let cancelled = false;
    const run = async () => {
      const q = reportData.searchQuery.trim();
      if (q.length < 2) { setUserSuggestions([]); return; }
      setIsSearching(true);
      try {
        const results = await searchUsers(q);
        if (!cancelled) setUserSuggestions(results);
      } catch (err) {
        console.error("User search error:", err);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    };
    const timer = setTimeout(run, 220);
    return () => { clearTimeout(timer); cancelled = true; };
  }, [reportData.searchQuery]);

  const handleCloseModal = useCallback(() => {
    setIsModalVisible(false);
    setTimeout(() => {
      setIsReportOpen(false);
      setReportData({ searchQuery: "", reason: "", targetUserId: "", targetUserEmail: "", targetUserName: "" });
      setImageFile(null);
      setFieldErrors({});
      setUserSuggestions([]);
      setSubmitSuccess(false);
    }, 250);
  }, []);

  const openReport = useCallback(() => {
    setIsReportOpen(true);
    requestAnimationFrame(() => setIsModalVisible(true));
  }, []);

  const handleSelectUser = useCallback((user) => {
    const displayName = [user.firstName, user.middleName, user.lastName]
      .filter(Boolean).join(" ") || user.fullName || "";
    skipNextSearch.current = true;
    setReportData((prev) => ({
      ...prev,
      searchQuery: user.email,
      targetUserId: user.id,
      targetUserEmail: user.email,
      targetUserName: displayName,
    }));
    setUserSuggestions([]);
    setFieldErrors((prev) => ({ ...prev, user: undefined }));
  }, []);

  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setReportData((prev) => ({
      ...prev,
      searchQuery: val,
      targetUserId: "", targetUserEmail: "", targetUserName: "",
    }));
    setFieldErrors((prev) => ({ ...prev, user: undefined }));
  }, []);

  const handleReasonChange = useCallback((e) => {
    const val = e.target.value;
    setReportData((prev) => ({ ...prev, reason: val }));
    setFieldErrors((prev) => ({ ...prev, reason: undefined }));
  }, []);

  const handleFileChange = useCallback((e) => {
    setImageFile(e.target.files[0] || null);
    setFieldErrors((prev) => ({ ...prev, image: undefined }));
  }, []);

  const handleReportSubmit = useCallback(async (e) => {
    e.preventDefault();
    const errors = {};
    if (!reportData.targetUserId) errors.user  = "Please select a valid user from the suggestions list.";
    if (!reportData.reason.trim()) errors.reason = "Please describe the reason for reporting.";
    if (!imageFile)                errors.image  = "Please upload an image as proof.";
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const storageRef  = ref(storage, `reports/${Date.now()}_${imageFile.name}`);
      const uploadResult = await uploadBytes(storageRef, imageFile);
      const downloadURL  = await getDownloadURL(uploadResult.ref);
      await addDoc(collection(db, "reports"), {
        reporterId:        auth.currentUser?.uid,
        reporterName:      auth.currentUser?.displayName || auth.currentUser?.email,
        reportedUserId:    reportData.targetUserId,
        reportedUserEmail: reportData.targetUserEmail,
        reportedUserName:  reportData.targetUserName,
        reason:            reportData.reason,
        proofImageUrl:     downloadURL,
        status:            "Pending",
        createdAt:         serverTimestamp(),
      });
      setSubmitSuccess(true);
      setTimeout(handleCloseModal, 2000);
    } catch (err) {
      console.error("Report submit error:", err);
      setAlertMessage("Failed to submit the report. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [reportData, imageFile, handleCloseModal]);

  const navItems = [
    { label: "App Guide",        path: "/appguide"  },
    { label: "Contact Details",  path: "/contactus" },
    { label: "Help & FAQ",       path: "/helpfaq"   },
    { label: "Terms & Conditions", path: "/terms"   },
  ];

  const modalProps = {
    reportData, onSearchChange: handleSearchChange, onSelectUser: handleSelectUser,
    onReasonChange: handleReasonChange, onFileChange: handleFileChange,
    onSubmit: handleReportSubmit, onClose: handleCloseModal,
    userSuggestions, isSearching, imageFile,
    isSubmitting, submitSuccess, isVisible: isModalVisible, fieldErrors,
  };

  /* ── MOBILE ── */
  if (mobile) return (
    <>
      <div className={styles.mobileDrawerSection}>
        <p className={styles.mobileDrawerHeading}>Our Services</p>
        <div className={styles.mobileDrawerLinks}>
          {navItems.map((item) => (
            <a key={item.path} href="#" className={styles.mobileDrawerLink}
              onClick={(e) => { e.preventDefault(); navigate(item.path); }}>
              {item.label}
            </a>
          ))}
          <a href="#" className={styles.mobileDrawerLink}
            onClick={(e) => { e.preventDefault(); openReport(); }}>
            Report User
          </a>
        </div>
      </div>
      {isReportOpen && ReactDOM.createPortal(<ReportModal {...modalProps} />, document.body)}
      {alertMessage && <AlertModal message={alertMessage} onClose={() => setAlertMessage(null)} />}
    </>
  );

  /* ── DESKTOP ── */
  return (
    <>
      <div className={styles.drawerWrapper}>
        <button
          ref={triggerRef}
          className={`${styles.drawerTrigger} ${isSubmenuOpen ? styles.drawerTriggerActive : ""}`}
          onClick={() => setIsSubmenuOpen((p) => !p)}
          aria-expanded={isSubmenuOpen}
          aria-haspopup="true"
        >
          <span>Our Services</span>
          <svg viewBox="0 0 360 360" className={`${styles.chevron} ${isSubmenuOpen ? styles.chevronUp : ""}`}>
            <path d="M325.607,79.393c-5.857-5.857-15.355-5.858-21.213,0.001l-139.39,139.393L25.607,79.393c-5.857-5.857-15.355-5.858-21.213,0.001c-5.858,5.858-5.858,15.355,0,21.213l150.004,150c2.813,2.813,6.628,4.393,10.606,4.393s7.794-1.581,10.606-4.394l149.996-150C331.465,94.749,331.465,85.251,325.607,79.393z"/>
          </svg>
        </button>

        <div ref={submenuRef}
          className={`${styles.submenuPanel} ${isSubmenuOpen ? styles.submenuPanelOpen : ""}`}
          role="menu"
        >
          {navItems.map((item) => (
            <button key={item.path} className={styles.submenuItem} role="menuitem"
              onClick={() => { navigate(item.path); setIsSubmenuOpen(false); }}>
              {item.label}
            </button>
          ))}
          <button className={styles.submenuItem} role="menuitem"
            onClick={() => { openReport(); setIsSubmenuOpen(false); }}>
            Report User
          </button>
        </div>
      </div>

      {isReportOpen && ReactDOM.createPortal(<ReportModal {...modalProps} />, document.body)}
      {alertMessage && <AlertModal message={alertMessage} onClose={() => setAlertMessage(null)} />}
    </>
  );
};

export default DrawerMenu;
