/* React & Firebase Imports */
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { db, storage, auth } from '../firebase';
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';

/* Component Imports */
import Header from '../components/Header.jsx';
import Card from '../components/AidCard.jsx';
import Footer from '../components/Footer.jsx';

/* Style Imports */
import styles from '../components/requests_and_events.module.css';

/* ── Animated Modal Wrapper ─────────────────────────────────────────────── */
const AnimatedModal = ({ children, onClose, maxWidth, style }) => {
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 210);
  };

  return (
    <div
      className={`${styles.contentModalOverlay}${closing ? ' ' + styles.closing : ''}`}
      onClick={handleClose}
    >
      <div
        className={styles.contentModal}
        style={{ maxWidth: maxWidth || 560, ...style }}
        onClick={(e) => e.stopPropagation()}
      >
        {React.Children.map(children, child =>
          React.isValidElement(child) ? React.cloneElement(child, { _onClose: handleClose }) : child
        )}
      </div>
    </div>
  );
};

/* ── Search Icon (SVG) ──────────────────────────────────────────────────── */
const SearchIcon = () => (
  <span className={styles.searchIcon}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  </span>
);

const AidRequests = () => {
  const location = useLocation();
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

  const [, setTimeTicker] = useState(Date.now());

  const [pendingFundIds, setPendingFundIds] = useState([]);
  const [pendingItemIds, setPendingItemIds] = useState([]);

  const [themeModal, setThemeModal] = useState(null);
  const [isResident, setIsResident] = useState(false);

  const showAlert = (message) => {
    return new Promise((resolve) => {
      setThemeModal({ type: 'alert', message, onConfirm: () => { setThemeModal(null); resolve(); } });
    });
  };

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
    const interval = setInterval(() => {
      setTimeTicker(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'aid_requests'),
      where('status', '==', 'Ongoing'),
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
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // --- NEW: Fetch user document for resident status ---
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            // Adjust this condition to match your exact database fields
            if (userData.isResident === true || userData.role === 'Resident' || userData.status === 'Verified') {
              setIsResident(true);
            } else {
              setIsResident(false);
            }
          }
        } catch (err) {
          console.error("Error fetching user status:", err);
          setIsResident(false);
        }

        // --- EXISTING: Fund and Item Queries ---
        const qFunds = query(collection(db, 'donation_funds'), where('userId', '==', user.uid));
        const unsubFunds = onSnapshot(qFunds, (snap) => {
          const pending = snap.docs
            .map(d => d.data())
            .filter(data => data.status === 'Unread' || data.status === 'Processing')
            .map(data => data.targetRequestId);
          setPendingFundIds(pending);
        });

        const qItems = query(collection(db, 'donation_items'), where('userId', '==', user.uid));
        const unsubItems = onSnapshot(qItems, (snap) => {
          const pending = snap.docs
            .map(d => d.data())
            .filter(data => data.status === 'Unread' || data.status === 'Processing')
            .map(data => data.targetRequestId);
          setPendingItemIds(pending);
        });

        return () => {
          unsubFunds();
          unsubItems();
        };
      } else {
        setPendingFundIds([]);
        setPendingItemIds([]);
        setIsResident(false); // Reset status on logout
      }
    });

    return () => unsubscribeAuth();
  }, []);

  /* ── Carousel auto-advance with reset on selectedRequest change ── */
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

  const getRequestDurationStatus = (req) => {
    const startTimeField = req?.approvedAt || req?.createdAt;
    if (!startTimeField) return { text: `${req?.postDurationDays || 1} days left`, isFinished: false };

    const startTimeMs = startTimeField.toDate ? startTimeField.toDate().getTime() : new Date(startTimeField).getTime();
    const durationMs = Number(req.postDurationDays || 1) * 24 * 60 * 60 * 1000;
    const expirationTime = startTimeMs + durationMs;
    const now = Date.now();
    const remainingMs = expirationTime - now;

    if (remainingMs <= 0) return { text: "Expired / Finished", isFinished: true };

    const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
    const remainingHours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const remainingSeconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

    let timeText = "";
    if (remainingDays > 0) {
      timeText = `${remainingDays} ${remainingDays === 1 ? 'day' : 'days'} and ${remainingHours} ${remainingHours === 1 ? 'hour' : 'hours'} left`;
    } else if (remainingHours > 0) {
      timeText = `${remainingHours} ${remainingHours === 1 ? 'hour' : 'hours'} and ${remainingMinutes} ${remainingMinutes === 1 ? 'min' : 'mins'} left`;
    } else {
      timeText = `${remainingMinutes} ${remainingMinutes === 1 ? 'minute' : 'minutes'} and ${remainingSeconds} ${remainingSeconds === 1 ? 'second' : 'seconds'} left`;
    }

    return { text: timeText, isFinished: false };
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();

    const currentUser = auth.currentUser;
    if (!currentUser) {
      await showAlert("You must be logged in to submit an aid request.");
      return;
    }

    if (images.length === 0) {
      setPhotoError(true);
      return;
    }

    setIsSubmitting(true);
    try {
      let authorName = currentUser.displayName || '';

      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.firstName && userData.lastName) {
            authorName = `${userData.firstName} ${userData.lastName}`;
          } else {
            authorName = userData.fullName || userData.name || userData.username || authorName;
          }
        }
      } catch (err) {
        console.log("Could not look up specific profile fields, falling back onto auth info", err);
      }

      if (!authorName.trim()) {
        authorName = currentUser.email ? currentUser.email.split('@')[0] : 'User';
      }

      const imageUrls = [];
      for (const imgObj of images) {
        const storageRef = ref(storage, `requests/${Date.now()}_${imgObj.file.name}`);
        await uploadBytes(storageRef, imgObj.file);
        const downloadUrl = await getDownloadURL(storageRef);
        imageUrls.push(downloadUrl);
      }

      await addDoc(collection(db, 'aid_requests'), {
        authorId: currentUser.uid,
        authorName: authorName,
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
        status: 'Pending',
        approvalStatus: 'Unread',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      });

      images.forEach((img) => URL.revokeObjectURL(img.preview));
      setImages([]);

      await showAlert('Request submitted! It will appear once approved.');
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating request: ", error);
      await showAlert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDonationSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest) {
      await showAlert("No active request selected. Please close and try again.");
      return;
    }

    setIsSendingDonation(true);
    try {
      const currentUser = auth.currentUser;
      const generatedRefNo = `BRGY-${Math.floor(100000 + Math.random() * 900000)}`;

      await addDoc(collection(db, 'donation_funds'), {
        donorName: currentUser?.displayName || currentUser?.email || "Donor",
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
      await showAlert("Failed to record donation request. Please verify your connection.");
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

  const pendingSet = new Set([...pendingFundIds, ...pendingItemIds]);

  const filteredRequests = requests
    .filter((req) => {
      const durationInfo = getRequestDurationStatus(req);
      if (durationInfo.isFinished) return false;

      const matchesCategory = activeFilters.length === 0 || activeFilters.includes(req.category);
      const matchesSearch = (req.title || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      const aPending = pendingSet.has(a.id);
      const bPending = pendingSet.has(b.id);
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      return 0;
    });

  const showDonateItems = (aidType) => aidType === 'In-Kind';
  const showDonateFunds = (aidType) => aidType === 'Fundraiser';

  const formatGoal = (req) => {
    if (req.aidType === 'Fundraiser') return req.fundraiserGoal ? `₱${Number(req.fundraiserGoal).toLocaleString()}` : '—';
    if (req.aidType === 'In-Kind') return 'Ongoing Need';
    return '—';
  };

  const aidTypeBadgeClass = useCallback((type) => {
    if (type === 'In-Kind') return `${styles.aidTypeBadge} ${styles.aidTypeBadgeInKind}`;
    return `${styles.aidTypeBadge} ${styles.aidTypeBadgeFundraiser}`;
  }, []);

  const [showInKindModal, setShowInKindModal] = useState(false);
  const [inKindItems, setInKindItems] = useState([{ item: '', quantity: '' }]);

  const handleInKindChange = (index, field, value) => {
    const updatedItems = [...inKindItems];
    updatedItems[index][field] = value;
    setInKindItems(updatedItems);
  };

  const addInKindRow = () => {
    setInKindItems([...inKindItems, { item: '', quantity: '' }]);
  };

  const removeInKindRow = (index) => {
    if (inKindItems.length > 1) {
      setInKindItems(inKindItems.filter((_, i) => i !== index));
    }
  };

  useEffect(() => {
    const targetId = location.state?.targetId;
    if (targetId && requests.length > 0) {
      const targetItem = requests.find((item) => item.id === targetId);
      if (targetItem) {
        setSelectedRequest(targetItem);
        window.history.replaceState({}, document.title);
      }
    }
  }, [requests, location.state]);

  /* ── Carousel nav handlers (immediate, no delay) ── */
  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === 0 ? (selectedRequest?.imageUrls?.length || 1) - 1 : prev - 1
    );
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % (selectedRequest?.imageUrls?.length || 1));
  };

  return (
    <div className={styles.homeContainer}>
      <Header />

      {/* ── Yellow patterned background for Aid Requests ── */}
      <section className={`${styles.causesSection} ${styles.causesSectionAid}`}>
        <div className={styles.causesHeader}>
          <div className={styles.headerInfo}>
            <div className={styles.aboutLabel}>
              <span>Aid Requests</span>
              <div className={`${styles.line} ${styles.aidAccentLine}`}></div>
            </div>
            <h2 className={styles.aboutTitle}>Help People With Their Aid Request!</h2>
          </div>
          {/* Green "Create Aid Request" button */}

          {isResident && (
            <button
            className={`${styles.readMoreBtn} ${styles.readMoreBtnGreen}`}
            onClick={openCreateModal}
            >
               + Create Aid Request
            </button>
          )}
          </div>

        {/* Search with magnifying glass icon */}
        <div className={styles.searchContainer}>
          <SearchIcon />
          <input
            className={`${styles.searchContainerInput} ${styles.searchAid}`}
            type="text"
            placeholder="Search aid requests by title…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter chips — yellow accent for Aid page */}
        <div className={styles.filterContainer}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleFilter(cat)}
              className={`${styles.filterBtn} ${
                activeFilters.includes(cat)
                  ? styles.filterBtnActiveYellow
                  : styles.filterBtnYellow
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className={styles.causesGrid}>
          {loading ? (
            <div className={styles.emptyState}>
              <div className={styles.loadingSpinner}></div>
              <span>Loading requests…</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <p className={styles.emptyState}>No aid requests found.</p>
          ) : (
            filteredRequests.map((req) => {
              const currentRaised = Number(req.raised || 0);
              let targetPercent = 0;
              let raisedDisplayString = '';
              let goalDisplayString = '';

              if (req.aidType === 'Fundraiser') {
                const targetGoal = Number(req.fundraiserGoal) || 0;
                targetPercent = targetGoal > 0
                  ? Math.min(Math.round((currentRaised / targetGoal) * 100), 100)
                  : 0;
                raisedDisplayString = `₱${currentRaised.toLocaleString()}`;
                goalDisplayString = formatGoal(req);
              } else {
                raisedDisplayString = `${currentRaised} items donated so far`;
                goalDisplayString = req.acceptedItems?.length > 0
                  ? `Needed: ${req.acceptedItems.join(', ')}`
                  : 'Ongoing Donation';
              }

              return (
                <div key={req.id} className={styles.aidCardWrapper} onClick={() => setSelectedRequest(req)}>
                  <Card
                    category={req.category}
                    title={req.title}
                    description={(req.description || '').substring(0, 90) + '…'}
                    raised={raisedDisplayString}
                    goal={goalDisplayString}
                    image={req.imageUrls?.[0] || 'https://via.placeholder.com/300'}
                    percentage={targetPercent}
                    hideProgressBar={req.aidType === 'In-Kind'}
                    isPending={pendingSet.has(req.id)}
                  />
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ══════════════════════ CREATE MODAL ══════════════════════ */}
      {showCreateModal && (
        <AnimatedModal onClose={() => setShowCreateModal(false)}>
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

              <div className={styles.fileUploadFieldset} style={photoError ? { borderColor: '#e05a5a' } : {}}>
                <span className={styles.itemLabel} style={photoError ? { color: '#e05a5a' } : {}}>
                  Photos (at least 1 required)
                </span>
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
        </AnimatedModal>
      )}

      {/* ══════════════════════ DETAIL MODAL ══════════════════════ */}
      {selectedRequest && (
        <AnimatedModal onClose={() => setSelectedRequest(null)}>
          <div className={styles.modalHeader}>
            <h3>Request Details</h3>
            <button className={styles.closeBtn} onClick={() => setSelectedRequest(null)}>×</button>
          </div>

          <div className={styles.modalBody} style={{ padding: 0 }}>
            {selectedRequest.imageUrls?.length > 0 ? (
              <div className={styles.carouselContainer}>
                {selectedRequest.imageUrls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Slide ${i + 1}`}
                    className={`${styles.carouselImg}${i === currentImageIndex ? ' ' + styles.active : ''}`}
                  />
                ))}
                {selectedRequest.imageUrls.length > 1 && (
                  <>
                    <button className={`${styles.carouselNav} ${styles.prev}`} onClick={handlePrev}>‹</button>
                    <button className={`${styles.carouselNav} ${styles.next}`} onClick={handleNext}>›</button>
                    <div className={styles.carouselDots}>
                      {selectedRequest.imageUrls.map((_, i) => (
                        <button
                          key={i}
                          className={`${styles.carouselDot}${i === currentImageIndex ? ' ' + styles.carouselDotActive : ''}`}
                          onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i); }}
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

              <div className={styles.itemFieldContainer}>
                <span className={styles.itemLabel}>Beneficiary</span>
                <div className={styles.modalDataField}>{selectedRequest.authorName || 'User'}</div>
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

              {selectedRequest.acceptedItems?.length > 0 && selectedRequest.aidType !== 'Fundraiser' && (
                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Accepted Items</span>
                  <div className={styles.modalDataField}>{selectedRequest.acceptedItems.join(', ')}</div>
                </div>
              )}

              <div className={styles.itemFieldContainer}>
                <span className={styles.itemLabel}>Duration Remaining</span>
                <div className={styles.modalDataField}>{getRequestDurationStatus(selectedRequest).text}</div>
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
                  onClick={() => setShowInKindModal(true)}
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
        </AnimatedModal>
      )}

      {/* ══════════════════════ DONATION MODAL ══════════════════════ */}
      {showDonateModal && (
        <AnimatedModal onClose={closeDonationModal}>
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
                  {isSendingDonation ? 'Processing…' : 'Send Donation Request'}
                </button>
              </form>
            ) : (
              <div className={styles.donationSuccessContainer}>
                <div className={styles.donationSuccessIcon}>🎉</div>
                <h4 className={styles.donationSuccessTitle}>Thank you for your kind donation!</h4>
                <p className={styles.donationSuccessText}>
                  You can now go to the barangay office to submit your donation.
                </p>
                <button type="button" className={styles.submitBtn} onClick={closeDonationModal}>
                  Close
                </button>
              </div>
            )}
          </div>
        </AnimatedModal>
      )}

      {/* ══════════════════════ IN-KIND DONATION MODAL ══════════════════════ */}
      {showInKindModal && (
        <AnimatedModal onClose={() => { setShowInKindModal(false); setShowThankYouMessage(false); }}>
          <div className={styles.modalHeader}>
            <h3>Donate Items to {selectedRequest?.title}</h3>
            <button className={styles.closeBtn} onClick={() => { setShowInKindModal(false); setShowThankYouMessage(false); }}>×</button>
          </div>

          <div className={styles.modalBody}>
            <form
              className={styles.modalFormLayout}
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSendingDonation(true);
                try {
                  const currentUser = auth.currentUser;
                  await addDoc(collection(db, 'donation_items'), {
                    donorName: currentUser?.displayName || currentUser?.email || "Anonymous",
                    userId: currentUser?.uid || null,
                    items: inKindItems,
                    targetRequestId: selectedRequest.id,
                    targetRequestTitle: selectedRequest.title,
                    status: 'Unread',
                    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                  });

                  setShowThankYouMessage(true);
                  setInKindItems([{ item: '', quantity: '' }]);
                } catch (err) {
                  console.error("Firestore Error:", err);
                  await showAlert("Error sending donation: " + err.message);
                } finally {
                  setIsSendingDonation(false);
                }
              }}
            >
              {!showThankYouMessage ? (
                <>
                  {inKindItems.map((row, index) => (
                    <div key={index} className={styles.formRow} style={{ alignItems: 'flex-end', marginBottom: '4px' }}>
                      <div className={styles.itemFieldContainer} style={{ flex: 2 }}>
                        {index === 0 && <label className={styles.itemLabel}>Item Name</label>}
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rice"
                          value={row.item}
                          onChange={(e) => handleInKindChange(index, 'item', e.target.value)}
                        />
                      </div>
                      <div className={styles.itemFieldContainer} style={{ flex: 1 }}>
                        {index === 0 && <label className={styles.itemLabel}>Quantity</label>}
                        <input
                          type="text"
                          required
                          placeholder="e.g. 5kg"
                          value={row.quantity}
                          onChange={(e) => handleInKindChange(index, 'quantity', e.target.value)}
                        />
                      </div>
                      {inKindItems.length > 1 && (
                        <button
                          type="button"
                          className={styles.rowRemoveBtn}
                          onClick={() => removeInKindRow(index)}
                        >×</button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    className={styles.addItemBtn}
                    onClick={addInKindRow}
                  >
                    + Add Item
                  </button>

                  <button type="submit" className={styles.submitBtn} disabled={isSendingDonation}>
                    {isSendingDonation ? 'Processing…' : 'Submit Donation'}
                  </button>
                </>
              ) : (
                <div className={styles.donationSuccessContainer}>
                  <div className={styles.donationSuccessIcon}>🎉</div>
                  <h4 className={styles.donationSuccessTitle}>Thank you for your donation!</h4>
                  <p className={styles.donationSuccessText}>Please coordinate with the barangay office to drop off your items.</p>
                  <button
                    type="button"
                    className={styles.submitBtn}
                    onClick={() => { setShowInKindModal(false); setShowThankYouMessage(false); }}
                  >
                    Close
                  </button>
                </div>
              )}
            </form>
          </div>
        </AnimatedModal>
      )}

      {/* ══════════════════════ THEME MODAL ══════════════════════ */}
      {themeModal && (
        <AnimatedModal onClose={() => {}} maxWidth={420} style={{ pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'all' }}>
            <div className={styles.modalHeader}>
              <h3>{themeModal.type === 'confirm' ? 'Confirm Action' : 'Notice'}</h3>
            </div>
            <div className={styles.modalBody} style={{ padding: '28px 24px' }}>
              <p className={styles.themeModalMessage}>{themeModal.message}</p>
            </div>
            <div className={styles.modalFooter}>
              {themeModal.type === 'confirm' && (
                <button className={styles.cancelBtn} onClick={themeModal.onCancel}>Cancel</button>
              )}
              <button className={styles.submitBtn} onClick={themeModal.onConfirm} style={{ margin: 0 }}>
                {themeModal.type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        </AnimatedModal>
      )}

      <Footer />
    </div>
  );
};

export default AidRequests;
