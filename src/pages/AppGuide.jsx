/* React & Firebase Imports */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";

/* Asset Imports */
import GuideImage from "../assets/GuideImage.jpg";
import CallSupport from "../assets/CallSupport.png";
import ChatSupport from "../assets/ChatSupport.png";
import Address from "../assets/Address.png";
import ContactUs from "../assets/ContactUs.png";

/* Component Imports */
import Footer from "../components/Footer.jsx";
import DrawerHero from "../components/DrawerHero.jsx";
import Accordion from "../components/Accordion.jsx";
import AskQuestionModal from "../components/AskQuestionModal.jsx";
import GuestRestrictionModal from "../components/GuestRestrictionModal.jsx";
import InfoCardContainer from "../components/InfoCards.jsx";

/* Style Imports */
import styles from "../components/support_page.module.css";

/* ── Inline SVG Icons ───────────────────────────────────────── */
const IconHome = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, flexShrink: 0 }}>
    <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1H15v-5h-6v5H4a1 1 0 0 1-1-1V10.5Z" fill="#4f46e5" stroke="#4f46e5" strokeWidth="1.2" strokeLinejoin="round"/>
    <rect x="9" y="16" width="6" height="6" rx="0.5" fill="#a5b4fc"/>
  </svg>
);

const IconMoney = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, flexShrink: 0 }}>
    <circle cx="12" cy="12" r="9.5" fill="#d1fae5" stroke="#059669" strokeWidth="1.5"/>
    <text x="12" y="16.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="#059669" fontFamily="serif">₱</text>
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

const IconChat = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, flexShrink: 0 }}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="#bfdbfe" stroke="#2563eb" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M8 10h8M8 14h5" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconBell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, flexShrink: 0 }}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill="#fef9c3" stroke="#ca8a04" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#ca8a04" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="18" cy="6" r="3.5" fill="#f97316"/>
  </svg>
);

const IconQuestion = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, flexShrink: 0 }}>
    <circle cx="12" cy="12" r="9.5" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.5"/>
    <path d="M9.5 9.5a2.5 2.5 0 1 1 2.5 2.5V13.5" stroke="#10b981" strokeWidth="1.7" strokeLinecap="round"/>
    <circle cx="12" cy="16.5" r="1" fill="#10b981"/>
  </svg>
);

const IconWarning = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, flexShrink: 0 }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M12 9v4" stroke="#d97706" strokeWidth="1.7" strokeLinecap="round"/>
    <circle cx="12" cy="17" r="1" fill="#d97706"/>
  </svg>
);

const AppGuide = () => {
  const [questionModal, setQuestionModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);

  const toggleQuestionModal = () => {
    if (auth.currentUser?.isAnonymous || auth.currentUser?.email === 'guest@feast.app') {
      setShowGuestModal(true);
      return;
    }
    setQuestionModal(!questionModal);
  };

  const guideData = [
    {
      title: <><IconHome /> Home: Your Community Dashboard</>,
      content:
        "The home page is your central command center for all things related to F.E.A.S.T. Here, you'll find a live feed of featured community aid requests and charity events, how impactful your involvement can be, and all important official announcements.",
    },
    {
      title: <><IconMoney /> Requests: Bridging the Gap</>,
      content:
        "Learn how to submit, browse, and respond to community aid requests. This section helps connect donors with beneficiaries or those in need. Only barangay residents may post aid requests.",
    },
    {
      title: <><IconCalendar /> Events: Action & Engagement</>,
      content:
        "Discover upcoming charity events, register as a volunteer, or organize your own. Both residents and non-residents can create charity events as long as it's within Barangay Almanza Dos.",
    },
    {
      title: <><IconChat /> Messages: Direct Communication</>,
      content:
        "Use the Messages tab to communicate directly with donors, beneficiaries, event organizers, volunteers, or admins within the platform. All messages are private and secure, as we comply with data privacy guidelines.",
    },
    {
      title: <><IconBell /> Notifications: Stay Informed</>,
      content:
        "Never miss an update on your community and account's activities. Track real-time updates regarding your donations, aid requests, charity event registrations, approved volunteer slots, and other incoming information all in one place.",
    },
    {
      title: <><IconQuestion /> Help & FAQ: Support & Resources</>,
      content:
        "Search for quick answers to common questions about the F.E.A.S.T. Charity Management System. Browse troubleshooting guides, platform rules, and FAQs to navigate the platform with ease.",
    },
    {
      title: <><IconWarning /> Reporting Users: Safeguard the Community</>,
      content:
        "Help us keep F.E.A.S.T. and the Almanza Dos community a safe, respectful, and trusted space. Flag fraudulent messages, abusive intentions, inappropriate behavior, or community guideline violations for immediate admin review.",
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
        title="User Guide"
        description="Learn how to use our website effectively."
      />
      <section className={styles.supportSection}>
        <div className={styles.supportHeader}>
          <p className={styles.supportHeaderSubtitle}>Need Help Navigating?</p>
          <h2 className={styles.supportHeaderTitle}>F.E.A.S.T. User Guide</h2>
        </div>
        <div className={styles.supportContentContainer}>
          <div className={styles.supportImageWrapper}>
            <img src={GuideImage} className={styles.supportImageWrapperImage} />
          </div>
          <div className={styles.supportAccordionWrapper}>
            <Accordion data={guideData} />
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

export default AppGuide;
