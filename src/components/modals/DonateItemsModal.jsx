import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import AnimatedModal from '../AnimatedModal';
import TermsConditionsModal from '../TermsConditionsModal';
import styles from '../requests_and_events.module.css';

const DonateItemsModal = ({ isOpen, onClose, selectedRequest, showAlert }) => {
  const [inKindItems, setInKindItems] = useState([{ item: '', qtyVal: '', unit: 'pcs', customUnit: '' }]);
  const [isAnonymousItem, setIsAnonymousItem] = useState(false);
  const [isSendingDonation, setIsSendingDonation] = useState(false);
  const [showThankYouMessage, setShowThankYouMessage] = useState(false);

  // Disclaimer step states
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isDisclaimerChecked, setIsDisclaimerChecked] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (selectedRequest?.acceptedItems && selectedRequest.acceptedItems.length > 0) {
        setInKindItems(
          selectedRequest.acceptedItems.map(item => ({
            item: item,
            qtyVal: '',
            unit: 'pcs',
            customUnit: ''
          }))
        );
      } else {
        setInKindItems([{ item: '', qtyVal: '', unit: 'pcs', customUnit: '' }]);
      }
    }
  }, [isOpen, selectedRequest]);

  if (!isOpen || !selectedRequest) return null;

  const handleInKindChange = (index, field, value) => {
    const updatedItems = [...inKindItems];
    updatedItems[index][field] = value;
    setInKindItems(updatedItems);
  };

  const addInKindRow = () => {
    setInKindItems([...inKindItems, { item: '', qtyVal: '', unit: 'pcs', customUnit: '' }]);
  };

  const removeInKindRow = (index) => {
    if (inKindItems.length > 1) {
      setInKindItems(inKindItems.filter((_, i) => i !== index));
    }
  };

  const handleInitialSubmit = (e) => {
    e.preventDefault();
    const hasValidItems = inKindItems.some(row => row.item.trim() && row.qtyVal.trim());
    if (!hasValidItems) {
      showAlert("Please specify at least one item and quantity.");
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

      if (!trueName.trim()) {
        trueName = currentUser?.email ? currentUser.email.split('@')[0] : 'Donor';
      }

      const formattedItems = inKindItems
        .filter(row => row.item.trim() && row.qtyVal.trim())
        .map(row => {
          const finalUnit = row.unit === 'other'
            ? row.customUnit.trim().toLowerCase()
            : row.unit;
          const u = finalUnit || 'pcs';
          return {
            item: row.item.trim(),
            quantity: `${row.qtyVal.trim()} ${u}`
          };
        });

      await addDoc(collection(db, 'donation_items'), {
        donorName: trueName,
        realDonorName: trueName,
        userId: currentUser?.uid || null,
        items: formattedItems,
        referenceNumber: generatedRefNo, 
        targetRequestId: selectedRequest.id,
        targetRequestTitle: selectedRequest.title || selectedRequest.name || "General In-Kind Cause",
        targetAuthorId: selectedRequest.authorId || null,
        status: 'Unread',
        isAnonymous: isAnonymousItem,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setShowDisclaimer(false);
      setShowThankYouMessage(true);
      setInKindItems([{ item: '', qtyVal: '', unit: 'pcs', customUnit: '' }]);
    } catch (err) {
      console.error("Firestore Error:", err);
      showAlert("Error sending donation: " + err.message);
    } finally {
      setIsSendingDonation(false);
    }
  };

  const handleClose = () => {
    setInKindItems([{ item: '', qtyVal: '', unit: 'pcs', customUnit: '' }]);
    setIsAnonymousItem(false);
    setShowThankYouMessage(false);
    setShowDisclaimer(false);
    onClose();
  };

  return (
    <>
      {!showDisclaimer ? (
        <AnimatedModal onClose={handleClose}>
          <div className={styles.modalHeader}>
            <h3>Donate Items to {selectedRequest.title}</h3>
            <button className={styles.closeBtn} onClick={handleClose}>×</button>
          </div>

          <div className={styles.modalBody}>
            <form className={styles.modalFormLayout} onSubmit={handleInitialSubmit}>
              {!showThankYouMessage ? (
                <>
                  {inKindItems.map((row, index) => (
                    <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginBottom: '12px' }}>
                      <div className={styles.dynamicRow} style={{ marginBottom: 0 }}>
                        <div className={`${styles.itemFieldContainer}`} style={{ flex: '2.5', minWidth: 0 }}>
                          <label className={styles.itemLabel}>Item Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Rice"
                            value={row.item}
                            onChange={(e) => handleInKindChange(index, 'item', e.target.value)}
                            maxLength="30"
                          />
                        </div>
                        
                        <div className={`${styles.itemFieldContainer}`} style={{ flex: '1', minWidth: 0 }}>
                          <label className={styles.itemLabel}>Qty</label>
                          <input
                            type="number"
                            required
                            min="1"
                            placeholder="5"
                            value={row.qtyVal}
                            onChange={(e) => handleInKindChange(index, 'qtyVal', e.target.value)}
                            onKeyPress={(e) => {
                              if (!/[0-9]/.test(e.key)) {
                                e.preventDefault();
                              }
                            }}
                          />
                        </div>

                        <div className={`${styles.itemFieldContainer}`} style={{ flex: '1.5', minWidth: 0 }}>
                          <label className={styles.itemLabel}>Unit</label>
                          <select
                            value={row.unit}
                            onChange={(e) => handleInKindChange(index, 'unit', e.target.value)}
                            style={{
                              width: '100%',
                              border: 'none',
                              background: 'transparent',
                              outline: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-primary)',
                              fontFamily: 'var(--font)',
                              fontSize: '14.5px',
                              boxSizing: 'border-box'
                            }}
                          >
                            <option value="pcs">pcs (Pieces)</option>
                            <option value="packs">packs</option>
                            <option value="cans">cans</option>
                            <option value="sacks">sacks</option>
                            <option value="boxes">boxes</option>
                            <option value="kg">kg</option>
                            <option value="L">L</option>
                            <option value="bottles">bottles</option>
                            <option value="kits">kits</option>
                            <option value="other">other...</option>
                          </select>
                        </div>
                        
                        {inKindItems.length > 1 && (
                          <button
                            type="button"
                            className={styles.rowRemoveBtn}
                            onClick={() => removeInKindRow(index)}
                          >×</button>
                        )}
                      </div>
                      
                      {row.unit === 'other' && (
                        <div className={styles.itemFieldContainer} style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                          <input
                            type="text"
                            required
                            placeholder="Specify custom unit (e.g. bundles)"
                            value={row.customUnit}
                            onChange={(e) => handleInKindChange(index, 'customUnit', e.target.value)}
                            maxLength="20"
                            style={{ width: '100%' }}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  <button type="button" className={styles.addItemBtn} onClick={addInKindRow}>
                    + Add Item
                  </button>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '12px', marginBottom: '16px' }}>
                    <input
                      type="checkbox"
                      checked={isAnonymousItem}
                      onChange={(e) => setIsAnonymousItem(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#f59e0b', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.95rem', color: '#334155' }}>Make my donation anonymous to the beneficiary</span>
                  </label>

                  <button type="submit" className={styles.submitBtn}>
                    Continue to Disclaimer
                  </button>
                </>
              ) : (
                <div className={styles.donationSuccessContainer}>
                  <div className={styles.donationSuccessIcon}>🎉</div>
                  <h4 className={styles.donationSuccessTitle}>Thank you for your kind item donation!</h4>
                  <p className={styles.donationSuccessText}>
                    Please coordinate with the Almanza Dos Barangay Office to drop off your items.
                    Look for and talk to the barangay's treasurer, secretary, chariman,
                    or any other elected official regarding the donation.
                    Thank you, and have a great day, citizen!
                  </p>
                  <button
                    type="button"
                    className={styles.submitBtn}
                    onClick={handleClose}
                  >
                    Close
                  </button>
                </div>
              )}
            </form>
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

export default DonateItemsModal;
