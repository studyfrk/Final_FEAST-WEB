import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import gpcLogo from "../assets/GPC_Logo.png";
import Header from '../components/header';
import Footer from '../components/footer';
import DrawerHero from '../components/DrawerHero';
import "../components/ContactUs.css";

const ContactUs = () => {
  return (
    <div>
        <Header />
        <DrawerHero 
          title="Contact Us"
          description="Have questions or feedback? We'd love to hear from you!"
        />
        <section className="contact-section">
          <div className="contact-header">
            <p>Get In Touch</p>
            <h2>Send Us A Message</h2>
          </div>
          <div className="contact-body">
            <div className="contact-form">
              <form>
                <div className="input-group">
                    <label className="label">Full Name</label>
                    <input autocomplete="off" name="fullname" id="fullname" class="input" type="text" placeholder="Enter Your Name" required />
                </div>
                <div className="input-group">
                    <label className="label">Your Email</label>
                    <input autocomplete="off" name="email" id="email" class="input" type="email" placeholder="Enter Your Email" required />
                </div>
                <div className="input-group">
                    <label className="label">Subject</label>
                    <input autocomplete="off" name="subject" id="subject" class="input" type="text" placeholder="Subject Title" required />
                </div>
                <div className="input-group">
                    <label className="label">Message</label>
                    <textarea autocomplete="off" name="message" id="message" className="input" placeholder="Type Message Here..." required />
                </div>
                <button type="submit">
                  <div className="svg-wrapper-1">
                    <div className="svg-wrapper">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        width="24"
                        height="24"
                      >
                        <path fill="none" d="M0 0h24v24H0z"></path>
                        <path
                          fill="currentColor"
                          d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"
                        ></path>
                      </svg>
                    </div>
                  </div>
                  <span>Send</span>
                </button>
              </form>
            </div>
            <div className="contact-details">
              <h2>Address & Contact Details</h2>
              <p>As one of the largest barangays in the city, we serve as a vital link between Las Piñas and our local communities. We pride ourselves on being a community that values security, accessibility, and growth.</p>
              <p><b>Location:</b> Ilang Street, T.S. Cruz Subdivision, C2G5+5MC, Las Piñas City, 1740 Metro Manila, Philippines</p>
              <p><b>Phone:</b> (02) 8641-3533</p>
              <p><b>Email:</b> almanza2lp.alovera@gmail.com</p>
            </div>
          </div>
        </section>
        <Footer />
    </div>
  )
}

export default ContactUs;
