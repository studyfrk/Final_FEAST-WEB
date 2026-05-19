/* React Imports */
import React from 'react';
import { Link } from 'react-router-dom';

/* Asset Imports */
import gpcLogo from '../assets/GPC_Logo.png';
import xIcon from '../assets/x.png';
import instaIcon from '../assets/insta.png';
import pinterestIcon from '../assets/pinterest.png';
import ytIcon from '../assets/yt.png';

/* Style Imports */
import styles from './footer.module.css';

/* ─────────────────────────────────────────
   DATA — edit these arrays to add / remove
   links, socials, or address lines anytime.
───────────────────────────────────────── */
const QUICK_LINKS = [
  { label: 'Home',          to: '/home'        },
  { label: 'Aid Requests',  to: '/requests' },
  { label: 'Charity Events',to: '/events'  },
  { label: 'Messages',      to: '/messages' },
  { label: 'Notifications', to: '/notif'   },
];

const GET_IN_TOUCH_LINKS = [
  { label: 'About Us',         to: '/about'     },
  { label: 'App Guide',        to: '/appguide'  },
  { label: 'Contact Details',  to: '/contactus' },
  { label: 'Help & FAQ',       to: '/helpfaq'   },
  { label: 'Terms & Conditions', to: '/terms'   },
];

const SOCIAL_LINKS = [
  { href: 'https://twitter.com/login',                    icon: xIcon,         alt: 'X / Twitter'  },
  { href: 'https://www.instagram.com/accounts/login/',    icon: instaIcon,     alt: 'Instagram'    },
  { href: 'https://www.pinterest.com/login/',             icon: pinterestIcon, alt: 'Pinterest'    },
  { href: 'https://www.youtube.com/',                     icon: ytIcon,        alt: 'YouTube'      },
];

const ADDRESS_LINES = [
  'Ilang Street, T.S. Cruz Subdivision,',
  'C2G5+5MC, Las Piñas City,',
  '1740 Metro Manila, Philippines',
];

/* ─────────────────────────────────────────
   SITE DESCRIPTION shown below the logo.
   Change this one string to update the blurb.
───────────────────────────────────────── */
const SITE_DESCRIPTION =
  'A community-driven platform connecting those in need with those who care. In collaboration with Barangay Almanza Dos, we enable aid requests, charity events, and meaningful support across the local community.';

/* ─────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────── */

/** Reusable column of navigation links (uses React Router <Link>) */
const LinkColumn = ({ title, links }) => (
  <div className={styles.footerColumn}>
    <h4 className={styles.footerTitle}>{title}</h4>
    <ul className={styles.footerLinks}>
      {links.map(({ label, to }) => (
        <li key={to}>
          <Link to={to}>{label}</Link>
        </li>
      ))}
    </ul>
  </div>
);

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footerSection}>
      <div className={styles.footerContainer}>

        {/* ── Brand Column ── */}
        <div className={`${styles.footerColumn} ${styles.brandCol}`}>
          <Link to="/" className={styles.footerLogoLink} aria-label="Go to homepage">
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
        <LinkColumn title="Quick Access" links={QUICK_LINKS} />

        {/* ── Get In Touch Column ── */}
        <LinkColumn title="Learn More" links={GET_IN_TOUCH_LINKS} />

        {/* ── Address Column ── */}
        <div className={styles.footerColumn}>
          <h4 className={styles.footerTitle}>Address</h4>
          <address className={styles.footerAddress}>
            {ADDRESS_LINES.map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < ADDRESS_LINES.length - 1 && <br />}
              </React.Fragment>
            ))}
          </address>
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
