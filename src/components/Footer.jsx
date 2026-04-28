import React from 'react';
import styles from './AboutStyles';
import facebookIcon from '../assets/facebook.svg';
import twitterIcon from '../assets/twitter.svg';

const Footer = () => {
  return (
    <footer style={styles.footerContainer}>
      {/* Column 1: Give Life */}
      <div style={styles.footerColumn}>
        <h4 style={styles.footerHeader}>Give Life</h4>
        <p style={styles.footerText}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
          Tellus magna purus, nibh dolor sed egestas ut imperdiet volutpat.
        </p>
        <div style={styles.socialIcons}>
          <img src={facebookIcon} alt="Facebook" style={styles.socialIcon} />
          <img src={twitterIcon} alt="Twitter" style={styles.socialIcon} />
        </div>
      </div>

      {/* Column 2: Links */}
      <div style={styles.footerColumn}>
        <h4 style={styles.footerHeader}>Links</h4>
        <ul style={styles.footerList}>
          <li>Causes</li>
          <li>Annual Reports</li>
          <li>Requests</li>
          <li>Messages</li>
        </ul>
      </div>

      {/* Column 3: Company */}
      <div style={styles.footerColumn}>
        <h4 style={styles.footerHeader}>Company</h4>
        <ul style={styles.footerList}>
          <li>About us</li>
          <li>Terms & Condition</li>
          <li>Events</li>
          <li>Contact us</li>
        </ul>
      </div>

      {/* Column 4: Donate */}
      <div style={styles.footerColumn}>
        <h4 style={styles.footerHeader}>Donate</h4>
        <button style={styles.footerPillButton}>DONATE NOW</button>
      </div>

      {/* Column 5: Subscribe */}
      <div style={styles.footerColumn}>
        <h4 style={styles.footerHeader}>Subscribe</h4>
        <input type="text" style={styles.subscribeInput} />
        <button style={styles.footerPillButtonSmall}>SUBSCRIBE</button>
      </div>
    </footer>
  );
};

export default Footer;