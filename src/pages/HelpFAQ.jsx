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

const HelpFAQ = () => {

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
      icon: gpcLogo,
      title: "Call Support",
      description: "Our team is available to assist you with any inquiries. Reach out for immediate support during business hours."
    },
    {
      icon: gpcLogo,
      title: "Chat With Us",
      description: "Looking for a quick answer? Start a conversation with our support specialists for real-time assistance."
    },
    {
      icon: gpcLogo,
      title: "Address",
      description: "Ilang Street, T.S. Cruz Subdivision, C2G5+5MC, Las Piñas City, 1740 Metro Manila, Philippines"
    }
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
        <Footer />
    </div>
  )
}

export default HelpFAQ;
