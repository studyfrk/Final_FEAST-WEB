/* React & Firebase Imports */
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, writeBatch, getDocs, where } from 'firebase/firestore';

/* Component Imports */
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

/* Style Imports */
import styles from './notifications_page.module.css';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      
      if (!user) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      const notifPath = `users/${user.uid}/notifications`;
      const q = query(collection(db, notifPath), orderBy("createdAt", "desc"));

      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setNotifications(data);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching notifications snapshot:", error);
        setLoading(false);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, []);

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    try {
      const notifPath = `users/${currentUser.uid}/notifications`;
      const q = query(collection(db, notifPath), where("read", "==", false));
      const snap = await getDocs(q);

      if (snap.empty) return;

      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        batch.update(d.ref, { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking all read:", error);
    }
  };

  const handleMarkAsRead = async (notif) => {
    if (!currentUser || notif.read) return;
    
    try {
      const docRef = doc(db, `users/${currentUser.uid}/notifications`, notif.id);
      await updateDoc(docRef, { read: true });
    } catch (error) {
      console.error("Error marking read:", error);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); 
    if (!currentUser) return;

    try {
      const docRef = doc(db, `users/${currentUser.uid}/notifications`, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={styles.pageWrapper}>
      <Header />
      
      <main className={styles.notificationsPage}>
        <div className={styles.tableHeaderRow}>
          <h2>Notifications</h2>
          {notifications.some(n => !n.read) && (
            <button className={styles.markReadBtn} onClick={handleMarkAllRead}>
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className={styles.loadingState}>Loading notifications...</div>
        ) : (
          <div className={styles.notifListContainer}>
            {notifications.length === 0 ? (
              <div className={styles.emptyState}>No notifications yet.</div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`${styles.notifCard} ${!notif.read ? styles.unread : ''}`}
                  onClick={() => handleMarkAsRead(notif)}
                >
                  <div className={styles.notifIconBox}>
                    <span className={`${styles.statusDot} ${notif.status || styles.default}`}></span>
                  </div>
                  
                  <div className={styles.notifContent}>
                    <div className={styles.notifTop}>
                      <h4>{notif.title}</h4>
                      <span className={styles.notifTime}>{formatTimestamp(notif.createdAt)}</span>
                    </div>
                    <p>{notif.body}</p>
                    <span className={styles.notifTypeTag}>{notif.type}</span>
                  </div>

                  <button 
                    className={styles.notifDeleteBtn} 
                    onClick={(e) => handleDelete(e, notif.id)}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default NotificationsPage;