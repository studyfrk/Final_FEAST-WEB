import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import gpcLogo from "../assets/GPC_Logo.png";
import Header from "../components/header";
import Footer from "../components/footer";
import DrawerHero from "../components/DrawerHero";
import styles from "../components/terms_conditions.module.css";

const TermsConditions = () => {
  return (
    <div>
      <Header />
      <DrawerHero
        title="Terms & Conditions"
        description="Please read these terms and conditions carefully before using our services."
      />
      <section className={styles.termsSection}>
        <div className={styles.termsContainer}>
          <ol className={styles.termsList}>
            <li>
              <h2 className={styles.h2}>User Eligibility & Conduct</h2>
              <hr className={styles.termsDivider} />
              <p className={styles.p}>
                <b>Community First:</b> Users must be residents or verified
                stakeholders of Almanza Dos.
                <br />
                <b>Respectful Interaction:</b> Harassment, hate speech, or any
                form of discrimination is strictly prohibited.
                <br />
                <b>Authenticity:</b> You agree to provide accurate information
                when creating your profile and making community aid requests.
              </p>
            </li>
            <li>
              <h2 className={styles.h2}>Data Privacy & Security</h2>
              <hr className={styles.termsDivider} />
              <p className={styles.p}>
                Your personal data is collected solely to facilitate community
                aid activities. We do not sell or share your information with
                third parties without your consent.
              </p>
            </li>
            <li>
              <h2 className={styles.h2}>Termination of Service</h2>
              <hr className={styles.termsDivider} />
              <p className={styles.p}>
                Accounts found violating community guidelines may be suspended
                or permanently removed without prior notice.
              </p>
            </li>
            <li>
              <h2 className={styles.h2}>Prohibited Activities</h2>
              <hr className={styles.termsDivider} />
              <p className={styles.p}>
                Users must not use the platform for commercial solicitation,
                spreading misinformation, or any activity that undermines
                community trust and safety.
              </p>
            </li>
            <li>
              <h2 className={styles.h2}>Reporting & Dispute Resolution</h2>
              <hr className={styles.termsDivider} />
              <p className={styles.p}>
                Users are encouraged to report suspicious activity via the Help
                & FAQ screen. All disputes will be reviewed by the barangay
                moderation team.
              </p>
            </li>
          </ol>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default TermsConditions;
