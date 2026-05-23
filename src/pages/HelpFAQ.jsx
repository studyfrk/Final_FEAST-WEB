/* React & Firebase Imports */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";

/* Component Imports */
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import DrawerHero from "../components/DrawerHero.jsx";
import Accordion from "../components/Accordion.jsx";
import AskQuestionModal from "../components/AskQuestionModal.jsx";
import InfoCardContainer from "../components/InfoCards.jsx";

/* Image Imports */
import faqImage from "../assets/FAQImage.jpg";
import CallSupport from "../assets/CallSupport.png";
import ChatSupport from "../assets/ChatSupport.png";
import Address from "../assets/Address.png";
import ContactUs from "../assets/ContactUs.png";

/* Style Imports */
import styles from "../components/support_page.module.css";

const HelpFAQ = () => {
  const [questionModal, setQuestionModal] = useState(false);

  const toggleQuestionModal = () => {
    setQuestionModal(!questionModal);
  };

  const faqData = [
    {
      title: "🌱 What is F.E.A.S.T.?",
      content:
        "F.E.A.S.T. (Food, Emergency Aid, Support & Transparency) is a platform designed to connect beneficiaries, donors, event organizers, and volunteers across Barangay Almanza Dos.",
    },
    {
      title: "✅ Why do administrators need to verify user accounts?",
      content:
        "Account verification ensures the safety, transparency, and integrity of our platform. By validating identities and roles, administrators prevent fraudulent activity, secure sensitive community data, and maintain a safe space for all legal-aged users.",
    },
    {
      title: "📅 What are aid requests or charity events?",
      content:
        "Aid requests are community needs submitted by barangay residents that request things such as funds, food, medicine, or other essential items. Charity events are organised activities where event organizers and volunteers contribute directly to the community.",
    },
    {
      title: "🚫 Why can't non-residents post aid requests?",
      content:
        "Aid requests are strictly reserved for verified residents to ensure that local relief efforts and resources directly benefit individuals and families within Barangay Almanza Dos. However, non-residents are welcome and highly encouraged to participate as donors or volunteers.",
    },
    {
      title: "📝 Can I edit my aid request or charity event after posting?",
      content:
        "No. To prevent disorganization, posts cannot be edited once they are published. We kindly ask that you double-check all details before submitting. Every post will be carefully reviewed by an administrator.",
    },
    {
      title: "🕒 How long does admin approval take?",
      content:
        "Registrations and posts are typically reviewed within 24 hours. You will receive a notification once your request is approved or rejected.",
    },
    {
      title: "⚠️ How do I report users for misbehaviour?",
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
      <Header />
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
      <Footer />
    </div>
  );
};

export default HelpFAQ;
