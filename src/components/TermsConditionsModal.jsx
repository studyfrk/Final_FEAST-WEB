/* React & Firebase Imports */
import React, { useEffect } from "react";

/* Style Imports */
import styles from "./terms_conditions_modal.module.css";

const terms = [
  {
    title: "Definition of Operational Terms",
    content: (
      <>
        <strong>F.E.A.S.T. System:</strong> The unified web- and mobile-based charity management software consisting of
        front-end user interfaces, administrative dashboards, centralized databases, and cloud infrastructures
        managed collaboratively by the Researchers and Barangay Officials.
        <br /><br />
        <strong>System Administrators / Admins:</strong> Authorized Barangay Officials and workers of Barangay Almanza Dos
        responsible for system configuration, user validation, request processing, tracking records, and moderating
        community-based charitable operations.
        <br /><br />
        <strong>Donors:</strong> Verified users who pledge, upload details of, and facilitate physical monetary or in-kind
        donations to selected beneficiaries or community charity events.
        <br /><br />
        <strong>Volunteers:</strong> Verified users who register to organize, coordinate, or physically participate in
        admin-approved localized charity events within Barangay Almanza Dos.
        <br /><br />
        <strong>Beneficiaries:</strong> In-need individuals residing strictly within Barangay Almanza Dos who submit formal
        individual aid requests to receive materials, sustenance, or financial support.
      </>
    ),
  },
  {
    title: "User Eligibility and Mandatory Account Registration",
    content: (
      <>
        <strong>Age Restriction:</strong> Access is strictly limited to individuals who are eighteen (18) years of age or
        older. The platform does not manage or process accounts for minors.
        <br /><br />
        <strong>Mandatory Identification:</strong> All users must undergo administrative validation during registration.
        Registrants must upload a clear copy of a valid government-issued photo ID (e.g., National ID, Driver's
        License, Voter's ID) or verified proof of residency.
        <br /><br />
        <strong>Administrative Approval:</strong> No account shall gain active status until a designated System Administrator
        has cross-referenced and validated the uploaded credentials and eligibility criteria.
        <br /><br />
        <strong>Residential Scope for Beneficiaries:</strong> Non-residents of Barangay Almanza Dos are explicitly prohibited
        from submitting aid requests. Verified residents who have completed user validation retain full access to
        beneficiary modules.
      </>
    ),
  },
  {
    title: "Scope and Operational Mechanics of Charity Work",
    content: (
      <>
        <strong>Individualistic Approach:</strong> Beneficiaries must file all aid requests exclusively based on individual
        personal needs. The system does not recognize or distribute aid to aggregated household groups.
        <br /><br />
        <strong>Core Category Parameters:</strong> Supported aid requests and charity events are bounded strictly to three
        community-based tracks: Educational Support, Disaster Relief, and Basic Necessities. Requests outside these
        categories will be automatically denied.
        <br /><br />
        <strong>Goal Configurations:</strong> Beneficiaries or event organizers are required to set explicit fundraising
        parameters or material metric goals to track real-time fulfillment and coordinate logistical distributions.
        <br /><br />
        <strong>Critical Logistical Delimitation:</strong> The F.E.A.S.T. system operates exclusively as a digital
        coordination and moderation tool. The platform does not manage, process, or handle the physical
        transportation, storage, distribution, or delivery of goods or donated items. Physical logistics are
        directly managed in-person by donors, volunteers, beneficiaries, and barangay office workers.
      </>
    ),
  },
  {
    title: "Mandatory Financial and Material Donation Policies",
    content: (
      <>
        <strong>Physical Transaction Delimitation:</strong> The system does not incorporate electronic payment gateways,
        commercial financial APIs, or digital transaction processing. All monetary donations must be physical and
        occur completely outside the digital system.
        <br /><br />
        <strong>Barangay Office Verification Protocol:</strong> All cash and item donations must be physically delivered to
        the centralized Barangay Office at Subdivision T.S. Cruz, Las Piñas City, for official acknowledgement
        and manual record-keeping in the barangay logbook.
        <br /><br />
        <strong>System Confirmation:</strong> Pledged donations will not appear as confirmed within the F.E.A.S.T. interface
        until a System Administrator has manually validated receipt of the physical assets at the Barangay Office.
        <br /><br />
        <strong>Anonymity Clause:</strong> Donors may toggle personal visibility to remain anonymous to the public and
        recipient. However, full donor details remain visible to System Administrators and will be archived in
        physical records for legal accountability and transparency.
      </>
    ),
  },
  {
    title: "System Boundaries and Technical Specifications",
    content: (
      <>
        <strong>Online Architecture:</strong> The platform operates using a centralized cloud database architecture
        (Firebase Services, Google Cloud Storage, and Hostinger Web Hosting). A continuous internet connection
        of at least 10 Mbps is mandatory to sync data logs. The application cannot function properly offline.
        <br /><br />
        <strong>Localized Event Constraints:</strong> Any charity event organized through the Volunteer Module must
        physically occur within the territorial jurisdiction and premises of Barangay Almanza Dos.
        <br /><br />
        <strong>Exclusion of Advanced Models:</strong> To preserve baseline stability and lower overhead costs, the platform
        excludes artificial intelligence integrations, machine learning frameworks, or complex predictive neural
        networks.
      </>
    ),
  },
  {
    title: "System Accountability, Transparency, and User Conduct",
    content: (
      <>
        <strong>Feedback and Transparency Controls:</strong> Transparency is reinforced via public donation records, system
        verification logs, and visible activity updates. All system actions are tracked via structured logs to
        evaluate performance and maintain complete traceability.
        <br /><br />
        <strong>In-App Messaging and Behavior:</strong> Users may coordinate logistical details via the built-in messaging
        feature. Users are strictly prohibited from using communication features to engage in harassment, fraud,
        offensive language, or behavior that violates community guidelines.
        <br /><br />
        <strong>Reporting and Banning Mechanism:</strong> A dedicated User Reporting feature allows any participant to flag
        suspicious, fraudulent, or abusive behaviors. Flagged items are routed directly to Barangay Administrators.
        <br /><br />
        <strong>System Restrictions:</strong> Accounts confirmed to be engaging in duplicate submissions, false document
        uploads, fraud, or system abuse are subject to permanent account restriction, blocking, or a total system
        ban executed by the administrators.
      </>
    ),
  },
  {
    title: "Intellectual Property and Final System Turnover",
    content: (
      <>
        The F.E.A.S.T. system was researched and developed by Arnold Nathan M. Alisangco, Joaquin Enrico Miguel
        T. Fidel, Gabriel T. Jasmin, and Regil Kent R. Requierme (Research Group GPC) in fulfillment of academic
        requirements at FEU Alabang. Upon completion of the capstone project study, full operational ownership,
        administrative authority, modification permissions, and ongoing technical maintenance responsibilities are
        legally transferred to the Barangay Government of Almanza Dos via a signed Memorandum of Agreement.
      </>
    ),
  },
  {
    title: "Amendments and Governing Law",
    content:
      "The System Administrators and Barangay Officials reserve the right to revise, amend, or alter these Terms and Conditions at any time to align with new barangay ordinances, municipal rules, or federal regulations of the Philippines. Continued usage of the web or mobile applications following posted modifications constitutes absolute acceptance of the revised terms.",
  },
];

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
            Last Updated: March 2026 · Version 1.0 · Please read these terms carefully before using our services.
          </p>

          <ol className={styles.termsList}>
            {terms.map((term, i) => (
              <li key={i} className={styles.termsItem}>
                <h3 className={styles.termsHeading}>{term.title}</h3>
                <hr className={styles.termsDivider} />
                <p className={styles.termsText}>{term.content}</p>
              </li>
            ))}
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
