import React from 'react';
import './card.css';

const Card = ({ category, title, description, raised, goal, percentage, image }) => {
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
            <span className="progress-label">Donated</span>
            <span className="progress-value">{percentage}%</span>
          </div>
          <div className="progress-bar-bg">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <div className="progress-bottom">
            <span className="raised-amt">Raised: ${raised}</span>
            <span className="goal-amt">Goal: ${goal}</span>
          </div>
        </div>
        
        <button className="card-btn">Donate Now</button>
      </div>
    </div>
  );
};

export default Card;