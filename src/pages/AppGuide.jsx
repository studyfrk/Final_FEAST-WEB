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
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import DrawerHero from "../components/DrawerHero.jsx";
import Accordion from "../components/Accordion.jsx";
import AskQuestionModal from "../components/AskQuestionModal.jsx";
import InfoCardContainer from "../components/InfoCards.jsx";

/* Style Imports */
import styles from "../components/support_page.module.css";

const AppGuide = () => {
  const [questionModal, setQuestionModal] = useState(false);

  const toggleQuestionModal = () => {
    setQuestionModal(!questionModal);
  };

  const guideData = [
    {
      title: "Home: Your Community Dashboard",
      content:
        "The Home screen is your central command center for all things related to F.E.A.S.T. Here, you'll find a live feed of featured community aid requests and events, a community contributions tracker, and all important announcements.",
    },
    {
      title: "Requests: Bridging the Gap",
      content:
        "Learn how to submit, browse, and respond to community aid requests. This section helps connect donors with those in need. Only Barangay residents may post aid requests.",
    },
    {
      title: "Events: Action & Engagement",
      content:
        "Discover upcoming community events, register as a volunteer, or post your own charity event. Both residents and non-residents can create charity events.",
    },
    {
      title: "Messages: Direct Communication",
      content:
        "Use the Messages tab to communicate directly with donors, beneficiaries, or event organisers within the platform. All messages are private and admin-inaccessible.",
    },
    {
      title: "Settings: Identity & Customisation",
      content:
        "Manage your profile, notification preferences, and other account customisations from the Settings screen.",
    },
  ];

  const infoData = [
    {
      icon: CallSupport,
      title: "Call Support",
      description:
        "Our team is available to assist you with any inquiries. Reach out for immediate support during business hours.",
    },
    {
      icon: ChatSupport,
      title: "Chat With Us",
      description:
        "Looking for a quick answer? Start a conversation with our support specialists for real-time assistance.",
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
        "Email: almanza2lp.alovera@gmail.com",
      ],
    },
  ];

  return (
    <div>
      <Header />
      <DrawerHero
        title="User Guide"
        description="Learn how to use our app effectively."
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
          <br />
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
      <Footer />
    </div>
  );
};

export default AppGuide;
