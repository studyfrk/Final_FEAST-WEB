/* React & Firebase Imports */
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; 
import { collection, onSnapshot, addDoc, doc, updateDoc, getDoc, query, orderBy, serverTimestamp, increment } from 'firebase/firestore';

/* Style Imports */
import styles from '../components/admin_pages.module.css';

const DonationItems = () => {
  const [donations, setDonations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [alertMessage, setAlertMessage] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); 
  const [rejectionReason, setRejectionReason] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    const q = query(collection(db, "donation_items"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDonations(data);
    });
    return () => unsub();
  }, []);

  const handleSelectDonation = async (donation) => {
    setSelectedDonation(donation);
    if (
  donation.status?.toLowerCase() === 'unread' &&
  donation.status !== 'Claimed'
) {
      try {
        await updateDoc(doc(db, "donation_items", donation.id), { status: 'Processing' });
      } catch (err) { 
        console.error("Error setting status to Processing: ", err); 
      }
    }
  };

  const updateStatus = async (donation, newStatus, reason = '') => {
    try {
      if (
  donation.status === 'Claimed' ||
  donation.status === 'Valid' ||
  donation.status === 'Invalid'
) {
  setAlertMessage(
    `This donation has already been finalized as "${donation.status}" and can no longer be modified.`
  );
  return;
}
      const adminUser = auth.currentUser;

      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      if (newStatus === 'Invalid' && reason) {
        updateData.rejectionReason = reason;
      }

      await updateDoc(doc(db, "donation_items", donation.id), updateData);

      const isValidated = newStatus === 'Valid';

      if (isValidated && donation.status !== 'Valid' && donation.targetRequestId) {
        const targetRequestRef = doc(db, "aid_requests", donation.targetRequestId);
        
        await updateDoc(targetRequestRef, {
          raised: increment(donation.items?.length || 1), 
          updatedAt: serverTimestamp()
        });

        const requestSnap = await getDoc(targetRequestRef);
        if (requestSnap.exists()) {
          const requestData = requestSnap.data();
          
          const requestOwnerId = requestData.authorId || requestData.userId || requestData.requesterId; 

          if (requestOwnerId) {
            const ownerNotifRef = collection(db, `users/${requestOwnerId}/notifications`);
            
            const itemsDescription = donation.items && donation.items.length > 0
              ? donation.items.map(i => `${i.quantity}x ${i.item}`).join(', ')
              : "In-kind items";

            const donorDisplay = donation.isAnonymous 
              ? "An anonymous donor" 
              : (donation.realDonorName || donation.donorName || "A generous donor");

            await addDoc(ownerNotifRef, {
              title: "Donation Ready for Claiming!",
              body: `${donorDisplay} has sent a donation to the barangay for your request "${donation.targetRequestTitle || 'Aid Request'}". Items: ${itemsDescription}. You may now head to the barangay to claim them.`,
              type: "Claim",
              status: "success",
              read: false,
              createdAt: serverTimestamp(),
              requestId: donation.targetRequestId,
              donationId: donation.id,
              donationType: 'items',
              donorUserId: donation.userId || null,
              requestTitle: donation.targetRequestTitle || null,
              requiresClaimConfirmation: true,
            });
          } else {
            console.warn("Could not locate a valid requester account ID (authorId) on the document.");
          }
        }
      }

      await addDoc(collection(db, "audit_logs"), {
        adminName: adminUser?.displayName || adminUser?.email || "Admin",
        role: "Administrator",
        actionType: "In-Kind Verification",
        actionDetails: `Changed item donation status to ${newStatus}${reason ? `. Reason: ${reason}` : ''}`,
        targetName: `Donor: ${donation.realDonorName || donation.donorName || 'N/A'}`,
        eventLifecycle: `${donation.items?.length || 0} Items`,
        status: "Success",
        timestamp: serverTimestamp(),
        type: "auth"
      });

      const recipientId = donation.userId;
      if (recipientId) {
        const notifRef = collection(db, `users/${recipientId}/notifications`);
        
        await addDoc(notifRef, {
          title: isValidated ? "Donation Received" : "Donation Rejected",
          body: isValidated
            ? `Your donation of ${donation.items?.length} item(s) has been verified and received. Thank you!`
            : `We couldn't verify the items for your donation to ${donation.targetRequestTitle}.${reason ? ` Reason: ${reason}` : ''}`,
          type: "Request",
          status: isValidated ? "success" : "error",
          read: false,
          createdAt: serverTimestamp(),
          requestId: donation.id
        });
      }

      setSelectedDonation(null);
    } catch (err) { 
      console.error("Error updating status:", err); 
      setAlertMessage("Error: " + err.message);
    }
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
    <div className={styles.logsPage}>
      <h2 className={styles.contentHeaderTitle}>In-Kind Donation Logs</h2>

      <div className={styles.tableControls}>
        <div className={styles.controlsLeft}>
          <select className={styles.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Unread">Unread</option>
            <option value="Processing">Processing</option>
            <option value="Valid">Valid</option>
            <option value="Invalid">Invalid</option>
            <option value="Claimed">Claimed</option>
          </select>

          <div className={styles.searchContainer}>
            <input 
              className={styles.searchContainerInput} 
              type="text" 
              placeholder="Search by donor name, ref number, or cause..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.requestTable}>
          <thead>
            <tr>
              <th className={styles.headerCell}>DONOR NAME</th>
              <th className={styles.headerCell}>ITEMS COUNT</th>
              <th className={styles.headerCell}>REFERENCE NO.</th>
              <th className={styles.headerCell}>ALLOCATED CAUSE</th>
              <th className={styles.headerCell}>DATE</th>
              <th className={styles.headerCell}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((don) => (
              <tr key={don.id} className={`${styles.clickableRow} ${['unread', 'pending', 'processing'].includes((don.status || '').toLowerCase()) ? styles.unreadRow : ''}`} onClick={() => handleSelectDonation(don)}>
                <td className={styles.tableCell}>
                  <span className={styles.actorName}>
                    {don.realDonorName || don.donorName || "Unknown Donor"}
                    {don.isAnonymous && <span style={{fontSize: '0.8rem', color: '#64748b'}}> (Anon)</span>}
                  </span>
                </td>
                <td className={styles.tableCell}>{don.items?.length || 0} unique items</td>
                <td className={styles.tableCell}>
                  <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                    {don.referenceNumber || "N/A"}
                  </code>
                </td>
                <td className={styles.tableCell}>{don.targetRequestTitle || "N/A"}</td>
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

      {/* DETAIL MODAL */}
      {selectedDonation && (
        <div className={styles.contentModalOverlay} onClick={() => setSelectedDonation(null)}>
          <div className={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>Review In-Kind Donation</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedDonation(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalFormLayout}>

                {/* Donor Info Card */}
                <div className={styles.donationCard}>
                  <div className={styles.donationCardHeader}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                        <line x1="12" y1="22.08" x2="12" y2="12" />
                      </svg>
                      Donation Info
                    </span>
                    <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.8rem' }}>{selectedDonation.date || 'N/A'}</span>
                  </div>
                  <div className={styles.donationCardBody}>
                    <div className={styles.itemFieldContainer}>
                      <span className={styles.itemLabel}>Donor</span>
                      <div className={styles.modalDataField}>
                        {selectedDonation.realDonorName || selectedDonation.donorName || "Unknown"}
                        {selectedDonation.isAnonymous && (
                          <span style={{ fontSize: '0.8rem', color: '#dc2626', marginLeft: '8px', fontStyle: 'italic', fontWeight: 'bold' }}>
                            (Requested Anonymous to Beneficiary)
                          </span>
                        )}
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

                    <div className={styles.itemFieldContainer}>
                      <span className={styles.itemLabel}>Allocated Cause</span>
                      <div className={styles.modalDataField}>{selectedDonation.targetRequestTitle || "N/A"}</div>
                    </div>
                  </div>
                </div>

                {/* Items List Card */}
                <div className={styles.donationCard}>
                  <div className={styles.donationCardHeader}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="8" y1="13" x2="16" y2="13" />
                        <line x1="8" y1="17" x2="16" y2="17" />
                        <line x1="8" y1="9" x2="10" y2="9" />
                      </svg>
                      Items List
                    </span>
                    <span style={{ background: '#eafaf5', color: '#28a786', padding: '2px 10px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 700, border: '1.5px solid rgba(40,167,134,0.25)' }}>
                      {selectedDonation.items?.length || 0} item types
                    </span>
                  </div>
                  <div className={styles.donationCardBody}>
                    {selectedDonation.items && selectedDonation.items.length > 0 ? (
                      selectedDonation.items.map((item, idx) => (
                        <div key={idx} className={styles.donationItemRow}>
                          <span className={styles.donationItemName}>{item.item}</span>
                          <span className={styles.donationItemQty}>×{item.quantity}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: '#94a3b8', textAlign: 'center', padding: '12px', fontSize: '0.9rem' }}>
                        No items listed.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
            
            {/* Action Buttons - Only show if not Valid/Invalid */}
           {!['Valid', 'Invalid', 'Claimed'].includes(selectedDonation.status) && (
              <div className={styles.modalActions}>
                <button className={`${styles.actionBtn} ${styles.cancel}`} onClick={() => { setConfirmAction('Invalid'); setRejectionReason(''); }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '5px', marginBottom: '1px' }}>
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Reject
                </button>
                <button className={`${styles.actionBtn} ${styles.approve}`} onClick={() => setConfirmAction('Valid')}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '5px', marginBottom: '1px' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Received
                </button>
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
                {confirmAction === 'Invalid' ? 'Reject Donation' : 'Confirm Action'}
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
                    placeholder="Please specify why this donation is invalid..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px', marginTop: '5px' }}
                    maxLength="200"
                  />
                </div>
              ) : (
                <p style={{ margin: '0 0 15px 0' }}>
                  Are you sure you want to mark this donation as <strong>Received</strong>? This will update the fundraiser total and notify both the donor and beneficiary.
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

export default DonationItems;
