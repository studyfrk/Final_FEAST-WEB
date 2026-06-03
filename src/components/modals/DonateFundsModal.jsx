import React, { useState } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import AnimatedModal from '../AnimatedModal';
import TermsConditionsModal from '../TermsConditionsModal';
import styles from '../requests_and_events.module.css';

const DonateFundsModal = ({ isOpen, onClose, selectedRequest, showAlert }) => {
  const [donationAmount, setDonationAmount] = useState('');
  const [isAnonymousFund, setIsAnonymousFund] = useState(false);
  const [isSendingDonation, setIsSendingDonation] = useState(false);
  const [showThankYouMessage, setShowThankYouMessage] = useState(false);
  
  // Disclaimer step states
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isDisclaimerChecked, setIsDisclaimerChecked] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  if (!isOpen || !selectedRequest) return null;

  const handleInitialSubmit = (e) => {
    e.preventDefault();
    if (!donationAmount || Number(donationAmount) <= 0) {
      showAlert("Please enter a valid donation amount.");
      return;
    }
    setIsDisclaimerChecked(false);
    setShowDisclaimer(true);
  };

  const handleConfirmDonation = async () => {
    if (!isDisclaimerChecked) return;

    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === selectedRequest.authorId) {
      showAlert("You cannot donate to your own aid request.");
      setShowDisclaimer(false);
      return;
    }

    setIsSendingDonation(true);
    try {
      const generatedRefNo = `BRGY-${Math.floor(100000 + Math.random() * 900000)}`;

      // Look up the actual profile name from the users collection
      let trueName = currentUser?.displayName || '';
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (userData.firstName && userData.lastName) {
              trueName = `${userData.firstName} ${userData.lastName}`;
            } else {
              trueName = userData.fullName || userData.name || userData.username || trueName;
            }
          }
        } catch (err) {
          console.error("Error looking up profile name:", err);
        }
      }
      
      // Fallback if no profile name is configured
      if (!trueName.trim()) {
        trueName = currentUser?.email ? currentUser.email.split('@')[0] : 'Donor';
      }

      await addDoc(collection(db, 'donation_funds'), {
        donorName: trueName, 
        realDonorName: trueName,
        userId: currentUser?.uid || null,
        amount: Number(donationAmount) || 0,
        referenceNumber: generatedRefNo,
        targetRequestId: selectedRequest.id || "Unknown ID",
        targetRequestTitle: selectedRequest.title || selectedRequest.name || "General Fundraiser Cause",
        targetAuthorId: selectedRequest.authorId || null, 
        status: 'Unread',
        receiptUrls: [],
        isAnonymous: isAnonymousFund,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setShowDisclaimer(false);
      setShowThankYouMessage(true);
    } catch (error) {
      console.error("Error creating donation entry: ", error);
      await showAlert("Failed to record donation request. Please verify your connection.");
    } finally {
      setIsSendingDonation(false);
    }
  };

  const handleClose = () => {
    setDonationAmount('');
    setIsAnonymousFund(false);
    setShowThankYouMessage(false);
    setShowDisclaimer(false);
    onClose();
  };

  return (
    <>
      {!showDisclaimer ? (
        <AnimatedModal onClose={handleClose}>
          <div className={styles.modalHeader}>
            <h3>Donate to {selectedRequest.title}</h3>
            <button className={styles.closeBtn} onClick={handleClose}>×</button>
          </div>

          <div className={styles.modalBody}>
            {!showThankYouMessage ? (
              <form onSubmit={handleInitialSubmit} className={styles.modalFormLayout}>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Donation Amount (₱)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Enter donation amount"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                  />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '16px' }}>
                  <input
                    type="checkbox"
                    checked={isAnonymousFund}
                    onChange={(e) => setIsAnonymousFund(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#f59e0b', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.95rem', color: '#334155' }}>Make my donation anonymous to the beneficiary</span>
                </label>

                <button type="submit" className={styles.submitBtn}>
                  Continue to Disclaimer
                </button>
              </form>
            ) : (
              <div className={styles.donationSuccessContainer}>
                <div className={styles.donationSuccessIcon}>🎉</div>
                <h4 className={styles.donationSuccessTitle}>Thank you for your kind fund donation!</h4>
                <p className={styles.donationSuccessText}>
                  You can now go to the Barangay Office of Almanza Dos to donate your funds.
                  Look for and coordinate with the barangay's treasurer, secretary, chariman,
                  or any other elected official regarding the donation.
                  Thank you, and have a great day, citizen!
                </p>
                <button type="button" className={styles.submitBtn} onClick={handleClose}>
                  Close
                </button>
              </div>
            )}
          </div>
        </AnimatedModal>
      ) : (
        <AnimatedModal onClose={() => setShowDisclaimer(false)} maxWidth={520}>
          <div className={styles.disclaimerModalHeader}>
            <h3 className={styles.disclaimerTitle}>Disclaimer</h3>
            <button className={styles.disclaimerCloseBtn} onClick={() => setShowDisclaimer(false)}>✕</button>
          </div>

          <div className={styles.disclaimerBody}>
            <h4 className={styles.disclaimerHeading}>Anti-Fraud & Privacy Notice</h4>
            <p className={styles.disclaimerText}>
              FEAST ensures all charity requests are meticulously verified. However, donating items or funds is at your own discretion.
            </p>

            <p className={styles.disclaimerText} style={{ fontWeight: 'bold', marginTop: '12px', color: '#0f172a' }}>
              NOTE: Please be advised that all transactions must be carried out directly at the Barangay Office to guarantee authenticity and prevent fraudulent activity.
            </p>
            
            <div style={{ marginTop: '24px', textAlign: 'left', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', margin: 0 }}>
                <input 
                  type="checkbox" 
                  checked={isDisclaimerChecked}
                  onChange={(e) => setIsDisclaimerChecked(e.target.checked)}
                  style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: '#f59e0b', cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ fontSize: '0.95rem', color: '#334155', lineHeight: '1.5' }}>
                  By proceeding, you acknowledge that your donation is voluntary and agree to our{' '}
                  <button 
                    type="button" 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      setShowTermsModal(true); 
                    }}
                    style={{ 
                      color: '#f59e0b', 
                      fontWeight: '600', 
                      textDecoration: 'underline', 
                      background: 'none', 
                      border: 'none', 
                      padding: 0, 
                      font: 'inherit', 
                      cursor: 'pointer' 
                    }}
                  >
                    Terms of Service
                  </button>. Do not share sensitive financial information outside our platform.
                </span>
              </label>
            </div>
          </div>

          <div className={styles.disclaimerFooter}>
            <button type="button" className={styles.disclaimerDeclineBtn} onClick={() => setShowDisclaimer(false)}>
              Cancel
            </button>
            <button 
              type="button" 
              className={styles.disclaimerAcceptBtn} 
              onClick={handleConfirmDonation}
              disabled={!isDisclaimerChecked || isSendingDonation}
              style={{ 
                opacity: isDisclaimerChecked ? 1 : 0.5, 
                cursor: isDisclaimerChecked ? 'pointer' : 'not-allowed' 
              }}
            >
              {isSendingDonation ? 'Processing...' : 'Continue'}
            </button>
          </div>
        </AnimatedModal>
      )}

      {showTermsModal && (
        <TermsConditionsModal onClose={() => setShowTermsModal(false)} />
      )}
    </>
  );
};

export default DonateFundsModal;
