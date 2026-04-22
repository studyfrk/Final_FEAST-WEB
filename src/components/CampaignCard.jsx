import React from 'react';
import styles from './CampaignStyles';

const CampaignCard = ({ title, description, progress }) => {
  return (
    <div style={styles.card}>
      {/* Black Place Holder Image*/}
      <div style={styles.cardImagePlaceHolder} />
      
      <div style={styles.cardContent}>
        <h3 style={styles.cardTitle}>{title}</h3>
        <p style={styles.cardDescription}>{description}</p>
        
        <div>
          <p style={styles.fundingLabel}>{progress}% funded</p>
          <div style={styles.progressBarBg}>
            <div 
              style={{
                ...styles.progressBarFill,
                width: `${progress}%`
              }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignCard;