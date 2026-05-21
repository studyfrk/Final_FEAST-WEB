/* React & Firebase Imports */
import React from "react";

/* Component Imports */
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import DrawerHero from "../components/DrawerHero.jsx";

/* Style Imports */
import styles from "../components/contact_us.module.css";

const ContactUs = () => {
  return (
    <div className={styles.pageWrapper}>
      <Header />
      <DrawerHero
        title="Contact Details"
        description="Have questions or feedback? We'd love to hear from you!"
      />
      <section className={styles.contactSection}>
        <div className={styles.contactHeader}>
          <p className={styles.contactHeaderSubtitle}>Get In Touch</p>
          <h2 className={styles.contactHeaderTitle}>Contact Details</h2>
        </div>

        <div className={styles.contactBody}>
          {/* Details card */}
          <div className={styles.contactDetails}>
            <h2 className={styles.contactDetailsTitle}>Address &amp; Contact</h2>
            <div className={styles.contactDetailsContent}>
              <p>
                As one of the largest barangays in the city, we serve as a vital
                link between Las Piñas and our local communities. We pride
                ourselves on being a community that values security,
                accessibility, and growth.
              </p>
              <p>
                <b>📍 Location:</b><br />
                Ilang Street, T.S. Cruz Subdivision, C2G5+5MC,
                Las Piñas City, 1740 Metro Manila, Philippines
              </p>
              <p>
                <b>📞 Barangay Hall Office:</b> (02) 8641-3533
              </p>
              <p>
                <b>📞 Barangay Tanod Office:</b> (02) 8561-0981
              </p>
              <p>
                <b>📱 Barangay Response Team:</b> 63+ 998 254 6814
              </p>
              <p>
                <b>✉️ Email:</b> almanza2lp.alovera@gmail.com
              </p>
              <p>
                <b>🕐 Office Hours:</b><br />
                Monday – Friday, 8:00 AM – 5:00 PM
              </p>
            </div>
          </div>

          {/* Map placeholder — swap in a real Google Maps iframe when ready */}
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
