import React from 'react';
import styles from './footer.module.css';
import gpcLogo from '../assets/GPC_Logo.png'; 
import xIcon from '../assets/x.png';
import instaIcon from '../assets/insta.png';
import pinterestIcon from '../assets/pinterest.png';
import ytIcon from '../assets/yt.png';

const Footer = () => {
  return (
    <footer className={styles.footerSection}>
      <div className={styles.footerContainer}>
        {/* Brand Column */}
        <div className={`${styles.footerColumn} ${styles.brandCol}`}>
          <div className={styles.footerLogo}>
            <img src={gpcLogo} alt="GPC Logo" className={styles.footerLogoImg} />
          </div>
          <div className={styles.footerStats}>
            <h3>1k</h3>
            <p>Users <br /> Already Connected</p>
          </div>
        </div>

        {/* Quick Link Column */}
        <div className={styles.footerColumn}>
          <h4 className={styles.footerTitle}>Quick Link</h4>
          <ul className={styles.footerLinks}>
            <li><a href="/">Home</a></li>
            <li><a href="/about">About Us</a></li>
            <li><a href="/blog">Requests</a></li>
            <li><a href="/gallery">Campaigns</a></li>
          </ul>
        </div>

        {/* Get In Touch Column */}
        <div className={styles.footerColumn}>
          <h4 className={styles.footerTitle}>Get In Touch</h4>
          <ul className={styles.footerLinks}>
            <li><a href="/contact">Contact Us</a></li>
            <li><a href="/services">Our Services</a></li>
          </ul>
        </div>

        {/* Address Column */}
        <div className={styles.footerColumn}>
          <h4 className={styles.footerTitle}>Address</h4>
          <p className={styles.footerAddress}>
            house 123 <br /> lot 45463
          </p>
        </div>

        {/* Newsletter & Socials Column */}
        <div className={`${styles.footerColumn} ${styles.newsletterCol}`}>
          <h4 className={styles.footerTitle}>Newsletter</h4>
          <div className={styles.newsletterForm}>
            <input type="email" placeholder="Enter Your Email" />
            <button type="submit" className={styles.subscribeBtn}>Subscribe</button>
          </div>
          <p className={styles.newsletterNote}>Your email is safe with us, we don't spam.</p>
          
          <h4 className={`${styles.footerTitle} ${styles.socialTitle}`}>Follow Me</h4>
          <div className={styles.footerSocials}>
            <a href="https://twitter.com/login" target="_blank" rel="noreferrer" className={styles.socialIcon}>
                <img src={xIcon} alt="X" className={styles.socialImg} />
            </a>
            <a href="https://www.instagram.com/accounts/login/" target="_blank" rel="noreferrer" className={styles.socialIcon}>
                <img src={instaIcon} alt="Instagram" className={styles.socialImg} />
            </a>
            <a href="https://www.pinterest.com/login/" target="_blank" rel="noreferrer" className={styles.socialIcon}>
                <img src={pinterestIcon} alt="Pinterest" className={styles.socialImg} />
            </a>
            <a href="https://www.youtube.com/" target="_blank" rel="noreferrer" className={styles.socialIcon}>
                <img src={ytIcon} alt="YouTube" className={styles.socialImg} />
            </a>
          </div>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <p>Developed By F.E.A.S.T.</p>
      </div>
    </footer>
  );
};

export default Footer;