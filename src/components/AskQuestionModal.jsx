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

  // Updates state as user types
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // This object structure follows your Firestore screenshot exactly
      const docData = {
        title: formData.topic, // Maps Topic to 'title'
        description: formData.question, // Maps Question to 'description'
        name: formData.name, // Records the user's name
        status: "pending", // Matches 'status' from your image
        submittedAt: serverTimestamp(), // Matches 'submittedAt' from your image
      };

      // Add the document to the 'user_questions' collection
      await addDoc(collection(db, "user_questions"), docData);

      alert("Your question has been submitted!");
      onClose(); // Close the modal on success
    } catch (error) {
      console.error("Error submitting to Firestore: ", error);
      alert("Error: Could not save to database. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.questionModalOverlay} onClick={onClose}>
      <div
        className={styles.questionFormContainer}
        onClick={(e) => e.stopPropagation()}
      >
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.heading}>
            Ask A Question
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
            >
              <span className={styles.x}></span>
              <span className={styles.y}></span>
              <div className={styles.close}>Close</div>
            </button>
          </div>

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
      </div>
    </div>
  );
};

export default AskQuestionModal;
