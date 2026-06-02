/* React & Firebase Imports */
import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { signOut, onAuthStateChanged } from 'firebase/auth';

/* Asset Imports */
import profilePlaceholder from '../assets/profile.jpg';
import requestIcon from '../assets/request.png';
import eventIcon from '../assets/event.png';
import userIcon from '../assets/user.png';
import reportIcon from '../assets/report.png';
import logoutIcon from '../assets/logout.png';
import homeIcon from "../assets/Home.png";
import faqIcon from "../assets/ChatSupport.png";
import fundsIcon from "../assets/funds.png";
import itemsIcon from "../assets/items.png";
import announcementIcon from "../assets/announcement.png";
import logsIcon from "../assets/logs.png";
import overviewIcon from "../assets/overview.png";

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
    firstName: "",
    lastName: "",
    role: "Admin",
    profilePictureUrl: "",
    email: "",
  });
  const [isLoading, setIsLoading] = useState(true);

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
            const data = docSnap.data();
            const userRole = (data.role || '').toLowerCase();
            if (userRole !== 'admin' && userRole !== 'superadmin') {
              navigate("/home");
              return;
            }
            setAdminData({...data, email: user.email});
          } else {
            navigate("/");
          }
        } catch (error) {
          console.error("Error fetching admin data:", error);
          navigate("/");
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

const handleLogout = async () => {
    try {
      // 1. Sign out of Firebase
      await signOut(auth);
      
      // 2. Remove the route guard token
      localStorage.removeItem("feast_auth_token");
      localStorage.removeItem("feast_was_admin");
      localStorage.removeItem("feast_display_name");
      localStorage.removeItem("feast_profile_pic");
      localStorage.removeItem("feast_user_id");
      
      // 3. Redirect to the sign-in page
      navigate("/");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const [hasPendingAidRequests, setHasPendingAidRequests] = useState(false);
  const [hasPendingCharityEvents, setHasPendingCharityEvents] = useState(false);
  const [hasUnreadFundDonations, setHasUnreadFundDonations] = useState(false);
  const [hasUnreadItemDonations, setHasUnreadItemDonations] = useState(false);
  const [hasPendingReports, setHasPendingReports] = useState(false);
  const [hasUnverifiedUsers, setHasUnverifiedUsers] = useState(false);
  const [hasPendingFaq, setHasPendingFaq] = useState(false);
  const [hasPendingEventDocu, setHasPendingEventDocu] = useState(false);

  useEffect(() => {
    // 0. Users listener
    const qUsers = query(
      collection(db, 'users'),
      where('status', 'in', ['unverified', 'Unverified'])
    );
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      setHasUnverifiedUsers(!snapshot.empty);
    }, (error) => {
      console.error("Error listening to unverified users:", error);
    });

    // 1. Aid Requests listener
    const qAid = query(
      collection(db, 'aid_requests'),
      where('approvalStatus', 'in', ['Pending', 'Unread', 'Processing', 'processing'])
    );
    const unsubAid = onSnapshot(qAid, (snapshot) => {
      setHasPendingAidRequests(!snapshot.empty);
    }, (error) => {
      console.error("Error listening to pending aid requests:", error);
    });

    // 2. Charity Events listener
    const qEvents = query(
      collection(db, 'charity_events'),
      where('approvalStatus', 'in', ['Pending', 'Processing', 'processing'])
    );
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      setHasPendingCharityEvents(!snapshot.empty);
    }, (error) => {
      console.error("Error listening to pending charity events:", error);
    });

    // 3. Fund Donations listener
    const qFunds = query(
      collection(db, 'donation_funds'),
      where('status', 'in', ['Unread', 'Processing', 'processing'])
    );
    const unsubFunds = onSnapshot(qFunds, (snapshot) => {
      setHasUnreadFundDonations(!snapshot.empty);
    }, (error) => {
      console.error("Error listening to unread fund donations:", error);
    });

    // 4. Item Donations listener
    const qItems = query(
      collection(db, 'donation_items'),
      where('status', 'in', ['Unread', 'Processing', 'processing'])
    );
    const unsubItems = onSnapshot(qItems, (snapshot) => {
      setHasUnreadItemDonations(!snapshot.empty);
    }, (error) => {
      console.error("Error listening to unread item donations:", error);
    });

    // 5. Reports listener
    const qReports = query(
      collection(db, 'reports'),
      where('status', 'in', ['Pending', 'Processing', 'processing'])
    );
    const unsubReports = onSnapshot(qReports, (snapshot) => {
      setHasPendingReports(!snapshot.empty);
    }, (error) => {
      console.error("Error listening to pending reports:", error);
    });

    // 6. FAQ listener
    const qFaq = query(
      collection(db, 'user_questions'),
      where('status', 'in', ['pending', 'processing', 'Pending', 'Processing'])
    );
    const unsubFaq = onSnapshot(qFaq, (snapshot) => {
      setHasPendingFaq(!snapshot.empty);
    }, (error) => {
      console.error("Error listening to pending faqs:", error);
    });

    // 7. Event Documentation listener
    // Catches docs explicitly marked Pending
    const qEventDocuPending = query(
      collection(db, 'charity_events'),
      where('reportReviewStatus', '==', 'Pending')
    );
    // Catches docs that have a submitted report but reportReviewStatus was never set
    const qEventDocuSubmitted = query(
      collection(db, 'charity_events'),
      where('reportSubmittedAt', '!=', null)
    );

    let pendingSnapshotEmpty = true;
    let submittedSnapshotEmpty = true;

    const updateEventDocuBadge = () => {
      setHasPendingEventDocu(!pendingSnapshotEmpty || !submittedSnapshotEmpty);
    };

    const unsubEventDocuPending = onSnapshot(qEventDocuPending, (snapshot) => {
      pendingSnapshotEmpty = snapshot.empty;
      updateEventDocuBadge();
    }, (error) => console.error("Error listening to pending event docu:", error));

    const unsubEventDocuSubmitted = onSnapshot(qEventDocuSubmitted, (snapshot) => {
      // Only count ones that aren't already Reviewed
      const hasUnreviewed = snapshot.docs.some(d => d.data().reportReviewStatus !== 'Reviewed');
      submittedSnapshotEmpty = !hasUnreviewed;
      updateEventDocuBadge();
    }, (error) => console.error("Error listening to submitted event docu:", error));

    return () => {
      unsubUsers();
      unsubAid();
      unsubEvents();
      unsubFunds();
      unsubItems();
      unsubReports();
      unsubFaq();
      unsubEventDocuPending();
      unsubEventDocuSubmitted();
    };
  }, []);

  const navItems = [
    { name: 'Users', path: '/admin/users', icon: userIcon, showBadge: hasUnverifiedUsers },
    { name: 'Announcements', path: '/admin/announcement', icon: announcementIcon },
    { name: 'Aid Requests', path: '/admin/requests', icon: requestIcon, showBadge: hasPendingAidRequests },
    { name: 'Charity Events', path: '/admin/events', icon: eventIcon, showBadge: hasPendingCharityEvents },
    { name: 'Fund Donations', path: '/admin/funds', icon: fundsIcon, showBadge: hasUnreadFundDonations },
    { name: 'Item Donations', path: '/admin/items', icon: itemsIcon, showBadge: hasUnreadItemDonations },
    { name: 'Event Documentation', path: '/admin/eventdocu', icon: eventIcon, showBadge: hasPendingEventDocu },
    { name: 'Reports', path: '/admin/reports', icon: reportIcon, showBadge: hasPendingReports },
    { name: 'Questions', path: '/admin/faqm', icon: faqIcon, showBadge: hasPendingFaq },
    { name: 'Summary Reports', path: '/admin/summary-reports', icon: overviewIcon },
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
          src={adminData.profilePictureUrl || auth.currentUser?.photoURL || profilePlaceholder}
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
            src={adminData.profilePictureUrl || auth.currentUser?.photoURL || profilePlaceholder}
            alt="Admin Profile"
            className={styles.adminAvatar}
            onClick={() => { setProfileModal(true); setSidebarOpen(false); }}
          />
          <div className={styles.adminUserInfo}>
            <h4 className={styles.adminName}>
              {isLoading 
                ? "Loading..." 
                : ((adminData.firstName || adminData.lastName) 
                  ? `${adminData.firstName || ''} ${adminData.lastName || ''}`.trim() 
                  : (adminData.displayName || adminData.fullName || 'Admin User'))}
            </h4>
            <p className={styles.adminRole} style={{ textTransform: 'none', marginBottom: '2px' }}>
              {adminData.email || 'Loading email...'}
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
                <span className={styles.navLabel} style={{ position: 'relative' }}>
                  {item.name}
                  {item.showBadge && (
                    <span className={styles.navBadge} />
                  )}
                </span>
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
            displayName: ((adminData.firstName || adminData.lastName) 
              ? `${adminData.firstName || ''} ${adminData.lastName || ''}`.trim() 
              : (adminData.displayName || adminData.fullName || localStorage.getItem('feast_display_name') || 'Admin User')),
            photoURL: adminData.profilePictureUrl || auth.currentUser?.photoURL || profilePlaceholder
          }}
          onClose={() => setProfileModal(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;