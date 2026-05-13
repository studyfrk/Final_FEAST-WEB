/* Database Imports */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";

/* Component Imports */
import Header from "../components/header.jsx";
import Footer from "../components/footer.jsx";
import DrawerHero from "../components/DrawerHero.jsx";

/* Style Imports */
import styles from "../components/contact_us.module.css";

const ContactUs = () => {
  return (
    <div>
      <Header />
      <DrawerHero
        title="Contact Us"
        description="Have questions or feedback? We'd love to hear from you!"
      />
      <section className={styles.contactSection}>
        <div className={styles.contactHeader}>
          <p className={styles.contactHeaderSubtitle}>Get In Touch</p>
          <h2 className={styles.contactHeaderTitle}>Send Us A Message</h2>
        </div>
        <div className={styles.contactBody}>
          <div className={styles.contactForm}>
            <form className={styles.form}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Full Name</label>
                <input
                  autocomplete="off"
                  name="fullname"
                  id="fullname"
                  className={styles.input}
                  type="text"
                  placeholder="Enter Your Name"
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Your Email</label>
                <input
                  autocomplete="off"
                  name="email"
                  id="email"
                  className={styles.input}
                  type="email"
                  placeholder="Enter Your Email"
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Subject</label>
                <input
                  autocomplete="off"
                  name="subject"
                  id="subject"
                  className={styles.input}
                  type="text"
                  placeholder="Subject Title"
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Message</label>
                <textarea
                  autocomplete="off"
                  name="message"
                  id="message"
                  className={`${styles.textarea} ${styles.input}`}
                  placeholder="Type Message Here..."
                  required
                />
              </div>
              <button type="submit" className={styles.button}>
                <div className={styles.svgWrapper1}>
                  <div className={styles.svgWrapper}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                      className={styles.svg}
                    >
                      <path fill="none" d="M0 0h24v24H0z"></path>
                      <path
                        fill="currentColor"
                        d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"
                      ></path>
                    </svg>
                  </div>
                </div>
                <span className={styles.span}>Send</span>
              </button>
            </form>
          </div>
          <div className={styles.contactDetails}>
            <h2 className={styles.contactDetailsTitle}>
              Address & Contact Details
            </h2>
            <div className={styles.contactDetailsContent}>
              <p>
                As one of the largest barangays in the city, we serve as a vital
                link between Las Piñas and our local communities. We pride
                ourselves on being a community that values security,
                accessibility, and growth.
              </p>
              <p>
                <b>Location:</b> Ilang Street, T.S. Cruz Subdivision, C2G5+5MC,
                Las Piñas City, 1740 Metro Manila, Philippines
              </p>
              <p>
                <b>Phone:</b> (02) 8641-3533
              </p>
              <p>
                <b>Email:</b> almanza2lp.alovera@gmail.com
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default ContactUs;
