/* React & Firebase Imports */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";

/* Component Imports */
import Footer from "../components/Footer.jsx";
import DrawerHero from "../components/DrawerHero.jsx";
import Accordion from "../components/Accordion.jsx";
import AskQuestionModal from "../components/AskQuestionModal.jsx";
import GuestRestrictionModal from "../components/GuestRestrictionModal.jsx";
import InfoCardContainer from "../components/InfoCards.jsx";

/* Image Imports */
import faqImage from "../assets/FAQImage.jpg";
import CallSupport from "../assets/CallSupport.png";
import ChatSupport from "../assets/ChatSupport.png";
import Address from "../assets/Address.png";
import ContactUs from "../assets/ContactUs.png";

/* Style Imports */
import styles from "../components/support_page.module.css";

/* ── Inline SVG Icons ───────────────────────────────────────── */
const IconSprout = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, flexShrink: 0 }}>
    <path d="M12 22V12" stroke="#16a34a" strokeWidth="1.7" strokeLinecap="round"/>
    <path d="M12 12C12 12 7 10 7 5a5 5 0 0 1 5 5Z" fill="#bbf7d0" stroke="#16a34a" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M12 12C12 12 17 10 17 5a5 5 0 0 0-5 5Z" fill="#86efac" stroke="#16a34a" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
);

const IconCheckShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, flexShrink: 0 }}>
    <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11 4.5-.85 8-5.75 8-11V6L12 2Z" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M8.5 12l2.5 2.5 4.5-5" stroke="#16a34a" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconCalendar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, flexShrink: 0 }}>
    <rect x="3" y="5" width="18" height="16" rx="2" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.5"/>
    <path d="M3 10h18" stroke="#7c3aed" strokeWidth="1.5"/>
    <path d="M8 3v4M16 3v4" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="7" y="13" width="3" height="3" rx="0.5" fill="#7c3aed"/>
    <rect x="14" y="13" width="3" height="3" rx="0.5" fill="#7c3aed"/>
  </svg>
);

const IconBan = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, flexShrink: 0 }}>
    <circle cx="12" cy="12" r="9.5" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.5"/>
    <path d="M4.93 4.93l14.14 14.14" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconEdit = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, flexShrink: 0 }}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);

const IconClock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, flexShrink: 0 }}>
    <circle cx="12" cy="12" r="9.5" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5"/>
    <path d="M12 7v5l3 3" stroke="#d97706" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconWarning = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, flexShrink: 0 }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M12 9v4" stroke="#d97706" strokeWidth="1.7" strokeLinecap="round"/>
    <circle cx="12" cy="17" r="1" fill="#d97706"/>
  </svg>
);

const HelpFAQ = () => {
  const [questionModal, setQuestionModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);

  const toggleQuestionModal = () => {
    if (auth.currentUser?.isAnonymous || auth.currentUser?.email === 'guest@feast.app') {
      setShowGuestModal(true);
      return;
    }
    setQuestionModal(!questionModal);
  };

  const faqData = [
    {
      title: <><IconSprout /> What is F.E.A.S.T.?</>,
      content:
        "F.E.A.S.T. (Food, Emergency Aid, Support & Transparency) is a platform designed to connect beneficiaries, donors, event organizers, and volunteers across Barangay Almanza Dos.",
    },
    {
      title: <><IconCheckShield /> Why do administrators need to verify user accounts?</>,
      content:
        "Account verification ensures the safety, transparency, and integrity of our platform. By validating identities and roles, administrators prevent fraudulent activity, secure sensitive community data, and maintain a safe space for all legal-aged users.",
    },
    {
      title: <><IconCalendar /> What are aid requests or charity events?</>,
      content:
        "Aid requests are community needs submitted by barangay residents that request things such as funds, food, medicine, or other essential items. Charity events are organised activities where event organizers and volunteers contribute directly to the community.",
    },
    {
      title: <><IconBan /> Why can't non-residents post aid requests?</>,
      content:
        "Aid requests are strictly reserved for verified residents to ensure that local relief efforts and resources directly benefit individuals and families within Barangay Almanza Dos. However, non-residents are welcome and highly encouraged to participate as donors or volunteers.",
    },
    {
      title: <><IconEdit /> Can I edit my aid request or charity event after posting?</>,
      content:
        "No. To prevent disorganization, posts cannot be edited once they are published. We kindly ask that you double-check all details before submitting. Every post will be carefully reviewed by an administrator.",
    },
    {
      title: <><IconClock /> How long does admin approval take?</>,
      content:
        "Registrations and posts are typically reviewed within 24 hours. You will receive a notification once your request is approved or rejected.",
    },
    {
      title: <><IconWarning /> How do I report users for misbehaviour?</>,
      content:
        'Navigate to the "Our Services" dropdown and select "Report User." Alternatively, you can report a user directly from the messages page.',
    },
  ];

  const infoData = [
    {
      icon: CallSupport,
      title: "Call Support",
      description:
        "Our team is available to assist you with any inquiries. Feel free to contact us for immediate support during business hours.",
    },
    {
      icon: ChatSupport,
      title: "Chat With Us",
      description:
        "Looking for a quick answer? Start a conversation with our support team for active assistance.",
    },
    {
      icon: Address,
      title: "Address",
      description:
        "Ilang Street, T.S. Cruz Subdivision, C2G5+5MC, Las Piñas City, 1740 Metro Manila, Philippines",
    },
    {
      icon: ContactUs,
      title: "Contact Info",
      description: [
        "Phone: (02) 8641-3533",
        <br />,
        "Email: almanza2lp.alovera",
        <br />,
        "@gmail.com",
      ],
    },
  ];

  return (
    <div className={styles.pageWrapper}>
      <DrawerHero
        title="Help & FAQ"
        description="Find answers to your questions or ask anything."
      />
      <section className={styles.supportSection}>
        <div className={styles.supportHeader}>
          <p className={styles.supportHeaderSubtitle}>Have Any Questions?</p>
          <h2 className={styles.supportHeaderTitle}>
            Frequently Asked Questions
          </h2>
        </div>
        <div className={styles.supportContentContainer}>
          <div className={styles.supportImageWrapper}>
            <img src={faqImage} className={styles.supportImageWrapperImage} />
          </div>
          <div className={styles.supportAccordionWrapper}>
            <Accordion data={faqData} />
            <button className={styles.askButton} onClick={toggleQuestionModal}>
              <span className={styles.circle} aria-hidden="true">
                <span className={styles.icon + " " + styles.arrow}></span>
              </span>
              <span className={styles.buttonText}>Ask A Question</span>
            </button>
          </div>
        </div>
      </section>
      <section className={styles.supportSection}>
        <div className={styles.supportHeader}>
          <h2 className={styles.supportHeaderTitle}>Still Need Help?</h2>
          <p className={styles.supportHeaderSubtitle}>
            We are dedicated to evolving our services to provide
            <br />
            every resident with the best support and community
            <br />
            programs that lead the way in local governance.
          </p>
        </div>
        <InfoCardContainer items={infoData} />
      </section>
      {questionModal && <AskQuestionModal onClose={toggleQuestionModal} />}
      <GuestRestrictionModal isOpen={showGuestModal} onClose={() => setShowGuestModal(false)} />
      <Footer />
    </div>
  );
};

export default HelpFAQ;
