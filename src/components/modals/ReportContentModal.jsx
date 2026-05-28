import React, { useState } from 'react';
import { db, storage, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AnimatedModal from '../AnimatedModal';
import styles from '../requests_and_events.module.css';
import alertIcon from '../../assets/alert.png';

const ReportContentModal = ({ isOpen, onClose, item, itemType, showAlert }) => {
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportProof, setReportProof] = useState(null);
  const [reportProofError, setReportProofError] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  if (!isOpen || !item) return null;

  const handleReportSubmit = async () => {
    if (!auth.currentUser) {
      await showAlert("You must be logged in to submit a report.");
      return;
    }
    if (!reportReason) {
      await showAlert("Please select a reason for reporting.");
      return;
    }
    if (!reportProof) {
      setReportProofError(true);
      return;
    }

    setIsSubmittingReport(true);
    try {
      const storageRef = ref(storage, `reports_proof/${Date.now()}_${reportProof.name}`);
      await uploadBytes(storageRef, reportProof);
      const proofImageUrl = await getDownloadURL(storageRef);

      const titleField = item.title || item.name || 'Untitled Post';
      const authorId = itemType === 'Aid Request' ? (item.authorId || item.userId || '') : (item.organizerId || item.userId || '');
      const authorName = itemType === 'Aid Request' ? (item.authorName || item.userName || 'Unknown User') : (item.organizerName || item.userName || 'Unknown User');
      const authorEmail = itemType === 'Aid Request' ? (item.authorEmail || item.email || 'N/A') : (item.organizerEmail || item.email || 'N/A');

      const reportData = {
        reportedItemId: item.id || '',
        reportedType: itemType,
        reportedContent: titleField,
        title: titleField,
        reportedUserId: authorId,
        reportedUserName: authorName,
        reportedUserEmail: authorEmail,
        reporterId: auth.currentUser.uid,
        reporterEmail: auth.currentUser.email || '',
        reporterName: auth.currentUser.displayName || auth.currentUser.email || 'Anonymous User',
        reporter: auth.currentUser.displayName || auth.currentUser.email || 'Anonymous User',
        reason: reportReason,
        description: reportDescription,
        proofImageUrl: proofImageUrl,
        status: 'Pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "reports"), reportData);

      onClose();
      await showAlert("Thank you. The content has been reported and will be reviewed by administration.");
    } catch (error) {
      console.error("Error submitting report: ", error);
      await showAlert("Failed to submit report. Please try again.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <AnimatedModal onClose={onClose} maxWidth={450}>
      <div className={styles.modalHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={alertIcon} alt="Report Content" style={{ width: '35px', height: '35px' }} />
          <h3>Report Misconduct</h3>
        </div>
        <button className={styles.closeBtn} onClick={onClose} disabled={isSubmittingReport}>×</button>
      </div>
      <div className={styles.modalBody}>
        <div className={styles.formGroup}>
          <label>
            Reason for Report <span style={{ color: '#dc3545' }}>*</span>
          </label>
          <select 
            value={reportReason} 
            onChange={(e) => setReportReason(e.target.value)}
            className={styles.modalInput}
            disabled={isSubmittingReport}
          >
            <option value="">Select a reason...</option>
            <option value="Fraudulent Activity">Fraudulent Activity</option>
            <option value="Inappropriate Content">Inappropriate Content</option>
            <option value="Harassment or Abuse">Harassment or Abuse</option>
            <option value="Misleading Information">Misleading Information</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Description</label>
          <textarea
            value={reportDescription}
            onChange={(e) => setReportDescription(e.target.value)}
            className={styles.modalTextarea}
            placeholder="Please provide additional details..."
            rows="4"
            disabled={isSubmittingReport}
          />
        </div>

        <div className={styles.formGroup}>
          <label>
            Proof (Screenshot) <span style={{ color: '#dc3545' }}>*</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files[0]) {
                setReportProof(e.target.files[0]);
                setReportProofError(false);
              }
            }}
            style={{ display: 'none' }}
            id="report-proof-upload"
            disabled={isSubmittingReport}
          />
          <label 
            htmlFor="report-proof-upload" 
            className={styles.uploadBtn}
            style={{ 
              border: reportProofError ? '1px solid #dc3545' : '1px solid #ccc',
              opacity: isSubmittingReport ? 0.6 : 1,
              pointerEvents: isSubmittingReport ? 'none' : 'auto'
            }}
          >
            {reportProofError ? 'Please attach a screenshot' : 'Upload Image Proof'}
          </label>
          
          {reportProof && (
            <div style={{ marginTop: '12px', position: 'relative', display: 'inline-block' }}>
              <img 
                src={URL.createObjectURL(reportProof)} 
                alt="Proof Preview" 
                style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #eee' }} 
              />
              <button
                type="button"
                onClick={() => setReportProof(null)}
                style={{
                  position: 'absolute', top: '-8px', right: '-8px', background: '#ff3b30', color: 'white',
                  border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', zIndex: 1
                }}
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button 
          className={styles.cancelBtn} 
          onClick={onClose}
          disabled={isSubmittingReport}
        >
          Cancel
        </button>
        <button 
          className={styles.submitBtn} 
          onClick={handleReportSubmit} 
          disabled={isSubmittingReport}
          style={{ 
            backgroundColor: '#dc3545', 
            opacity: isSubmittingReport ? 0.6 : 1 
          }}
        >
          {isSubmittingReport ? 'Sending...' : 'Submit Report'}
        </button>
      </div>
    </AnimatedModal>
  );
};

export default ReportContentModal;
