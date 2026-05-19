/* React & Firebase Imports */
import React, { useState, useEffect } from 'react';

/* Style Imports */
import styles from './card.module.css';

const Card = ({
  category,
  title,
  description,
  raised,
  goal,
  image,
  percentage,
  date,
  startTime,
  endTime,
  volunteerCount,
  isJoined,
}) => {
  // Live dynamic time tracking state for event progress
  const [livePercentage, setLivePercentage] = useState(0);

  // ── Duration-based live calculation ─────────────────────────────────────
  useEffect(() => {
    if (percentage !== undefined) {
      setLivePercentage(percentage);
      return;
    }
    if (!date || !startTime || !endTime) {
      const numericRaised = typeof raised === 'string' ? parseFloat(raised.replace(/[^\d.]/g, '')) : raised;
      const numericGoal   = typeof goal   === 'string' ? parseFloat(goal.replace(/[^\d.]/g, ''))   : goal;
      setLivePercentage(numericGoal > 0 ? Math.floor((numericRaised / numericGoal) * 100) : 0);
      return;
    }

    const updateProgress = () => {
      try {
        // Safe robust extraction of components to clear browser mismatch offsets
        const [year, month, day] = date.split('-').map(Number);
        const [startH, startM]   = startTime.split(':').map(Number);
        const [endH, endM]       = endTime.split(':').map(Number);

        const start = new Date(year, month - 1, day, startH, startM, 0, 0);
        const end   = new Date(year, month - 1, day, endH, endM, 0, 0);
        const now   = new Date();

        if (now <= start) {
          setLivePercentage(0);
        } else if (now >= end) {
          setLivePercentage(100);
        } else {
          const totalDuration = end.getTime() - start.getTime();
          const timeElapsed = now.getTime() - start.getTime();
          setLivePercentage(Math.floor((timeElapsed / totalDuration) * 100));
        }
      } catch (err) {
        setLivePercentage(0);
      }
    };

    // Calculate once immediately on component load
    updateProgress();

    // Re-verify and update every single second to reflect progress cleanly
    const intervalId = setInterval(updateProgress, 1000);
    return () => clearInterval(intervalId);
  }, [percentage, date, startTime, endTime, raised, goal]);

  // Clamp percentage output value bound securely between 0 and 100 for safety width layout engine
  const barWidth = Math.min(Math.max(livePercentage, 0), 100);

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
            <span className={styles.progressValue}>{livePercentage}%</span>
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

        {/* Join Now / Leave / Joined button matching design standard requirements */}
        <button
          className={`${styles.cardBtn} ${isJoined ? styles.cardBtnJoined : ''}`}
          style={isJoined ? {
            backgroundColor: 'transparent',
            color: '#d9534f',
            border: '2px solid #d9534f',
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