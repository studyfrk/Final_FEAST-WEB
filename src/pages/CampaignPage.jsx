import CampaignLayout from '../components/CampaignLayout';
import CampaignCard from '../components/CampaignCard';
import styles from '../components/CampaignStyles';

import caretLeft from '../assets/caret-left.svg';
import caretRight from '../assets/caret-right.svg';
import facebookIcon from '../assets/facebook.svg';
import twitterIcon from '../assets/twitter.svg';

const CampaignPage = () => {
  const campaignData = Array(6).fill({
    title: "Sample",
    description: "Cras ultricies mi eu turpis hendrerit fringilla. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; In ac dui quis mi consectetuer lacinia. Nam pretium turpis..",
    progress: 17
  });

  return (
    <CampaignLayout>
      {/* Section 1: Page Header and Grid */}
      <div style={styles.headerRow}>
        <h1 style={styles.mainHeader}>Health Campaigns</h1>
        <select style={styles.sortDropdown}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>

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

      {/* Section 2: Pagination */}
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

      {/* Section 3: Call to Action */}
      <div style={styles.ctaFooterBackground}>
        <section style={styles.ctaSection}>
          <div style={styles.ctaBlock}>
            <h2 style={styles.ctaHeader}>Get Involve</h2>
            <p style={styles.ctaText}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Libero libero ipsum amet eleifend aliquam porttitor. Sem pellentesque faucibus nec ut. Amet feugiat quisque quis morbi libero massa augue.
            </p>
            <button style={styles.blackButton}>Register</button>
          </div>

          <div style={styles.ctaBlock}>
            <h2 style={styles.ctaHeader}>Give Donation</h2>
            <p style={styles.ctaText}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pretium volutpat sem elementum duis leo duis donec arcu aenean. Dapibus vel nec dictumst ullamcorper aliquam feugiat.
            </p>
            <button style={styles.blackButton}>Donate</button>
          </div>
        </section>

        {/* Section 4: Footer */}
        <footer style={styles.footer}>
          {/* Column 1: Give Life */}
          <div style={styles.footerColumn}>
            <h4 style={styles.footerHeader}>Give Life</h4>
            <p style={styles.footerText}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Tellus magna purus, nibh dolor sed egestas ut imperdiet volutpat.
            </p>
            <div style={styles.socialIcons}>
              <img src={facebookIcon} alt="Facebook" style={styles.socialIcon} />
              <img src={twitterIcon} alt="Twitter" style={styles.socialIcon} />
            </div>
          </div>

          {/* Column 2: Links */}
          <div style={styles.footerColumn}>
            <h4 style={styles.footerHeader}>Links</h4>
            <a style={styles.footerLink}>Causes</a>
            <a style={styles.footerLink}>Annual Reports</a>
            <a style={styles.footerLink}>Requests</a>
            <a style={styles.footerLink}>Messages</a>
          </div>

          {/* Column 3: Company */}
          <div style={styles.footerColumn}>
            <h4 style={styles.footerHeader}>Company</h4>
            <a style={styles.footerLink}>About us</a>
            <a style={styles.footerLink}>Terms & Condition</a>
            <a style={styles.footerLink}>Events</a>
            <a style={styles.footerLink}>Contact us</a>
          </div>

          {/* Column 4: Donate */}
          <div style={styles.footerColumn}>
            <h4 style={styles.footerHeader}>Donate</h4>
            <button style={styles.smallBlackButton}>Donate Now</button>
          </div>

          {/* Column 5: Subscribe */}
          <div style={styles.footerColumn}>
            <h4 style={styles.footerHeader}>Subscribe</h4>
            <div style={styles.footerInputGroup}>
              <input 
                type="email" 
                placeholder="Your email address" 
                style={styles.footerInput}
              />
              <button style={styles.smallBlackButton}>Subscribe</button>
            </div>
          </div>
        </footer>
      </div>
    </CampaignLayout>
  );
};

export default CampaignPage;