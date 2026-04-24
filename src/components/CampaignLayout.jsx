import React from 'react';
import Navbar from './Navbar';
import styles from './CampaignStyles';
import caretDownIcon from '../assets/arrow-down.svg';

const CampaignLayout = ({ children }) => {
  return (
    <div style={styles.pageBackground}>
      {/* Top Functional Navigation Bar */}
      <Navbar />

      {/* Search Bar Section */}
      <nav style={styles.navbar}>
        <div style={styles.searchContainer}>
          <label style={styles.searchLabel}>Search Cause</label>
          <input 
            type="text" 
            placeholder="Title" 
            style={styles.searchInput} 
          />
          <div style={{ position: 'relative' }}>
            <select style={styles.searchDropdown}>
              <option value="health">Health</option>
              <option value="education">Education</option>
              <option value="environment">Environment</option>
            </select>
            <img 
              src={caretDownIcon} 
              alt="dropdown" 
              style={styles.dropdownIcon} 
            />
          </div>
          <button style={styles.searchButton}>Search</button>
        </div>
      </nav>

      {/* Main Page Content */}
      <main style={styles.mainContent}>
        {children}
      </main>

      {/* Footer & CTA Section Background */}
      <div style={styles.ctaFooterBackground}>
        {/* Footer content goes here */}
      </div>
    </div>
  );
};

export default CampaignLayout;