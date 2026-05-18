import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; 
import { collection, onSnapshot, addDoc, doc, updateDoc, query, orderBy, serverTimestamp, increment } from 'firebase/firestore';
import styles from '../components/admin_pages.module.css';

const DonationFunds = () => {
  const [donations, setDonations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

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

  const updateStatus = async (donation, newStatus) => {
    try {
      const adminUser = auth.currentUser;

      await updateDoc(doc(db, "donation_funds", donation.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

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
        actionDetails: `Changed donation verification status to ${newStatus}`,
        targetName: `Ref: ${donation.referenceNumber || 'N/A'}`,
        eventLifecycle: donation.amount ? `₱${donation.amount}` : "N/A",
        status: "Success",
        timestamp: serverTimestamp(),
        type: "auth"
      });

      const recipientId = donation.userId || donation.authorId;
      if (recipientId) {
        const notifRef = collection(db, `users/${recipientId}/notifications`);
        const isValidated = newStatus === 'Valid';
        
        await addDoc(notifRef, {
          title: isValidated ? "Donation Verified" : "Donation Verification Rejected",
          body: isValidated
            ? `Your financial contribution donation of ₱${Number(donation.amount).toLocaleString()} has been verified. Thank you!`
            : `We couldn't verify the transaction details for your payment referencing: ${donation.referenceNumber || 'N/A'}.`,
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
      alert("Error processing verification check: " + err.message);
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
                          (don.referenceNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (don.targetRequestTitle || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' || don.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className={styles.logsPage}>
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
          </select>

          <div className={styles.searchContainer}>
            <input className={styles.searchContainerInput} type="text" placeholder="Search by donor, ref number, fundraiser..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
            {filteredData.map((don) => (
              <tr key={don.id} className={`${styles.clickableRow} ${don.status?.toLowerCase() === 'unread' ? styles.unreadRow : ''}`} onClick={() => handleSelectDonation(don)}>
                <td className={`${styles.truncateCell} ${styles.tableCell}`}><span className={styles.actorName}>{don.donorName || "Anonymous"}</span></td>
                <td className={styles.tableCell} style={{ fontWeight: 'bold', color: '#15803d' }}>₱{Number(don.amount || 0).toLocaleString()}</td>
                <td className={styles.tableCell}><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{don.referenceNumber || "N/A"}</code></td>
                <td className={`${styles.truncateCell} ${styles.tableCell}`}>{don.targetRequestTitle || "General Fund"}</td>
                <td className={styles.tableCell}>{don.date || "N/A"}</td>
                <td className={styles.tableCell}>{don.status || "Unread"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DETAIL MODAL*/}
      {selectedDonation && (
        <div className={styles.contentModalOverlay} onClick={() => setSelectedDonation(null)}>
          <div className={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Review Transaction Details</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedDonation(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <p><strong>Donor:</strong> {selectedDonation.donorName || "Anonymous"}</p>
              <p><strong>Amount:</strong> ₱{Number(selectedDonation.amount || 0).toLocaleString()}</p>
              <p><strong>Reference Number:</strong> {selectedDonation.referenceNumber || "N/A"}</p>
              <p><strong>Cause:</strong> {selectedDonation.targetRequestTitle || "General Fund"}</p>
              
              {selectedDonation.receiptUrls?.length > 0 && (
                <div style={{ position: 'relative', textAlign: 'center', margin: '15px 0' }}>
                  <img src={selectedDonation.receiptUrls[currentImgIndex]} alt="Receipt Preview" style={{ maxWidth: '100%', maxHeight: '300px' }} />
                  {selectedDonation.receiptUrls.length > 1 && (
                    <div>
                      <button onClick={handlePrevImage}>Prev</button>
                      <button onClick={handleNextImage}>Next</button>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button style={{ backgroundColor: '#ef4444', color: 'white', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => updateStatus(selectedDonation, 'Invalid')}>Mark Invalid</button>
                <button style={{ backgroundColor: '#22c55e', color: 'white', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => updateStatus(selectedDonation, 'Valid')}>Mark Valid</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonationFunds;