import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import gpcLogo from "../assets/GPC_Logo.png";
import Header from '../components/header';
import Footer from '../components/footer';
import DrawerHero from '../components/DrawerHero';
import Accordion from "../components/Accordion";
import faqImage from "../assets/FAQImage.jpg";
import "../components/HelpFAQ.css";
import InfoCardContainer from "../components/InfoCards.jsx";
import CallSupport from "../assets/CallSupport.png";
import ChatSupport from "../assets/ChatSupport.png";
import Address from "../assets/Address.png";
import ContactUs from "../assets/ContactUs.png"
import AskQuestionModal from "../components/AskQuestionModal.jsx";

const HelpFAQ = () => {

  const [questionModal, setQuestionModal] = useState(false);

  const toggleQuestionModal = () => {
    setQuestionModal(!questionModal)
  }

  const faqData = [
    { 
      title: "What is F.E.A.S.T.?",
      content: "F.E.A.S.T. stands for Food, Emergency Aid, Support & Transparency. It is a platform built to connect donors, volunteers, and beneficiaries in Barangay Almanza Dos." 
    },
    { 
      title: "What are aid requests or charity events?",
      content: "Aid requests are community-submitted needs such as food, medicine, or services. Charity events are organised activities where volunteers and donors contribute directly to the community." 
    },
    { 
      title: "How do I report users for misbehaviour?",
      content: "Navigate to a user's profile and tap the Report button, or use the Ask a Question button on this screen to contact the moderation team." 
    },
    { 
      title: "How long does admin approval take?",
      content: "Registrations and posts are typically reviewed within 24 hours. You will receive a notification once a decision is made." 
    },
    {
      title: "Can I edit my aid request after posting?",
      content: "No. Edits are disabled once a post is live. Please review all details carefully before submitting."
    }
  ];

  const infoData = [
    {
      icon: CallSupport,
      title: "Call Support",
      description: "Our team is available to assist you with any inquiries. Reach out for immediate support during business hours."
    },
    {
      icon: ChatSupport,
      title: "Chat With Us",
      description: "Looking for a quick answer? Start a conversation with our support specialists for real-time assistance."
    },
    {
      icon: Address,
      title: "Address",
      description: "Ilang Street, T.S. Cruz Subdivision, C2G5+5MC, Las Piñas City, 1740 Metro Manila, Philippines"
    },
    {
      icon: ContactUs,
      title: "Contact Info",
      description: ["Phone: (02) 8641-3533", <br />, "Email: almanza2lp.alovera@gmail.com"]
    },
  ];

  return (
    <div>
        <Header />
        <DrawerHero 
          title="Help & FAQ"
          description="Find answers to your questions or get help with our services."
        />
        <section className="faq-section">
          <div className="faq-header">
            <p>Have Any Questions?</p>
            <h2>Frequently Asked Questions</h2>
          </div>
          <div className="faq-content-container">
            <div className="faq-image-wrapper">
              <img src={faqImage} />
            </div>
            <div className="faq-accordion-wrapper">
              <Accordion data={faqData} />
              <button className="learn-more" onClick={toggleQuestionModal}>
                <span className="circle" aria-hidden="true">
                <span className="icon arrow"></span>
                </span>
                <span className="button-text">Ask A Question</span>
              </button>
            </div>
          </div>
        </section>
        <section className="info-section">
          <div className="info-header">
            <h2>Still Need Help?</h2>
            <br />
            <p>We are dedicated to evolving our services to provide<br />every resident with the best support and community<br />programs that lead the way in local governance.</p>
          </div>
          <InfoCardContainer items={infoData} />
        </section>
        {questionModal && (
          <AskQuestionModal onClose={toggleQuestionModal} />
        )}
        <Footer />
    </div>
  );
};

export default HelpFAQ;
