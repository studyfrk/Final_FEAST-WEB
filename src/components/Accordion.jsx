import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Accordion.css";

const AccordionItem = ({ id, title, content }) => {
  return (
    <div className="accordion-item">
      <input type="checkbox" id={id} />
      <label htmlFor={id} className="accordion-header">
        <span className="accordion-title">{title}</span>
        <div className="accordion-icon">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            height="16"
            width="16"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.293 5.293a1 1 0 0 1 1.414 0L8 7.586l2.293-2.293a1 1 0 0 1 1.414 1.414l-3 3a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 0-1.414z"
              fill="currentColor"
            />
          </svg>
        </div>
      </label>
      <div className="content">
        <p>{content}</p>
      </div>
    </div>
  );
};

const Accordion = ({ data }) => {
  return (
    <div className="accordion">
      {data.map((item, index) => (
        <AccordionItem 
          key={index} 
          id={`section-${index}`} 
          title={item.title} 
          content={item.content} 
        />
      ))}
    </div>
  );
};

export default Accordion;
