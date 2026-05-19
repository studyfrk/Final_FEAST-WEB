/* React & Firebase Imports */
import React, { useEffect } from "react";

/* Style Imports */
import styles from "./terms_conditions_modal.module.css";

const TermsConditionsModal = ({ onClose }) => {
  // Prevent background scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="terms-title">
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 id="terms-title" className={styles.modalTitle}>Terms &amp; Conditions</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">&times;</button>
        </div>

        {/* Scrollable Body */}
        <div className={styles.modalBody}>
          <p className={styles.modalIntro}>
            Please read these terms and conditions carefully before using our services.
          </p>

          <ol className={styles.termsList}>
            <li className={styles.termsItem}>
              <h3 className={styles.termsHeading}>User Eligibility &amp; Conduct</h3>
              <hr className={styles.termsDivider} />
              <p className={styles.termsText}>
                <strong>Community First:</strong> Users must be residents or verified stakeholders of Almanza Dos.
                <br /><br />
                <strong>Respectful Interaction:</strong> Harassment, hate speech, or any form of discrimination is strictly prohibited.
                <br /><br />
                <strong>Authenticity:</strong> You agree to provide accurate information when creating your profile and making community aid requests.
              </p>
            </li>

            <li className={styles.termsItem}>
              <h3 className={styles.termsHeading}>Data Privacy &amp; Security</h3>
              <hr className={styles.termsDivider} />
              <p className={styles.termsText}>
                Your personal data is collected solely to facilitate community aid activities. We do not sell or share your information with third parties without your consent.
              </p>
            </li>

            <li className={styles.termsItem}>
              <h3 className={styles.termsHeading}>Termination of Service</h3>
              <hr className={styles.termsDivider} />
              <p className={styles.termsText}>
                Accounts found violating community guidelines may be suspended or permanently removed without prior notice.
              </p>
            </li>

            <li className={styles.termsItem}>
              <h3 className={styles.termsHeading}>Prohibited Activities</h3>
              <hr className={styles.termsDivider} />
              <p className={styles.termsText}>
                Users must not use the platform for commercial solicitation, spreading misinformation, or any activity that undermines community trust and safety.
              </p>
            </li>

            <li className={styles.termsItem}>
              <h3 className={styles.termsHeading}>Reporting &amp; Dispute Resolution</h3>
              <hr className={styles.termsDivider} />
              <p className={styles.termsText}>
                Users are encouraged to report suspicious activity via the Help &amp; FAQ screen. All disputes will be reviewed by the barangay moderation team.
              </p>
            </li>
          </ol>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button className={styles.closeBtn} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default TermsConditionsModal;
