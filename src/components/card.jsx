import React from 'react';
import './card.css';

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
    <div className="card-container">
      <div className="card-image-area">
        {image ? (
          <img src={image} alt={title} className="card-img" />
        ) : (
          <div className="card-img-placeholder"></div>
        )}
      </div>
      
      <div className="card-body">
        <span className="card-category">{category || "Category"}</span>
        <h3 className="card-title">{title || "Cause Title"}</h3>
        <p className="card-description">{description}</p>
        
        <div className="card-progress-section">
          <div className="progress-top">
            <span className="progress-label">Progress</span>
            <span className="progress-value">{displayPercentage}%</span>
          </div>
          <div className="progress-bar-bg">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${barWidth}%` }}
            ></div>
          </div>
          <div className="progress-bottom">
            <span className="raised-amt">Raised: {raised}</span>
            <span className="goal-amt">Goal: {goal}</span>
          </div>
        </div>
        
        <button className="card-btn">Donate Now</button>
      </div>
    </div>
  );
};

export default Card;