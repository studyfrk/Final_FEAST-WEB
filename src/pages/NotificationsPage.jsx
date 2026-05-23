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
import { db, auth } from '../firebase';
import {
  collection, onSnapshot, query, orderBy,
  doc, updateDoc, deleteDoc, writeBatch, getDocs, where
} from 'firebase/firestore';

/* Component Imports */
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

/* Style Imports */
import styles from './notifications_page.module.css';

/* ============================================================
   CATEGORY REGISTRY
   Add new categories here — the filter dropdown updates automatically.
   Keep values lowercase; they must match the `type` field in Firestore
   and the CSS class names in the module.
   ============================================================ */
const CATEGORY_OPTIONS = [
  { value: 'all',      label: 'All Types' },
  { value: 'event',    label: 'Event' },
  { value: 'request',  label: 'Request' },
  { value: 'claim',    label: 'Claim' },
  { value: 'account',  label: 'Account' },
  { value: 'security', label: 'Security' },
];

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest First' },
  { value: 'oldest', label: 'Oldest First' },
];

const ITEMS_PER_PAGE = 10; // ← Set how many notifications per page

/* ============================================================
   HELPERS
   ============================================================ */

const getCategoryClass = (type = '') => {
  const known = ['event', 'request', 'claim', 'account', 'security'];
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

  /* States for live-monitoring pending drop-offs */
  const [pendingFunds, setPendingFunds] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);

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

  /* ── Reset pagination when filters change ───────────────── */
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
      <Header />

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

                      {notif.notifSubtype === 'co_organizer_invite' && notif.requiresAction && (
                        <div style={{ marginTop: '12px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                          <div style={{ fontSize: '13px', margin: '4px 0', color: '#334155' }}><strong>Main Organizer:</strong> {notif.organizerName || 'N/A'}</div>
                          <div style={{ fontSize: '13px', margin: '4px 0', color: '#334155' }}><strong>Event Title:</strong> {notif.eventTitle || 'N/A'}</div>
                          <div style={{ fontSize: '13px', margin: '4px 0', color: '#334155' }}><strong>Date & Time:</strong> {formatDisplayDate(notif.eventDate)} ({formatTime12hr(notif.eventStartTime)} - {formatTime12hr(notif.eventEndTime)})</div>
                          <div style={{ fontSize: '13px', margin: '4px 0', color: '#334155' }}><strong>Location:</strong> {notif.eventLocation || 'N/A'}</div>
                          <div style={{ fontSize: '13px', margin: '4px 0', color: '#475569', whiteSpace: 'pre-wrap' }}><strong>Description:</strong> {notif.eventDescription || 'N/A'}</div>

                          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                            {notif.actionStatus === 'pending' ? (
                              <>
                                <button 
                                  style={{ padding: '6px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                                  onClick={(e) => { e.stopPropagation(); handleAcceptCoOrg(notif); }}
                                >
                                  Accept
                                </button>
                                <button 
                                  style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                                  onClick={(e) => { e.stopPropagation(); handleDeclineCoOrg(notif); }}
                                >
                                  Decline
                                </button>
                              </>
                            ) : notif.actionStatus === 'accepted' ? (
                              <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '13px' }}>✓ Accepted Invitation</span>
                            ) : (
                              <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '13px' }}>✗ Declined Invitation</span>
                            )}
                          </div>
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
    </div>
  );
};

export default NotificationsPage;