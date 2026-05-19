/* React & Firebase Imports */
import React from 'react';

/* Style Imports */
import styles from './card.module.css';

const Card = ({ category, title, description, raised, goal, image, percentage }) => {
  // Logic: Calculate percentage if not explicitly passed as a prop
  // We strip symbols like ₱ or , if they accidentally get passed to ensure math works
  const numericRaised = typeof raised === 'string' ? parseFloat(raised.replace(/[^\d.]/g, '')) : raised;
  const numericGoal = typeof goal === 'string' ? parseFloat(goal.replace(/[^\d.]/g, '')) : goal;

  const displayPercentage = percentage !== undefined 
    ? percentage 
    : (numericGoal > 0 ? Math.floor((numericRaised / numericGoal) * 100) : 0);

  // Clamp percentage between 0 and 100 for the CSS width
  const barWidth = Math.min(Math.max(displayPercentage, 0), 100);

  return (
    <div className={styles.cardContainer}>
      <div className={styles.cardImageArea}>
        {image ? (
          <img src={image} alt={title} className={styles.cardImg} />
        ) : (
          <div className={styles.cardImgPlaceholder}></div>
        )}
      </div>
      
      <div className={styles.cardBody}>
        <span className={styles.cardCategory}>{category || "Category"}</span>
        <h3 className={styles.cardTitle}>{title || "Cause Title"}</h3>
        <p className={styles.cardDescription}>{description}</p>
        
        <div className={styles.cardProgressSection}>
          <div className={styles.progressTop}>
            <span className={styles.progressLabel}>Progress</span>
            <span className={styles.progressValue}>{displayPercentage}%</span>
          </div>
          <div className={styles.progressBarBg}>
            <div 
              className={styles.progressBarFill} 
              style={{ width: `${barWidth}%` }}
            ></div>
          </div>
          <div className={styles.progressBottom}>
            <span className={styles.raisedAmt}>Raised: {raised}</span>
            <span className={styles.goalAmt}>Goal: {goal}</span>
          </div>
        </div>
        
        <button className={styles.cardBtn}>Donate Now</button>
      </div>
    </div>
  );
};

export default Card;
