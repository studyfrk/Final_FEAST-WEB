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
  const [searchTerm, setSearchTerm] = useState('');
  const [photoError, setPhotoError] = useState(false);

  // Data States
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    desc: '',
    category: '',
    aidType: 'In-Kind',
    location: '',
    fundraiserGoal: '',
    itemQuantity: '',
    postDurationDays: '7',
    acceptedItems: '',
  });

  const categories = ['Basic Needs', 'Health', 'Food', 'Education', 'Disaster', 'Financial'];
  const aidTypes = ['In-Kind', 'Fundraiser', 'Supply & Support'];

  // Fetch Approved Requests
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'aid_requests'),
      where('status', '==', 'Approved'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    let timer;
    if (selectedRequest?.imageUrls?.length > 1) {
      timer = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % selectedRequest.imageUrls.length);
      }, 3500);
    }
    return () => clearInterval(timer);
  }, [selectedRequest]);

  useEffect(() => {
    if (!selectedRequest) setCurrentImageIndex(0);
  }, [selectedRequest]);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setImages((prev) => [...prev, ...Array.from(e.target.files)]);
      setPhotoError(false);
    }
  };

  const removeSelectedImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const openCreateModal = () => {
    setFormData({
      name: '', phone: '', desc: '', category: '',
      aidType: 'In-Kind', location: '', fundraiserGoal: '',
      itemQuantity: '', postDurationDays: '7', acceptedItems: '',
    });
    setImages([]);
    setPhotoError(false);
    setShowCreateModal(true);
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();

    if (images.length === 0) {
      setPhotoError(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const imageUrls = [];
      for (const image of images) {
        const storageRef = ref(storage, `requests/${Date.now()}_${image.name}`);
        await uploadBytes(storageRef, image);
        imageUrls.push(await getDownloadURL(storageRef));
      }

      await addDoc(collection(db, 'aid_requests'), {
        title: formData.name,
        phone: formData.phone,
        description: formData.desc,
        category: formData.category,
        aidType: formData.aidType,
        location: formData.location,
        fundraiserGoal: formData.aidType !== 'In-Kind' ? Number(formData.fundraiserGoal) : null,
        itemQuantity: formData.aidType !== 'Fundraiser' ? Number(formData.itemQuantity) : null,
        postDurationDays: Number(formData.postDurationDays),
        acceptedItems:
          formData.aidType !== 'Fundraiser' && formData.acceptedItems
            ? formData.acceptedItems.split(',').map((i) => i.trim()).filter(Boolean)
            : [],
        imageUrls,
        status: 'Unread',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      });

      alert('Request submitted successfully! It will appear once approved.');
      setShowCreateModal(false);
    } catch (error) {
      console.error(error);
      alert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFilter = (cat) => {
    setActiveFilters((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const filteredRequests = requests.filter((req) => {
    const matchesCategory = activeFilters.length === 0 || activeFilters.includes(req.category);
    const matchesSearch = (req.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Determine which donate buttons to show
  const showDonateItems = (aidType) => ['In-Kind', 'Supply & Support'].includes(aidType);
  const showDonateFunds = (aidType) => ['Fundraiser', 'Supply & Support'].includes(aidType);

  // Helper to format goal display
  const formatGoal = (req) => {
    if (req.aidType === 'Fundraiser') return req.fundraiserGoal ? `₱${Number(req.fundraiserGoal).toLocaleString()}` : '—';
    if (req.aidType === 'In-Kind') return req.itemQuantity ? `${req.itemQuantity} items` : '—';
    if (req.aidType === 'Supply & Support') {
      const parts = [];
      if (req.fundraiserGoal) parts.push(`₱${Number(req.fundraiserGoal).toLocaleString()}`);
      if (req.itemQuantity) parts.push(`${req.itemQuantity} items`);
      return parts.join(' · ') || '—';
    }
    return '—';
  };

  const aidTypeBadgeClass = (type) => {
    if (type === 'In-Kind') return `${styles.aidTypeBadge} ${styles.aidTypeBadgeInKind}`;
    if (type === 'Fundraiser') return `${styles.aidTypeBadge} ${styles.aidTypeBadgeFundraiser}`;
    return `${styles.aidTypeBadge} ${styles.aidTypeBadgeSupply}`;
  };

  return (
    <div className={styles.homeContainer}>
      <Header />

      <section className={styles.causesSection}>
        {/* Page Header */}
        <div className={styles.causesHeader}>
          <div className={styles.headerInfo}>
            <div className={styles.aboutLabel}>
              <span>Aid Requests</span>
              <div className={styles.line}></div>
            </div>
            <h2 className={styles.aboutTitle}>Help People With Their Aid Request!</h2>
          </div>
          <button className={styles.readMoreBtn} onClick={openCreateModal}>
            + Create Aid Request
          </button>
        </div>

        {/* Search */}
        <div className={styles.searchContainer}>
          <input
            className={styles.searchContainerInput}
            type="text"
            placeholder="Search aid requests by title…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Category Filters */}
        <div className={styles.filterContainer}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleFilter(cat)}
              className={`${styles.filterBtn} ${activeFilters.includes(cat) ? styles.filterBtnActive : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Requests Grid */}
        <div className={styles.causesGrid}>
          {loading ? (
            <p className={styles.emptyState}>Loading requests…</p>
          ) : filteredRequests.length === 0 ? (
            <p className={styles.emptyState}>No aid requests found.</p>
          ) : (
            filteredRequests.map((req) => (
              <div key={req.id} className={styles.aidCardWrapper} onClick={() => setSelectedRequest(req)}>
                <Card
                  category={req.category}
                  title={req.title}
                  description={(req.description || '').substring(0, 90) + '…'}
                  raised={0}
                  goal={formatGoal(req)}
                  image={req.imageUrls?.[0] || 'https://via.placeholder.com/300'}
                  percentage={0}
                />
              </div>
            ))
          )}
        </div>
      </section>

      {/* ===================== CREATE MODAL ===================== */}
      {showCreateModal && (
        <div className={styles.contentModalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>New Aid Request</h3>
              <button className={styles.closeBtn} onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <div className={styles.modalBody}>
              <form onSubmit={handleCreateRequest} className={styles.modalFormLayout}>

                {/* Title */}
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Request Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Typhoon Relief for Familia Santos"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {/* Phone */}
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Contact Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 09xxxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                {/* Category + Aid Type */}
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Category</label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="">Select…</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Aid Type</label>
                    <select
                      value={formData.aidType}
                      onChange={(e) => setFormData({ ...formData, aidType: e.target.value })}
                    >
                      {aidTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Location */}
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BF Almanza, Las Piñas City"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                {/* Conditional goal fields */}
                {formData.aidType === 'In-Kind' && (
                  <div className={styles.formRow}>
                    <div className={styles.itemFieldContainer}>
                      <label className={styles.itemLabel}>Item Quantity Goal</label>
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="e.g. 50"
                        value={formData.itemQuantity}
                        onChange={(e) => setFormData({ ...formData, itemQuantity: e.target.value })}
                      />
                    </div>
                    <div className={styles.itemFieldContainer}>
                      <label className={styles.itemLabel}>Duration (days)</label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        required
                        placeholder="e.g. 14"
                        value={formData.postDurationDays}
                        onChange={(e) => setFormData({ ...formData, postDurationDays: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {formData.aidType === 'Fundraiser' && (
                  <div className={styles.formRow}>
                    <div className={styles.itemFieldContainer}>
                      <label className={styles.itemLabel}>Monetary Goal (₱)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="e.g. 10000"
                        value={formData.fundraiserGoal}
                        onChange={(e) => setFormData({ ...formData, fundraiserGoal: e.target.value })}
                      />
                    </div>
                    <div className={styles.itemFieldContainer}>
                      <label className={styles.itemLabel}>Duration (days)</label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        required
                        placeholder="e.g. 30"
                        value={formData.postDurationDays}
                        onChange={(e) => setFormData({ ...formData, postDurationDays: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {formData.aidType === 'Supply & Support' && (
                  <>
                    <div className={styles.formRow}>
                      <div className={styles.itemFieldContainer}>
                        <label className={styles.itemLabel}>Monetary Goal (₱)</label>
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="e.g. 5000"
                          value={formData.fundraiserGoal}
                          onChange={(e) => setFormData({ ...formData, fundraiserGoal: e.target.value })}
                        />
                      </div>
                      <div className={styles.itemFieldContainer}>
                        <label className={styles.itemLabel}>Item Quantity Goal</label>
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="e.g. 20"
                          value={formData.itemQuantity}
                          onChange={(e) => setFormData({ ...formData, itemQuantity: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className={styles.itemFieldContainer}>
                      <label className={styles.itemLabel}>Duration (days)</label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        required
                        placeholder="e.g. 21"
                        value={formData.postDurationDays}
                        onChange={(e) => setFormData({ ...formData, postDurationDays: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {/* Accepted Items (In-Kind + Supply & Support) */}
                {formData.aidType !== 'Fundraiser' && (
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Accepted Items</label>
                    <input
                      type="text"
                      placeholder="e.g. Rice, Canned Goods, Blankets (comma-separated)"
                      value={formData.acceptedItems}
                      onChange={(e) => setFormData({ ...formData, acceptedItems: e.target.value })}
                    />
                  </div>
                )}

                {/* Description */}
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Description</label>
                  <textarea
                    required
                    placeholder="Describe your situation and what kind of help you need…"
                    value={formData.desc}
                    onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                  />
                </div>

                {/* Photo Upload */}
                <div className={styles.fileUploadFieldset}>
                  <span className={styles.itemLabel}>Photos (at least 1 required)</span>
                  <div className={styles.fileInputWrapper}>
                    <label className={styles.customBrowseBtn}>
                      Browse…
                      <input type="file" multiple accept="image/*" hidden onChange={handleFileChange} />
                    </label>
                    <span className={styles.fileNameDisplay}>
                      {images.length > 0 ? `${images.length} file(s) selected` : 'No file chosen'}
                    </span>
                  </div>
                  {photoError && (
                    <span className={styles.photoRequiredHint}>⚠ Please upload at least one photo to continue.</span>
                  )}
                  {images.length > 0 && (
                    <div className={styles.thumbnailGrid}>
                      {images.map((file, index) => (
                        <div key={index} className={styles.thumbnailContainer}>
                          <img src={URL.createObjectURL(file)} alt="preview" className={styles.thumbnailImg} />
                          <button
                            type="button"
                            className={styles.removeThumbBtn}
                            onClick={() => removeSelectedImage(index)}
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                  {isSubmitting ? 'Uploading…' : 'Submit Request'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===================== DETAIL MODAL ===================== */}
      {selectedRequest && (
        <div className={styles.contentModalOverlay} onClick={() => setSelectedRequest(null)}>
          <div className={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={styles.modalHeader}>
              <h3>Request Details</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedRequest(null)}>×</button>
            </div>

            {/* Scrollable Body */}
            <div className={styles.modalBody} style={{ padding: 0 }}>
              {/* Carousel */}
              {selectedRequest.imageUrls?.length > 0 ? (
                <div className={styles.carouselContainer}>
                  <img
                    src={selectedRequest.imageUrls[currentImageIndex]}
                    alt={`Slide ${currentImageIndex + 1}`}
                    className={styles.carouselImg}
                  />
                  {selectedRequest.imageUrls.length > 1 && (
                    <>
                      <button
                        className={`${styles.carouselNav} ${styles.prev}`}
                        onClick={() =>
                          setCurrentImageIndex((prev) =>
                            prev === 0 ? selectedRequest.imageUrls.length - 1 : prev - 1
                          )
                        }
                      >‹</button>
                      <button
                        className={`${styles.carouselNav} ${styles.next}`}
                        onClick={() =>
                          setCurrentImageIndex((prev) => (prev + 1) % selectedRequest.imageUrls.length)
                        }
                      >›</button>
                      <div className={styles.carouselDots}>
                        {selectedRequest.imageUrls.map((_, i) => (
                          <button
                            key={i}
                            className={`${styles.carouselDot} ${i === currentImageIndex ? styles.carouselDotActive : ''}`}
                            onClick={() => setCurrentImageIndex(i)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className={styles.noImagePlaceholder}>No Images Available</div>
              )}

              {/* Details */}
              <div className={styles.modalFormLayout} style={{ padding: '22px 20px' }}>
                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Aid Request Title</span>
                  <div className={styles.modalDataField}>{selectedRequest.title}</div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Contact Number</span>
                    <div className={styles.modalDataField}>{selectedRequest.phone}</div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Category</span>
                    <div className={styles.modalDataField}>{selectedRequest.category}</div>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Aid Type</span>
                    <div className={styles.modalDataField}>
                      <span className={aidTypeBadgeClass(selectedRequest.aidType)}>
                        {selectedRequest.aidType}
                      </span>
                    </div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Location</span>
                    <div className={styles.modalDataField}>{selectedRequest.location}</div>
                  </div>
                </div>

                {/* Goal fields based on type */}
                {selectedRequest.aidType === 'Fundraiser' && (
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Monetary Goal</span>
                    <div className={styles.modalDataField}>
                      ₱{Number(selectedRequest.fundraiserGoal || 0).toLocaleString()}
                    </div>
                  </div>
                )}

                {selectedRequest.aidType === 'In-Kind' && (
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Item Quantity Goal</span>
                    <div className={styles.modalDataField}>
                      {selectedRequest.itemQuantity || selectedRequest.fundraiserGoal} items
                    </div>
                  </div>
                )}

                {selectedRequest.aidType === 'Supply & Support' && (
                  <div className={styles.formRow}>
                    <div className={styles.itemFieldContainer}>
                      <span className={styles.itemLabel}>Monetary Goal</span>
                      <div className={styles.modalDataField}>
                        ₱{Number(selectedRequest.fundraiserGoal || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className={styles.itemFieldContainer}>
                      <span className={styles.itemLabel}>Item Quantity Goal</span>
                      <div className={styles.modalDataField}>
                        {selectedRequest.itemQuantity || 0} items
                      </div>
                    </div>
                  </div>
                )}

                {/* Accepted Items */}
                {selectedRequest.acceptedItems?.length > 0 && selectedRequest.aidType !== 'Fundraiser' && (
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Accepted Items</span>
                    <div className={styles.modalDataField}>
                      {selectedRequest.acceptedItems.join(', ')}
                    </div>
                  </div>
                )}

                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Duration</span>
                  <div className={styles.modalDataField}>
                    {selectedRequest.postDurationDays} day{selectedRequest.postDurationDays !== 1 ? 's' : ''}
                  </div>
                </div>

                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Description</span>
                  <div className={styles.modalDataField}>{selectedRequest.description}</div>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            {(showDonateItems(selectedRequest.aidType) || showDonateFunds(selectedRequest.aidType)) && (
              <div className={styles.modalFooter}>
                {showDonateItems(selectedRequest.aidType) && (
                  <button
                    className={styles.donateItemsBtn}
                    onClick={() => alert('Item donation coming soon.')}
                  >
                    DONATE ITEMS
                  </button>
                )}
                {showDonateFunds(selectedRequest.aidType) && (
                  <button
                    className={styles.donateFundsBtn}
                    onClick={() => alert('Fund donation coming soon.')}
                  >
                    DONATE FUNDS
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AidRequests;
