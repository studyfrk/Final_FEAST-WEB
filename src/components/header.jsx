/* React & Firebase Imports */
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from "../firebase";
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

/* Asset Imports */
import logo from '../assets/GPC_Logo.png';

/* Component Imports */
import DrawerMenu from './DrawerMenu.jsx';
import ProfileModal from './ProfileModal.jsx';

/* Style Imports */
import styles from './header.module.css';

const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    let unsubscribeUserDoc = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        unsubscribeUserDoc = onSnapshot(userRef, (userSnap) => {
          if (userSnap.exists()) {
            setUserData(userSnap.data());
          }
        });
      } else {
        setUserData(null);
        if (unsubscribeUserDoc) unsubscribeUserDoc();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  // Close mobile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  // Close mobile menu on route change / resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  const handleNavClick = () => setIsMobileMenuOpen(false);

  // Prioritize Firestore data (userData) over Firebase Auth data
  const profilePic = userData?.profilePictureUrl || user?.photoURL || 'https://via.placeholder.com/40';
  const displayName = userData
    ? `${userData.firstName} ${userData.lastName}`
    : (user?.displayName || 'User');

  return (
    <>
      <header className={styles.navbar}>
        {/* Logo */}
        <div className={styles.navbarLogo}>
          <Link to="/" className={styles.logoButton} onClick={handleScrollToTop}>
            <img src={logo} alt="GPC Logo" className={styles.logoImg} />
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className={styles.navbarLinks}>
          <Link to="/home" onClick={handleScrollToTop}>Home</Link>
          <Link to="/about" onClick={handleNavClick}>About</Link>
          <Link to="/requests" onClick={handleNavClick}>Requests</Link>
          <Link to="/events" onClick={handleNavClick}>Events</Link>
          <Link to="/messages" onClick={handleNavClick}>Messages</Link>
          <Link to="/notif" onClick={handleNavClick}>Notifications</Link>
          <Link to="/admin" onClick={handleNavClick}>Admin</Link>
          <DrawerMenu />

          {user && (
            <div
              className={styles.userProfileTrigger}
              onClick={() => setIsModalOpen(true)}
            >
              <div className={styles.profilePicContainer}>
                <img
                  src={profilePic}
                  alt="Profile"
                  className={styles.navbarProfileImg}
                  key={profilePic}
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }}
                />
              </div>
              <span className={styles.navbarUsername}>{displayName}</span>
            </div>
          )}
        </nav>

        {/* Mobile Right: profile pic + hamburger */}
        <div className={styles.mobileRight}>
          {user && (
            <img
              src={profilePic}
              alt="Profile"
              className={styles.mobileProfileImg}
              key={`mob-${profilePic}`}
              onClick={() => setIsModalOpen(true)}
              onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }}
            />
          )}

          <button
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
          <Link to="/home" onClick={handleScrollToTop}>Home</Link>
          <Link to="/about" onClick={handleNavClick}>About</Link>
          <Link to="/requests" onClick={handleNavClick}>Requests</Link>
          <Link to="/events" onClick={handleNavClick}>Events</Link>
          <Link to="/messages" onClick={handleNavClick}>Messages</Link>
          <Link to="/notif" onClick={handleNavClick}>Notifications</Link>
          <Link to="/admin" onClick={handleNavClick}>Admin</Link>

          {user && (
            <div
              className={styles.mobileUserProfile}
              onClick={() => { setIsModalOpen(true); setIsMobileMenuOpen(false); }}
            >
              <img
                src={profilePic}
                alt="Profile"
                className={styles.mobileMenuProfileImg}
                onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }}
              />
              <span className={styles.mobileUsername}>{displayName}</span>
            </div>
          )}
        </nav>
      </div>

      {/* Overlay backdrop */}
      {isMobileMenuOpen && (
        <div
          className={styles.mobileOverlay}
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {isModalOpen && (
        <ProfileModal
          user={{
            ...user,
            displayName: displayName,
            photoURL: profilePic,
          }}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};

export default Header;
