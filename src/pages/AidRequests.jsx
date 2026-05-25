/* React & Firebase Imports */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { db, storage, auth } from '../firebase';
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';

/* Component Imports */
import Header from '../components/Header.jsx';
import Card from '../components/AidCard.jsx';
import Footer from '../components/Footer.jsx';
import TermsConditionsModal from '../components/TermsConditionsModal.jsx';

/* Style Imports */
import styles from '../components/requests_and_events.module.css';

/* Asset Imports */
import alertIcon from '../assets/alert.png';

/* ── Animated Modal Wrapper ─────────────────────────────────────────────── */
const AnimatedModal = ({ children, onClose, maxWidth, style }) => {
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 180);
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

  // Anonymous Toggle States
  const [isAnonymousFund, setIsAnonymousFund] = useState(false);
  const [isAnonymousItem, setIsAnonymousItem] = useState(false);

  // Disclaimer States
  const [disclaimer, setDisclaimer] = useState({ isOpen: false, onConfirm: null, onCancel: null });
  const [isDisclaimerChecked, setIsDisclaimerChecked] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Report States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportProof, setReportProof] = useState(null);
  const [reportProofError, setReportProofError] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const [, setTimeTicker] = useState(Date.now());

  const [pendingFundIds, setPendingFundIds] = useState([]);
  const [pendingItemIds, setPendingItemIds] = useState([]);

  const [themeModal, setThemeModal] = useState(null);
  const [isResident, setIsResident] = useState(false);

  const sectionRef = useRef(null);

  const [sortOption, setSortOption] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const CARDS_PER_PAGE = 9;

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
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
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
        setIsResident(false);
      }
    });

    return () => unsubscribeAuth();
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

  /* ── Disclaimer Prompter Helper ── */
  const promptDisclaimer = () => {
    setIsDisclaimerChecked(false);
    return new Promise((resolve) => {
      setDisclaimer({
        isOpen: true,
        onConfirm: () => { setDisclaimer({ isOpen: false }); resolve(true); },
        onCancel: () => { setDisclaimer({ isOpen: false }); resolve(false); },
      });
    });
  };

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

  /* ── Report Handlers ── */
  const closeReportModal = () => {
    setShowReportModal(false);
    setReportReason('');
    setReportDescription('');
    setReportProof(null);
    setReportProofError(false);
  };

  const handleReportSubmit = async (item) => {
    if (!auth.currentUser) {
      await showAlert("You must be logged in to submit a report.");
      return;
    }
    if (!reportReason) {
      await showAlert("Please select a reason for reporting.");
      return;
    }
    if (!reportProof) {
      setReportProofError(true);
      return;
    }

    setIsSubmittingReport(true);
    try {
      const storageRef = ref(storage, `reports_proof/${Date.now()}_${reportProof.name}`);
      await uploadBytes(storageRef, reportProof);
      const proofImageUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, "reports"), {
        reportedItemId: item.id || '',
        reportedType: 'Aid Request',
        reportedContent: item.title || item.name || 'Untitled Post',
        title: item.title || item.name || 'Untitled Post',
        reportedUserId: item.authorId || item.userId || '', 
        reportedUserName: item.authorName || item.userName || 'Unknown User',
        reportedUserEmail: item.authorEmail || item.email || 'N/A',
        reporterId: auth.currentUser.uid,
        reporterEmail: auth.currentUser.email || '',
        reporterName: auth.currentUser.displayName || auth.currentUser.email || 'Anonymous User',
        reporter: auth.currentUser.displayName || auth.currentUser.email || 'Anonymous User',
        reason: reportReason,
        description: reportDescription,
        proofImageUrl: proofImageUrl,
        status: 'Pending',
        createdAt: serverTimestamp()
      });

      closeReportModal();
      await showAlert("Thank you. The content has been reported and will be reviewed by administration.");
    } catch (error) {
      console.error("Error submitting report: ", error);
      await showAlert("Failed to submit report. Please try again.");
    } finally {
      setIsSubmittingReport(false);
    }
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
        authorEmail: currentUser.email || '', 
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

      await showAlert('Your aid request has been submitted. An admin will review your post if it meets the established guidelines. If so, it will appear once approved.');
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating request: ", error);
      await showAlert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Fund Donation Submit Handler ── */
/* ── Fund Donation Submit Handler ── */
  const handleDonationSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest) {
      await showAlert("No active request selected. Please close and try again.");
      return;
    }

    const isAgreed = await promptDisclaimer();
    if (!isAgreed) return;

    setIsSendingDonation(true);
    try {
      const currentUser = auth.currentUser;
      const generatedRefNo = `BRGY-${Math.floor(100000 + Math.random() * 900000)}`;

      // Look up the actual profile name from the users collection
      let trueName = currentUser?.displayName || '';
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (userData.firstName && userData.lastName) {
              trueName = `${userData.firstName} ${userData.lastName}`;
            } else {
              trueName = userData.fullName || userData.name || userData.username || trueName;
            }
          }
        } catch (err) {
          console.error("Error looking up profile name:", err);
        }
      }
      
      // Fallback if no profile name is configured
      if (!trueName.trim()) {
        trueName = currentUser?.email ? currentUser.email.split('@')[0] : 'Donor';
      }

      await addDoc(collection(db, 'donation_funds'), {
        donorName: trueName, 
        realDonorName: trueName,
        userId: currentUser?.uid || null,
        amount: Number(donationAmount) || 0,
        referenceNumber: generatedRefNo,
        targetRequestId: selectedRequest.id || "Unknown ID",
        targetRequestTitle: selectedRequest.title || selectedRequest.name || "General Fundraiser Cause",
        targetAuthorId: selectedRequest.authorId || null, 
        status: 'Unread',
        receiptUrls: [],
        isAnonymous: isAnonymousFund,
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

  /* ── In-Kind Donation Submit Handler ── */
  const handleInKindSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    const isAgreed = await promptDisclaimer();
    if (!isAgreed) return;

    setIsSendingDonation(true);
    try {
      const currentUser = auth.currentUser;

      // Look up the actual profile name from the users collection
      let trueName = currentUser?.displayName || '';
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (userData.firstName && userData.lastName) {
              trueName = `${userData.firstName} ${userData.lastName}`;
            } else {
              trueName = userData.fullName || userData.name || userData.username || trueName;
            }
          }
        } catch (err) {
          console.error("Error looking up profile name:", err);
        }
      }

      // Fallback if no profile name is configured
      if (!trueName.trim()) {
        trueName = currentUser?.email ? currentUser.email.split('@')[0] : 'Donor';
      }

      await addDoc(collection(db, 'donation_items'), {
        donorName: trueName,
        realDonorName: trueName,
        userId: currentUser?.uid || null,
        items: inKindItems,
        targetRequestId: selectedRequest.id,
        targetRequestTitle: selectedRequest.title || selectedRequest.name || "General In-Kind Cause",
        targetAuthorId: selectedRequest.authorId || null,
        status: 'Unread',
        isAnonymous: isAnonymousItem,
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
  };

  const closeDonationModal = () => {
    setShowDonateModal(false);
    setDonationAmount('');
    setShowThankYouMessage(false);
    setIsAnonymousFund(false);
  };

  const closeInKindModal = () => {
    setShowInKindModal(false);
    setShowThankYouMessage(false);
    setIsAnonymousItem(false);
  };

  const toggleFilter = (cat) => {
    setActiveFilters((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setCurrentPage(1);
  };

  const pendingSet = new Set([...pendingFundIds, ...pendingItemIds]);

  const getPostDurationMs = (req) => Number(req.postDurationDays || 1) * 24 * 60 * 60 * 1000;
  const getCreatedAtMs = (req) => {
    const ts = req?.createdAt;
    if (!ts) return 0;
    return ts.toDate ? ts.toDate().getTime() : new Date(ts).getTime();
  };

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

      if (sortOption === 'newest') return getCreatedAtMs(b) - getCreatedAtMs(a);
      if (sortOption === 'oldest') return getCreatedAtMs(a) - getCreatedAtMs(b);
      if (sortOption === 'duration_desc') return getPostDurationMs(b) - getPostDurationMs(a);
      if (sortOption === 'duration_asc')  return getPostDurationMs(a) - getPostDurationMs(b);
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / CARDS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRequests = filteredRequests.slice((safePage - 1) * CARDS_PER_PAGE, safePage * CARDS_PER_PAGE);

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

      <section ref={sectionRef} className={`${styles.causesSection} ${styles.causesSectionAid}`}>
        <div className={styles.causesHeader}>
          <div className={styles.headerInfo}>
            <div className={styles.aboutLabel}>
              <span>Aid Requests</span>
              <div className={`${styles.line} ${styles.aidAccentLine}`}></div>
            </div>
            <h2 className={styles.aboutTitle}>Help Each Other Through Aid Requests!</h2>
          </div>

          {isResident && (
            <button
            className={`${styles.readMoreBtn} ${styles.readMoreBtnGreen}`}
            onClick={openCreateModal}
            >
               + Create Aid Request
            </button>
          )}
          </div>

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
          <div className={styles.sortSelectWrap}>
            <select
              className={`${styles.sortSelect} ${styles.sortSelectAid}`}
              value={sortOption}
              onChange={(e) => { setSortOption(e.target.value); setCurrentPage(1); }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="duration_desc">Longest Duration</option>
              <option value="duration_asc">Shortest Duration</option>
            </select>
          </div>
        </div>

        <div className={styles.causesGrid}>
          {loading ? (
            <div className={styles.emptyState}>
              <div className={styles.loadingSpinner}></div>
              <span>Loading Aid Requests…</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <p className={styles.emptyState}>No aid requests found.</p>
          ) : (
            paginatedRequests.map((req) => {
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

        {!loading && filteredRequests.length > CARDS_PER_PAGE && (
          <div className={styles.paginationSpacer} />
        )}
      </section>

      {!loading && filteredRequests.length > CARDS_PER_PAGE && (
        <div className={`${styles.paginationBar} ${styles.paginationBarAid}`}>
          <button
            className={`${styles.pageBtn} ${styles.pageBtnAid}`}
            disabled={safePage === 1}
            onClick={() => { setCurrentPage(1); sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            aria-label="First page"
          >«</button>

          <button
            className={`${styles.pageBtn} ${styles.pageBtnAid}`}
            disabled={safePage === 1}
            onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            aria-label="Previous page"
          >‹ Prev</button>

          <div className={styles.pageDivider} />

          <div className={styles.pageDots}>
            {(() => {
              const pages = [];
              const delta = 2;
              const left  = Math.max(2, safePage - delta);
              const right = Math.min(totalPages - 1, safePage + delta);

              pages.push(
                <button key={1}
                  className={`${styles.pageDot} ${safePage === 1 ? styles.pageDotActiveAid : ''}`}
                  onClick={() => { setCurrentPage(1); sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                >1</button>
              );

              if (left > 2) pages.push(<span key="el1" className={styles.pageEllipsis}>…</span>);

              for (let i = left; i <= right; i++) {
                pages.push(
                  <button key={i}
                    className={`${styles.pageDot} ${safePage === i ? styles.pageDotActiveAid : ''}`}
                    onClick={() => { setCurrentPage(i); sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                  >{i}</button>
                );
              }

              if (right < totalPages - 1) pages.push(<span key="el2" className={styles.pageEllipsis}>…</span>);

              if (totalPages > 1) pages.push(
                <button key={totalPages}
                  className={`${styles.pageDot} ${safePage === totalPages ? styles.pageDotActiveAid : ''}`}
                  onClick={() => { setCurrentPage(totalPages); sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                >{totalPages}</button>
              );

              return pages;
            })()}
          </div>

          <div className={styles.pageDivider} />

          <button
            className={`${styles.pageBtn} ${styles.pageBtnAid}`}
            disabled={safePage === totalPages}
            onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            aria-label="Next page"
          >Next ›</button>

          <button
            className={`${styles.pageBtn} ${styles.pageBtnAid}`}
            disabled={safePage === totalPages}
            onClick={() => { setCurrentPage(totalPages); sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            aria-label="Last page"
          >»</button>
        </div>
      )}

      {/* CREATE REQUEST MODAL */}
      {showCreateModal && (
        <AnimatedModal onClose={() => setShowCreateModal(false)}>
          <div className={styles.modalHeader}>
            <h3>Create New Aid Request</h3>
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

      {/* REQUEST DETAILS MODAL */}
      {selectedRequest && (
        <AnimatedModal onClose={() => setSelectedRequest(null)}>
          <div className={styles.modalHeader}>
            <h3>Request Details</h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                title="Report Content"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: 0.7,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
              >
                <img src={alertIcon} alt="Report Content" style={{ width: '35px', height: '35px' }} />
              </button>
              
              <button className={styles.closeBtn} onClick={() => setSelectedRequest(null)}>×</button>
            </div>
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

      {/* DONATION MODALS */}
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

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '16px' }}>
                  <input
                    type="checkbox"
                    checked={isAnonymousFund}
                    onChange={(e) => setIsAnonymousFund(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#f59e0b', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.95rem', color: '#334155' }}>Make my donation anonymous to the beneficiary</span>
                </label>

                <button type="submit" className={styles.submitBtn} disabled={isSendingDonation}>
                  {isSendingDonation ? 'Processing…' : 'Send Donation Request'}
                </button>
              </form>
            ) : (
              <div className={styles.donationSuccessContainer}>
                <div className={styles.donationSuccessIcon}>🎉</div>
                <h4 className={styles.donationSuccessTitle}>Thank you for your kind fund donation!</h4>
                <p className={styles.donationSuccessText}>
                  You can now go to the Barangay Office of Almanza Dos to donate your funds.
                  Look for and coordinate with the barangay's treasurer, secretary, chariman,
                  or any other elected official regarding the donation.
                  Thank you, and have a great day, citizen!
                </p>
                <button type="button" className={styles.submitBtn} onClick={closeDonationModal}>
                  Close
                </button>
              </div>
            )}
          </div>
        </AnimatedModal>
      )}

      {showInKindModal && (
        <AnimatedModal onClose={closeInKindModal}>
          <div className={styles.modalHeader}>
            <h3>Donate Items to {selectedRequest?.title}</h3>
            <button className={styles.closeBtn} onClick={closeInKindModal}>×</button>
          </div>

          <div className={styles.modalBody}>
            <form className={styles.modalFormLayout} onSubmit={handleInKindSubmit}>
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

                  <button type="button" className={styles.addItemBtn} onClick={addInKindRow}>
                    + Add Item
                  </button>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '12px', marginBottom: '16px' }}>
                    <input
                      type="checkbox"
                      checked={isAnonymousItem}
                      onChange={(e) => setIsAnonymousItem(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#f59e0b', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.95rem', color: '#334155' }}>Make my donation anonymous to the beneficiary</span>
                  </label>

                  <button type="submit" className={styles.submitBtn} disabled={isSendingDonation}>
                    {isSendingDonation ? 'Processing…' : 'Submit Donation'}
                  </button>
                </>
              ) : (
                <div className={styles.donationSuccessContainer}>
                  <div className={styles.donationSuccessIcon}>🎉</div>
                  <h4 className={styles.donationSuccessTitle}>Thank you for your kind item donation!</h4>
                  <p className={styles.donationSuccessText}>
                    Please coordinate with the Almanza Dos Barangay Office to drop off your items.
                    Look for and talk to the barangay's treasurer, secretary, chariman,
                    or any other elected official regarding the donation.
                    Thank you, and have a great day, citizen!
                  </p>
                  <button
                    type="button"
                    className={styles.submitBtn}
                    onClick={closeInKindModal}
                  >
                    Close
                  </button>
                </div>
              )}
            </form>
          </div>
        </AnimatedModal>
      )}

      {/* DISCLAIMER MODAL */}
      {disclaimer.isOpen && (
        <AnimatedModal onClose={disclaimer.onCancel} maxWidth={520}>
          <div className={styles.disclaimerModalHeader}>
            <h3 className={styles.disclaimerTitle}>Disclaimer</h3>
            <button className={styles.disclaimerCloseBtn} onClick={disclaimer.onCancel}>✕</button>
          </div>

          <div className={styles.disclaimerBody}>
            <h4 className={styles.disclaimerHeading}>Anti-Fraud & Privacy Notice</h4>
            <p className={styles.disclaimerText}>
              FEAST ensures all charity requests are meticulously verified. However, donating items or funds is at your own discretion.
            </p>

            <p className={styles.disclaimerText} style={{ fontWeight: 'bold', marginTop: '12px', color: '#0f172a' }}>
              NOTE: Please be advised that all transactions must be carried out directly at the Barangay Office to guarantee authenticity and prevent fraudulent activity.
            </p>
            
            <div style={{ marginTop: '24px', textAlign: 'left', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', margin: 0 }}>
                <input 
                  type="checkbox" 
                  checked={isDisclaimerChecked}
                  onChange={(e) => setIsDisclaimerChecked(e.target.checked)}
                  style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: '#f59e0b', cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ fontSize: '0.95rem', color: '#334155', lineHeight: '1.5' }}>
                  By proceeding, you acknowledge that your donation is voluntary and agree to our{' '}
                  <button 
                    type="button" 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      setShowTermsModal(true); 
                    }}
                    style={{ 
                      color: '#f59e0b', 
                      fontWeight: '600', 
                      textDecoration: 'underline', 
                      background: 'none', 
                      border: 'none', 
                      padding: 0, 
                      font: 'inherit', 
                      cursor: 'pointer' 
                    }}
                  >
                    Terms of Service
                  </button>. Do not share sensitive financial information outside our platform.
                </span>
              </label>
            </div>
          </div>

          <div className={styles.disclaimerFooter}>
            <button type="button" className={styles.disclaimerDeclineBtn} onClick={disclaimer.onCancel}>
              Cancel
            </button>
            <button 
              type="button" 
              className={styles.disclaimerAcceptBtn} 
              onClick={disclaimer.onConfirm}
              disabled={!isDisclaimerChecked}
              style={{ 
                opacity: isDisclaimerChecked ? 1 : 0.5, 
                cursor: isDisclaimerChecked ? 'pointer' : 'not-allowed' 
              }}
            >
              Continue
            </button>
          </div>
        </AnimatedModal>
      )}

      {/* TERMS MODAL */}
      {showTermsModal && (
        <TermsConditionsModal onClose={() => setShowTermsModal(false)} />
      )}

      {/* ══════════════════════ SUBMIT REPORT MODAL ══════════════════════ */}
      {showReportModal && (
        <AnimatedModal onClose={closeReportModal} maxWidth={450}>
          <div className={styles.modalHeader}>
            <h3>Report Misconduct</h3>
          </div>
          <div className={styles.modalBody} style={{ padding: '20px 24px' }}>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px', lineHeight: '1.4' }}>
              Help us maintain community standards. Your submission remains confidential.
            </p>
            
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
              Reason for Report <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <select 
              value={reportReason} 
              onChange={(e) => setReportReason(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                marginBottom: '16px',
                fontSize: '14px',
                background: '#fff'
              }}
            >
              <option value="">-- Choose a reason --</option>
              <option value="Scam or Fraud">Scam or Fraudulent Request</option>
              <option value="Inappropriate Content">Inappropriate or Offensive Material</option>
              <option value="Harassment">Harassment or Bullying</option>
              <option value="False Information">Spam / Misinformation</option>
              <option value="Other">Other</option>
            </select>

            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
              Image Proof <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <div style={{ marginBottom: '16px' }}>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setReportProof(e.target.files[0]);
                    setReportProofError(false);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: reportProofError ? '1px solid #dc3545' : '1px solid #ccc',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              {reportProofError && (
                <span style={{ color: '#dc3545', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                  Please attach a screenshot or image as evidence.
                </span>
              )}
              {reportProof && (
                <div style={{ position: 'relative', display: 'inline-block', marginTop: '10px' }}>
                  <img 
                    src={URL.createObjectURL(reportProof)} 
                    alt="Proof preview" 
                    style={{ height: '80px', borderRadius: '4px', border: '1px solid #ddd', objectFit: 'cover' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setReportProof(null)}
                    style={{
                      position: 'absolute', top: '-8px', right: '-8px', background: '#dc3545',
                      color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px',
                      cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >✕</button>
                </div>
              )}
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button 
              type="button"
              className={styles.cancelBtn} 
              onClick={closeReportModal}
              disabled={isSubmittingReport}
            >
              Cancel
            </button>
            <button 
              type="button"
              className={styles.submitBtn} 
              onClick={() => handleReportSubmit(selectedRequest)} 
              disabled={isSubmittingReport}
              style={{ 
                margin: 0, 
                backgroundColor: '#dc3545', 
                borderColor: '#dc3545',
                opacity: isSubmittingReport ? 0.6 : 1 
              }}
            >
              {isSubmittingReport ? 'Sending...' : 'Submit'}
            </button>
          </div>
        </AnimatedModal>
      )}

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