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
  { value: 'request', label: 'Request' },
  { value: 'claim',    label: 'Claim' },
  { value: 'account',  label: 'Account' },
  { value: 'security', label: 'Security' },
  // { value: 'newCategory', label: 'New Category' }, ← add new ones here
];

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest First' },
  { value: 'oldest', label: 'Oldest First' },
];

/* ============================================================
   HELPERS
   ============================================================ */

/**
 * Returns the CSS module class for a given notification type.
 * Falls back to an empty string (uses .notifCard default) for
 * categories not listed in the module.
 */
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

      // Reset previous listeners if user logs out or switches
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

      // 1. Fetch persistent database notifications
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

      // 2. Monitor ongoing monetary drop-offs
      const qFunds = query(collection(db, 'donation_funds'), where('userId', '==', user.uid));
      unsubFunds = onSnapshot(qFunds, (snapshot) => {
        const data = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(d => d.status === 'Unread' || d.status === 'Processing');
        setPendingFunds(data);
      });

      // 3. Monitor ongoing in-kind item drop-offs
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
    if (!currentUser || notif.read || notif.isVirtual) return; // Ignore clicks for reminders
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

  /* ── Client-side filtering & sorting ────────────────────── */
  const filteredNotifications = useMemo(() => {
    // Transform live pending fund transactions into UI notification objects
    const fundReminders = pendingFunds.map(fund => ({
      id: `pending-fund-${fund.id}`,
      title: `Pending Drop-off: ${fund.targetRequestTitle || 'Fundraiser'}`,
      body: `Awaiting delivery of your ₱${Number(fund.amount || 0).toLocaleString()} donation. Reference No: ${fund.referenceNumber || 'N/A'}. Please present this reference number to the barangay office.`,
      type: 'request', // Sets category color layout matching 'Request' settings
      createdAt: fund.createdAt,
      read: false,
      isVirtual: true // Internal flag to identify it as dynamic
    }));

    // Transform live pending items transactions into UI notification objects
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

    // Merge database items and the generated dynamic reminders
    let list = [...fundReminders, ...itemReminders, ...notifications];

    // Core sorting step: sort by time initially
    list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });

    /* Category filter */
    if (categoryFilter !== 'all') {
      list = list.filter(
        (n) => (n.type || '').toLowerCase().trim() === categoryFilter
      );
    }

    /* Sort order adjustment */
    if (sortOrder === 'oldest') {
      list = list.reverse();
    }

    // Force all active reminders to remain pinned at the very top of the grid
    const pinned = list.filter(n => n.isVirtual);
    const unpinned = list.filter(n => !n.isVirtual);
    
    return [...pinned, ...unpinned];
  }, [notifications, pendingFunds, pendingItems, categoryFilter, sortOrder]);

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

            {/* Category dropdown */}
            <select
              className={styles.filterSelect}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Sort dropdown */}
            <select
              className={styles.filterSelect}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              aria-label="Sort by time"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
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
              filteredNotifications.map((notif) => {
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
                    // Added unique indicator styling styling if it's an active virtual reminder
                    style={notif.isVirtual ? { borderLeft: '5px solid #f59e0b', backgroundColor: '#fffbeb', cursor: 'default' } : {}}
                  >
                    {/* Status dot */}
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

                    {/* Main content */}
                    <div className={styles.notifContent}>
                      <div className={styles.notifTop}>
                        <h4>{notif.title}</h4>
                        <span className={styles.notifTime}>
                          {formatTimestamp(notif.createdAt)}
                        </span>
                      </div>

                      <p>{notif.body}</p>

                      {/* Type tag — inherits category color via CSS */}
                      <span
                        className={[
                          styles.notifTypeTag,
                          categoryClass ? styles[categoryClass] : '',
                        ].filter(Boolean).join(' ')}
                      >
                        {notif.type || 'general'}
                      </span>
                    </div>

                    {/* Render Delete button only for non-mandatory persistent alerts */}
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
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default NotificationsPage;