import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import gpcLogo from "../assets/GPC_Logo.png";
import Header from '../components/header';
import Footer from '../components/footer';
import DrawerHero from '../components/DrawerHero';

const TermsConditions = () => {
  return (
    <div>
        <Header />
        <DrawerHero 
          title="Terms & Conditions"
          description="Please read these terms and conditions carefully before using our services."
        />
        <Footer />
    </div>
  )
}

export default TermsConditions;
