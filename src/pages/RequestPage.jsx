/* React & Firebase Imports */
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; 
import { collection, onSnapshot, addDoc, doc, updateDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';

/* Style Imports */
import styles from '../components/admin_pages.module.css';

const RequestPage = () => {
  const [requests, setRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All'); 
  const [selectedRequest, setSelectedRequest] = useState(null);
  
  const [timeRemainingMap, setTimeRemainingMap] = useState({});
  
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [alertMessage, setAlertMessage] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); 
  
  const [rejectionReason, setRejectionReason] = useState('');

  const itemsPerPage = 10;

  useEffect(() => {
    const q = query(collection(db, "aid_requests"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const calculateCountdowns = async () => {
      const updatedMap = {};
      
      for (const req of requests) {
        const approvalStatusClean = (req.approvalStatus || '').toLowerCase();

        if (approvalStatusClean === 'rejected') {
          updatedMap[req.id] = "Invalid";
          continue;
        }

        if (approvalStatusClean !== 'approved') {
          updatedMap[req.id] = "Pending Approval";
          continue;
        }

        if (!req.approvedAt || !req.postDurationDays) {
          updatedMap[req.id] = "Starting...";
          continue;
        }

        const approvedMs = req.approvedAt.toDate ? req.approvedAt.toDate().getTime() : new Date(req.approvedAt).getTime();
        const durationMs = Number(req.postDurationDays) * 24 * 60 * 60 * 1000;
        const expirationTime = approvedMs + durationMs;
        const now = Date.now();
        const timeLeft = expirationTime - now;

        if (timeLeft <= 0) {
          updatedMap[req.id] = "Expired";

          if (req.status === 'Ongoing') {
            try {
              await updateDoc(doc(db, "aid_requests", req.id), {
                status: 'Completed',
                updatedAt: serverTimestamp()
              });
            } catch (err) {
              console.error("Error auto-completing expired request:", err);
            }
          }
        } else {
          const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

          let displayStr = "";
          if (days > 0) displayStr += `${days}d `;
          displayStr += `${hours}h ${minutes}m ${seconds}s`;
          updatedMap[req.id] = displayStr;
        }
      }
      setTimeRemainingMap(updatedMap);
    };

    if (requests.length > 0) {
      calculateCountdowns();
      const interval = setInterval(calculateCountdowns, 1000);
      return () => clearInterval(interval);
    }
  }, [requests]);

  const handleSelectRequest = async (req) => {
    setSelectedRequest(req);
    setCurrentImgIndex(0);
    if (['unread', 'processing'].includes((req.approvalStatus || '').toLowerCase())) {
      try {
        await updateDoc(doc(db, "aid_requests", req.id), { approvalStatus: 'Processing' });
      } catch (err) { console.error(err); }
    }
  };

  const rejectRequestWithReason = async (request, reason) => {
    try {
      const adminUser = auth.currentUser;
      const requestName = request.title || request.fullName || "Untitled Request";

      await updateDoc(doc(db, "aid_requests", request.id), { 
        approvalStatus: 'Rejected',
        status: 'Rejected',
        rejectionReason: reason,
        updatedAt: serverTimestamp() 
      });

      await addDoc(collection(db, "audit_logs"), {
        adminName: adminUser?.displayName || adminUser?.email || "Admin",
        role: "Administrator",
        actionType: "Request Moderation",
        actionDetails: `Rejected request. Reason: ${reason}`,
        targetName: requestName,
        eventLifecycle: request.status || "Ongoing",
        status: "Success",
        timestamp: serverTimestamp(),
        type: "request" 
      });

      const recipientId = request.authorId || request.userId;
      if (recipientId) {
        const notifRef = collection(db, `users/${recipientId}/notifications`);
        await addDoc(notifRef, {
          title: "Request Rejected",
          body: `Unfortunately, your request "${requestName}" was not approved at this time. Reason: ${reason}`,
          type: "Request",
          status: "error",
          read: false,
          createdAt: serverTimestamp(),
          requestId: request.id,
          rejectionReason: reason
        });
      }

      setSelectedRequest(null); 
    } catch (err) { 
      console.error("Error in rejectRequestWithReason:", err);
      setAlertMessage("Failed to reject request."); 
    }
  };

  const updateApprovalStatus = async (request, newStatus) => {
    try {
      const adminUser = auth.currentUser;
      const requestName = request.title || request.fullName || "Untitled Request";

      const updateData = {
        approvalStatus: newStatus,
        updatedAt: serverTimestamp()
      };

      if (newStatus === 'Approved') {
        updateData.approvedAt = serverTimestamp();
        updateData.status = 'Ongoing';
      }

      if (newStatus === 'Rejected') {
        updateData.status = 'Rejected';
      }

      await updateDoc(doc(db, "aid_requests", request.id), updateData);

      await addDoc(collection(db, "audit_logs"), {
        adminName: adminUser?.displayName || adminUser?.email || "Admin",
        role: "Administrator",
        actionType: "Request Moderation",
        actionDetails: `Changed approval to ${newStatus}`,
        targetName: requestName,
        eventLifecycle: updateData.status || request.status || "Ongoing",
        status: "Success",
        timestamp: serverTimestamp(),
        type: "request"
      });

      const recipientId = request.authorId || request.userId;
      if (recipientId) {
        const notifRef = collection(db, `users/${recipientId}/notifications`);
        const isApproved = newStatus === 'Approved';
        
        await addDoc(notifRef, {
          title: isApproved ? "Request Approved" : "Request Rejected",
          body: isApproved
            ? `Your request "${requestName}" has been approved and is now active.`
            : `Unfortunately, your request "${requestName}" was not approved at this time.`,
          type: "Request",
          status: isApproved ? "success" : "error",
          read: false,
          createdAt: serverTimestamp(),
          requestId: request.id
        });
      }

      setSelectedRequest(null);
    } catch (err) { 
      console.error("Error updating status:", err); 
      setAlertMessage("Error: " + err.message);
    }
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev + 1) % selectedRequest.imageUrls.length);
  };

  const handlePrevImage = (e) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev - 1 + selectedRequest.imageUrls.length) % selectedRequest.imageUrls.length);
  };

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterStatus, filterType]);

  const filteredData = requests.filter(req => {
    const targetTitle = req.title || req.fullName || "";
    const matchesSearch = targetTitle.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (req.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'All' || 
                          (req.status || '').toLowerCase() === filterStatus.toLowerCase() ||
                          (req.approvalStatus || '').toLowerCase() === filterStatus.toLowerCase();

    const matchesType = filterType === 'All' || req.aidType === filterType;
    return matchesSearch && matchesFilter && matchesType;
  });

  return (
    <div className={styles.requestPage}>
      <div>
        <h2 className={styles.contentHeaderTitle}>Aid Management</h2>
      </div>

      <div className={styles.tableControls}>
        <div className={styles.controlsLeft}>
          <select className={styles.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All Filter</option>
            <option disabled>── Lifecycle ──</option>
            <option value="Pending">Pending</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
            <option value="Rejected">Rejected</option>
            <option disabled>── Admin ──</option>
            <option value="Unread">Unread</option>
            <option value="Processing">Processing</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          
          <select className={styles.filterSelect} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="All">All Types</option>
            <option value="In-Kind">In-Kind</option>
            <option value="Fundraiser">Fundraiser</option>
          </select>

          <div className={styles.searchContainer}>
            <input className={styles.searchContainerInput} type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.requestTable}>
          <thead>
            <tr>
              <th className={styles.headerCell}>REQUEST TITLE</th>
              <th className={styles.headerCell}>CATEGORY</th>
              <th className={styles.headerCell}>TYPE</th>
              <th className={styles.headerCell}>DATE</th>
              <th className={styles.headerCell}>STATUS</th>
              <th className={styles.headerCell}>APPROVAL</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((req) => (
              <tr 
                key={req.id} 
                className={`${styles.clickableRow} ${['unread', 'pending', 'processing'].includes((req.approvalStatus || '').toLowerCase()) ? styles.unreadRow : ''}`} 
                onClick={() => handleSelectRequest(req)}
              >
                <td className={styles.tableCell}>
                  <span className={styles.evTitle}>{req.title || req.fullName || "Untitled Request"}</span>
                </td>
                <td className={`${styles.tableCell} ${styles.capitalizeText}`}>
                  {req.category || "N/A"}
                </td>
                <td className={styles.tableCell}>
                  {req.aidType || "N/A"}
                </td>
                <td className={styles.tableCell}>
                  {req.date || "N/A"}
                </td>
                <td className={`${styles.tableCell} ${styles.statusCell}`}>
                  <span className={`${styles.statusPill} ${styles[(req.status || 'ongoing').toLowerCase()]}`}>
                    {req.status || "Ongoing"}
                  </span>
                </td>
                <td className={`${styles.tableCell} ${styles.statusCell}`}>
                  <span className={`${styles.statusPill} ${styles[(req.approvalStatus || 'Processing').toLowerCase()]}`}>
                    {req.approvalStatus || "Processing"}
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

      {selectedRequest && (
        <div className={styles.contentModalOverlay} onClick={() => setSelectedRequest(null)}>
          <div className={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>Request Details</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedRequest(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              {selectedRequest.imageUrls?.length > 0 ? (
                <div className={styles.carouselContainer}>
                  <div 
                    className={styles.carouselTrack} 
                    style={{ transform: `translateX(-${currentImgIndex * 100}%)` }}
                  >
                    {selectedRequest.imageUrls.map((url, index) => (
                      <img 
                        key={index}
                        src={url} 
                        alt={`request-${index}`} 
                        className={styles.carouselImg} 
                      />
                    ))}
                  </div>
                  
                  {selectedRequest.imageUrls.length > 1 && (
                    <>
                      <button className={`${styles.carouselNav} ${styles.prev}`} onClick={handlePrevImage}>&#10094;</button>
                      <button className={`${styles.carouselNav} ${styles.next}`} onClick={handleNextImage}>&#10095;</button>

                      <div className={styles.carouselDots}>
                        {selectedRequest.imageUrls.map((_, index) => (
                          <div 
                            key={index} 
                            className={`${styles.dot} ${currentImgIndex === index ? styles.active : ''}`}
                            onClick={() => setCurrentImgIndex(index)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className={styles.noImagesPlaceholder}>No images uploaded</div>
              )}

              <div className={styles.modalFormLayout}>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Name</label>
                  <div className={styles.modalDataField}>{selectedRequest.title || selectedRequest.fullName || "N/A"}</div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Category</label>
                    <div className={styles.modalDataField + ' ' + styles.capitalizeText}>{selectedRequest.category || "N/A"}</div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Type</label>
                    <div className={styles.modalDataField}>{selectedRequest.aidType || "N/A"}</div>
                  </div>
                </div>

                {selectedRequest.aidType === 'Fundraiser' && (
                  <div className={styles.formRow}>
                    <div className={styles.itemFieldContainer}>
                      <label className={styles.itemLabel}>Goal Amount</label>
                      <div className={styles.modalDataField}>
                        ₱{Number(selectedRequest.fundraiserGoal || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className={styles.itemFieldContainer}>
                      <label className={styles.itemLabel}>Amount Raised</label>
                      <div className={styles.modalDataField}>
                        ₱{Number(selectedRequest.raised || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Lifecycle Status</label>
                    <div className={styles.modalDataField}>{selectedRequest.status || "Ongoing"}</div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Approval Status</label>
                    <div className={styles.modalDataField}>{selectedRequest.approvalStatus || "Processing"}</div>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Total Duration</label>
                    <div className={styles.modalDataField}>{selectedRequest.postDurationDays ? `${selectedRequest.postDurationDays} Days` : "N/A"}</div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Remaining Time</label>
                    <div 
                      className={`${styles.modalDataField}`} 
                      style={{ 
                        fontWeight: '600', 
                        color: timeRemainingMap[selectedRequest.id] === 'Invalid' || timeRemainingMap[selectedRequest.id] === 'Expired' 
                          ? '#e74c3c' 
                          : (timeRemainingMap[selectedRequest.id] === 'Pending Approval' ? '#f39c12' : '#2ecc71') 
                      }}
                    >
                      {timeRemainingMap[selectedRequest.id] || "Calculating..."}
                    </div>
                  </div>
                </div>

                {selectedRequest.aidType === 'In-Kind' && (
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Accepted Items</label>
                    <div className={styles.modalDataField}>
                      {selectedRequest.acceptedItems?.length > 0 ? selectedRequest.acceptedItems.join(', ') : "N/A"}
                    </div>
                  </div>
                )}

                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Description</label>
                  <div className={styles.modalDataField + " " + styles.textareaView}>
                    {selectedRequest.description || "N/A"}
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            {selectedRequest.approvalStatus !== 'Approved' && selectedRequest.approvalStatus !== 'Rejected' && (
              <div className={styles.modalActions}>
                <button 
                  className={styles.actionBtn + " " + styles.decline} 
                  onClick={() => { setConfirmAction('Rejected'); setRejectionReason(''); }}
                >
                  Reject Request
                </button>
                <button 
                  className={styles.actionBtn + " " + styles.approve} 
                  onClick={() => setConfirmAction('Approved')}
                >
                  Approve Request
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION & DISCLAIMER MODAL */}
      {confirmAction && (
        <div className={styles.contentModalOverlay} onClick={() => setConfirmAction(null)}>
          <div className={styles.inlineConfirmModal} style={confirmAction === 'Rejected' ? { maxWidth: '450px' } : {}} onClick={e => e.stopPropagation()}>
            <div className={styles.inlineConfirmHeader}>
              <h3 className={styles.modalHeaderTitle}>
                {confirmAction === 'Rejected' ? 'Reject Request' : 'Confirm Action'}
              </h3>
              <button className={styles.closeBtn} onClick={() => setConfirmAction(null)}>×</button>
            </div>
            <div className={styles.inlineConfirmBody}>
              {confirmAction === 'Rejected' ? (
                <div className={styles.itemFieldContainer} style={{ marginBottom: '15px' }}>
                  <label className={styles.itemLabel}>Reason for Rejection</label>
                  <textarea
                    className={styles.itemFieldTextarea}
                    required
                    placeholder="Please specify why this request is being rejected..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px', marginTop: '5px' }}
                    maxLength="200"
                  />
                </div>
              ) : (
                <p style={{ margin: '0 0 15px 0' }}>
                  Are you sure you want to mark this request as <strong>{confirmAction}</strong>?
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
                style={confirmAction === 'Rejected' ? { backgroundColor: '#d32f2f', color: '#fff' } : {}}
                onClick={() => {
                  if (confirmAction === 'Rejected') {
                    if (!rejectionReason.trim()) {
                      setAlertMessage("Please provide a reason for rejection.");
                      return;
                    }
                    rejectRequestWithReason(selectedRequest, rejectionReason.trim());
                  } else {
                    updateApprovalStatus(selectedRequest, confirmAction);
                  }
                  setConfirmAction(null);
                }}
              >
                {confirmAction === 'Rejected' ? 'Confirm Reject' : 'Yes, Proceed'}
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

export default RequestPage;