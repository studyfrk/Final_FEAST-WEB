import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CampaignStyles';

//This top navbar can be used for future purposes
const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav style={styles.topNav}>
      <ul style={styles.navLinks}>
        <li style={styles.navLinkItem} onClick={() => navigate('/home')}>Home</li>
        <li style={styles.navLinkItem} onClick={() => navigate('/about')}>About</li>
        <li style={styles.navLinkItem} onClick={() => navigate('/requests')}>Requests</li>
        <li style={styles.navLinkItem} onClick={() => navigate('/campaigns')}>Campaigns</li>
        <li style={styles.navLinkItem} onClick={() => navigate('/messages')}>Messages</li>
      </ul>
      
      <div style={styles.signInLink} onClick={() => navigate('/')}>
        Sign In
      </div>
    </nav>
  );
};

export default Navbar;