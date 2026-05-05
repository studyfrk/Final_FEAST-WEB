import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import gpcLogo from "../assets/GPC_Logo.png";
import Header from '../components/header';
import Footer from '../components/footer';
import DrawerHero from '../components/DrawerHero';

const HelpFAQ = () => {
  return (
    <div>
        <Header />
        <DrawerHero 
          title="Help & FAQ"
          description="Find answers to your questions or get help with our services."
        />
        <Footer />
    </div>
  )
}

export default HelpFAQ;
