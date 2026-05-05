import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import gpcLogo from "../assets/GPC_Logo.png";
import heroImage from '../assets/homehero.jpg';
import "../components/DrawerHero.css";

const DrawerHero = ({ title, description }) => {
  return (
    <div>
      <section className="drawer-hero-section">
        <div className="drawer-hero-overlay">
          <div className="drawer-hero-content">
            <h1 className="drawer-hero-title">{title}</h1>
            <p className="drawer-hero-description">{description}</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DrawerHero;
