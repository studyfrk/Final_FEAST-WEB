import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import styles from './admin_layout.module.css';
import ProfileModal from './ProfileModal'; 

import profilePlaceholder from '../assets/profile.jpg';
import requestIcon from '../assets/request.png';
import eventIcon from '../assets/event.png';
import userIcon from '../assets/user.png';
import reportIcon from '../assets/report.png';
import logoutIcon from '../assets/logout.png';
import homeIcon from "../assets/Home.png";
import faqIcon from "../assets/ChatSupport.png";

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
    { name: 'Logs', path: '/admin/logs', icon: reportIcon },
    { name: 'Reports', path: '/admin/reports', icon: reportIcon },
    { name: 'FAQ', path: '/admin/faqm', icon: faqIcon },
    { name: 'Return Home', path:'/home', icon: homeIcon },
  ];

  return (
    <div className={styles.adminContainer}>
      <aside className={styles.adminSidebar}>
        {/* Profile Section - Now Dynamic */}
        <div className={styles.adminUserProfile} onClick={() => setProfileModal(true)}>
          <img 
            src={adminData.profilePictureUrl || profilePlaceholder} 
            alt="Admin Profile" 
            className={styles.adminAvatar} 
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
