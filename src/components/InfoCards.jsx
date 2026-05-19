/* React & Firebase Imports */
import React from "react";
import { useNavigate } from "react-router-dom";

/* Style Imports */
import styles from "./info_cards.module.css";

const InfoCard = ({ icon, title, description }) => (
  <div className={styles.infoCard}>
    <img src={icon} alt={title} className={styles.infoCardImage} />
    <h3 className={styles.infoCardTitle}>{title}</h3>
    <p className={styles.infoCardDescription}>{description}</p>
  </div>
);

const InfoCardContainer = ({ items }) => {
  return (
    <div className={styles.infoCardContainer}>
      {items.map((item, index) => (
        <InfoCard
          key={index}
          icon={item.icon}
          title={item.title}
          description={item.description}
        />
      ))}
    </div>
  );
};

export default InfoCardContainer;
