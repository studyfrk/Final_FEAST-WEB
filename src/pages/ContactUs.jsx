import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import gpcLogo from "../assets/GPC_Logo.png";
import Header from '../components/header';
import Footer from '../components/footer';
import DrawerHero from '../components/DrawerHero';

const ContactUs = () => {
  return (
    <div>
        <Header />
        <DrawerHero 
          title="Contact Us"
          description="Have questions or feedback? We'd love to hear from you!"
        />
        <Footer />
    </div>
  )
}

export default ContactUs;
