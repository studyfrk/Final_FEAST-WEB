import React, { useState, useEffect, useCallback } from 'react';
import { db, storage, auth } from '../firebase'; 
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Header from '../components/header';
import Card from '../components/card';
import Footer from '../components/footer';
import styles from '../components/requests_and_events.module.css';

const AidRequests = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [photoError, setPhotoError] = useState(false);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [images, setImages] = useState([]);

  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');
  const [showThankYouMessage, setShowThankYouMessage] = useState(false);
  const [isSendingDonation, setIsSendingDonation] = useState(false); 

  const [formData, setFormData] = useState({
    name: '',
    desc: '',
    category: '',
    aidType: 'In-Kind',
    fundraiserGoal: '',
    itemQuantity: '',
    postDurationDays: '1',
    acceptedItems: '',
  });

  const categories = ['Basic Needs', 'Health', 'Education', 'Disaster'];
  const aidTypes = ['In-Kind', 'Fundraiser'];

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
    }, (error) => {
      console.error("Error fetching requests: ", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

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
    setCurrentImageIndex(0);
  }, [selectedRequest]);

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, [images]);

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setImages((prev) => [...prev, ...newFiles]);
      setPhotoError(false);
    }
  };

  const removeSelectedImage = (index) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview); 
      return prev.filter((_, i) => i !== index);
    });
  };

  const openCreateModal = () => {
    setFormData({
      name: '', desc: '', category: '',
      aidType: 'In-Kind', fundraiserGoal: '',
      itemQuantity: '', postDurationDays: '1', acceptedItems: '',
    });
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    setPhotoError(false);
    setShowCreateModal(true);
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();

    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert("You must be logged in to submit an aid request.");
      return;
    }

    if (images.length === 0) {
      setPhotoError(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const imageUrls = [];
      for (const imgObj of images) {
        const storageRef = ref(storage, `requests/${Date.now()}_${imgObj.file.name}`);
        await uploadBytes(storageRef, imgObj.file);
        const downloadUrl = await getDownloadURL(storageRef);
        imageUrls.push(downloadUrl);
      }

      await addDoc(collection(db, 'aid_requests'), {
        authorId: currentUser.uid, 
        title: formData.name,
        description: formData.desc,
        category: formData.category,
        aidType: formData.aidType,
        fundraiserGoal: formData.aidType !== 'In-Kind' ? Number(formData.fundraiserGoal) : null,
        itemQuantity: formData.aidType !== 'Fundraiser' ? Number(formData.itemQuantity) : null,
        raised: 0,  
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

      images.forEach((img) => URL.revokeObjectURL(img.preview));
      setImages([]);
      
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating request: ", error);
      alert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDonationSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest) {
      alert("No active request selected. Please close and try again.");
      return;
    }

    setIsSendingDonation(true);
    try {
      const currentUser = auth.currentUser;
      const generatedRefNo = `BRGY-${Math.floor(100000 + Math.random() * 900000)}`;

      await addDoc(collection(db, 'donation_funds'), {
        donorName: currentUser?.displayName || currentUser?.email || "Anonymous Donor",
        userId: currentUser?.uid || null,
        amount: Number(donationAmount) || 0,
        referenceNumber: generatedRefNo,
        targetRequestId: selectedRequest.id || "Unknown ID",
        targetRequestTitle: selectedRequest.title || selectedRequest.name || "General Fundraiser Cause",
        status: 'Unread', 
        receiptUrls: [], 
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setShowThankYouMessage(true);
    } catch (error) {
      console.error("Error creating donation entry: ", error);
      alert("Failed to record donation request. Please verify your connection.");
    } finally {
      setIsSendingDonation(false);
    }
  };

  const closeDonationModal = () => {
    setShowDonateModal(false);
    setDonationAmount('');
    setShowThankYouMessage(false);
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

  const showDonateItems = (aidType) => aidType === 'In-Kind';
  const showDonateFunds = (aidType) => aidType === 'Fundraiser';

  const formatGoal = (req) => {
    if (req.aidType === 'Fundraiser') return req.fundraiserGoal ? `₱${Number(req.fundraiserGoal).toLocaleString()}` : '—';
    if (req.aidType === 'In-Kind') return req.itemQuantity ? `${req.itemQuantity} items` : '—';
    return '—';
  };

  const aidTypeBadgeClass = useCallback((type) => {
    if (type === 'In-Kind') return `${styles.aidTypeBadge} ${styles.aidTypeBadgeInKind}`;
    return `${styles.aidTypeBadge} ${styles.aidTypeBadgeFundraiser}`;
  }, []);

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
          <button className={styles.readMoreBtn} onClick={openCreateModal}>
            + Create Aid Request
          </button>
        </div>

        <div className={styles.searchContainer}>
          <input
            className={styles.searchContainerInput}
            type="text"
            placeholder="Search aid requests by title…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

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

        <div className={styles.causesGrid}>
          {loading ? (
            <p className={styles.emptyState}>Loading requests…</p>
          ) : filteredRequests.length === 0 ? (
            <p className={styles.emptyState}>No aid requests found.</p>
          ) : (
            filteredRequests.map((req) => {
              const currentRaised = Number(req.raised || 0);
              const targetGoal = Number(req.aidType === 'Fundraiser' ? req.fundraiserGoal : req.itemQuantity) || 0;
              
              const targetPercent = targetGoal > 0 
                ? Math.min(Math.round((currentRaised / targetGoal) * 100), 100) 
                : 0;

              const raisedDisplayString = req.aidType === 'Fundraiser' 
                ? `₱${currentRaised.toLocaleString()}` 
                : `${currentRaised} items`;

              return (
                <div key={req.id} className={styles.aidCardWrapper} onClick={() => setSelectedRequest(req)}>
                  <Card
                    category={req.category}
                    title={req.title}
                    description={(req.description || '').substring(0, 90) + '…'}
                    raised={raisedDisplayString}
                    goal={formatGoal(req)}
                    image={req.imageUrls?.[0] || 'https://via.placeholder.com/300'}
                    percentage={targetPercent}
                  />
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className={styles.contentModalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>New Aid Request</h3>
              <button className={styles.closeBtn} onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <div className={styles.modalBody}>
              <form onSubmit={handleCreateRequest} className={styles.modalFormLayout}>
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
                      <label className={styles.itemLabel}>Duration (days, max 14)</label>
                      <input
                        type="number"
                        min="1"
                        max="14"
                        required
                        placeholder="e.g. 1"
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
                      <label className={styles.itemLabel}>Duration (days, max 14)</label>
                      <input
                        type="number"
                        min="1"
                        max="14"
                        required
                        placeholder="e.g. 1"
                        value={formData.postDurationDays}
                        onChange={(e) => setFormData({ ...formData, postDurationDays: e.target.value })}
                      />
                    </div>
                  </div>
                )}

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

                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Description</label>
                  <textarea
                    required
                    placeholder="Describe your situation and what kind of help you need…"
                    value={formData.desc}
                    onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                  />
                </div>

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
                      {images.map((imgObj, index) => (
                        <div key={index} className={styles.thumbnailContainer}>
                          <img src={imgObj.preview} alt="preview" className={styles.thumbnailImg} />
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

      {/* DETAIL MODAL */}
      {selectedRequest && (
        <div className={styles.contentModalOverlay} onClick={() => setSelectedRequest(null)}>
          <div className={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Request Details</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedRequest(null)}>×</button>
            </div>

            <div className={styles.modalBody} style={{ padding: 0 }}>
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

              <div className={styles.modalFormLayout} style={{ padding: '22px 20px' }}>
                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Aid Request Title</span>
                  <div className={styles.modalDataField}>{selectedRequest.title}</div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Category</span>
                    <div className={styles.modalDataField}>{selectedRequest.category}</div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Aid Type</span>
                    <div className={styles.modalDataField}>
                      <span className={aidTypeBadgeClass(selectedRequest.aidType)}>
                        {selectedRequest.aidType}
                      </span>
                    </div>
                  </div>
                </div>

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
                      {selectedRequest.itemQuantity || 0} items
                    </div>
                  </div>
                )}

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
                    onClick={() => setShowDonateModal(true)}
                  >
                    DONATE FUNDS
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DONATION MODAL */}
      {showDonateModal && (
        <div className={styles.contentModalOverlay} onClick={closeDonationModal}>
          <div className={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Donate to {selectedRequest?.title}</h3>
              <button className={styles.closeBtn} onClick={closeDonationModal}>×</button>
            </div>

            <div className={styles.modalBody}>
              {!showThankYouMessage ? (
                <form onSubmit={handleDonationSubmit} className={styles.modalFormLayout}>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>How much are you willing to donate? (₱)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="Enter donation amount"
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(e.target.value)}
                    />
                  </div>
                  <button type="submit" className={styles.submitBtn} disabled={isSendingDonation}>
                    {isSendingDonation ? 'Processing...' : 'Send Donation Request'}
                  </button>
                </form>
              ) : (
                <div className={styles.donationSuccessContainer}>
                  <h4 className={styles.donationSuccessTitle}>
                    Thank you for your kind donation!
                  </h4>
                  <p className={styles.donationSuccessText}>
                    You can now go to the barangay office to submit your donation.
                  </p>
                  <button 
                    type="button" 
                    className={styles.submitBtn} 
                    onClick={closeDonationModal}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AidRequests;