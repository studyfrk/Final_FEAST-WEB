/* React & Firebase Imports */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from "../firebase.js";
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';

/* Asset Imports */
import logo from '../assets/GPC_Logo.png';
import userIcon from '../assets/user(1).png';

/* Component Imports */
import DrawerMenu from './DrawerMenu.jsx';
import ProfileModal from './ProfileModal.jsx';

/* Style Imports */
import styles from './header.module.css';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(auth.currentUser);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // State variables for the red dots
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false); 
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);

  const mobileMenuRef = useRef(null);
  const hamburgerRef = useRef(null);

  // Track previous UID to avoid clearing userData when the same user is still logged in
  const prevUidRef = useRef(auth.currentUser?.uid || null);

  // 1. Listen for User Auth
  useEffect(() => {
    let unsubscribeUserDoc = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
       if (currentUser?.uid !== prevUidRef.current) {
        setUserData(null);
      }
      prevUidRef.current = currentUser?.uid || null;
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        unsubscribeUserDoc = onSnapshot(userRef, (userSnap) => {
          setUserData(userSnap.exists() ? userSnap.data() : null);
        });
      } else {
        if (unsubscribeUserDoc) unsubscribeUserDoc();
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setHasUnreadMessages(false);
      setHasUnreadNotifs(false);
      return;
    }

    const notifRef = collection(db, 'users', user.uid, 'notifications');
    const qNotif = query(notifRef, where('read', '==', false));
    const unsubNotif = onSnapshot(qNotif, (snapshot) => {
      setHasUnreadNotifs(!snapshot.empty);
    }, (error) => {
      console.error("Error fetching notifications:", error);
    });
    // Messages Listener
    const msgRef = collection(db, 'chats');
    const qMsg = query(
      msgRef,
      where('participantIds', 'array-contains', user.uid),
      where(`unread.${user.uid}`, '==', true)
    );
    const unsubMsg = onSnapshot(qMsg, (snapshot) => {
      setHasUnreadMessages(!snapshot.empty);
    }, (error) => {
      console.error("Error fetching chats:", error);
    });
    return () => {
      unsubNotif();
      unsubMsg();
    };
  }, [user]);

  // Mobile Menu Click Outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        mobileMenuRef.current && !mobileMenuRef.current.contains(e.target) &&
        hamburgerRef.current && !hamburgerRef.current.contains(e.target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  // Window Resize Handle
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* Lock body scroll when mobile menu open */
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  const handleNavClick = () => setIsMobileMenuOpen(false);

  // Profile Data Cache
  const cachedName = localStorage.getItem('feast_display_name');
  const cachedPic = localStorage.getItem('feast_profile_pic');

  const profilePic = userData?.profilePictureUrl || user?.photoURL || cachedPic || userIcon;
  const displayName = userData
    ? (`${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.fullName || userData.displayName || cachedName || user?.displayName || 'User')
    : (cachedName || user?.displayName || 'User');
  
  const isAdmin = userData?.role?.toLowerCase() === 'admin' || (user && localStorage.getItem('feast_was_admin') === 'true');

  useEffect(() => {
    if (userData) {
      if (userData.role?.toLowerCase() === 'admin') {
        localStorage.setItem('feast_was_admin', 'true');
      }
      if (userData.firstName && userData.lastName) {
        localStorage.setItem('feast_display_name', `${userData.firstName} ${userData.lastName}`);
      }
      if (userData.profilePictureUrl) {
        localStorage.setItem('feast_profile_pic', userData.profilePictureUrl);
      }
    }
  }, [userData]);

  // Consolidated Navigation Links Array
  const navLinks = [
    { to: '/home', label: 'Home', onClick: handleScrollToTop },
    { to: '/about', label: 'About', onClick: handleNavClick },
    { to: '/requests', label: 'Requests', onClick: handleNavClick },
    { to: '/events', label: 'Events', onClick: handleNavClick },
    { to: '/messages', label: 'Messages', onClick: handleNavClick, hasBadge: hasUnreadMessages },
    { to: '/notif', label: 'Notifications', onClick: handleNavClick, hasBadge: hasUnreadNotifs },
  ];

  return (
    <>
      <header className={styles.navbar}>
        {/* Logo */}
        <div className={styles.navbarLogo}>
          <Link to="/home" className={styles.logoButton} onClick={handleScrollToTop}>
            <img src={logo} alt="GPC Logo" className={styles.logoImg} />
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className={styles.navbarLinks}>
          {navLinks.map(({ to, label, onClick, hasBadge }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClick}
              className={({ isActive }) => {
                const isRequests = to === '/requests' && (location.pathname.startsWith('/requests') || location.pathname.startsWith('/aid-requests'));
                const isEvents = to === '/events' && (location.pathname.startsWith('/events') || location.pathname.startsWith('/charity-events'));
                return (isActive || isRequests || isEvents) ? styles.activeLink : undefined;
              }}
            >
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <span>{label}</span>
                {hasBadge && (
                  <span style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-12px',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#ff3b30',
                    borderRadius: '50%'
                  }} />
                )}
              </div>
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              onClick={handleNavClick}
              className={({ isActive }) => isActive ? styles.activeLink : undefined}
            >
              Admin
            </NavLink>
          )}
          <DrawerMenu />
          
          {/* Permanent Desktop Profile Box (Stays strictly sized in layout context regardless of loading states) */}
          <div className={styles.userProfileTrigger} onClick={() => user && setIsModalOpen(true)}>
            <div className={`${styles.profilePicContainer} ${!user ? styles.skeletonAnimation : ''}`}>
              {user && (
                <img
                  src={profilePic}
                  alt="Profile"
                  className={styles.navbarProfileImg}
                  key={profilePic}
                  onError={(e) => { e.target.src = userIcon; }}
                />
              )}
            </div>
            <span className={`${styles.navbarUsername} ${!user ? styles.skeletonTextAnimation : ''}`}>
              {user ? displayName : ""}
            </span>
          </div>
        </nav>

        {/* Mobile Right */}
        <div className={styles.mobileRight}>
          <div className={styles.mobileProfileImgWrapper}>
            {user && (
              <img
                src={profilePic}
                alt="Profile"
                className={styles.mobileProfileImg}
                key={`mob-${profilePic}`}
                onClick={() => setIsModalOpen(true)}
                onError={(e) => { e.target.src = userIcon; }}
              />
            )}
          </div>
          <button
            ref={hamburgerRef}
            className={`${styles.hamburger} ${isMobileMenuOpen ? styles.hamburgerOpen : ''}`}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            <span className={styles.hamburgerLine} />
            <span className={styles.hamburgerLine} />
            <span className={styles.hamburgerLine} />
          </button>
        </div>
      </header>

      {/* Mobile Dropdown Menu */}
      <div
        ref={mobileMenuRef}
        className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.mobileMenuOpen : ''}`}
        aria-hidden={!isMobileMenuOpen}
      >
        <nav className={styles.mobileNav}>
          {navLinks.map(({ to, label, onClick, hasBadge }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClick}
              className={({ isActive }) => {
                const isRequests = to === '/requests' && (location.pathname.startsWith('/requests') || location.pathname.startsWith('/aid-requests'));
                const isEvents = to === '/events' && (location.pathname.startsWith('/events') || location.pathname.startsWith('/charity-events'));
                return (isActive || isRequests || isEvents) ? styles.mobileActiveLink : undefined;
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{label}</span>
                {hasBadge && (
                  <span style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#ff3b30',
                    borderRadius: '50%',
                    flexShrink: 0
                  }} />
                )}
              </div>
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              onClick={handleNavClick}
              className={({ isActive }) => isActive ? styles.mobileActiveLink : undefined}
            >
              Admin
            </NavLink>
          )}

          <DrawerMenu mobile={true} />

          {/* Permanent Mobile Dropdown Profile Box */}
          <div
            className={styles.mobileUserProfile}
            onClick={() => { if (user) { setIsModalOpen(true); setIsMobileMenuOpen(false); } }}
          >
            <div className={`${styles.mobileMenuProfileImgWrapper} ${!user ? styles.skeletonAnimation : ''}`}>
              {user && (
                <img
                  src={profilePic}
                  alt="Profile"
                  className={styles.mobileMenuProfileImg}
                  onError={(e) => { e.target.src = userIcon; }}
                />
              )}
            </div>
            <span className={`${styles.mobileUsername} ${!user ? styles.skeletonTextAnimation : ''}`}>
              {user && (userData || user?.displayName) ? displayName : ""}
            </span>
          </div>
        </nav>
      </div>

      {isMobileMenuOpen && (
        <div
          className={styles.mobileOverlay}
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {isModalOpen && (
        <ProfileModal
          user={{ ...user, displayName, photoURL: profilePic }}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};

export default Header;