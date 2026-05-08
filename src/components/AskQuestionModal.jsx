import React from 'react';
import { useNavigate } from "react-router-dom";
import "./AskQuestionModal.css";

const AskQuestionModal = ({ onClose }) => {
    return (
        <div className="question-modal-overlay" onClick={onClose}>
            <div className="question-form-container" onClick={(e) => e.stopPropagation()}>
                <form className="form">
                    <div className="heading">
                        Ask A Question
                        <button className="close-button" onClick={onClose}>
                            <span className="x"></span>
                            <span className="y"></span>
                            <div className="close">Close</div>
                        </button>
                    </div>
                    <input placeholder="Name" id="name" type="text" className="input" required />
                    <input placeholder="Topic" id="topic" type="text" className="input" required />
                    <textarea placeholder="Type Question Here..." rows="10" cols="30" id="question" name="question" className="textarea" required />
                    <div className="button-container">
                        <button className="send-button" type="submit">Send</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AskQuestionModal;
