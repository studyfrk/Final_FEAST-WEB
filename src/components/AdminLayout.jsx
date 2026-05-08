import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import './admin_layout.css';

import profilePlaceholder from '../assets/profile.jpg';
import requestIcon from '../assets/request.png';
import eventIcon from '../assets/event.png';
import userIcon from '../assets/user.png';
import reportIcon from '../assets/report.png';
import logoutIcon from '../assets/logout.png';

const AdminLayout = () => {
  const navigate = useNavigate();
  const [adminData, setAdminData] = useState({
    firstName: "Loading...",
    lastName: "",
    role: "Admin",
    profilePictureUrl: ""
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setAdminData(docSnap.data());
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
    { name: 'Reports & Logs', path: '/admin/reports', icon: reportIcon },
    { name: 'FAQ', path: '/admin/faqm', icon: reportIcon },
  ];

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        {/* Profile Section - Now Dynamic */}
        <div className="admin-user-profile">
          <img 
            src={adminData.profilePictureUrl || profilePlaceholder} 
            alt="Admin Profile" 
            className="admin-avatar" 
          />
          <div className="admin-user-info">
            <h4 className="admin-name">
              {adminData.firstName} {adminData.lastName}
            </h4>
            <p className="admin-role">
              {adminData.role.charAt(0).toUpperCase() + adminData.role.slice(1)}
            </p>
          </div>
        </div>

        {/* Navigation Wrapper */}
        <div className="admin-nav-wrapper">
          <nav className="admin-nav">
            {navItems.map((item, index) => (
              <NavLink 
                key={index} 
                to={item.path} 
                className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
              >
                <div className="nav-icon-container">
                  <img src={item.icon} alt={item.name} className="nav-icon-img" />
                </div>
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* Logout Section */}
          <div className="admin-sidebar-footer">
            <button className="nav-item logout-btn" onClick={handleLogout}>
              <div className="nav-icon-container">
                <img src={logoutIcon} alt="Logout" className="nav-icon-img" />
              </div>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;