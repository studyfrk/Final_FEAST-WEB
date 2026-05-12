import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./accordion.module.css";

const AccordionItem = ({ id, title, content }) => {
  return (
    <div className={styles.accordionItem}>
      <input className={styles.accordionInput} type="checkbox" id={id} />
      <label htmlFor={id} className={styles.accordionHeader}>
        <span className={styles.accordionTitle}>{title}</span>
        <div className={styles.accordionIcon}>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            height="16"
            width="16"
            xmlns="http://www.w3.org/2000/svg"
            className={styles.accordionSvg}
          >
            <path
              d="M4.293 5.293a1 1 0 0 1 1.414 0L8 7.586l2.293-2.293a1 1 0 0 1 1.414 1.414l-3 3a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 0-1.414z"
              fill="currentColor"
            />
          </svg>
        </div>
      </label>
      <div className={styles.content}>
        <p>{content}</p>
      </div>
    </div>
  );
};

const Accordion = ({ data }) => {
  return (
    <div className={styles.accordion}>
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
