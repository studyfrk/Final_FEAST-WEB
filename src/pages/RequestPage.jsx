import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase'; 
import { collection, onSnapshot, addDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './request_page.css';

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

  const categories = ["Basic Needs", "Health", "Food", "Education", "Disaster", "Financial"];

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

  const updateStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "aid_requests", id), { status: newStatus });
      setSelectedRequest(null);
    } catch (err) { console.error(err); }
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

      await addDoc(collection(db, "aid_requests"), {
        fullName: formData.name, 
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
        createdAt: new Date().toISOString(), 
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      });

      setFormData({ name: '', phone: '', desc: '', category: '', aidType: 'In-Kind', location: '', fundraiserGoal: '', postDurationDays: '7', acceptedItems: '' });
      setImages([]);
      setShowCreateModal(false);
    } catch (error) {
      alert("Failed to submit.");
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
    <div className="request-page">
      <div className="table-header-row">
        <h2>Service Requests</h2>
      </div>

      <div className="table-controls">
        <div className="controls-left">
          <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Unread">Unread</option>
            <option value="Processing">Processing</option>
            <option value="Approved">Approved</option>
            <option value="Denied">Denied</option>
          </select>
          
          <select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="All">All Types</option>
            <option value="In-Kind">In-Kind</option>
            <option value="Fundraiser">Fundraiser</option>
          </select>

          <div className="search-container">
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <button className="create-btn" onClick={() => setShowCreateModal(true)}>+ Add Request</button>
      </div>

      <div className="table-wrapper">
        <table className="request-table">
          <thead>
            <tr>
              <th>NAME</th>
              <th>CATEGORY</th>
              <th>TYPE</th>
              <th>DESCRIPTION</th>
              <th>LOCATION</th>
              <th>DATE</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((req) => (
              <tr key={req.id} className={`clickable-row ${req.status?.toLowerCase() === 'unread' ? 'unread-row' : ''}`} onClick={() => handleSelectRequest(req)}>
                <td className="truncate-cell"><span className="req-name">{req.fullName || "N/A"}</span></td>
                <td>{req.category || "N/A"}</td>
                <td>
                    <span className={`type-tag ${req.aidType?.toLowerCase() === 'fundraiser' ? 'fund' : 'kind'}`}>
                      {req.aidType || "N/A"}
                    </span>
                </td>
                <td className="truncate-cell">{req.description || "N/A"}</td>
                <td className="truncate-cell">{req.location || "N/A"}</td>
                <td>{req.date || "N/A"}</td>
                <td><span className={`status-pill ${req.status?.toLowerCase() || 'unread'}`}>{req.status || "N/A"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="content-modal-overlay">
          <div className="content-modal">
            <div className="modal-header">
              <h3>New Request</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateRequest} className="modal-form-layout">
                <div className="item-field-container">
                  <label className="item-label">Full Name</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="item-field-container">
                  <label className="item-label">Phone Number</label>
                  <input type="text" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="form-row">
                  <div className="item-field-container">
                    <label className="item-label">Category</label>
                    <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      <option value="">Select Category</option>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="item-field-container">
                    <label className="item-label">Aid Type</label>
                    <select value={formData.aidType} onChange={e => setFormData({...formData, aidType: e.target.value})}>
                      <option value="In-Kind">In-Kind</option>
                      <option value="Fundraiser">Fundraiser</option>
                    </select>
                  </div>
                </div>
                <div className="item-field-container">
                  <label className="item-label">Location</label>
                  <input type="text" required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                </div>
                <div className="form-row">
                  <div className="item-field-container">
                    <label className="item-label">{formData.aidType === 'Fundraiser' ? 'Goal (₱)' : 'Quantity'}</label>
                    <input type="number" required value={formData.fundraiserGoal} onChange={e => setFormData({...formData, fundraiserGoal: e.target.value})} />
                  </div>
                  <div className="item-field-container">
                    <label className="item-label">Duration</label>
                    <select value={formData.postDurationDays} onChange={e => setFormData({...formData, postDurationDays: e.target.value})}>
                      <option value="7">7 Days</option>
                      <option value="14">14 Days</option>
                      <option value="30">30 Days</option>
                    </select>
                  </div>
                </div>
                <div className="item-field-container">
                  <label className="item-label">Accepted Items</label>
                  <input type="text" placeholder="e.g. Rice, Canned Goods" value={formData.acceptedItems} onChange={e => setFormData({...formData, acceptedItems: e.target.value})} />
                </div>
                <div className="item-field-container">
                  <label className="item-label">Description</label>
                  <textarea required value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} />
                </div>

                <div className="file-upload-fieldset">
                  <span className="item-label">IMAGES</span>
                  <div className="file-input-wrapper">
                    <label className="custom-browse-btn">
                      Browse...
                      <input type="file" multiple accept="image/*" hidden onChange={handleFileChange} />
                    </label>
                    <span className="file-name-display">
                      {images.length > 0 ? `${images.length} files selected` : "No file chosen"}
                    </span>
                  </div>
                  
                  {images.length > 0 && (
                    <div className="thumbnail-grid">
                      {images.map((file, index) => (
                        <div key={index} className="thumbnail-container">
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt="preview" 
                            className="thumbnail-img" 
                          />
                          <button 
                            type="button" 
                            className="remove-thumb-btn" 
                            onClick={() => removeSelectedImage(index)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button type="submit" className="submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Uploading..." : "Submit Request"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {selectedRequest && (
        <div className="content-modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="content-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Details</h3>
              <button className="close-btn" onClick={() => setSelectedRequest(null)}>×</button>
            </div>
            <div className="modal-body">
              {selectedRequest.imageUrls?.length > 0 && (
                <div className="carousel-container">
                  <div 
                    className="carousel-track" 
                    style={{ transform: `translateX(-${currentImgIndex * 100}%)` }}
                  >
                    {selectedRequest.imageUrls.map((url, index) => (
                      <img 
                        key={index}
                        src={url} 
                        alt={`request-${index}`} 
                        className="carousel-img" 
                      />
                    ))}
                  </div>
                  
                  {selectedRequest.imageUrls.length > 1 && (
                    <>
                      <button className="carousel-nav prev" onClick={handlePrevImage}>&#10094;</button>
                      <button className="carousel-nav next" onClick={handleNextImage}>&#10095;</button>
                      <div className="carousel-dots">
                        {selectedRequest.imageUrls.map((_, i) => (
                          <span key={i} className={`dot ${i === currentImgIndex ? 'active' : ''}`} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="modal-form-layout">
                <div className="item-field-container">
                  <label className="item-label">Name</label>
                  <div className="modal-data-field">{selectedRequest.fullName || "N/A"}</div>
                </div>
                <div className="item-field-container">
                  <label className="item-label">Contact</label>
                  <div className="modal-data-field">{selectedRequest.phone || "N/A"}</div>
                </div>
                <div className="form-row">
                  <div className="item-field-container">
                    <label className="item-label">Category</label>
                    <div className="modal-data-field">{selectedRequest.category || "N/A"}</div>
                  </div>
                  <div className="item-field-container">
                    <label className="item-label">Type</label>
                    <div className="modal-data-field">{selectedRequest.aidType || "N/A"}</div>
                  </div>
                </div>
                <div className="item-field-container">
                  <label className="item-label">Location</label>
                  <div className="modal-data-field">{selectedRequest.location || "N/A"}</div>
                </div>
                <div className="form-row">
                  <div className="item-field-container">
                    <label className="item-label">Goal/Quantity</label>
                    <div className="modal-data-field">
                      {selectedRequest.aidType === 'Fundraiser' ? `₱${selectedRequest.fundraiserGoal?.toLocaleString()}` : (selectedRequest.fundraiserGoal || "N/A")}
                    </div>
                  </div>
                  <div className="item-field-container">
                    <label className="item-label">Status</label>
                    <div className="modal-data-field">{selectedRequest.status || "N/A"}</div>
                  </div>
                </div>
                <div className="item-field-container">
                  <label className="item-label">Accepted Items</label>
                  <div className="modal-data-field">
                    {selectedRequest.acceptedItems?.length > 0 ? selectedRequest.acceptedItems.join(', ') : "N/A"}
                  </div>
                </div>
                <div className="item-field-container">
                  <label className="item-label">Message Body</label>
                  <div className="modal-data-field textarea-view">
                    {selectedRequest.description || "N/A"}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="action-btn approve" onClick={() => updateStatus(selectedRequest.id, 'Approved')}>Approve</button>
              <button className="action-btn decline" onClick={() => updateStatus(selectedRequest.id, 'Denied')}>Decline</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestPage;