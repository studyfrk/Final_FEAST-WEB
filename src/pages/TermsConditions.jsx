/* React Imports */
import React from "react";

/* Component Imports */
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import DrawerHero from "../components/DrawerHero.jsx";

/* Style Imports */
import styles from "../components/terms_conditions.module.css";

const terms = [
  {
    title: "User Eligibility & Conduct",
    content: (
      <>
        <b>Community First:</b> Users must be residents or verified stakeholders of Almanza Dos.
        <br /><br />
        <b>Respectful Interaction:</b> Harassment, hate speech, or any form of discrimination is strictly prohibited.
        <br /><br />
        <b>Authenticity:</b> You agree to provide accurate information when creating your profile and making community aid requests.
      </>
    ),
  },
  {
    title: "Data Privacy & Security",
    content:
      "Your personal data is collected solely to facilitate community aid activities. We do not sell or share your information with third parties without your consent.",
  },
  {
    title: "Termination of Service",
    content:
      "Accounts found violating community guidelines may be suspended or permanently removed without prior notice.",
  },
  {
    title: "Prohibited Activities",
    content:
      "Users must not use the platform for commercial solicitation, spreading misinformation, or any activity that undermines community trust and safety.",
  },
  {
    title: "Reporting & Dispute Resolution",
    content:
      "Users are encouraged to report suspicious activity via the Help & FAQ screen. All disputes will be reviewed by the barangay moderation team.",
  },
];

const TermsConditions = () => {
  return (
    <div className={styles.pageWrapper}>
      <Header />
      <DrawerHero
        title="Terms & Conditions"
        description="Please read these terms carefully before using our services."
      />
      <section className={styles.termsSection}>
        <div className={styles.termsContainer}>
          <ol className={styles.termsList}>
            {terms.map((term, i) => (
              <li key={i} className={styles.li}>
                <h2 className={styles.h2}>{term.title}</h2>
                <hr className={styles.termsDivider} />
                <p className={styles.p}>{term.content}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default TermsConditions;
