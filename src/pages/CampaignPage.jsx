import React from 'react';
import CampaignLayout from '../components/CampaignLayout';
import CampaignCard from '../components/CampaignCard';
import styles from '../components/CampaignStyles';
import Footer from '../components/Footer'; 

import caretLeft from '../assets/caret-left.svg';
import caretRight from '../assets/caret-right.svg';

const CampaignPage = () => {
  const campaignData = Array(6).fill({
    title: "Sample",
    description: "Cras ultricies mi eu turpis hendrerit fringilla. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; In ac dui quis mi consectetuer lacinia. Nam pretium turpis..",
    progress: 17
  });

  return (
    <CampaignLayout>
      {/* Header Section */}
      <div style={styles.headerRow}>
        <h1 style={styles.mainHeader}>Health Campaigns</h1>
        <select style={styles.sortDropdown}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>

      {/* Grid Section */}
      <div style={styles.grid}>
        {campaignData.map((campaign, index) => (
          <CampaignCard 
            key={index}
            title={campaign.title}
            description={campaign.description}
            progress={campaign.progress}
          />
        ))}
      </div>

      {/* Pagination Section */}
      <div style={styles.pagination}>
        <button style={styles.pageArrow}>
          <img src={caretLeft} alt="previous" style={{width: '12px'}}/>
        </button>
        <button style={styles.pageButton}>1</button>
        <button style={styles.pageButton}>2</button>
        <button style={{...styles.pageButton, ...styles.activePage}}>3</button>
        <button style={styles.pageButton}>4</button>
        <button style={styles.pageButton}>5</button>
        <button style={styles.pageArrow}>
          <img src={caretRight} alt="next" style={{width: '12px'}}/>
        </button>
      </div>

      {/* CTA Section (Optional - keep if you want the Register/Donate boxes above footer) */}
      <div style={styles.ctaFooterBackground}>
        <section style={styles.ctaSection}>
          <div style={styles.ctaBlock}>
            <h2 style={styles.ctaHeader}>Get Involve</h2>
            <p style={styles.ctaText}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Libero libero ipsum amet eleifend aliquam porttitor.
            </p>
            <button style={styles.blackButton}>Register</button>
          </div>

          <div style={styles.ctaBlock}>
            <h2 style={styles.ctaHeader}>Give Donation</h2>
            <p style={styles.ctaText}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pretium volutpat sem elementum duis leo duis donec arcu aenean.
            </p>
            <button style={styles.blackButton}>Donate</button>
          </div>
        </section>
      </div>

      
      
    </CampaignLayout>
  );
};

export default CampaignPage;