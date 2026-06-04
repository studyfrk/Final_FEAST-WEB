/* React & Firebase Imports */
import React from "react";

/* Component Imports */
import Footer from "../components/Footer.jsx";
import DrawerHero from "../components/DrawerHero.jsx";

/* Style Imports */
import styles from "../components/contact_us.module.css";

/* ── Inline SVG Icons ───────────────────────────────────────── */
const IconPin = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6, flexShrink: 0 }}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" fill="#fecdd3" stroke="#e11d48" strokeWidth="1.5"/>
    <circle cx="12" cy="9" r="2.5" fill="#e11d48"/>
  </svg>
);

const IconPhone = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6, flexShrink: 0 }}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 5.07 12.9 19.79 19.79 0 0 1 2 4.28 2 2 0 0 1 3.98 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);

const IconMobile = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6, flexShrink: 0 }}>
    <rect x="5" y="2" width="14" height="20" rx="2" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.5"/>
    <circle cx="12" cy="17.5" r="1.2" fill="#7c3aed"/>
    <path d="M9 5.5h6" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6, flexShrink: 0 }}>
    <rect x="2" y="4" width="20" height="16" rx="2" fill="#d1fae5" stroke="#059669" strokeWidth="1.5"/>
    <path d="M2 8l10 6 10-6" stroke="#059669" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);

const IconOfficeHours = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6, flexShrink: 0 }}>
    <rect x="3" y="5" width="18" height="16" rx="2" fill="#fef9c3" stroke="#ca8a04" strokeWidth="1.5"/>
    <path d="M3 10h18" stroke="#ca8a04" strokeWidth="1.4"/>
    <path d="M8 3v4M16 3v4" stroke="#ca8a04" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="12" cy="16" r="3" fill="none" stroke="#ca8a04" strokeWidth="1.3"/>
    <path d="M12 14.5V16l1 1" stroke="#ca8a04" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const ContactUs = () => {
  return (
    <div className={styles.pageWrapper}>
      <DrawerHero
        title="Contact Details"
        description="Have questions or feedback? We'd love to hear from you!"
      />
      <section className={styles.contactSection}>
        <div className={styles.contactBody}>
          {/* Details card */}
          <div className={styles.contactDetails}>
            <h2 className={styles.contactDetailsTitle}>Address & Contact</h2>
            <div className={styles.contactDetailsContent}>
              <p>
                  As one of the largest barangays in Las Piñas City,
                  we serve as a vital link between Filipino citizens and our local communities.
                  We pride ourselves on being a community that values security, accessibility, and growth.
              </p>
              <p>
                <b><IconPin /> Location:</b><br />
                Ilang Street, T.S. Cruz Subdivision, C2G5+5MC,
                Las Piñas City, 1740 Metro Manila, Philippines
              </p>
              <p>
                <b><IconPhone /> Barangay Hall Office:</b><br />(02) 8641-3533
              </p>
              <p>
                <b><IconPhone /> Barangay Tanod Office:</b><br />(02) 8561-0981
              </p>
              <p>
                <b><IconMobile /> Barangay Response Team:</b><br />63+ 998 254 6814
              </p>
              <p>
                <b><IconMail /> Email:</b><br />almanza2lp.alovera@gmail.com
              </p>
              <p>
                <b><IconOfficeHours /> Office Hours:</b><br />
                Monday – Thursday, 8:00 AM – 7:00 PM
              </p>
            </div>
          </div>

          {/* Map card — dynamically stretches to match details height */}
          <div className={styles.contactMapCard}>
            <iframe
              title="Barangay Almanza Dos Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3862.8498!2d120.9929!3d14.4369!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397ce5b2765413f%3A0x3e7ba5c18bdd3f88!2sAlmanza%20Dos%2C%20Las%20Pi%C3%B1as%2C%20Metro%20Manila!5e0!3m2!1sen!2sph!4v1700000000000!5m2!1sen!2sph"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: '360px', display: 'block' }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default ContactUs;
