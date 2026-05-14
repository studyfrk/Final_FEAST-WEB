import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase'; 
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Header from '../components/header';
import Card from '../components/card';
import Footer from '../components/footer';
import styles from '../components/requests_and_events.module.css';

const AidRequests = () => {
  // UI States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState(''); // Added Search State
  
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
        title: formData.name, // This is the "Aid Request Title"
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

  // Combined Search and Category Filtering
  const filteredRequests = requests.filter(req => {
    const matchesCategory = activeFilters.length === 0 || activeFilters.includes(req.category);
    const matchesSearch = (req.title || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className={styles.homeContainer}>
      <Header />
      
      <section className={styles.causesSection}>
        <div className={styles.causesHeader}>
          <div className={styles.headerInfo}>
            <div className={styles.aboutLabel}>
              <span>Aid Requests</span>
              <div className={styles.line}></div>
            </div>
            <h2 className={styles.aboutTitle}>Help People With Their Aid Request!</h2>
          </div>
          <button className={styles.readMoreBtn} onClick={() => setShowCreateModal(true)}>
            + Create Aid Request
          </button>
        </div>

        {/* Search Bar */}
        <div className={styles.searchContainer} style={{ marginBottom: '20px', width: '100%' }}>
          <input 
            className={styles.searchContainerInput}
            type="text" 
            placeholder="Search aid requests by title..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px 20px', 
              borderRadius: '25px', 
              border: '1px solid #ddd', 
              fontSize: '16px',
              outline: 'none'
            }}
          />
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
        <div className={styles.causesGrid}>
          {loading ? (
            <p>Loading...</p>
          ) : filteredRequests.map(req => (
            <div key={req.id} className={styles.aidCardWrapper} onClick={() => setSelectedRequest(req)}>
              <Card 
                category={req.category}
                title={req.title} 
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
        <div className={styles.contentModalOverlay}>
          <div className={styles.contentModal}>
            <div className={styles.modalHeader}>
              <h3>New Request</h3>
              <button className={styles.closeBtn} onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleCreateRequest} className={styles.modalFormLayout}>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Aid Request Title</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Phone Number</label>
                  <input type="text" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Category</label>
                    <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      <option value="">Select Category</option>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Aid Type</label>
                    <select value={formData.aidType} onChange={e => setFormData({...formData, aidType: e.target.value})}>
                      <option value="In-Kind">In-Kind</option>
                      <option value="Fundraiser">Fundraiser</option>
                    </select>
                  </div>
                </div>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Location</label>
                  <input type="text" required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                </div>
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>{formData.aidType === 'Fundraiser' ? 'Goal (₱)' : 'Quantity'}</label>
                    <input type="number" required value={formData.fundraiserGoal} onChange={e => setFormData({...formData, fundraiserGoal: e.target.value})} />
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Duration</label>
                    <select value={formData.postDurationDays} onChange={e => setFormData({...formData, postDurationDays: e.target.value})}>
                      <option value="7">7 Days</option>
                      <option value="14">14 Days</option>
                      <option value="30">30 Days</option>
                    </select>
                  </div>
                </div>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Accepted Items</label>
                  <input type="text" placeholder="e.g. Rice, Canned Goods, Water" value={formData.acceptedItems} onChange={e => setFormData({...formData, acceptedItems: e.target.value})} />
                </div>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Description</label>
                  <textarea required value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} />
                </div>

                <div className={styles.fileUploadFieldset}>
                  <span className={styles.itemLabel}>IMAGES</span>
                  <div className={styles.fileInputWrapper}>
                    <label className={styles.customBrowseBtn}>
                      Browse...
                      <input type="file" multiple accept="image/*" hidden onChange={handleFileChange} />
                    </label>
                    <span className={styles.fileNameDisplay}>{images.length > 0 ? `${images.length} files selected` : "No file chosen"}</span>
                  </div>
                  {images.length > 0 && (
                    <div className={styles.thumbnailGrid}>
                      {images.map((file, index) => (
                        <div key={index} className={styles.thumbnailContainer}>
                          <img src={URL.createObjectURL(file)} alt="preview" className={styles.thumbnailImg} />
                          <button type="button" className={styles.removeThumbBtn} onClick={() => removeSelectedImage(index)}>×</button>
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

      {/* --- DETAIL MODAL --- */}
      {selectedRequest && (
        <div className={styles.contentModalOverlay} onClick={() => setSelectedRequest(null)}>
          <div className={styles.contentModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Request Details</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedRequest(null)}>×</button>
            </div>

            <div className={styles.modalBody} style={{ padding: 0 }}>
              {/* CAROUSEL */}
              {selectedRequest.imageUrls?.length > 0 ? (
                <div className={styles.carouselContainer} style={{ width: '100%', height: '280px', position: 'relative', backgroundColor: '#000' }}>
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
                    </>
                  )}
                </div>
              ) : (
                <div style={{ width: '100%', height: '150px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>No Images Available</div>
              )}

              {/* DETAILS FIELDS */}
              <div className={styles.modalFormLayout} style={{ padding: '25px 20px' }}>
                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Aid Request Title</span>
                  <div className={styles.modalDataField}>{selectedRequest.title}</div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Phone</span>
                    <div className={styles.modalDataField}>{selectedRequest.phone}</div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Category</span>
                    <div className={styles.modalDataField}>{selectedRequest.category}</div>
                  </div>
                </div>

                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Location</span>
                  <div className={styles.modalDataField}>{selectedRequest.location}</div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Target Goal</span>
                    <div className={styles.modalDataField}>
                      {selectedRequest.aidType === 'Fundraiser' 
                        ? `₱${selectedRequest.fundraiserGoal?.toLocaleString()}` 
                        : `${selectedRequest.fundraiserGoal} items`}
                    </div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Aid Type</span>
                    <div className={styles.modalDataField}>{selectedRequest.aidType}</div>
                  </div>
                </div>

                {selectedRequest.aidType === 'In-Kind' && selectedRequest.acceptedItems?.length > 0 && (
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Accepted Items</span>
                    <div className={styles.modalDataField}>{selectedRequest.acceptedItems.join(', ')}</div>
                  </div>
                )}

                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Description</span>
                  <div className={styles.modalDataField}>{selectedRequest.description}</div>
                </div>
              </div>
            </div>

            {/* ACTION FOOTER */}
            <div className={styles.modalFooter} style={{ padding: '20px', borderTop: '1px solid #eee', display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button 
                className={styles.submitBtn} 
                onClick={() => alert("Redirecting to Item Donation Form...")}
                style={{ margin: 0, flex: 1, padding: '12px 20px', backgroundColor: '#4CAF50', fontSize: '14px' }}
              >
                DONATE ITEMS
              </button>
              
              <button 
                className={styles.submitBtn} 
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