import React from 'react';
import styles from './card.module.css';

const Card = ({
  category,
  title,
  description,
  raised,
  goal,
  image,
  percentage,
  // New props for event-based display
  date,
  startTime,
  endTime,
  volunteerCount,
  isJoined,
}) => {
  // ── Duration-based progress (if date/time props are provided) ───────────
  const getEventProgress = () => {
    if (percentage !== undefined) return percentage; // honour explicit override
    if (!date || !startTime || !endTime) {
      // Fall back to raised/goal calculation when no event time props
      const numericRaised = typeof raised === 'string' ? parseFloat(raised.replace(/[^\d.]/g, '')) : raised;
      const numericGoal   = typeof goal   === 'string' ? parseFloat(goal.replace(/[^\d.]/g, ''))   : goal;
      return numericGoal > 0 ? Math.floor((numericRaised / numericGoal) * 100) : 0;
    }
    try {
      const start = new Date(`${date}T${startTime}`);
      const end   = new Date(`${date}T${endTime}`);
      const now   = new Date();
      if (now <= start) return 0;
      if (now >= end)   return 100;
      return Math.floor(((now - start) / (end - start)) * 100);
    } catch {
      return 0;
    }
  };

  const displayPercentage = getEventProgress();

  // Clamp percentage between 0 and 100 for the CSS width
  const barWidth = Math.min(Math.max(displayPercentage, 0), 100);

  // ── Format helpers ────────────────────────────────────────────────────────
  const formatTime = (val) => {
    if (!val) return '';
    try {
      const [h, m] = val.split(':').map(Number);
      const ampm   = h >= 12 ? 'PM' : 'AM';
      const hour   = h % 12 || 12;
      return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
    } catch {
      return val;
    }
  };

  const formatDate = (val) => {
    if (!val) return '';
    try {
      return new Date(val).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return val;
    }
  };

  const hasEventTime = date && startTime && endTime;

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
          {/* Date and Time row placed ABOVE the progress bar */}
          {hasEventTime && (
            <div style={{ marginBottom: '8px', display: 'flex' }}>
              <span className={styles.raisedAmt} style={{ fontSize: '13px' }}>
                {formatDate(date)} · {formatTime(startTime)}–{formatTime(endTime)}
              </span>
            </div>
          )}

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

          {/* Participant count row placed BELOW the progress bar and centered */}
          <div className={styles.progressBottom} style={{ marginTop: '8px', display: 'flex', justifyContent: 'center' }}>
            {hasEventTime ? (
              <span className={styles.goalAmt} style={{ textAlign: 'center' }}>
                {volunteerCount !== undefined ? `${volunteerCount} Participant${volunteerCount !== 1 ? 's' : ''}` : ''}
              </span>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                {raised !== undefined && <span className={styles.raisedAmt}>Raised: {raised}</span>}
                {goal   !== undefined && <span className={styles.goalAmt}>Goal: {goal}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Join Now / Hollow Blue Outlined Joined button */}
        <button
          className={`${styles.cardBtn} ${isJoined ? styles.cardBtnJoined : ''}`}
          style={isJoined ? {
            backgroundColor: 'transparent',
            color: '#2980b9',
            border: '2px solid #2980b9',
            boxShadow: 'none'
          } : {}}
        >
          {isJoined ? 'Joined' : 'Join Now'}
        </button>
      </div>
    </div>
  );
};

export default Card;