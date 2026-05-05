import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import './admin_layout.css';

// Import Assets
import profileImg from '../assets/profile.jpg';
import overviewIcon from '../assets/overview.png';
import requestIcon from '../assets/request.png';
import eventIcon from '../assets/event.png';
import userIcon from '../assets/user.png';
import reportIcon from '../assets/report.png';
import messageIcon from '../assets/message.png';
import logoutIcon from '../assets/logout.png';

const AdminLayout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    console.log("User logged out");
    navigate('/login');
  };

  const navItems = [
    { name: 'Overview', path: '/admin/overview', icon: overviewIcon },
    { name: 'Aid Requests', path: '/admin/requests', icon: requestIcon },
    { name: 'Events', path: '/admin/events', icon: eventIcon },
    { name: 'Placeholder', path: '/admin/p1', icon: userIcon }, 
    { name: 'Placeholder', path: '/admin/p2', icon: reportIcon }, 
    { name: 'Users', path: '/admin/users', icon: userIcon },
    { name: 'Reports & Logs', path: '/admin/reports', icon: reportIcon },
    { name: 'Messages', path: '/admin/messages', icon: messageIcon },
  ];

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        {/* Profile Section */}
        <div className="admin-user-profile">
          <img src={profileImg} alt="Admin" className="admin-avatar" />
          <div className="admin-user-info">
            <h4 className="admin-name">Juan De La Cruz</h4>
            <p className="admin-role">Admin</p>
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