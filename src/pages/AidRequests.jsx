import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase'; 
import { collection, onSnapshot, query, where, orderBy, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Header from '../components/header';
import Card from '../components/card';
import Footer from '../components/footer';
import '../components/home.css';

const AidRequests = () => {
  // UI States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Data States
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState([]);

  const [formData, setFormData] = useState({ 
    name: '', phone: '', desc: '', category: '', 
    aidType: 'In-Kind', location: '', fundraiserGoal: '', 
    postDurationDays: '7', acceptedItems: '' 
  });

  const categories = ["Basic Needs", "Health", "Food", "Education", "Disaster", "Financial"];

  // Fetch Approved Requests
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "aid_requests"), 
      where("status", "==", "Approved"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Automatic Carousel Logic
  useEffect(() => {
    let timer;
    if (selectedRequest && selectedRequest.imageUrls?.length > 1) {
      timer = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % selectedRequest.imageUrls.length);
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [selectedRequest]);

  // Reset image index when modal is closed
  useEffect(() => {
    if (!selectedRequest) setCurrentImageIndex(0);
  }, [selectedRequest]);

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImages(prev => [...prev, ...newFiles]);
    }
  };

  const removeSelectedImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
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

      alert("Request submitted successfully!");
      setFormData({ name: '', phone: '', desc: '', category: '', aidType: 'In-Kind', location: '', fundraiserGoal: '', postDurationDays: '7', acceptedItems: '' });
      setImages([]);
      setShowCreateModal(false);
    } catch (error) {
      console.error(error);
      alert("Failed to submit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFilter = (cat) => {
    setActiveFilters(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const filteredRequests = activeFilters.length === 0 
    ? requests 
    : requests.filter(req => activeFilters.includes(req.category));

  return (
    <div className="home-container">
      <Header />
      
      <section className="causes-section">
        <div className="causes-header">
          <div className="header-info">
            <div className="about-label">
              <span>Aid Requests</span>
              <div className="line"></div>
            </div>
            <h2 className="about-title">Help People With Their Aid Request!</h2>
          </div>
          <button className="read-more-btn" onClick={() => setShowCreateModal(true)}>
            + Create Aid Request
          </button>
        </div>

        {/* Categories / Filters */}
        <div className="filter-container" style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => toggleFilter(cat)}
              className={activeFilters.includes(cat) ? "filter-btn active" : "filter-btn"}
              style={{
                padding: '10px 20px', borderRadius: '20px', border: '1px solid #2196F3', cursor: 'pointer',
                backgroundColor: activeFilters.includes(cat) ? '#2196F3' : 'transparent',
                color: activeFilters.includes(cat) ? 'white' : '#2196F3', fontWeight: 'bold'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Requests Grid */}
        <div className="causes-grid">
          {loading ? (
            <p>Loading...</p>
          ) : filteredRequests.map(req => (
            <div key={req.id} className="aid-card-wrapper" onClick={() => setSelectedRequest(req)}>
              <Card 
                category={req.category}
                title={req.fullName} 
                description={req.description?.substring(0, 80) + "..."}
                raised={0} 
                goal={req.aidType === 'Fundraiser' ? `₱${req.fundraiserGoal?.toLocaleString()}` : `${req.fundraiserGoal} items`}
                image={req.imageUrls?.[0] || 'https://via.placeholder.com/300'}
                percentage={0}
              />
            </div>
          ))}
        </div>
      </section>

      {/* --- CREATE MODAL --- */}
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
                  <input type="text" placeholder="e.g. Rice, Canned Goods, Water" value={formData.acceptedItems} onChange={e => setFormData({...formData, acceptedItems: e.target.value})} />
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
                    <span className="file-name-display">{images.length > 0 ? `${images.length} files selected` : "No file chosen"}</span>
                  </div>
                  {images.length > 0 && (
                    <div className="thumbnail-grid">
                      {images.map((file, index) => (
                        <div key={index} className="thumbnail-container">
                          <img src={URL.createObjectURL(file)} alt="preview" className="thumbnail-img" />
                          <button type="button" className="remove-thumb-btn" onClick={() => removeSelectedImage(index)}>×</button>
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

      {/* --- DETAIL MODAL --- */}
      {selectedRequest && (
        <div className="content-modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="content-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Details</h3>
              <button className="close-btn" onClick={() => setSelectedRequest(null)}>×</button>
            </div>

            <div className="modal-body" style={{ padding: 0 }}>
              {/* CAROUSEL */}
              {selectedRequest.imageUrls?.length > 0 ? (
                <div className="carousel-container" style={{ width: '100%', height: '280px', position: 'relative', backgroundColor: '#000' }}>
                  <img 
                    src={selectedRequest.imageUrls[currentImageIndex]} 
                    alt={`Slide ${currentImageIndex + 1}`} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.4s ease' }}
                  />
                  {selectedRequest.imageUrls.length > 1 && (
                    <>
                      <button 
                        onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? selectedRequest.imageUrls.length - 1 : prev - 1))}
                        style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', fontSize: '20px', zIndex: 10 }}
                      >‹</button>
                      <button 
                        onClick={() => setCurrentImageIndex((prev) => (prev + 1) % selectedRequest.imageUrls.length)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', fontSize: '20px', zIndex: 10 }}
                      >›</button>
                      <div style={{ position: 'absolute', bottom: '15px', width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', zIndex: 10 }}>
                        {selectedRequest.imageUrls.map((_, i) => (
                          <button 
                            key={i} 
                            onClick={() => setCurrentImageIndex(i)}
                            style={{ width: '100px', height: '10px', borderRadius: '5px', border: 'none', padding: 0, background: i === currentImageIndex ? '#2196F3' : 'rgba(255,255,255,0.6)', cursor: 'pointer' }} 
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ width: '100%', height: '150px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>No Images Available</div>
              )}

              {/* DETAILS FIELDS */}
              <div className="modal-form-layout" style={{ padding: '25px 20px' }}>
                <div className="item-field-container">
                  <span className="item-label">Full Name</span>
                  <div className="modal-data-field">{selectedRequest.fullName}</div>
                </div>

                <div className="form-row">
                  <div className="item-field-container">
                    <span className="item-label">Phone</span>
                    <div className="modal-data-field">{selectedRequest.phone}</div>
                  </div>
                  <div className="item-field-container">
                    <span className="item-label">Category</span>
                    <div className="modal-data-field">{selectedRequest.category}</div>
                  </div>
                </div>

                <div className="item-field-container">
                  <span className="item-label">Location</span>
                  <div className="modal-data-field">{selectedRequest.location}</div>
                </div>

                <div className="form-row">
                  <div className="item-field-container">
                    <span className="item-label">Target Goal</span>
                    <div className="modal-data-field">
                      {selectedRequest.aidType === 'Fundraiser' 
                        ? `₱${selectedRequest.fundraiserGoal?.toLocaleString()}` 
                        : `${selectedRequest.fundraiserGoal} items`}
                    </div>
                  </div>
                  <div className="item-field-container">
                    <span className="item-label">Aid Type</span>
                    <div className="modal-data-field">{selectedRequest.aidType}</div>
                  </div>
                </div>

                {selectedRequest.aidType === 'In-Kind' && selectedRequest.acceptedItems?.length > 0 && (
                  <div className="item-field-container">
                    <span className="item-label">Accepted Items</span>
                    <div className="modal-data-field">{selectedRequest.acceptedItems.join(', ')}</div>
                  </div>
                )}

                <div className="item-field-container">
                  <span className="item-label">Description</span>
                  <div className="modal-data-field">{selectedRequest.description}</div>
                </div>
              </div>
            </div>

            {/* ACTION FOOTER WITH TWO BUTTONS */}
            <div className="modal-footer" style={{ padding: '20px', borderTop: '1px solid #eee', display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button 
                className="submit-btn" 
                onClick={() => alert("Redirecting to Item Donation Form...")}
                style={{ margin: 0, flex: 1, padding: '12px 20px', backgroundColor: '#4CAF50', fontSize: '14px' }}
              >
                DONATE ITEMS
              </button>
              
              <button 
                className="submit-btn" 
                onClick={() => alert("Redirecting to Donation Page...")}
                style={{ margin: 0, flex: 1, padding: '12px 20px', backgroundColor: '#2196F3', fontSize: '14px' }}
              >
                DONATE FUNDS
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AidRequests;