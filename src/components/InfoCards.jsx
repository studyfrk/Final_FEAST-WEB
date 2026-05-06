import React from 'react';
import { useNavigate } from "react-router-dom";
import "./InfoCards.css";

const InfoCard = ({ icon, title, description }) => (
  <div className="info-card">
    <img src={icon} alt={title} />
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
);

const InfoCardContainer = ({ items }) => {
  return (
    <div className="info-card-container">
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
