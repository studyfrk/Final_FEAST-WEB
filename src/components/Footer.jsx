/* React Imports */
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

/* Asset Imports */
import gpcLogo from '../assets/GPC_Logo.png';
import facebookIcon from '../assets/facebookIcon.png';
import hallIcon from '../assets/hallIcon.png';
import atlasIcon from '../assets/atlasIcon.png';
import googleMapsIcon from '../assets/googleMapsIcon.png';

/* Style Imports */
import styles from './footer.module.css';

const QUICK_LINKS = [
  { label: 'Home',          to: '/home'        },
  { label: 'Aid Requests',  to: '/requests' },
  { label: 'Charity Events',to: '/events'  },
  { label: 'Messages',      to: '/messages' },
  { label: 'Notifications', to: '/notif'   },
];

const GET_IN_TOUCH_LINKS = [
  { label: 'About Us',         to: '/about'     },
  { label: 'User Guide',        to: '/appguide'  },
  { label: 'Contact Details',  to: '/contactus' },
  { label: 'Help & FAQ',       to: '/helpfaq'   },
  { label: 'Terms & Conditions', to: '/terms'   },
];

const SOCIAL_LINKS = [
  { href: 'https://www.facebook.com/BarangayAlmanzaDos/',                             icon: facebookIcon,     alt: 'Facebook'            },
  { href: 'https://www.barangaydirectory.com/barangay/city-of-las-pi-as/almanza-dos', icon: hallIcon,         alt: 'Barangay Directory'  },
  { href: 'https://www.philatlas.com/luzon/ncr/las-pinas/almanza-dos.html',           icon: atlasIcon,        alt: 'PhilAtlas'           },
  { href: 'https://maps.app.goo.gl/GBmnQGRRJDWbKrdw9',                                icon: googleMapsIcon,   alt: 'GoogleMaps'          },
];

const SITE_DESCRIPTION =
  'A community-driven platform connecting those in need with those who care. In collaboration with Barangay Almanza Dos, we enable aid requests, charity events, and meaningful support across the local community.';

/** Reusable column of navigation links (uses React Router <Link>) */
const LinkColumn = ({ title, links }) => {
  const { pathname } = useLocation();
  return (
    <div className={styles.footerColumn}>
      <h4 className={styles.footerTitle}>{title}</h4>
      <ul className={styles.footerLinks}>
        {links.map(({ label, to }) => (
          <li key={to}>
            <Link
              to={to}
              onClick={(e) => {
                if (pathname === to) {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsGuest(user?.isAnonymous || false);
    });
    return () => unsub();
  }, []);

  const dynamicQuickLinks = isGuest 
    ? QUICK_LINKS.filter(l => l.label !== 'Messages' && l.label !== 'Notifications')
    : QUICK_LINKS;

  return (
    <footer className={styles.footerSection}>
      <div className={styles.footerContainer}>

        {/* ── Brand Column ── */}
        <div className={`${styles.footerColumn} ${styles.brandCol}`}>
          <Link to="/" className={styles.footerLogoLink} aria-label="Go to homepage" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src={gpcLogo} alt="GPC Logo" className={styles.footerLogoImg} />
          </Link>

          <h4 className={styles.footerTitle}>F.E.A.S.T.</h4>
          <p className={styles.footerDescription}>{SITE_DESCRIPTION}</p>

          <h4 className={`${styles.footerTitle} ${styles.socialTitle}`}>External Links</h4>
          <div className={styles.footerSocials}>
            {SOCIAL_LINKS.map(({ href, icon, alt }) => (
              <a
                key={alt}
                href={href}
                target="_blank"
                rel="noreferrer"
                className={styles.socialIcon}
                aria-label={alt}
              >
                <img src={icon} alt={alt} className={styles.socialImg} />
              </a>
            ))}
          </div>
        </div>

        {/* ── Quick Links Column ── */}
        <LinkColumn title="Quick Access" links={dynamicQuickLinks} />

        {/* ── Get In Touch Column ── */}
        <LinkColumn title="Learn More" links={GET_IN_TOUCH_LINKS} />

        {/* ── Address Column ── */}
        <div className={styles.footerColumn}>
          <h4 className={styles.footerTitle}>Contact Details</h4>
          <ul className={styles.contactList}>
            <li className={styles.contactItem}>
              <svg className={styles.contactIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <span>Ilang Street, T.S. Cruz Subdivision, C2G5+5MC, Las Piñas City, 1740 Metro Manila, Philippines</span>
            </li>
            <li className={styles.contactItem}>
              <svg className={styles.contactIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.72 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.64a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 16z"/>
              </svg>
              <span>(02) 8641-3533</span>
            </li>
            <li className={styles.contactItem}>
              <svg className={styles.contactIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              <span>almanza2lp.alovera@gmail.com</span>
            </li>
          </ul>
        </div>

      </div>

      {/* ── Footer Bottom Bar ── */}
      <div className={styles.footerDivider} />
      <div className={styles.footerBottom}>
        <p className={styles.footerBottomText}>
          &copy; {currentYear} GPC. All rights reserved.
        </p>
        <p className={styles.footerCredit}>Developed by GPC</p>
      </div>
    </footer>
  );
};

export default Footer;