import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import gpcLogo from "../assets/GPC_Logo.png";
import Header from '../components/header';
import Footer from '../components/footer';
import DrawerHero from '../components/DrawerHero';

const AboutUs = () => {
  return (
    <div>
        <Header />
        <DrawerHero 
          title="About Us"
          description="Learn more about our mission and values."
        />
        <Footer />
    </div>
  )
}

export default AboutUs;
