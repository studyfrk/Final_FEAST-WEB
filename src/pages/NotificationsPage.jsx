import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import Header from '../components/header';
import Footer from '../components/footer';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, writeBatch, getDocs, where } from 'firebase/firestore';
import './notifications_page.css';

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
    <div className="page-wrapper">
      <Header />
      
      <main className="notifications-page">
        <div className="table-header-row">
          <h2>Notifications</h2>
          {notifications.some(n => !n.read) && (
            <button className="mark-read-btn" onClick={handleMarkAllRead}>
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading-state">Loading notifications...</div>
        ) : (
          <div className="notif-list-container">
            {notifications.length === 0 ? (
              <div className="empty-state">No notifications yet.</div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`notif-card ${!notif.read ? 'unread' : ''}`}
                  onClick={() => handleMarkAsRead(notif)}
                >
                  <div className="notif-icon-box">
                    <span className={`status-dot ${notif.status || 'default'}`}></span>
                  </div>
                  
                  <div className="notif-content">
                    <div className="notif-top">
                      <h4>{notif.title}</h4>
                      <span className="notif-time">{formatTimestamp(notif.createdAt)}</span>
                    </div>
                    <p>{notif.body}</p>
                    <span className="notif-type-tag">{notif.type}</span>
                  </div>

                  <button 
                    className="notif-delete-btn" 
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