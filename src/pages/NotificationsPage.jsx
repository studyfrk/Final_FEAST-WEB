/* ============================================================
   NotificationsPage.jsx
   F.E.A.S.T. Admin/User Dashboard
   ============================================================

   ── HOW TO ADD A NEW NOTIFICATION CATEGORY ──────────────────
   1. Add the new category string to CATEGORY_OPTIONS below.
   2. Add its CSS classes in notifications_page.module.css
      (see the "HOW TO ADD A NEW NOTIFICATION CATEGORY" note
       in that file — it's just 3 copy-paste blocks).
   3. Done. The filter dropdown, card border, dot, and tag
      all update automatically.
   ─────────────────────────────────────────────────────────── */

/* React & Firebase Imports */
import React, { useState, useEffect, useMemo } from 'react';
import { db, auth, storage } from '../firebase'; // <-- Added storage
import {
  collection, onSnapshot, query, orderBy,
  doc, updateDoc, deleteDoc, writeBatch, getDocs, where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // <-- Added storage utilities

/* Component Imports */
import Footer from '../components/Footer.jsx';

/* Style Imports */
import styles from './notifications_page.module.css';

/* ============================================================
   CATEGORY REGISTRY
   ============================================================ */
const CATEGORY_OPTIONS = [
  { value: 'all',      label: 'All Types' },
  { value: 'event',    label: 'Event' },
  { value: 'request',  label: 'Request' },
  { value: 'claim',    label: 'Claim' },
  { value: 'account',  label: 'Account' },
  { value: 'security', label: 'Security' },
  { value: 'inquiry',  label: 'Inquiry' },
];

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest First' },
  { value: 'oldest', label: 'Oldest First' },
];

const ITEMS_PER_PAGE = 10; 

/* ============================================================
   HELPERS
   ============================================================ */

const getCategoryClass = (type = '') => {
  const known = ['event', 'request', 'claim', 'account', 'security', 'inquiry'];
  const normalized = type.toLowerCase().trim();
  return known.includes(normalized) ? normalized : '';
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDisplayDate = (dateString) => {
  if (!dateString) return "N/A";
  if (dateString.toDate) {
    return dateString.toDate().toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  }
  const dateObj = new Date(dateString);
  return dateObj.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  });
};

const formatTime12hr = (time24) => {
  if (!time24) return "N/A";
  if (time24.toDate) {
    const d = time24.toDate();
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hours12 = h % 12 || 12;
  return `${hours12}:${minutes} ${ampm}`;
};

/* ============================================================
   COMPONENT
   ============================================================ */
const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [currentUser, setCurrentUser]     = useState(null);

  /* Filter state */
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortOrder, setSortOrder]           = useState('latest');
  
  /* Pagination state */
  const [currentPage, setCurrentPage]       = useState(1);

  /* Live-monitoring pending drop-offs */
  const [pendingFunds, setPendingFunds] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);

  /* Modal state for FAQ reply details */
  const [selectedFaqReply, setSelectedFaqReply] = useState(null);

  /* Modal state for Post-Event Report */
  const [selectedReportNotif, setSelectedReportNotif] = useState(null);
  const [reportText, setReportText] = useState('');
  const [reportEntries, setReportEntries] = useState([{ description: '', file: null }]); // <-- Dynamic file rows
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  /* ── Firebase Auth + Firestore listener ─────────────────── */
  useEffect(() => {
    let unsubSnapshot = null;
    let unsubFunds = null;
    let unsubItems = null;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);

      if (unsubSnapshot) { unsubSnapshot(); unsubSnapshot = null; }
      if (unsubFunds) { unsubFunds(); unsubFunds = null; }
      if (unsubItems) { unsubItems(); unsubItems = null; }

      if (!user) {
        setNotifications([]);
        setPendingFunds([]);
        setPendingItems([]);
        setLoading(false);
        return;
      }

      const notifPath = `users/${user.uid}/notifications`;
      const q = query(collection(db, notifPath), orderBy('createdAt', 'desc'));

      unsubSnapshot = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setNotifications(data);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching notifications snapshot:', error);
        setLoading(false);
      });

      const qFunds = query(collection(db, 'donation_funds'), where('userId', '==', user.uid));
      unsubFunds = onSnapshot(qFunds, (snapshot) => {
        const data = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(d => d.status === 'Unread' || d.status === 'Processing');
        setPendingFunds(data);
      });

      const qItems = query(collection(db, 'donation_items'), where('userId', '==', user.uid));
      unsubItems = onSnapshot(qItems, (snapshot) => {
        const data = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(d => d.status === 'Unread' || d.status === 'Processing');
        setPendingItems(data);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubSnapshot) unsubSnapshot();
      if (unsubFunds) unsubFunds();
      if (unsubItems) unsubItems();
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, sortOrder]);

  /* ── Backend handlers ───────────────────────────────────── */
  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    try {
      const notifPath = `users/${currentUser.uid}/notifications`;
      const q    = query(collection(db, notifPath), where('read', '==', false));
      const snap = await getDocs(q);
      if (snap.empty) return;
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
      await batch.commit();
    } catch (error) {
      console.error('Error marking all read:', error);
    }
  };

  const handleMarkAsRead = async (notif) => {
    if (!currentUser || notif.read || notif.isVirtual) return; 
    try {
      const docRef = doc(db, `users/${currentUser.uid}/notifications`, notif.id);
      await updateDoc(docRef, { read: true });
    } catch (error) {
      console.error('Error marking read:', error);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!currentUser) return;
    try {
      const docRef = doc(db, `users/${currentUser.uid}/notifications`, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleAcceptCoOrg = async (notif) => {
    if (!currentUser || !notif.id || !notif.eventId) return;
    try {
      const notifRef = doc(db, `users/${currentUser.uid}/notifications`, notif.id);
      await updateDoc(notifRef, { actionStatus: 'accepted', read: true });
      const eventRef = doc(db, 'charity_events', notif.eventId);
      await updateDoc(eventRef, { [`coOrganizerAcceptances.${currentUser.uid}`]: 'accepted' });
    } catch (error) {
      console.error('Error accepting co-organizer invitation:', error);
    }
  };

  const handleDeclineCoOrg = async (notif) => {
    if (!currentUser || !notif.id || !notif.eventId) return;
    try {
      const notifRef = doc(db, `users/${currentUser.uid}/notifications`, notif.id);
      await updateDoc(notifRef, { actionStatus: 'declined', read: true });
      const eventRef = doc(db, 'charity_events', notif.eventId);
      await updateDoc(eventRef, { [`coOrganizerAcceptances.${currentUser.uid}`]: 'declined' });
    } catch (error) {
      console.error('Error declining co-organizer invitation:', error);
    }
  };

  /* ── Dynamic Row Handlers for Event Report ──────────────── */
  const handleAddEntry = () => {
    setReportEntries([...reportEntries, { description: '', file: null }]);
  };

  const handleRemoveEntry = (index) => {
    const newEntries = reportEntries.filter((_, i) => i !== index);
    setReportEntries(newEntries);
  };

  const handleEntryChange = (index, field, value) => {
    const newEntries = [...reportEntries];
    newEntries[index][field] = value;
    setReportEntries(newEntries);
  };

  const closeReportModal = () => {
    setSelectedReportNotif(null);
    setReportText('');
    setReportEntries([{ description: '', file: null }]);
  };

  const handleSubmitReport = async () => {
    if (!selectedReportNotif || !currentUser) return;
    setIsSubmittingReport(true);

    try {
      const uploadedFiles = [];

      // 1. Upload attached files to Firebase Storage
      for (let i = 0; i < reportEntries.length; i++) {
        const entry = reportEntries[i];
        if (entry.file) {
          // Generate a unique file path
          const fileRef = ref(storage, `event_reports/${selectedReportNotif.eventId}/${Date.now()}_${entry.file.name}`);
          await uploadBytes(fileRef, entry.file);
          const url = await getDownloadURL(fileRef);
          
          uploadedFiles.push({
            description: entry.description || entry.file.name,
            fileName: entry.file.name,
            fileUrl: url,
          });
        } else if (entry.description.trim()) {
          // Keep text-only entries if they wrote a description but attached no file
          uploadedFiles.push({
            description: entry.description,
            fileName: null,
            fileUrl: null,
          });
        }
      }

      // 2. Update the charity_event document with the report data
      const eventRef = doc(db, 'charity_events', selectedReportNotif.eventId);
      await updateDoc(eventRef, {
        postEventReport: reportText,
        reportFiles: uploadedFiles,
        reportSubmittedAt: new Date()
      });

      // 3. Mark the notification as resolved/read
      const notifRef = doc(db, `users/${currentUser.uid}/notifications`, selectedReportNotif.id);
      await updateDoc(notifRef, { 
        read: true, 
        actionStatus: 'completed' 
      });

      closeReportModal();
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("Failed to submit the report. Please try again.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Helper check for button disabled state
  const hasValidReportData = reportText.trim() || reportEntries.some(e => e.file || e.description.trim());

  /* ── Client-side filtering & sorting ────────────────────── */
  const filteredNotifications = useMemo(() => {
    const fundReminders = pendingFunds.map(fund => ({
      id: `pending-fund-${fund.id}`,
      title: `Pending Drop-off: ${fund.targetRequestTitle || 'Fundraiser'}`,
      body: `Awaiting delivery of your ₱${Number(fund.amount || 0).toLocaleString()} donation. Reference No: ${fund.referenceNumber || 'N/A'}. Please present this reference number to the barangay office.`,
      type: 'request', 
      createdAt: fund.createdAt,
      read: false,
      isVirtual: true 
    }));

    const itemReminders = pendingItems.map(itemDoc => {
      const itemsList = (itemDoc.items || []).map(i => `${i.quantity}x ${i.item}`).join(', ');
      return {
        id: `pending-item-${itemDoc.id}`,
        title: `Pending Drop-off: ${itemDoc.targetRequestTitle || 'In-Kind Request'}`,
        body: `Awaiting drop-off of your pledged items: ${itemsList || 'items'}. Please deliver them to the barangay office to complete verification.`,
        type: 'request', 
        createdAt: itemDoc.createdAt,
        read: false,
        isVirtual: true
      };
    });

    let list = [...fundReminders, ...itemReminders, ...notifications];

    list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });

    if (categoryFilter !== 'all') {
      list = list.filter((n) => (n.type || '').toLowerCase().trim() === categoryFilter);
    }

    if (sortOrder === 'oldest') {
      list = list.reverse();
    }

    const pinned = list.filter(n => n.isVirtual);
    const unpinned = list.filter(n => !n.isVirtual);
    
    return [...pinned, ...unpinned];
  }, [notifications, pendingFunds, pendingItems, categoryFilter, sortOrder]);

  /* ── Pagination Logic ───────────────────────────────────── */
  const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentNotifications = filteredNotifications.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasUnread   = unreadCount > 0;

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className={styles.pageWrapper}>

      <main className={styles.notificationsPage}>

        {/* ── Page Header ──────────────────────────────────── */}
        <div className={styles.pageHeader}>
          <div className={styles.headerTop}>
            <h2 className={styles.pageTitle}>
              Notifications
              {unreadCount > 0 && (
                <span className={styles.unreadBadge}>{unreadCount}</span>
              )}
            </h2> 

            {hasUnread && (
              <button className={styles.markReadBtn} onClick={handleMarkAllRead}>
                Mark all as read
              </button>
            )}
          </div>

          {/* ── Filter Bar ─────────────────────────────────── */}
          <div className={styles.filterBar}>
            <span className={styles.filterLabel}>Filter:</span>
            <select
              className={styles.filterSelect}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              className={styles.filterSelect}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              aria-label="Sort by time"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────── */}
        {loading ? (
          <div className={styles.loadingState}>
            Loading notifications<span className={styles.loadingDots} />
          </div>
        ) : (
          <div className={styles.notifListContainer}>
            {filteredNotifications.length === 0 ? (
              <div className={styles.emptyState}>
                <p>
                  {categoryFilter !== 'all'
                    ? `No "${CATEGORY_OPTIONS.find(o => o.value === categoryFilter)?.label}" notifications.`
                    : 'No notifications yet.'}
                </p>
              </div>
            ) : (
              currentNotifications.map((notif) => {
                const categoryClass = getCategoryClass(notif.type);
                return (
                  <div
                    key={notif.id}
                    className={[
                      styles.notifCard,
                      categoryClass ? styles[categoryClass] : '',
                      (!notif.read && !notif.isVirtual) ? styles.unread : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => handleMarkAsRead(notif)}
                    style={notif.isVirtual ? { borderLeft: '5px solid #f59e0b', backgroundColor: '#fffbeb', cursor: 'default' } : {}}
                  >
                    <div className={styles.notifIconBox}>
                      {notif.isVirtual ? (
                        <span style={{ fontSize: '15px' }} title="Pinned Reminder">📌</span>
                      ) : (
                        <span
                          className={[
                            styles.statusDot,
                            categoryClass ? styles[categoryClass] : '',
                            notif.status ? styles[notif.status] : '',
                          ].filter(Boolean).join(' ')}
                        />
                      )}
                    </div>

                    <div className={styles.notifContent}>
                      <div className={styles.notifTop}>
                        <h4>{notif.title}</h4>
                        <span className={styles.notifTime}>
                          {formatTimestamp(notif.createdAt)}
                        </span>
                      </div>

                      <p>{notif.body}</p>

                      {/* --- CUSTOM RENDER: Co-Organizer Invite --- */}
                      {notif.notifSubtype === 'co_organizer_invite' && notif.requiresAction && (
                        <div className={styles.inviteContainer}>
                          <div className={styles.inviteDetail}><strong>Main Organizer:</strong> {notif.organizerName || 'N/A'}</div>
                          <div className={styles.inviteDetail}><strong>Event Title:</strong> {notif.eventTitle || 'N/A'}</div>
                          <div className={styles.inviteDetail}><strong>Date & Time:</strong> {formatDisplayDate(notif.eventDate)} ({formatTime12hr(notif.eventStartTime)} - {formatTime12hr(notif.eventEndTime)})</div>
                          <div className={styles.inviteDetail}><strong>Location:</strong> {notif.eventLocation || 'N/A'}</div>
                          <div className={styles.inviteDetail}><strong>Description:</strong> {notif.eventDescription || 'N/A'}</div>

                          <div className={styles.inviteActions}>
                            {notif.actionStatus === 'pending' ? (
                              <>
                                <button 
                                  className={styles.btnAccept}
                                  onClick={(e) => { e.stopPropagation(); handleAcceptCoOrg(notif); }}
                                >
                                  Accept
                                </button>
                                <button 
                                  className={styles.btnDecline}
                                  onClick={(e) => { e.stopPropagation(); handleDeclineCoOrg(notif); }}
                                >
                                  Decline
                                </button>
                              </>
                            ) : notif.actionStatus === 'accepted' ? (
                              <span className={styles.statusAccepted}>✓ Accepted Invitation</span>
                            ) : (
                              <span className={styles.statusDeclined}>✗ Declined Invitation</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* --- CUSTOM RENDER: FAQ Admin Reply --- */}
                      {notif.notifSubtype === 'faq_reply' && (
                        <div className={styles.faqReplyAction}>
                          <button
                            className={styles.viewReplyLink}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFaqReply(notif);
                            }}
                          >
                            Click to view admin response
                          </button>
                        </div>
                      )}

                      {/* --- CUSTOM RENDER: Event Report Request --- */}
                      {notif.notifSubtype === 'event_report_request' && notif.requiresAction && notif.actionStatus !== 'completed' && (
                        <div className={styles.faqReplyAction}>
                          <button
                            className={styles.viewReplyLink}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReportNotif(notif);
                            }}
                          >
                            Click to open report form
                          </button>
                        </div>
                      )}

                      {notif.notifSubtype === 'event_report_request' && notif.actionStatus === 'completed' && (
                        <div className={styles.inviteContainer}>
                          <span className={styles.statusAccepted}>✓ Documentation Submitted</span>
                        </div>
                      )}

                      <span
                        className={[
                          styles.notifTypeTag,
                          categoryClass ? styles[categoryClass] : '',
                        ].filter(Boolean).join(' ')}
                      >
                        {notif.type || 'general'}
                      </span>
                    </div>

                    {!notif.isVirtual && (
                      <button
                        className={styles.notifDeleteBtn}
                        onClick={(e) => handleDelete(e, notif.id)}
                        aria-label="Delete notification"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })
            )}

            {/* ── Pagination UI ──────────────────────────────── */}
            {totalPages > 1 && (
              <>
                <div className={styles.paginationSpacer} />
                <div className={styles.paginationBar}>
                  <button
                    className={styles.pageBtn}
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                  >
                    First
                  </button>
                  <button
                    className={styles.pageBtn}
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Prev
                  </button>

                  <div className={styles.pageDivider} />

                  <div className={styles.pageDots}>
                    {getPageNumbers().map((page, index) =>
                      page === '...' ? (
                        <span key={`ellipsis-${index}`} className={styles.pageEllipsis}>...</span>
                      ) : (
                        <button
                          key={page}
                          className={`${styles.pageDot} ${currentPage === page ? styles.pageDotActive : ''}`}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </button>
                      )
                    )}
                  </div>

                  <div className={styles.pageDivider} />

                  <button
                    className={styles.pageBtn}
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                  <button
                    className={styles.pageBtn}
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Last
                  </button>
                </div>
              </>
            )}
          </div>
        )}

      </main>

      <Footer />

      {/* ── FAQ REPLY MODAL ──────────────────────────────── */}
      {selectedFaqReply && (
        <div className={styles.modalOverlay} onClick={() => setSelectedFaqReply(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Support Reply Details</h3>
              <button className={styles.closeModalBtn} onClick={() => setSelectedFaqReply(null)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.faqSection}>
                <label>Your Inquiry:</label>
                <div className={styles.faqBox}>
                  {selectedFaqReply.originalQuestion || 'N/A'}
                </div>
              </div>
              <div className={styles.faqSection}>
                <label className={styles.adminLabel}>Admin Response:</label>
                <div className={`${styles.faqBox} ${styles.adminBox}`}>
                  {selectedFaqReply.adminAnswer || 'N/A'}
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.closeActionBtn} onClick={() => setSelectedFaqReply(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EVENT REPORT MODAL ──────────────────────────────── */}
      {selectedReportNotif && (
        <div className={styles.modalOverlay} onClick={closeReportModal}>
          <div className={styles.modalContent} style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Submit Post-Event Report</h3>
              <button className={styles.closeModalBtn} onClick={closeReportModal}>
                ×
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.faqSection}>
                <label>Event Title:</label>
                <div className={styles.faqBox}>
                  {selectedReportNotif.eventTitle || 'N/A'}
                </div>
              </div>
              
              <div className={styles.faqSection}>
                <label className={styles.adminLabel}>Event Documentation / Summary</label>
                <textarea
                  className={styles.faqBox}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
                  placeholder="Describe how the event went, attendance count, impact..."
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  disabled={isSubmittingReport}
                />
              </div>

              <div className={styles.faqSection}>
                <label className={styles.adminLabel}>Attachments (Photos, Receipts, Documents)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '5px' }}>
                  {reportEntries.map((entry, index) => (
                    <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        placeholder="File description (e.g., Event Photo)"
                        value={entry.description}
                        onChange={(e) => handleEntryChange(index, 'description', e.target.value)}
                        disabled={isSubmittingReport}
                        style={{ flex: 1, padding: '8px', minWidth: '150px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                      <input
                        type="file"
                        onChange={(e) => handleEntryChange(index, 'file', e.target.files[0])}
                        disabled={isSubmittingReport}
                        style={{ flex: 1, minWidth: '200px' }}
                      />
                      {reportEntries.length > 1 && (
                        <button
                          onClick={() => handleRemoveEntry(index)}
                          disabled={isSubmittingReport}
                          style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                          title="Remove entry"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={handleAddEntry}
                    disabled={isSubmittingReport}
                    style={{ alignSelf: 'flex-start', background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em', marginTop: '5px' }}
                  >
                    + Add another file
                  </button>
                </div>
              </div>
            </div>
            
            <div className={styles.modalFooter} style={{ display: 'flex', gap: '10px' }}>
              <button 
                className={styles.closeActionBtn} 
                style={{ background: '#cbd5e1', color: '#0f172a' }}
                onClick={closeReportModal}
                disabled={isSubmittingReport}
              >
                Cancel
              </button>
              <button 
                className={styles.closeActionBtn} 
                style={{ background: 'var(--color-account)' }}
                onClick={handleSubmitReport}
                disabled={isSubmittingReport || !hasValidReportData}
              >
                {isSubmittingReport ? 'Uploading & Submitting...' : 'Submit Documentation'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default NotificationsPage;