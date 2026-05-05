import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import gpcLogo from "../assets/GPC_Logo.png";
import Header from '../components/header';
import Footer from '../components/footer';
import DrawerHero from '../components/DrawerHero';

const AppGuide = () => {
  return (
    <div>
        <Header />
        <DrawerHero 
          title="App Guide"
          description="Learn how to use our app effectively."
        />
        <Footer />
    </div>
  )
}

export default AppGuide;
