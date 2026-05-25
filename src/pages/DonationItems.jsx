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
    if (donation.status?.toLowerCase() === 'unread') {
      try {
        await updateDoc(doc(db, "donation_items", donation.id), { status: 'Processing' });
      } catch (err) { 
        console.error("Error setting status to Processing: ", err); 
      }
    }
  };

  const updateStatus = async (donation, newStatus) => {
    try {
      const adminUser = auth.currentUser;

      await updateDoc(doc(db, "donation_items", donation.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

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
              donationId: donation.id
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
        actionDetails: `Changed item donation status to ${newStatus}`,
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
            : `We couldn't verify the items for your donation to ${donation.targetRequestTitle}.`,
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
          </select>

          <div className={styles.searchContainer}>
            <input 
              className={styles.searchContainerInput} 
              type="text" 
              placeholder="Search by donor name or cause..." 
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
              <th className={styles.headerCell}>ALLOCATED CAUSE</th>
              <th className={styles.headerCell}>DATE</th>
              <th className={styles.headerCell}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((don) => (
              <tr key={don.id} className={`${styles.clickableRow} ${don.status?.toLowerCase() === 'unread' ? styles.unreadRow : ''}`} onClick={() => handleSelectDonation(don)}>
                <td className={styles.tableCell}>
                  <span className={styles.actorName}>
                    {don.realDonorName || don.donorName || "Unknown Donor"}
                    {don.isAnonymous}
                  </span>
                </td>
                <td className={styles.tableCell}>{don.items?.length || 0} unique items</td>
                <td className={styles.tableCell}>{don.targetRequestTitle || "N/A"}</td>
                <td className={styles.tableCell}>{don.date || "N/A"}</td>
                <td className={styles.tableCell}>{don.status || "Unread"}</td>
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
                    <span>📦 Donation Info</span>
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
                      <span className={styles.itemLabel}>Allocated Cause</span>
                      <div className={styles.modalDataField}>{selectedDonation.targetRequestTitle || "N/A"}</div>
                    </div>
                  </div>
                </div>

                {/* Items List Card */}
                <div className={styles.donationCard}>
                  <div className={styles.donationCardHeader}>
                    <span>🗂 Items List</span>
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
            <div className={styles.modalActions}>
              <button className={`${styles.actionBtn} ${styles.cancel}`} onClick={() => updateStatus(selectedDonation, 'Invalid')}>✗ Reject</button>
              <button className={`${styles.actionBtn} ${styles.approve}`} onClick={() => updateStatus(selectedDonation, 'Valid')}>✓ Received</button>
            </div>
          </div>
        </div>
      )}
      {alertMessage && (
        <div className={styles.contentModalOverlay} onClick={() => setAlertMessage(null)}>
          <div className={styles.contentModal} style={{ maxWidth: '400px', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader} style={{ padding: 0, border: 'none', marginBottom: '12px' }}>
              <h3 className={styles.modalHeaderTitle}>Notice</h3>
              <button className={styles.closeBtn} onClick={() => setAlertMessage(null)}>×</button>
            </div>
            <div className={styles.modalBody} style={{ padding: 0, marginBottom: '20px' }}>
              <p style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b', lineHeight: 1.5 }}>{alertMessage}</p>
            </div>
            <div className={styles.modalActions} style={{ padding: 0, border: 'none', display: 'flex', justifyContent: 'flex-end' }}>
              <button className={styles.actionBtn + ' ' + styles.approve} onClick={() => setAlertMessage(null)} style={{ margin: 0, minWidth: '100px' }}>
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