/* React & Firebase Imports */
import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signOut, onAuthStateChanged } from 'firebase/auth';

/* Asset Imports */
import profilePlaceholder from '../assets/profile.jpg';
import requestIcon from '../assets/request.png';
import eventIcon from '../assets/event.png';
import userIcon from '../assets/user.png';
import reportIcon from '../assets/report.png';
import logoutIcon from '../assets/logout.png';
import homeIcon from "../assets/home.png";
import faqIcon from "../assets/ChatSupport.png";
import fundsIcon from "../assets/funds.png";
import itemsIcon from "../assets/items.png";
import announcementIcon from "../assets/announcement.png";
import logsIcon from "../assets/logs.png";

/* Component Imports */
import ProfileModal from './ProfileModal.jsx'; 
import DonationFunds from '../pages/DonationFunds.jsx';

/* Style Imports */
import styles from './admin_layout.module.css';

const AdminLayout = () => {
  const navigate = useNavigate();
  const [profileModal, setProfileModal] = useState(false);
  const [adminData, setAdminData] = useState({
    firstName: "Loading...",
    lastName: "",
    role: "Admin",
    profilePictureUrl: "",
    email: "",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setAdminData({...docSnap.data(), email: user.email});
          }
        } catch (error) {
          console.error("Error fetching admin data:", error);
        }
      } else {
        navigate("/");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("User logged out");
      navigate("/");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const navItems = [
    { name: 'Aid Requests', path: '/admin/requests', icon: requestIcon },
    { name: 'Events', path: '/admin/events', icon: eventIcon },
    { name: 'Users', path: '/admin/users', icon: userIcon },
    { name: 'Logs', path: '/admin/logs', icon: logsIcon },
    { name: 'Reports', path: '/admin/reports', icon: reportIcon },
    { name: 'FAQ', path: '/admin/faqm', icon: faqIcon },
    { name: 'Announcement', path: '/admin/announcement', icon: announcementIcon },
    { name: 'Funds', path: '/admin/funds', icon: fundsIcon },
    { name: 'Items', path: '/admin/items', icon: itemsIcon },
    { name: 'Return Home', path:'/home', icon: homeIcon },
  ];

  return (
    <div className={styles.adminContainer}>
      <aside className={styles.adminSidebar}>
        {/* Profile Section - Now Dynamic */}
        <div className={styles.adminUserProfile}>
          <img 
            src={adminData.profilePictureUrl || profilePlaceholder} 
            alt="Admin Profile" 
            className={styles.adminAvatar}
            onClick={() => setProfileModal(true)}
          />
          <div className={styles.adminUserInfo}>
            <h4 className={styles.adminName}>
              {adminData.firstName} {adminData.lastName}
            </h4>
            <p className={styles.adminRole}>
              {adminData.role.charAt(0).toUpperCase() + adminData.role.slice(1)}
            </p>
          </div>
        </div>

        {/* Navigation Wrapper */}
        <div className={styles.adminNavWrapper}>
          <nav className={styles.adminNav}>
            {navItems.map((item, index) => (
              <NavLink 
                key={index} 
                to={item.path} 
                className={({ isActive }) => isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}
              >
                <div className={styles.navIconContainer}>
                  <img src={item.icon} alt={item.name} className={styles.navIconImg} />
                </div>
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* Logout Section */}
          <div className={styles.adminSidebarFooter}>
            <button className={`${styles.navItem} ${styles.logoutBtn}`} onClick={handleLogout}>
              <div className={styles.navIconContainer}>
                <img src={logoutIcon} alt="Logout" className={styles.navIconImg} />
              </div>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main className={styles.adminMainContent}>
        <Outlet />
      </main>

      {profileModal && (
        <ProfileModal 
          user={{
            uid: auth.currentUser?.uid,                                    // ✅ ADDED
            email: adminData.email,                                        // ✅ ADDED
            displayName: `${adminData.firstName} ${adminData.lastName}`,   // ✅ ADDED
            photoURL: adminData.profilePictureUrl || profilePlaceholder  
          }} 
          onClose={() => setProfileModal(false)} 
        />
      )}
    </div>
  );
};

export default AdminLayout;
