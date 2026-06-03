/* React & Firebase Imports */
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; 
import { collection, onSnapshot, addDoc, doc, updateDoc, query, orderBy, serverTimestamp, increment } from 'firebase/firestore';

/* Style Imports */
import styles from '../components/admin_pages.module.css';

const DonationFunds = () => {
  const [donations, setDonations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [alertMessage, setAlertMessage] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); 
  const [rejectionReason, setRejectionReason] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    const q = query(collection(db, "donation_funds"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDonations(data);
    });
    return () => unsub();
  }, []);

  const handleSelectDonation = async (donation) => {
    setSelectedDonation(donation);
    setCurrentImgIndex(0);
    if (donation.status?.toLowerCase() === 'unread') {
      try {
        await updateDoc(doc(db, "donation_funds", donation.id), { status: 'Processing' });
      } catch (err) { 
        console.error("Error setting status to Processing: ", err); 
      }
    }
  };

  const updateStatus = async (donation, newStatus, reason = '') => {
    try {
      const adminUser = auth.currentUser;

      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      if (newStatus === 'Invalid' && reason) {
        updateData.rejectionReason = reason;
      }

      await updateDoc(doc(db, "donation_funds", donation.id), updateData);

      if (newStatus === 'Valid' && donation.status !== 'Valid' && donation.targetRequestId) {
        const targetRequestRef = doc(db, "aid_requests", donation.targetRequestId);
        await updateDoc(targetRequestRef, {
          raised: increment(Number(donation.amount || 0)),
          updatedAt: serverTimestamp()
        });
      }

      await addDoc(collection(db, "audit_logs"), {
        adminName: adminUser?.displayName || adminUser?.email || "Admin",
        role: "Administrator",
        actionType: "Fund Audit Verification",
        actionDetails: `Changed donation verification status to ${newStatus}${reason ? `. Reason: ${reason}` : ''}`,
        targetName: `Ref: ${donation.referenceNumber || 'N/A'}`,
        eventLifecycle: donation.amount ? `₱${donation.amount}` : "N/A",
        status: "Success",
        timestamp: serverTimestamp(),
        type: "auth"
      });

      // 1. Notify the Donor
      const recipientId = donation.userId || donation.authorId;
      if (recipientId) {
        const notifRef = collection(db, `users/${recipientId}/notifications`);
        const isValidated = newStatus === 'Valid';
        
        await addDoc(notifRef, {
          title: isValidated ? "Donation Verified" : "Donation Verification Rejected",
          body: isValidated
            ? `Your financial contribution donation of ₱${Number(donation.amount).toLocaleString()} has been verified. Thank you!`
            : `We couldn't verify the transaction details for your payment referencing: ${donation.referenceNumber || 'N/A'}.${reason ? ` Reason: ${reason}` : ''}`,
          type: "Request",
          status: isValidated ? "success" : "error",
          read: false,
          createdAt: serverTimestamp(),
          requestId: donation.id
        });
      }

      // 2. Notify the Beneficiary to Claim (Only if Validated)
      if (newStatus === 'Valid' && donation.targetAuthorId) {
        const beneficiaryNotifRef = collection(db, `users/${donation.targetAuthorId}/notifications`);
        
        const donorDisplay = donation.isAnonymous 
          ? "An anonymous donor" 
          : (donation.realDonorName || donation.donorName || "A generous donor");

        await addDoc(beneficiaryNotifRef, {
          title: "Donation Ready to Claim",
          body: `${donorDisplay} has successfully donated ₱${Number(donation.amount || 0).toLocaleString()} for your request "${donation.targetRequestTitle || 'Fundraiser'}". It has been verified and is ready to be claimed at the Barangay Office!`,
          type: "claim", 
          status: "success",
          read: false,
          createdAt: serverTimestamp(),
          requestId: donation.id,
          donationId: donation.id,
          donationType: 'fund',
          donorUserId: donation.userId || donation.authorId || null,
          requestTitle: donation.targetRequestTitle || null,
        });
      }

      setSelectedDonation(null);
    } catch (err) { 
      console.error("Error updating status:", err); 
      setAlertMessage("Error processing verification check: " + err.message);
    }
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    if (!selectedDonation.receiptUrls?.length) return;
    setCurrentImgIndex((prev) => (prev + 1) % selectedDonation.receiptUrls.length);
  };

  const handlePrevImage = (e) => {
    e.stopPropagation();
    if (!selectedDonation.receiptUrls?.length) return;
    setCurrentImgIndex((prev) => (prev - 1 + selectedDonation.receiptUrls.length) % selectedDonation.receiptUrls.length);
  };

  const filteredData = donations.filter(don => {
    const matchesSearch = (don.donorName || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (don.realDonorName || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (don.referenceNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (don.targetRequestTitle || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' || don.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className={styles.fundsPage}>
      <div>
        <h2 className={styles.contentHeaderTitle}>Fundraising Logs</h2>
      </div>

      <div className={styles.tableControls}>
        <div className={styles.controlsLeft}>
          <select className={styles.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All Verification Statuses</option>
            <option value="Unread">Unread</option>
            <option value="Processing">Processing</option>
            <option value="Valid">Valid</option>
            <option value="Invalid">Invalid</option>
            <option value="Claimed">Claimed</option>
          </select>

          <div className={styles.searchContainer}>
            <input className={styles.searchContainerInput} type="text" placeholder="Search by donor name, ref number, fundraiser..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.requestTable}>
          <thead>
            <tr>
              <th className={styles.headerCell}>DONOR NAME</th>
              <th className={styles.headerCell}>AMOUNT</th>
              <th className={styles.headerCell}>REFERENCE NO.</th>
              <th className={styles.headerCell}>ALLOCATED CAUSE</th>
              <th className={styles.headerCell}>TRANSACTION DATE</th>
              <th className={styles.headerCell}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((don) => (
              <tr key={don.id} className={`${styles.clickableRow} ${['unread', 'pending', 'processing'].includes((don.status || '').toLowerCase()) ? styles.unreadRow : ''}`} onClick={() => handleSelectDonation(don)}>
                <td className={`${styles.truncateCell} ${styles.tableCell}`}>
                  <span className={styles.actorName}>
                    {don.realDonorName || don.donorName || "Unknown Donor"}
                    {don.isAnonymous && <span style={{fontSize: '0.8rem', color: '#64748b'}}> (Anon)</span>}
                  </span>
                </td>
                <td className={styles.tableCell} style={{ fontWeight: 'bold', color: '#15803d' }}>₱{Number(don.amount || 0).toLocaleString()}</td>
                <td className={styles.tableCell}><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{don.referenceNumber || "N/A"}</code></td>
                <td className={`${styles.truncateCell} ${styles.tableCell}`}>{don.targetRequestTitle || "General Fund"}</td>
                <td className={styles.tableCell}>{don.date || "N/A"}</td>
                <td className={`${styles.tableCell} ${styles.statusCell}`}>
                  <span className={`${styles.statusPill} ${styles[(don.status || 'unread').toLowerCase()]}`}>
                    {don.status || "Unread"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {Math.ceil(filteredData.length / itemsPerPage) > 1 && (
          <div className={styles.paginationControls}>
            <button className={styles.pageBtn} disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>← Prev</button>
            <div className={styles.pageNumbers}>
              {Array.from({ length: Math.ceil(filteredData.length / itemsPerPage) }, (_, i) => i + 1)
                .filter(n => n === 1 || n === Math.ceil(filteredData.length / itemsPerPage) || Math.abs(n - currentPage) <= 1)
                .reduce((acc, n, idx, arr) => { if (idx > 0 && n - arr[idx-1] > 1) acc.push('...'); acc.push(n); return acc; }, [])
                .map((item, idx) => item === '...'
                  ? <span key={`e${idx}`} className={styles.pageEllipsis}>…</span>
                  : <button key={item} className={`${styles.pageNumber} ${currentPage === item ? styles.activePage : ''}`} onClick={() => setCurrentPage(item)}>{item}</button>
                )}
            </div>
            <button className={styles.pageBtn} disabled={currentPage === Math.ceil(filteredData.length / itemsPerPage)} onClick={() => setCurrentPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {/* DETAIL MODAL*/}
      {selectedDonation && (
        <div className={styles.contentModalOverlay} onClick={() => setSelectedDonation(null)}>
          <div className={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>Review Transaction Details</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedDonation(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalFormLayout}>

                {/* Donor Info Card */}
                <div className={styles.donationCard}>
                  <div className={styles.donationCardHeader}>
                    <span>💳 Transaction Info</span>
                    <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.8rem' }}>{selectedDonation.date || 'N/A'}</span>
                  </div>
                  <div className={styles.donationCardBody}>
                    <div className={styles.itemFieldContainer}>
                      <span className={styles.itemLabel}>Donor Name</span>
                      <div className={styles.modalDataField}>
                        {selectedDonation.realDonorName || selectedDonation.donorName || "Unknown"}
                        {selectedDonation.isAnonymous && (
                          <span style={{ fontSize: '0.8rem', color: '#dc2626', marginLeft: '8px', fontStyle: 'italic', fontWeight: 'bold' }}>
                            (Requested Anonymous to Beneficiary)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.itemFieldContainer}>
                        <span className={styles.itemLabel}>Amount</span>
                        <div className={styles.modalDataField} style={{ fontWeight: 800, color: '#15803d', fontSize: '1.1rem' }}>
                          ₱{Number(selectedDonation.amount || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className={styles.itemFieldContainer}>
                        <span className={styles.itemLabel}>Reference No.</span>
                        <div className={styles.modalDataField}>
                          <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.9rem', wordBreak: 'break-all' }}>
                            {selectedDonation.referenceNumber || "N/A"}
                          </code>
                        </div>
                      </div>
                    </div>
                    <div className={styles.itemFieldContainer}>
                      <span className={styles.itemLabel}>Allocated Cause</span>
                      <div className={styles.modalDataField}>{selectedDonation.targetRequestTitle || "General Fund"}</div>
                    </div>
                  </div>
                </div>

                {/* Receipt Images */}
                {selectedDonation.receiptUrls?.length > 0 && (
                  <div className={styles.donationCard}>
                    <div className={styles.donationCardHeader}>
                      <span>🧾 Payment Receipt</span>
                      {selectedDonation.receiptUrls.length > 1 && (
                        <span className={styles.receiptCount}>{currentImgIndex + 1} / {selectedDonation.receiptUrls.length}</span>
                      )}
                    </div>
                    <div className={styles.donationCardBody}>
                      <div className={styles.receiptImageContainer}>
                        <img
                          src={selectedDonation.receiptUrls[currentImgIndex]}
                          alt="Receipt"
                          className={styles.receiptImage}
                        />
                      </div>
                      {selectedDonation.receiptUrls.length > 1 && (
                        <div className={styles.receiptNavRow}>
                          <button className={styles.receiptNavBtn} onClick={handlePrevImage}>← Prev</button>
                          <span className={styles.receiptCount}>{currentImgIndex + 1} of {selectedDonation.receiptUrls.length}</span>
                          <button className={styles.receiptNavBtn} onClick={handleNextImage}>Next →</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
            
            {/* Action Buttons - Only show if not Valid/Invalid */}
            {selectedDonation.status !== 'Valid' && selectedDonation.status !== 'Invalid' && (
              <div className={styles.modalActions}>
                <button className={`${styles.actionBtn} ${styles.cancel}`} onClick={() => { setConfirmAction('Invalid'); setRejectionReason(''); }}>✗ Mark Invalid</button>
                <button className={`${styles.actionBtn} ${styles.approve}`} onClick={() => setConfirmAction('Valid')}>✓ Mark Valid</button>
              </div>
            )}
            
          </div>
        </div>
      )}

      {/* CONFIRMATION DISCLAIMER MODAL */}
      {confirmAction && (
        <div className={styles.contentModalOverlay} onClick={() => setConfirmAction(null)}>
          <div className={styles.inlineConfirmModal} style={confirmAction === 'Invalid' ? { maxWidth: '450px' } : {}} onClick={e => e.stopPropagation()}>
            <div className={styles.inlineConfirmHeader}>
              <h3 className={styles.modalHeaderTitle}>
                {confirmAction === 'Invalid' ? 'Reject Transaction' : 'Confirm Verification'}
              </h3>
              <button className={styles.closeBtn} onClick={() => setConfirmAction(null)}>×</button>
            </div>
            <div className={styles.inlineConfirmBody}>
              {confirmAction === 'Invalid' ? (
                <div className={styles.itemFieldContainer} style={{ marginBottom: '15px' }}>
                  <label className={styles.itemLabel}>Reason for Rejection</label>
                  <textarea
                    className={styles.itemFieldTextArea}
                    required
                    placeholder="Please specify why this transaction is invalid..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px', marginTop: '5px' }}
                    maxLength="200"
                  />
                </div>
              ) : (
                <p style={{ margin: '0 0 15px 0' }}>
                  Are you sure you want to mark this transaction as <strong>Valid</strong>? This will update the fundraiser total and notify both the donor and beneficiary.
                </p>
              )}
              
              <strong>Disclaimer:</strong> This is a one-time action and cannot be undone. Relevant users will be notified automatically upon confirmation.
            </div>
            <div className={styles.inlineConfirmActions}>
              <button className={`${styles.actionBtn} ${styles.cancel}`} onClick={() => setConfirmAction(null)}>
                Cancel
              </button>
              <button
                className={`${styles.actionBtn} ${styles.approve}`}
                style={confirmAction === 'Invalid' ? { backgroundColor: '#d32f2f', color: '#fff' } : {}}
                onClick={() => {
                  if (confirmAction === 'Invalid') {
                    if (!rejectionReason.trim()) {
                      setAlertMessage("Please provide a reason for rejection.");
                      return;
                    }
                    updateStatus(selectedDonation, 'Invalid', rejectionReason.trim());
                  } else {
                    updateStatus(selectedDonation, 'Valid');
                  }
                  setConfirmAction(null);
                }}
              >
                {confirmAction === 'Invalid' ? 'Confirm Reject' : 'Yes, Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standard Alert Message */}
      {alertMessage && (
        <div className={styles.contentModalOverlay} onClick={() => setAlertMessage(null)}>
          <div className={styles.inlineConfirmModal} onClick={e => e.stopPropagation()}>
            <div className={styles.inlineConfirmHeader}>
              <h3 className={styles.modalHeaderTitle}>Notice</h3>
              <button className={styles.closeBtn} onClick={() => setAlertMessage(null)}>×</button>
            </div>
            <div className={styles.inlineConfirmBody}>{alertMessage}</div>
            <div className={styles.inlineConfirmActions}>
              <button className={`${styles.actionBtn} ${styles.approve}`} onClick={() => setAlertMessage(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonationFunds;