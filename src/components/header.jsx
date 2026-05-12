import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/GPC_Logo.png';
import './header.css';
import DrawerMenu from './DrawerMenu';
import ProfileModal from './ProfileModal'; 
import { auth, db } from "../firebase";
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    let unsubscribeUserDoc = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // This is the key: every time the app loads or refreshes, 
        // we pull the latest data from the "users" collection
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

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  // Prioritize Firestore data (userData) over Firebase Auth data
  const profilePic = userData?.profilePictureUrl || user?.photoURL || 'https://via.placeholder.com/40';
  const displayName = userData ? `${userData.firstName} ${userData.lastName}` : (user?.displayName || 'User');

  return (
    <>
      <header className="navbar">
        <div className="navbar-logo">
          <Link to="/" className="logo-button">
            <img src={logo} alt="GPC Logo" className="logo-img" />
          </Link>
        </div>
        
        <nav className="navbar-links">
          <Link to="/home" onClick={handleScrollToTop}>Home</Link>
          <Link to="/about">About</Link>
          <Link to="/requests">Requests</Link>
          <Link to="/events">Events</Link>
          <Link to="/messages">Messages</Link>
          <Link to="/notiff">Notiffications</Link>
          <Link to="/admin">Admin</Link>
          <DrawerMenu />

          {user && (
            <div className="user-profile-trigger" onClick={() => setIsModalOpen(true)}>
              <div className="profile-pic-container">
                <img 
                  src={profilePic} 
                  alt="Profile" 
                  className="navbar-profile-img" 
                  key={profilePic} // Forces re-render when URL changes
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }}
                />
              </div>
              <span className="navbar-username">{displayName}</span>
            </div>
          )}
        </nav>
      </header>

      {isModalOpen && (
        <ProfileModal 
          user={{
            ...user, 
            displayName: displayName, 
            photoURL: profilePic 
          }} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </>
  );
};

export default Header;