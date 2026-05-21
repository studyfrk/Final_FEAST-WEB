/* React & Firebase Imports */
import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const [profileModal, setProfileModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);
  const [adminData, setAdminData] = useState({
    firstName: "Loading...",
    lastName: "",
    role: "Admin",
    profilePictureUrl: "",
    email: "",
  });

  // Close sidebar on route change (mobile/tablet)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        // Don't close if clicking the burger button itself
        if (!e.target.closest(`.${styles.burgerBtn}`)) {
          setSidebarOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarOpen]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

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
      navigate("/");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const navItems = [
    { name: 'Users', path: '/admin/users', icon: userIcon },
    { name: 'Announcements', path: '/admin/announcement', icon: announcementIcon },
    { name: 'Aid Requests', path: '/admin/requests', icon: requestIcon },
    { name: 'Fund Donations', path: '/admin/funds', icon: fundsIcon },
    { name: 'Item Donations', path: '/admin/items', icon: itemsIcon },
    { name: 'Charity Events', path: '/admin/events', icon: eventIcon },
    { name: 'Reports', path: '/admin/reports', icon: reportIcon },
    { name: 'Questions', path: '/admin/faqm', icon: faqIcon },
    { name: 'System Logs', path: '/admin/logs', icon: logsIcon },
    { name: 'Return Home', path: '/home', icon: homeIcon },
  ];

  return (
    <div className={styles.adminContainer}>

      {/* ── Mobile / Tablet Top Bar ── */}
      <header className={styles.mobileTopBar}>
        <button
          className={`${styles.burgerBtn} ${sidebarOpen ? styles.burgerOpen : ''}`}
          onClick={() => setSidebarOpen(prev => !prev)}
          aria-label="Toggle navigation"
          aria-expanded={sidebarOpen}
        >
          <span className={styles.burgerLine} />
          <span className={styles.burgerLine} />
          <span className={styles.burgerLine} />
        </button>

        <span className={styles.topBarTitle}>Admin Panel</span>

        <img
          src={adminData.profilePictureUrl || profilePlaceholder}
          alt="Admin"
          className={styles.topBarAvatar}
          onClick={() => setProfileModal(true)}
        />
      </header>

      {/* ── Backdrop ── */}
      <div
        className={`${styles.sidebarBackdrop} ${sidebarOpen ? styles.backdropVisible : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar ── */}
      <aside
        ref={sidebarRef}
        className={`${styles.adminSidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}
      >
        {/* Profile Section */}
        <div className={styles.adminUserProfile}>
          <img
            src={adminData.profilePictureUrl || profilePlaceholder}
            alt="Admin Profile"
            className={styles.adminAvatar}
            onClick={() => { setProfileModal(true); setSidebarOpen(false); }}
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
                className={({ isActive }) =>
                  isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
                }
              >
                <div className={styles.navIconContainer}>
                  <img src={item.icon} alt={item.name} className={styles.navIconImg} />
                </div>
                <span className={styles.navLabel}>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* Logout Section */}
          <div className={styles.adminSidebarFooter}>
            <button className={`${styles.navItem} ${styles.logoutBtn}`} onClick={handleLogout}>
              <div className={styles.navIconContainer}>
                <img src={logoutIcon} alt="Logout" className={styles.navIconImg} />
              </div>
              <span className={styles.navLabel}>Logout</span>
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
            uid: auth.currentUser?.uid,
            email: adminData.email,
            displayName: `${adminData.firstName} ${adminData.lastName}`,
            photoURL: adminData.profilePictureUrl || profilePlaceholder
          }}
          onClose={() => setProfileModal(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;
