/* React & Firebase Imports */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { db, storage, auth } from '../firebase';
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';

/* Component Imports */
import Card from '../components/AidCard.jsx';
import Footer from '../components/Footer.jsx';
import TermsConditionsModal from '../components/TermsConditionsModal.jsx';
import GuestRestrictionModal from '../components/GuestRestrictionModal.jsx';
import ReportContentModal from '../components/modals/ReportContentModal.jsx';
import CreateAidRequestModal from '../components/modals/CreateAidRequestModal.jsx';
import DonateFundsModal from '../components/modals/DonateFundsModal.jsx';
import DonateItemsModal from '../components/modals/DonateItemsModal.jsx';

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
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donationItems, setDonationItems] = useState([]);
  const [showItemsModal, setShowItemsModal] = useState(false);

  // Disclaimer States
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

    const qItems = query(
      collection(db, 'donation_items'),
      where('status', 'in', ['Valid', 'valid'])
    );
    const unsubItems = onSnapshot(qItems, (snapshot) => {
      setDonationItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error(error));

    return () => {
      unsub();
      unsubItems();
    };
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

  const handleGuestAction = (action) => {
    if (auth.currentUser?.isAnonymous || auth.currentUser?.email === 'guest@feast.app') {
      setShowGuestModal(true);
    } else {
      action();
    }
  };

  const openCreateModal = () => {
    handleGuestAction(() => setShowCreateModal(true));
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
      await showAlert("Please enter a reason for reporting.");
      return;
    }
    if (!auth.currentUser || auth.currentUser.isAnonymous || auth.currentUser.email === 'guest@feast.app') {
      await showAlert("Guest accounts are not permitted to submit reports.");
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
        reportedUserId: item.requesterId || item.userId || '', 
        reportedUserName: item.requesterName || item.userName || 'Unknown User',
        reportedUserEmail: item.requesterEmail || item.email || 'N/A',
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

      <section ref={sectionRef} className={`${styles.causesSection} ${styles.causesSectionAid}`}>
        <div className={styles.causesHeader}>
          <div className={styles.headerInfo}>
            <div className={styles.aboutLabel}>
              <span>Aid Requests</span>
              <div className={`${styles.line} ${styles.aidAccentLine}`}></div>
            </div>
            <h2 className={styles.aboutTitle}>Help Each Other Through Aid Requests!</h2>
          </div>

          {(isResident || auth.currentUser?.isAnonymous || auth.currentUser?.email === 'guest@feast.app') && (
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
                const requestDonations = donationItems.filter(d => d.targetRequestId === req.id);
                const donorsCount = requestDonations.length;
                raisedDisplayString = `${donorsCount} donors donated`;
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
                    isOwnRequest={auth.currentUser?.uid === req.authorId}
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
      <CreateAidRequestModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        showAlert={showAlert}
      />

      {/* REQUEST DETAILS MODAL */}
      {selectedRequest && (
        <AnimatedModal onClose={() => setSelectedRequest(null)}>
          <div className={styles.modalHeader}>
            <h3>Request Details</h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                type="button"
                onClick={() => handleGuestAction(() => setShowReportModal(true))}
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

              {selectedRequest.aidType !== 'Fundraiser' && (
                <button
                  type="button"
                  className={styles.viewParticipantsBtn}
                  style={{ marginTop: '4px', marginBottom: '12px' }}
                  onClick={() => setShowItemsModal(true)}
                >
                  View Donated Items ({donationItems.filter(d => d.targetRequestId === selectedRequest.id).length})
                </button>
              )}

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

{selectedRequest.authorId !== auth.currentUser?.uid && (showDonateItems(selectedRequest.aidType) || showDonateFunds(selectedRequest.aidType)) && (
            <div className={styles.modalFooter}>
              {showDonateItems(selectedRequest.aidType) && (
                <button
                  className={styles.donateItemsBtn}
                  onClick={() => handleGuestAction(() => setShowInKindModal(true))}
                >
                  DONATE ITEMS
                </button>
              )}
              {showDonateFunds(selectedRequest.aidType) && (
                <button
                  className={styles.donateFundsBtn}
                  onClick={() => handleGuestAction(() => setShowDonateModal(true))}
                >
                  DONATE FUNDS
                </button>
              )}
            </div>
          )}
        </AnimatedModal>
      )}

      <DonateFundsModal
        isOpen={showDonateModal}
        onClose={() => setShowDonateModal(false)}
        selectedRequest={selectedRequest}
        showAlert={showAlert}
      />

      <DonateItemsModal
        isOpen={showInKindModal}
        onClose={() => setShowInKindModal(false)}
        selectedRequest={selectedRequest}
        showAlert={showAlert}
      />

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
            <input 
              type="text"
              placeholder="Enter reason for reporting..."
              value={reportReason} 
              onChange={(e) => setReportReason(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                marginBottom: '16px',
                fontSize: '14px',
                background: '#fff',
                boxSizing: 'border-box'
              }}
              maxLength={400}
            />

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

      <GuestRestrictionModal isOpen={showGuestModal} onClose={() => setShowGuestModal(false)} />

      {/* ITEMS MODAL */}
      {showItemsModal && selectedRequest && (
        <AnimatedModal onClose={() => setShowItemsModal(false)} maxWidth={400}>
          <div className={styles.modalHeader}>
            <h3>Donated Items</h3>
            <button className={styles.closeBtn} onClick={() => setShowItemsModal(false)}>×</button>
          </div>
          <div className={styles.modalBody} style={{ padding: '24px 20px', maxHeight: '400px', overflowY: 'auto' }}>
            {(() => {
              const reqDonations = donationItems.filter(d => d.targetRequestId === selectedRequest.id);
              if (reqDonations.length === 0) {
                return (
                  <p style={{ textAlign: 'center', color: '#999', padding: '20px 0', fontFamily: 'var(--font)' }}>
                    No items donated yet.
                  </p>
                );
              }
              const allItems = reqDonations.flatMap(d => d.items || []);
              if (allItems.length === 0) {
                return (
                  <p style={{ textAlign: 'center', color: '#999', padding: '20px 0', fontFamily: 'var(--font)' }}>
                    No items found.
                  </p>
                );
              }
              return (
                <div className={styles.participantList}>
                  {allItems.map((itemObj, idx) => (
                    <div key={idx} className={styles.participantRow}>
                      <span className={styles.participantNumber}>{idx + 1}</span>
                      <span className={styles.participantName}>
                        {itemObj.item} <span style={{ color: '#64748b' }}>({itemObj.quantity})</span>
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </AnimatedModal>
      )}

      <Footer />
    </div>
  );
};

export default AidRequests;