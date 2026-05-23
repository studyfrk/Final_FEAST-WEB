/* React & Firebase Imports */
import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/* Style Imports */
import styles from "./ask_question_modal.module.css";

const AskQuestionModal = ({ onClose }) => {
  // State to capture form inputs
  const [formData, setFormData] = useState({
    name: "",
    topic: "",
    question: "",
  });

  // Loading state to prevent double-submissions
  const [loading, setLoading] = useState(false);
  
  // State to trigger closing animations
  const [isExiting, setIsExiting] = useState(false);

  // State to track successful submission
  const [isSubmitted, setIsSubmitted] = useState(false);

  // State to track submission errors dynamically
  const [errorMessage, setErrorMessage] = useState("");

  // Updates state as user types
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  // Triggers exit animation before calling the unmount prop
  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 400); // 400ms matches the slideOutContainer duration
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(""); // Clear previous errors if any

    try {
      const docData = {
        title: formData.topic,
        description: formData.question,
        name: formData.name,
        status: "pending",
        submittedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "user_questions"), docData);
      
      // Smoothly transition to the custom success view
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting to Firestore: ", error);
      setErrorMessage("Could not save to the database. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className={`${styles.questionModalOverlay} ${isExiting ? styles.questionModalOverlayExiting : ""}`} 
      onClick={handleClose}
    >
      <div
        className={`${styles.questionFormContainer} ${isExiting ? styles.questionFormContainerExiting : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Conditional Rendering: Show Confirmation Screen or the Form */}
        {isSubmitted ? (
          <div className={styles.confirmationContainer}>
            <div className={styles.heading}>
              Thank You!
            </div>
            <p style={{ color: "#b9bbbe", margin: "10px 0 30px 0", lineHeight: "1.5" }}>
              Your question regarding <strong>{formData.topic}</strong> has been successfully submitted. We will review it shortly.
            </p>
            <div className={styles.buttonContainer}>
              <button
                className={styles.sendButton}
                type="button"
                onClick={handleClose}
              >
                Confirm
              </button>
            </div>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.heading}>
              Ask A Question
              <button
                type="button"
                className={styles.closeButton}
                onClick={handleClose}
              >
                <span className={styles.x}></span>
                <span className={styles.y}></span>
                <div className={styles.close}>Close</div>
              </button>
            </div>

            {/* Error Message display block if database connection fails */}
            {errorMessage && (
              <div style={{ color: "#ff4d4d", marginBottom: "15px", fontWeight: "bold" }}>
                {errorMessage}
              </div>
            )}

            <input
              placeholder="Name"
              id="name"
              type="text"
              className={styles.input}
              value={formData.name}
              onChange={handleChange}
              required
            />

            <input
              placeholder="Topic"
              id="topic"
              type="text"
              className={styles.input}
              value={formData.topic}
              onChange={handleChange}
              required
            />

            <textarea
              placeholder="Type Question Here..."
              rows="10"
              cols="30"
              id="question"
              name="question"
              className={styles.textarea}
              value={formData.question}
              onChange={handleChange}
              required
            />

            <div className={styles.buttonContainer}>
              <button
                className={styles.sendButton}
                type="submit"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AskQuestionModal;
