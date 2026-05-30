/* React & Firebase Imports */
import React from 'react';

/* Style Imports */
import styles from './card.module.css';

const Card = ({ category, title, description, raised, goal, image, percentage, hideProgressBar, isPending, isOwnRequest }) => {
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
    <div 
      className={styles.cardContainer}
      style={isPending ? { border: '1.5px solid #f59e0b', position: 'relative' } : { position: 'relative' }}
    >
      <div className={styles.cardImageArea} style={{ position: 'relative' }}>
        {/* Awaiting Drop-off Badge */}
        {isPending && (
          <span style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            backgroundColor: '#f59e0b', 
            color: '#ffffff',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
            zIndex: 3,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
          }}>
            Awaiting Drop-off
          </span>
        )}

        {/* Your Request Badge */}
        {isOwnRequest && (
          <span style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            backgroundColor: '#10b981', 
            color: '#ffffff',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
            zIndex: 3,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
          }}>
            Your Request
          </span>
        )}

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
          {!hideProgressBar && (
            <>
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
            </>
          )}

          <div 
            className={styles.progressBottom} 
            style={hideProgressBar ? { display: 'block', width: '100%' } : {}}
          >
            {hideProgressBar ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', width: '100%' }}>
                <span className={styles.raisedAmt} style={{ color: '#2e7d32', fontWeight: '600', fontSize: '13px' }}>
                  {raised}
                </span>
                <span className={styles.goalAmt} style={{ color: '#555', fontSize: '12.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', width: '100%' }} title={goal}>
                  {goal}
                </span>
              </div>
            ) : (
              <>
                <span className={styles.raisedAmt}>Raised: {raised}</span>
                <span className={styles.goalAmt}>Goal: {goal}</span>
              </>
            )}
          </div>
        </div>
        
        {/* Only show the donate button if it's not their own request */}
        {!isOwnRequest && (
          <button className={styles.cardBtn}>Donate Now</button>
        )}
      </div>
    </div>
  );
};

export default Card;