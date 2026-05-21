/* React & Firebase Imports */
import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
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
  const hamburgerRef = useRef(null);

  useEffect(() => {
    let unsubscribeUserDoc = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUserData(null);
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

  const profilePic = userData?.profilePictureUrl || user?.photoURL || 'https://via.placeholder.com/40';
  const displayName = userData
    ? `${userData.firstName} ${userData.lastName}`
    : (user?.displayName || 'User');
  const isAdmin = userData?.role?.toLowerCase() === 'admin';

  const desktopLinks = [
    { to: '/home', label: 'Home', onClick: handleScrollToTop },
    { to: '/about', label: 'About', onClick: handleNavClick },
    { to: '/requests', label: 'Requests', onClick: handleNavClick },
    { to: '/events', label: 'Events', onClick: handleNavClick },
    { to: '/messages', label: 'Messages', onClick: handleNavClick },
    { to: '/notif', label: 'Notifications', onClick: handleNavClick },
  ];

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
          {desktopLinks.map(({ to, label, onClick }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClick}
              className={({ isActive }) => isActive ? styles.activeLink : undefined}
            >
              {label}
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
          {user && (
            <div className={styles.userProfileTrigger} onClick={() => setIsModalOpen(true)}>
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

        {/* Mobile Right */}
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
        {[
          { to: '/home', label: 'Home', onClick: handleScrollToTop },
          { to: '/about', label: 'About', onClick: handleNavClick },
          { to: '/requests', label: 'Requests', onClick: handleNavClick },
          { to: '/events', label: 'Events', onClick: handleNavClick },
          { to: '/messages', label: 'Messages', onClick: handleNavClick },
          { to: '/notif', label: 'Notifications', onClick: handleNavClick },
        ].map(({ to, label, onClick }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClick}
            className={({ isActive }) => isActive ? styles.mobileActiveLink : undefined}
          >
            {label}
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

          {/* DrawerMenu as flat mobile links */}
          <DrawerMenu mobile={true} />

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
