/* React & Firebase Imports */
import React, { useState, useEffect } from 'react';
import { db, storage, auth } from '../firebase'; 
import { collection, onSnapshot, addDoc, doc, updateDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/* Style Imports */
import styles from '../components/admin_pages.module.css';

const RequestPage = () => {
  const [requests, setRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All'); 
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // State to hold live calculated countdowns for requests
  const [timeRemainingMap, setTimeRemainingMap] = useState({});
  
  const [formData, setFormData] = useState({ 
    name: '', desc: '', category: '', 
    aidType: 'In-Kind', fundraiserGoal: '', 
    postDurationDays: '1', acceptedItems: '' 
  });
  
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [alertMessage, setAlertMessage] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // Added state for confirmation modal
  const itemsPerPage = 10;

  const categories = ["Basic Needs", "Health", "Education", "Disaster"];

  useEffect(() => {
    const q = query(collection(db, "aid_requests"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(data);
    });
    return () => unsub();
  }, []);

  // Live countdown timer ticker running every second to keep track of time remaining
  // Also automatically switches lifecycle status to 'Completed' in the DB upon expiration
  useEffect(() => {
    const calculateCountdowns = async () => {
      const updatedMap = {};
      
      for (const req of requests) {
        const approvalStatusClean = (req.approvalStatus || '').toLowerCase();

        // 1. If rejected, show Invalid
        if (approvalStatusClean === 'rejected') {
          updatedMap[req.id] = "Invalid";
          continue;
        }

        // 2. Check if the request is approved yet
        if (approvalStatusClean !== 'approved') {
          updatedMap[req.id] = "Pending Approval";
          continue;
        }

        // 3. Fallback check if approvedAt hasn't synced from Firestore yet
        if (!req.approvedAt || !req.postDurationDays) {
          updatedMap[req.id] = "Starting...";
          continue;
        }

        // 4. Convert approvedAt timestamp or native object to milliseconds
        const approvedMs = req.approvedAt.toDate ? req.approvedAt.toDate().getTime() : new Date(req.approvedAt).getTime();
        const durationMs = Number(req.postDurationDays) * 24 * 60 * 60 * 1000;
        const expirationTime = approvedMs + durationMs;
        const now = Date.now();
        const timeLeft = expirationTime - now;

        if (timeLeft <= 0) {
          updatedMap[req.id] = "Expired";

          // If the timer is up but the database status is still 'Ongoing', trigger DB completion update
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

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImages(prev => [...prev, ...newFiles]);
    }
  };

  const removeSelectedImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const updateApprovalStatus = async (request, newStatus) => {
    try {
      const adminUser = auth.currentUser;
      const requestName = request.title || request.fullName || "Untitled Request";

      const updateData = {
        approvalStatus: newStatus,
        updatedAt: serverTimestamp()
      };

      // Set approvedAt timestamp and shift lifecycle to Ongoing when Approved
      if (newStatus === 'Approved') {
        updateData.approvedAt = serverTimestamp();
        updateData.status = 'Ongoing';
      }

      // Sync lifecycle status to Rejected when Rejected
      if (newStatus === 'Rejected') {
        updateData.status = 'Rejected';
      }

      // Updates document in Firestore
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

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    
    if (Number(formData.postDurationDays) > 14) {
      setAlertMessage("Duration cannot exceed 14 days.");
      return;
    }

    setIsSubmitting(true);
    try {
      const imageUrls = [];
      for (const image of images) {
        const storageRef = ref(storage, `requests/${Date.now()}_${image.name}`);
        await uploadBytes(storageRef, image);
        const url = await getDownloadURL(storageRef);
        imageUrls.push(url);
      }

      const user = auth.currentUser;
      const isFundraiser = formData.aidType === 'Fundraiser';

      await addDoc(collection(db, "aid_requests"), {
        title: formData.name,
        fullName: formData.name, 
        authorId: user ? user.uid : null,
        userId: user ? user.uid : null,
        description: formData.desc, 
        category: formData.category,
        aidType: formData.aidType,
        
        fundraiserGoal: isFundraiser ? Number(formData.fundraiserGoal) : null,
        raised: 0, 
        
        postDurationDays: Number(formData.postDurationDays),
        acceptedItems: !isFundraiser && formData.acceptedItems 
          ? formData.acceptedItems.split(',').map(i => i.trim()).filter(Boolean) 
          : [],
        imageUrls: imageUrls, 
        
        // --- STATUS UPDATES HERE ---
        status: 'Pending',
        approvalStatus: 'Unread', 
        
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp(),
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      });

      setFormData({ name: '', desc: '', category: '', aidType: 'In-Kind', fundraiserGoal: '', postDurationDays: '1', acceptedItems: '' });
      setImages([]);
      setShowCreateModal(false);
    } catch (error) {
      console.error(error);
      setAlertMessage("Failed to submit. Check permissions.");
    } finally {
      setIsSubmitting(false);
    }
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
        <button className={styles.createBtn} onClick={() => setShowCreateModal(true)}>Add New Request</button>
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

      {showCreateModal && (
        <div className={styles.contentModalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>Create New Aid Request</h3>
              <button className={styles.closeBtn} onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleCreateRequest} className={styles.modalFormLayout}>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Request Title</label>
                  <input className={styles.itemFieldInput} type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} maxLength="60" />
                </div>
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Category</label>
                    <select className={styles.itemFieldSelect} required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      <option value="">Select Category</option>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Aid Type</label>
                    <select className={styles.itemFieldSelect} value={formData.aidType} onChange={e => setFormData({...formData, aidType: e.target.value})}>
                      <option value="In-Kind">In-Kind</option>
                      <option value="Fundraiser">Fundraiser</option>
                    </select>
                  </div>
                </div>
                <div className={styles.formRow}>
                  {formData.aidType === 'Fundraiser' && (
                    <div className={styles.itemFieldContainer}>
                      <label className={styles.itemLabel}>Goal (₱)</label>
                      <input className={styles.itemFieldInput} type="number" required value={formData.fundraiserGoal} onChange={e => setFormData({...formData, fundraiserGoal: e.target.value})} />
                    </div>
                  )}
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Duration (Days, Max 14)</label>
                    <input 
                      className={styles.itemFieldInput} 
                      type="number" 
                      required 
                      min="1" 
                      max="14" 
                      value={formData.postDurationDays} 
                      onChange={e => setFormData({...formData, postDurationDays: e.target.value})} 
                    />
                  </div>
                </div>

                {formData.aidType === 'In-Kind' && (
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Accepted Items</label>
                    <input className={styles.itemFieldInput} type="text" placeholder="e.g. Rice, Canned Goods" value={formData.acceptedItems} onChange={e => setFormData({...formData, acceptedItems: e.target.value})} maxLength="100" />
                  </div>
                )}

                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Description</label>
                  <textarea className={styles.itemFieldTextarea} required value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} maxLength="400" />
                </div>

                <div className={styles.fileUploadFieldset}>
                  <span className={styles.itemLabel}>IMAGES</span>
                  <div className={styles.fileInputWrapper}>
                    <label className={styles.customBrowseBtn}>
                      Browse...
                      <input type="file" multiple accept="image/*" hidden onChange={handleFileChange} />
                    </label>
                    <span className={styles.fileNameDisplay}>
                      {images.length > 0 ? `${images.length} files selected` : "No file chosen"}
                    </span>
                  </div>
                  
                  {images.length > 0 && (
                    <div className={styles.thumbnailGrid}>
                      {images.map((file, index) => (
                        <div key={index} className={styles.thumbnailContainer}>
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt="preview" 
                            className={styles.thumbnailImg} 
                          />
                          <button 
                            type="button" 
                            className={styles.removeThumbBtn} 
                            onClick={() => removeSelectedImage(index)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                  {isSubmitting ? "Uploading..." : "Submit Request"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

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

            {/* ACTION BUTTONS: Only show if not Approved or Rejected to enforce one-time action */}
            {selectedRequest.approvalStatus !== 'Approved' && selectedRequest.approvalStatus !== 'Rejected' && (
              <div className={styles.modalActions}>
                <button 
                  className={styles.actionBtn + " " + styles.decline} 
                  onClick={() => setConfirmAction('Rejected')}
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

      {/* CONFIRMATION DISCLAIMER MODAL */}
      {confirmAction && (
        <div className={styles.contentModalOverlay} onClick={() => setConfirmAction(null)} style={{ zIndex: 1000 }}>
          <div className={styles.contentModal} style={{ maxWidth: '450px', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader} style={{ padding: 0, border: 'none', marginBottom: '12px' }}>
              <h3 className={styles.modalHeaderTitle}>Confirm Action</h3>
              <button className={styles.closeBtn} onClick={() => setConfirmAction(null)}>×</button>
            </div>
            <div className={styles.modalBody} style={{ padding: 0, marginBottom: '20px' }}>
              <p style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b', lineHeight: 1.5 }}>
                Are you sure you want to mark this request as <strong>{confirmAction}</strong>? <br/><br/>
                <strong>Disclaimer:</strong> This is a one-time action and cannot be undone. Relevant users will be notified automatically upon confirmation.
              </p>
            </div>
            <div className={styles.modalActions} style={{ padding: 0, border: 'none', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className={`${styles.actionBtn} ${styles.cancel}`} onClick={() => setConfirmAction(null)} style={{ margin: 0 }}>
                Cancel
              </button>
              <button 
                className={`${styles.actionBtn} ${styles.approve}`} 
                onClick={() => {
                  updateApprovalStatus(selectedRequest, confirmAction);
                  setConfirmAction(null);
                }} 
                style={{ margin: 0 }}
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standard Alert Message */}
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

export default RequestPage;