import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './CampaignStyles';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isCampaignPage = location.pathname === '/campaigns';
  const textColor = isCampaignPage ? '#000000' : 'inherit';

  const getPageLabel = () => {
    switch (location.pathname) {
      case '/contact': return 'Contact Us';
      case '/about': return 'About Us';
      case '/campaigns': return 'Health Campaigns';
      case '/requests': return 'Requests';
      case '/messages': return 'Messages';
      case '/home': return 'Home';
      default: return 'F.E.A.S.T.';
    }
  };

  return (
    <nav style={{
      ...styles.topNav,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '15px 50px',
      backgroundColor: 'transparent',
      color: textColor // This sets the color for the bold label and the container
    }}>
      
      {/* Dynamic Bold Text on the Left */}
      <div style={{ fontWeight: 'bold', fontSize: '20px' }}>
        {getPageLabel()}
      </div>

      {/* Navigation Links */}
      <ul style={{ ...styles.navLinks, display: 'flex', gap: '25px', listStyle: 'none' }}>
        <li style={{ ...styles.navLinkItem, color: textColor }} onClick={() => navigate('/home')}>Home</li>
        <li style={{ ...styles.navLinkItem, color: textColor }} onClick={() => navigate('/about')}>About</li>
        <li style={{ ...styles.navLinkItem, color: textColor }} onClick={() => navigate('/requests')}>Requests</li>
        <li style={{ ...styles.navLinkItem, color: textColor }} onClick={() => navigate('/campaigns')}>Campaigns</li>
        <li style={{ ...styles.navLinkItem, color: textColor }} onClick={() => navigate('/messages')}>Messages</li>
        <li style={{ ...styles.navLinkItem, color: textColor }} onClick={() => navigate('/contact')}>Contact Us</li>
      </ul>
      
      {/* Sign In on the Right */}
      <div style={{ ...styles.signInLink, color: textColor, cursor: 'pointer' }} onClick={() => navigate('/')}>
        Sign In
      </div>
    </nav>
  );
};

export default Navbar;