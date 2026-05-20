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

  /* ── Firebase Auth + Firestore listener (unchanged) ─────── */
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);

      if (!user) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      const notifPath = `users/${user.uid}/notifications`;
      const q = query(collection(db, notifPath), orderBy('createdAt', 'desc'));

      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setNotifications(data);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching notifications snapshot:', error);
        setLoading(false);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, []);

  /* ── Backend handlers (unchanged) ───────────────────────── */
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
    if (!currentUser || notif.read) return;
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
    let list = [...notifications];

    /* Category filter */
    if (categoryFilter !== 'all') {
      list = list.filter(
        (n) => (n.type || '').toLowerCase().trim() === categoryFilter
      );
    }

    /* Sort order (Firestore always returns latest-first; we may reverse) */
    if (sortOrder === 'oldest') {
      list = list.reverse();
    }

    return list;
  }, [notifications, categoryFilter, sortOrder]);

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
                      !notif.read ? styles.unread : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => handleMarkAsRead(notif)}
                  >
                    {/* Status dot */}
                    <div className={styles.notifIconBox}>
                      <span
                        className={[
                          styles.statusDot,
                          categoryClass ? styles[categoryClass] : '',
                          notif.status ? styles[notif.status] : '',
                        ].filter(Boolean).join(' ')}
                      />
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

                    {/* Delete button */}
                    <button
                      className={styles.notifDeleteBtn}
                      onClick={(e) => handleDelete(e, notif.id)}
                      aria-label="Delete notification"
                    >
                      ×
                    </button>
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
