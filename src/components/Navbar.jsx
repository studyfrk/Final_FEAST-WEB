import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './CampaignStyles';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine the left-side label based on the current URL path
  const getPageLabel = () => {
    const path = location.pathname;
    
    if (path === '/contact') return 'Contact Us';
    if (path === '/about') return 'About Us';
    if (path === '/campaigns') return 'Health Campaigns';
    if (path === '/requests') return 'Aid Request';
    if (path === '/create-request') return 'Create Aid Request';
    if (path === '/messages') return 'Messages';
    if (path === '/home') return 'Home';
    
    return 'F.E.A.S.T.'; // Default fallback
  };

  // Determine text color based on page (Black for Campaigns, inherit/white for others)
  const isCampaignPage = location.pathname === '/campaigns';
  const textColor = isCampaignPage ? '#000000' : 'inherit';

  return (
    <nav style={{
      ...styles.topNav,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '15px 50px',
      backgroundColor: 'transparent',
      color: textColor
    }}>
      
      {/* 1. Dynamic Bold Text on the Left - Updates based on URL */}
      <div style={{ fontWeight: 'bold', fontSize: '20px' }}>
        {getPageLabel()}
      </div>

      {/* 2. Navigation Links */}
      <ul style={{ 
        ...styles.navLinks, 
        display: 'flex', 
        gap: '25px', 
        listStyle: 'none',
        margin: 0,
        padding: 0
      }}>
        <li style={{ ...styles.navLinkItem, color: textColor }} onClick={() => navigate('/home')}>Home</li>
        <li style={{ ...styles.navLinkItem, color: textColor }} onClick={() => navigate('/about')}>About</li>
        <li style={{ ...styles.navLinkItem, color: textColor }} onClick={() => navigate('/requests')}>Requests</li>
        <li style={{ ...styles.navLinkItem, color: textColor }} onClick={() => navigate('/campaigns')}>Campaigns</li>
        <li style={{ ...styles.navLinkItem, color: textColor }} onClick={() => navigate('/messages')}>Messages</li>
        <li style={{ ...styles.navLinkItem, color: textColor }} onClick={() => navigate('/contact')}>Contact Us</li>
      </ul>
      
      {/* 3. Sign In on the Right */}
      <div style={{ ...styles.signInLink, color: textColor, cursor: 'pointer' }} onClick={() => navigate('/')}>
        Sign In
      </div>
    </nav>
  );
};

export default Navbar;