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

            await addDoc(ownerNotifRef, {
              title: "Donation Ready for Claiming!",
              body: `A donation has been sent to the barangay for your request "${donation.targetRequestTitle || 'Aid Request'}". Items: ${itemsDescription}. You may now head to the barangay to claim them.`,
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
        targetName: `Donor: ${donation.donorName || 'N/A'}`,
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
      alert("Error: " + err.message);
    }
  };

  const filteredData = donations.filter(don => {
    const matchesSearch = (don.donorName || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
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
              placeholder="Search by donor or cause..." 
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
            {filteredData.map((don) => (
              <tr key={don.id} className={`${styles.clickableRow} ${don.status?.toLowerCase() === 'unread' ? styles.unreadRow : ''}`} onClick={() => handleSelectDonation(don)}>
                <td className={styles.tableCell}><span className={styles.actorName}>{don.donorName || "Anonymous"}</span></td>
                <td className={styles.tableCell}>{don.items?.length || 0} unique items</td>
                <td className={styles.tableCell}>{don.targetRequestTitle || "N/A"}</td>
                <td className={styles.tableCell}>{don.date || "N/A"}</td>
                <td className={styles.tableCell}>{don.status || "Unread"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DETAIL MODAL */}
      {selectedDonation && (
        <div className={styles.contentModalOverlay} onClick={() => setSelectedDonation(null)}>
          <div className={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Review In-Kind Donation</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedDonation(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <p><strong>Donor:</strong> {selectedDonation.donorName}</p>
              <p><strong>Cause:</strong> {selectedDonation.targetRequestTitle}</p>
              
              <div style={{ marginTop: '15px' }}>
                <p><strong>Items List:</strong></p>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {selectedDonation.items && selectedDonation.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: idx !== selectedDonation.items.length - 1 ? '1px solid #cbd5e1' : 'none' }}>
                      <span>{item.item}</span>
                      <span style={{ fontWeight: 'bold' }}>{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                <button 
                  style={{ flex: 1, backgroundColor: '#ef4444', color: 'white', padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }} 
                  onClick={() => updateStatus(selectedDonation, 'Invalid')}
                >
                  Reject
                </button>
                <button 
                  style={{ flex: 1, backgroundColor: '#22c55e', color: 'white', padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }} 
                  onClick={() => updateStatus(selectedDonation, 'Valid')}
                >
                  Received
                </button>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonationItems;