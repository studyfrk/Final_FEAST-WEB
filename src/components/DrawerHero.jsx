/* Database Imports */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

/* Style Imports */
import styles from "../components/drawer_hero.module.css";

const DrawerHero = ({ title, description }) => {
  return (
    <div>
      <section className={styles.drawerHeroSection}>
        <div className={styles.drawerHeroOverlay}>
          <div className={styles.drawerHeroContent}>
            <h1 className={styles.drawerHeroTitle}>{title}</h1>
            <p className={styles.drawerHeroDescription}>{description}</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DrawerHero;
