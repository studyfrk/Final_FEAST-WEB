import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase'; 
import { collection, onSnapshot, addDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './request_page.css';

const RequestPage = () => {
  const [requests, setRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [formData, setFormData] = useState({ name: '', phone: '', desc: '', fullContent: '' });
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  // 1. Fetching Data with Real-time Listener
  useEffect(() => {
    const q = query(collection(db, "aid_requests"), orderBy("createdAt", "desc"));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(data);
    }, (error) => {
      console.error("Firestore Listener Error:", error);
    });

    return () => unsub();
  }, []);

  const handleSelectRequest = async (req) => {
    setSelectedRequest(req);
    setCurrentImgIndex(0);
    if (req.status?.toLowerCase() === 'unread') {
      try {
        await updateDoc(doc(db, "aid_requests", req.id), { status: 'Processing' });
      } catch (err) {
        console.error("Update Status Error:", err);
      }
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "aid_requests", id), { status: newStatus });
      setSelectedRequest(null);
    } catch (err) {
      console.error("Update Status Error:", err);
    }
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
        fullContent: formData.fullContent,
        imageUrls: imageUrls, 
        status: 'Unread',
        createdAt: new Date().toISOString(), 
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      });

      setFormData({ name: '', phone: '', desc: '', fullContent: '' });
      setImages([]);
      setShowCreateModal(false);
    } catch (error) {
      console.error("Upload/Submission error:", error);
      alert("Failed to submit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredData = requests.filter(req => {
    const matchesSearch = (req.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (req.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (req.category || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' || req.status === filterStatus;
    return matchesSearch && matchesFilter;
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
            <option value="Valid">Valid</option>
            <option value="Invalid">Invalid</option>
          </select>

          <div className="search-container">
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>

        <button className="create-btn" onClick={() => setShowCreateModal(true)}>
          + Add Request
        </button>
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
            {filteredData.length > 0 ? (
              filteredData.map((req) => (
                <tr 
                  key={req.id} 
                  className={`clickable-row ${req.status?.toLowerCase() === 'unread' ? 'unread-row' : ''}`} 
                  onClick={() => handleSelectRequest(req)}
                >
                  <td className="truncate-cell">
                    <span className="req-name">{req.fullName || "Unavailable"}</span>
                  </td>
                  <td>{req.category || "N/A"}</td>
                  <td>{req.aidType || "N/A"}</td>
                  <td className="truncate-cell">{req.description || "No Description"}</td>
                  <td className="truncate-cell">{req.location || "No Location"}</td>
                  <td>{req.date || "No Date"}</td>
                  <td>
                    <span className={`status-pill ${req.status?.toLowerCase() || 'unread'}`}>
                        {req.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No requests found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="content-modal-overlay">
          <div className="content-modal">
            <div className="modal-header">
              <h3>New Request</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateRequest} className="create-form">
                <input type="text" placeholder="Full Name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <input type="text" placeholder="Phone Number" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                <input type="text" placeholder="Short Description" required value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} />
                <textarea placeholder="Detailed Content" required value={formData.fullContent} onChange={e => setFormData({...formData, fullContent: e.target.value})} />
                <div className="file-input-wrapper">
                   <label>Upload Images:</label>
                   <input type="file" multiple accept="image/*" onChange={e => setImages(Array.from(e.target.files))} />
                </div>
                <button type="submit" className="submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Uploading..." : "Submit Request"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedRequest && (
        <div className="content-modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="content-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Details</h3>
              <button className="close-btn" onClick={() => setSelectedRequest(null)}>×</button>
            </div>
            <div className="modal-body">
              {selectedRequest.imageUrls?.length > 0 && (
                <div className="carousel">
                  <img src={selectedRequest.imageUrls[currentImgIndex]} alt="request" className="carousel-img" />
                  {selectedRequest.imageUrls.length > 1 && (
                    <div className="carousel-btns">
                      <button onClick={() => setCurrentImgIndex(prev => (prev > 0 ? prev - 1 : selectedRequest.imageUrls.length - 1))}>‹</button>
                      <span>{currentImgIndex + 1} / {selectedRequest.imageUrls.length}</span>
                      <button onClick={() => setCurrentImgIndex(prev => (prev < selectedRequest.imageUrls.length - 1 ? prev + 1 : 0))}>›</button>
                    </div>
                  )}
                </div>
              )}
              <div className="modal-meta">
                <p><strong>From:</strong> {selectedRequest.fullName}</p>
                <p><strong>Category:</strong> {selectedRequest.category || "N/A"}</p>
                <p><strong>Status:</strong> {selectedRequest.status}</p>
              </div>
              <hr className="modal-divider" />
              <div className="modal-text">
                <h4>Message Body:</h4>
                <p>{selectedRequest.fullContent || selectedRequest.description}</p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="action-btn approve" onClick={() => updateStatus(selectedRequest.id, 'Valid')}>Approve</button>
              <button className="action-btn decline" onClick={() => updateStatus(selectedRequest.id, 'Invalid')}>Decline</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestPage;