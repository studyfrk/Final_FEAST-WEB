/* React & Firebase Imports */
import React, { useState } from "react";
import { auth, db } from "../firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";

/* Style Imports */
import styles from "./ask_question_modal.module.css";

const AskQuestionModal = ({ onClose }) => {
  const [formData, setFormData] = useState({
    topic: "",
    question: "",
  });

  const [loading, setLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 400); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(""); 

    const currentUser = auth.currentUser;

    try {
      let finalName = currentUser?.displayName;

      if (currentUser && !finalName) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.firstName && userData.lastName) {
            finalName = `${userData.firstName} ${userData.lastName}`;
          } else if (userData.displayName) {
            finalName = userData.displayName;
          }
        }
      }

      const docData = {
        title: formData.topic,
        description: formData.question,
        userName: finalName || "Guest",
        userId: currentUser ? currentUser.uid : null,
        status: "pending",
        submittedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "user_questions"), docData);
      
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

            {errorMessage && (
              <div style={{ color: "#ff4d4d", marginBottom: "15px", fontWeight: "bold" }}>
                {errorMessage}
              </div>
            )}

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