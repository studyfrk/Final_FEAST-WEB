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
      title: "🏠 Home: Your Community Dashboard",
      content:
        "The home page is your central command center for all things related to F.E.A.S.T. Here, you'll find a live feed of featured community aid requests and charity events, how impactful your involvement can be, and all important official announcements.",
    },
    {
      title: "💰 Requests: Bridging the Gap",
      content:
        "Learn how to submit, browse, and respond to community aid requests. This section helps connect donors with beneficiaries or those in need. Only barangay residents may post aid requests.",
    },
    {
      title: "📅 Events: Action & Engagement",
      content:
        "Discover upcoming charity events, register as a volunteer, or organize your own. Both residents and non-residents can create charity events as long as it's within Barangay Almanza Dos.",
    },
    {
      title: "💬 Messages: Direct Communication",
      content:
        "Use the Messages tab to communicate directly with donors, beneficiaries, event organizers, volunteers, or admins within the platform. All messages are private and secure, as we comply with data privacy guidelines.",
    },
    {
      title: "🔔 Notifications: Stay Informed",
      content:
        "Never miss an update on your community and account's activities. Track real-time updates regarding your donations, aid requests, charity event registrations, approved volunteer slots, and other incoming information all in one place.",
    },
    {
      title: "❓ Help & FAQ: Support & Resources",
      content:
        "Search for quick answers to common questions about the F.E.A.S.T. Charity Management System. Browse troubleshooting guides, platform rules, and FAQs to navigate the platform with ease.",
    },
    {
      title: "⚠️ Reporting Users: Safeguard the Community",
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
