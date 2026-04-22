import styles from './CampaignStyles';

import caretDownIcon from '../assets/arrow-down.svg';

const CampaignLayout = ({ children }) => {
  return (
    <div style={styles.pageBackground}>
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

      <main style={styles.mainContent}>
        {children}
      </main>

      <div style={styles.ctaFooterBackground}>
      </div>
    </div>
  );
};

export default CampaignLayout;