import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import styles from '../components/ContactStyles';
import facebookIcon from '../assets/facebook.svg'; 
import callIcon from '../assets/phone-icon.jpg';
import emailIcon from '../assets/email-icon.jpg';
import locationIcon from '../assets/location-icon.jpg';
import mapPin from '../assets/map-pin-blue.jpg';

const ContactPage = () => {
  return (
    <div style={styles.pageWrapper}>
      <Navbar />
      
      <main style={styles.contentContainer}>
        <div style={styles.heroCard}>
          <h1 style={styles.heroTitle}>Feel Free To <br /> Reach Out</h1>
          <div style={styles.divider}></div>
          <p style={styles.heroDescription}>
            Don’t hesitate to contact us whether you have a suggestion on our 
            improvement, a complain to discuss or an issue to solve.
          </p>
        </div>

        <div style={styles.infoGrid}>
          <div style={styles.topRow}>
            <div style={styles.smallCard}>
              <div style={styles.iconCircle}><img src={callIcon} alt="Call" /></div>
              <h3 style={styles.cardTitle}>Call Us</h3>
              <p style={styles.cardDetail}>(02) 8288 8338</p>
              <p style={styles.cardSubDetail}>Mon-Fri • 9 AM-5 PM</p>
            </div>
            <div style={styles.smallCard}>
              <div style={styles.iconCircle}><img src={emailIcon} alt="Email" /></div>
              <h3 style={styles.cardTitle}>Email Us</h3>
              <p style={styles.cardDetail}>pbl.gpc@gmail.com</p>
              <p style={styles.cardSubDetail}>Mon-Fri • 9 AM-5 PM</p>
            </div>
          </div>

          <div style={styles.wideCard}>
            <div style={styles.iconCircle}><img src={facebookIcon} alt="FB" /></div>
            <div style={styles.wideCardText}>
              <h3 style={styles.cardTitleLeft}>Facebook</h3>
              <p style={styles.cardDetailLeft}>Barangay's Official Page</p>
            </div>
          </div>

          <div style={styles.wideCard}>
            <div style={styles.iconCircle}><img src={locationIcon} alt="Loc" /></div>
            <div style={styles.wideCardText}>
              <h3 style={styles.cardTitleLeft}>Location</h3>
              <p style={styles.cardDetailLeft}>Almanza Dos, Las Piñas City</p>
            </div>
            <img src={mapPin} alt="Pin" style={styles.pinIcon} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ContactPage;