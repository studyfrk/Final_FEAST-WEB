import React, { useState, useEffect } from 'react';
import { db, storage, auth } from '../firebase'; 
import { collection, onSnapshot, addDoc, doc, updateDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import styles from '../components/admin_pages.module.css';

const RequestPage = () => {
  const [requests, setRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All'); 
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [formData, setFormData] = useState({ 
    name: '', phone: '', desc: '', category: '', 
    aidType: 'In-Kind', location: '', fundraiserGoal: '', 
    postDurationDays: '7', acceptedItems: '' 
  });
  
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const categories = ["Basic Needs", "Health", "Food", "Education", "Disaster"];

  useEffect(() => {
    const q = query(collection(db, "aid_requests"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(data);
    });
    return () => unsub();
  }, []);

  const handleSelectRequest = async (req) => {
    setSelectedRequest(req);
    setCurrentImgIndex(0);
    if (req.status?.toLowerCase() === 'unread') {
      try {
        await updateDoc(doc(db, "aid_requests", req.id), { status: 'Processing' });
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

  const updateStatus = async (request, newStatus) => {
    try {
      const adminUser = auth.currentUser;
      const requestName = request.fullName || request.title || "Untitled Request";

      await updateDoc(doc(db, "aid_requests", request.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, "audit_logs"), {
        adminName: adminUser?.displayName || adminUser?.email || "Admin",
        role: "Administrator",
        actionType: "Request Moderation",
        actionDetails: `Changed request status to ${newStatus}`,
        targetName: requestName,
        eventLifecycle: request.aidType || "N/A",
        status: "Success",
        timestamp: serverTimestamp(),
        type: "request"
      });

      const recipientId = request.authorId || request.userId;
      if (recipientId) {
        const notifRef = collection(db, `users/${recipientId}/notifications`);
        const isApproved = newStatus === 'Approved';
        
        await addDoc(notifRef, {
          title: isApproved ? "Request Approved" : "Request Denied",
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
      alert("Error: " + err.message);
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

      await addDoc(collection(db, "aid_requests"), {
        title: formData.name,
        fullName: formData.name, 
        authorId: user ? user.uid : null,
        userId: user ? user.uid : null,
        phone: formData.phone,
        description: formData.desc, 
        category: formData.category,
        aidType: formData.aidType,
        location: formData.location,
        fundraiserGoal: Number(formData.fundraiserGoal),
        postDurationDays: Number(formData.postDurationDays),
        acceptedItems: formData.acceptedItems ? formData.acceptedItems.split(',').map(i => i.trim()) : [],
        imageUrls: imageUrls, 
        status: 'Unread',
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp(),
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      });

      setFormData({ name: '', phone: '', desc: '', category: '', aidType: 'In-Kind', location: '', fundraiserGoal: '', postDurationDays: '7', acceptedItems: '' });
      setImages([]);
      setShowCreateModal(false);
    } catch (error) {
      console.error(error);
      alert("Failed to submit. Check permissions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredData = requests.filter(req => {
    const matchesSearch = (req.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (req.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' || req.status === filterStatus;
    const matchesType = filterType === 'All' || req.aidType === filterType;
    return matchesSearch && matchesFilter && matchesType;
  });

  return (
    <div className={styles.requestPage}>
      <div>
        <h2 className={styles.contentHeaderTitle}>Service Requests</h2>
      </div>

      <div className={styles.tableControls}>
        <div className={styles.controlsLeft}>
          <select className={styles.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Unread">Unread</option>
            <option value="Processing">Processing</option>
            <option value="Approved">Approved</option>
            <option value="Denied">Denied</option>
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
              <th className={styles.headerCell}>NAME</th>
              <th className={styles.headerCell}>CATEGORY</th>
              <th className={styles.headerCell}>TYPE</th>
              <th className={styles.headerCell}>DESCRIPTION</th>
              <th className={styles.headerCell}>LOCATION</th>
              <th className={styles.headerCell}>DATE</th>
              <th className={styles.headerCell}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((req) => (
              <tr key={req.id} className={`${styles.clickableRow} ${req.status?.toLowerCase() === 'unread' ? styles.unreadRow : ''}`} onClick={() => handleSelectRequest(req)}>
                <td className={`${styles.truncateCell} ${styles.tableCell}`}><span className={styles.reqName}>{req.fullName || req.title || "N/A"}</span></td>
                <td className={styles.tableCell}>{req.category || "N/A"}</td>
                <td className={styles.tableCell}>
                    <span className={`${styles.typeTag} ${req.aidType?.toLowerCase() === 'fundraiser' ? styles.fund : styles.kind}`}>
                      {req.aidType || "N/A"}
                    </span>
                </td>
                <td className={`${styles.truncateCell} ${styles.tableCell}`}>{req.description || "N/A"}</td>
                <td className={`${styles.truncateCell} ${styles.tableCell}`}>{req.location || "N/A"}</td>
                <td className={styles.tableCell}>{req.date || "N/A"}</td>
                <td className={styles.tableCell}>
                  <span className={`${styles.statusPill} ${styles[req.status?.toLowerCase()] || styles.unread}`}>{req.status || "N/A"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className={styles.contentModalOverlay}>
          <div className={styles.contentModal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>Create New Aid Request</h3>
              <button className={styles.closeBtn} onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleCreateRequest} className={styles.modalFormLayout}>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Full Name</label>
                  <input className={styles.itemFieldInput} type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Phone Number</label>
                  <input className={styles.itemFieldInput} type="text" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
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
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Location</label>
                  <input className={styles.itemFieldInput} type="text" required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                </div>
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>{formData.aidType === 'Fundraiser' ? 'Goal (₱)' : 'Quantity'}</label>
                    <input className={styles.itemFieldInput} type="number" required value={formData.fundraiserGoal} onChange={e => setFormData({...formData, fundraiserGoal: e.target.value})} />
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Duration</label>
                    <select className={styles.itemFieldSelect} value={formData.postDurationDays} onChange={e => setFormData({...formData, postDurationDays: e.target.value})}>
                      <option value="7">7 Days</option>
                      <option value="14">14 Days</option>
                      <option value="30">30 Days</option>
                    </select>
                  </div>
                </div>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Accepted Items</label>
                  <input className={styles.itemFieldInput} type="text" placeholder="e.g. Rice, Canned Goods" value={formData.acceptedItems} onChange={e => setFormData({...formData, acceptedItems: e.target.value})} />
                </div>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Description</label>
                  <textarea className={styles.itemFieldTextarea} required value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} />
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
                  <div className={styles.modalDataField}>{selectedRequest.fullName || "N/A"}</div>
                </div>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Contact</label>
                  <div className={styles.modalDataField}>{selectedRequest.phone || "N/A"}</div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Category</label>
                    <div className={styles.modalDataField}>{selectedRequest.category || "N/A"}</div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Type</label>
                    <div className={styles.modalDataField}>{selectedRequest.aidType || "N/A"}</div>
                  </div>
                </div>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Location</label>
                  <div className={styles.modalDataField}>{selectedRequest.location || "N/A"}</div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Goal/Quantity</label>
                    <div className={styles.modalDataField}>
                      {selectedRequest.aidType === 'Fundraiser' ? `₱${selectedRequest.fundraiserGoal?.toLocaleString()}` : (selectedRequest.fundraiserGoal || "N/A")}
                    </div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Status</label>
                    <div className={styles.modalDataField}>{selectedRequest.status || "N/A"}</div>
                  </div>
                </div>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Accepted Items</label>
                  <div className={styles.modalDataField}>
                    {selectedRequest.acceptedItems?.length > 0 ? selectedRequest.acceptedItems.join(', ') : "N/A"}
                  </div>
                </div>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Description</label>
                  <div className={styles.modalDataField + " " + styles.textareaView}>
                    {selectedRequest.description || "N/A"}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.actionBtn + " " + styles.decline} onClick={() => updateStatus(selectedRequest, 'Denied')}>Decline</button>
              <button className={styles.actionBtn + " " + styles.approve} onClick={() => updateStatus(selectedRequest, 'Approved')}>Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestPage;