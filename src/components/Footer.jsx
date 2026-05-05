import React from 'react';
import './footer.css';
import gpcLogo from '../assets/GPC_Logo.png'; 
import xIcon from '../assets/x.png';
import instaIcon from '../assets/insta.png';
import pinterestIcon from '../assets/pinterest.png';
import ytIcon from '../assets/yt.png';

const Footer = () => {
  return (
    <footer className="footer-section">
      <div className="footer-container">
        {/* Brand Column */}
        <div className="footer-column brand-col">
          <div className="footer-logo">
            <img src={gpcLogo} alt="GPC Logo" className="footer-logo-img" />
          </div>
          <div className="footer-stats">
            <h3>1k</h3>
            <p>Users <br /> Already Connected</p>
          </div>
        </div>

        {/* Quick Link Column */}
        <div className="footer-column">
          <h4 className="footer-title">Quick Link</h4>
          <ul className="footer-links">
            <li><a href="/">Home</a></li>
            <li><a href="/about">About Us</a></li>
            <li><a href="/blog">Requests</a></li>
            <li><a href="/gallery">Campaigns</a></li>
          </ul>
        </div>

        {/* Get In Touch Column */}
        <div className="footer-column">
          <h4 className="footer-title">Get In Touch</h4>
          <ul className="footer-links">
            <li><a href="/contact">Contact Us</a></li>
            <li><a href="/services">Our Services</a></li>
          </ul>
        </div>

        {/* Address Column */}
        <div className="footer-column">
          <h4 className="footer-title">Address</h4>
          <p className="footer-address">
            house 123 <br /> lot 45463
          </p>
        </div>

        {/* Newsletter & Socials Column */}
        <div className="footer-column newsletter-col">
          <h4 className="footer-title">Newsletter</h4>
          <div className="newsletter-form">
            <input type="email" placeholder="Enter Your Email" />
            <button type="submit" className="subscribe-btn">Subscribe</button>
          </div>
          <p className="newsletter-note">Your email is safe with us, we don't spam.</p>
          
          <h4 className="footer-title social-title">Follow Me</h4>
          <div className="footer-socials">
            <a href="https://twitter.com/login" target="_blank" rel="noreferrer" className="social-icon">
                <img src={xIcon} alt="X" className="social-img" />
            </a>
            <a href="https://www.instagram.com/accounts/login/" target="_blank" rel="noreferrer" className="social-icon">
                <img src={instaIcon} alt="Instagram" className="social-img" />
            </a>
            <a href="https://www.pinterest.com/login/" target="_blank" rel="noreferrer" className="social-icon">
                <img src={pinterestIcon} alt="Pinterest" className="social-img" />
            </a>
            <a href="https://www.youtube.com/" target="_blank" rel="noreferrer" className="social-icon">
                <img src={ytIcon} alt="YouTube" className="social-img" />
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>Developed By F.E.A.S.T.</p>
      </div>
    </footer>
  );
};

export default Footer;