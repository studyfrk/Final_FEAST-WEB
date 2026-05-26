/* React & Firebase Imports */
import React, { useState, useEffect, useCallback } from "react";


/* Asset Imports */
import AlabangWest from "../assets/AlabangWest.jpg";
import BarangayAlmanzaDos from "../assets/BarangayAlmanzaDos.jpg";
import BFAlmanza from "../assets/BFAlmanza.jpg";
import DBPVillage from "../assets/DBPVillage.jpg";
import TSCruz from "../assets/TSCruz.jpg";
import Registration from "../assets/Registration.png";
import CharityEvent from "../assets/CharityEvent.png";
import AidRequest from "../assets/AidRequest.png";
import Donation from "../assets/Donation.png";
import Volunteer from "../assets/Volunteer.png";
import Messaging from "../assets/Messaging.png";
import Notifications from "../assets/Notifications.png";
import Feedback from "../assets/Feedback.png";
import AboutUsImage1 from "../assets/AboutUsImage1.jpg";
import AboutUsImage2 from "../assets/AboutUsImage2.jpg";
import AboutUsImage3 from "../assets/AboutUsImage3.png";
import AboutUsImage4 from "../assets/AboutUsImage4.jpg";
import AboutUsImage5 from "../assets/AboutUsImage5.jpg";
import AboutUsImage6 from "../assets/AboutUsImage6.jpg";

/* Component Imports */
import Footer from '../components/Footer.jsx';
import DrawerHero from '../components/DrawerHero.jsx';
import InfoCardContainer from "../components/InfoCards.jsx";

/* Style Imports */
import styles from '../components/home.module.css';

const AboutUs = () => {

  const infoData = [
    {
      icon: Registration,
      title: "User Registration and Authentication",
      description: "Securely create and manage your personal account to access and partake in community services."
    },
    {
      icon: AidRequest,
      title: "Aid Request Submission",
      description: "Beneficiaries can submit individual requests for essential aid based on their personal needs."
    },
    {
      icon: Donation,
      title: "Donation Pledging",
      description: "Easily pledge donations to support ongoing charity initiatives within the barangay."
    },
    {
      icon: CharityEvent,
      title: "Charity Event Organization",
      description: "Stay informed and participate in community events posted directly on the platform."
    },
    {
      icon: Volunteer,
      title: "Volunteer Participation",
      description: "Sign up for volunteer opportunities to actively contribute to local support efforts."
    },
    {
      icon: Messaging,
      title: "In-App Messaging",
      description: "Communicate directly with organizers and other members through the built-in messaging system."
    },
    {
      icon: Notifications,
      title: "Real-Time Notifications",
      description: "Receive instant updates on the status of your requests, pledges, and new community events."
    },
    {
      icon: Feedback,
      title: "Feedback and Reporting",
      description: "Share your suggestions or report issues using dedicated feedback and system activity tools."
    },
  ];

  const testimonials = [
    {
      id: 1,
      name: "Barangay Almanza Dos",
      role: "The Administrative Heart",
      text: "A vital district in Las Piñas City serving as a bridge between urban convenience and suburban peace. It oversees a diverse landscape of established neighborhoods and premier modern developments along the Daang Hari corridor.",
      image: BarangayAlmanzaDos
    },
    {
      id: 2,
      name: "T.S. Cruz",
      role: "Civic Center",
      text: "The administrative and social hub of the barangay. Home to the local government center and primary public services, it remains one of the most active and accessible residential communities in the area.",
      image: TSCruz
    },
    {
      id: 3,
      name: "BF Almanza",
      role: "Established Suburban Living",
      text: "An established residential area known for its peaceful streets and long-standing community spirit. It offers a classic suburban atmosphere that has made it a preferred choice for families for decades.",
      image: BFAlmanza
    },
    {
      id: 4,
      name: "DBP Village",
      role: "Quiet Residential Community",
      text: "A quiet and professional neighborhood with deep roots in the district’s history. Originally established for bank employees, it now serves as a secluded and tight-knit retreat from the busy city life.",
      image: DBPVillage
    },
    {
      id: 5,
      name: "Alabang West",
      role: "The Modern Township",
      text: "A premier lifestyle destination featuring contemporary architecture and high-end services. It seamlessly blends upscale residential living with a vibrant retail and dining strip along the Alabang West Parade.",
      image: AlabangWest
    }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = useCallback(() => {
    setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  }, [testimonials.length]);

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      nextTestimonial();
    }, 5000);
    return () => clearInterval(interval);
  }, [nextTestimonial]);

  return (
    <div className={styles.aboutUsContainer}>
        <DrawerHero 
          title="About Us"
          description="Learn more about our mission and values."
        />
        <section className={styles.aboutSection}>
          <div className={styles.aboutContainer}>
            <div className={styles.aboutImages}>
              <div className={styles.imgWrapper + ' ' + styles.mainImg}>
                <img src={AboutUsImage1} alt="Children smiling" />
              </div>
              <div className={styles.imgWrapper + ' ' + styles.overlayImg}>
                <img src={AboutUsImage2} alt="Giving support" />
              </div>
            </div>
            <div className={styles.aboutText}>
              <div className={styles.aboutLabel}>
                <span>The F.E.A.S.T. Story</span>
                <div className={styles.line}></div>
              </div>
              <h2 className={styles.aboutTitle}>Spirit of Bayanihan: Connecting Hearts, Changing Lives</h2>
              <p className={styles.aboutDescription}>
                The heart of a thriving community lies in the spirit of Bayanihan.
                We believe that true progress is achieved when we look out for one another, ensuring that no neighbor is left behind.
                Through the <b>F.E.A.S.T. Charity Management System</b>, we are bridging the gap between those who wish to give and those in need within the Almanza Dos community.
              </p>
            </div>
          </div>
        </section>
        <section className={styles.aboutSection}>
          <div className={styles.aboutContainer}>
            <div className={styles.aboutText}>
              <div className={styles.aboutLabel}>
                <span>Our Heart for Almanza Dos</span>
                <div className={styles.line}></div>
              </div>
              <h2 className={styles.aboutTitle}>The Community Transforms Almanza Dos</h2>
              <p className={styles.aboutDescription}>
                Our platform serves as a dedicated hub for <b>Food, Emergency Aid, Support, and Transparency</b>.
                Whether you are pledging a donation, volunteering your free time for local initiatives,
                or seeking essential aid or assistance, your contribution creates a direct and lasting impact.
              </p>
            </div>
            <div className={styles.aboutImages}>
              <div className={styles.imgWrapper + ' ' + styles.mainImg}>
                <img src={AboutUsImage3} alt="Children smiling" />
              </div>
              <div className={styles.imgWrapper + ' ' + styles.overlayImg}>
                <img src={AboutUsImage4} alt="Giving support" />
              </div>
            </div>
          </div>
        </section>
        <section className={styles.aboutSection}>
          <div className={styles.aboutContainer}>
            <div className={styles.aboutImages}>
              <div className={styles.imgWrapper + ' ' + styles.mainImg}>
                <img src={AboutUsImage5} alt="Children smiling" />
              </div>
              <div className={styles.imgWrapper + ' ' + styles.overlayImg}>
                <img src={AboutUsImage6} alt="Giving support" />
              </div>
            </div>
            <div className={styles.aboutText}>
              <div className={styles.aboutLabel}>
                <span>Compassion in Action</span>
                <div className={styles.line}></div>
              </div>
              <h2 className={styles.aboutTitle}>Bridging the Gap Between Compassion and Action</h2>
              <p className={styles.aboutDescription}>
                Never underestimate the difference <b>YOU</b> can make in the lives of the vulnerable and hardworking members of Almanza Dos.
                Together, we can all build and uphold a more resilient, transparent, and compassionate community.
              </p>
            </div>
          </div>
        </section>
        {/* Testimonials Section */}
        <section className={styles.testimonialsSection} 
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.75)), url(${testimonials[currentIndex].image})`,
          }}>
          <div className={styles.testimonialHeader}>
            <div className={styles.aboutLabel}>
              <div className={styles.line}></div>
              <span>Our Reach</span>
              <div className={styles.line}></div>
            </div>
            <h2 className={styles.testimonialMainTitle}>Where We Serve</h2>
          </div>

          <div className={styles.testimonialCarousel}>
            <button className={styles.carouselArrow + ' ' + styles.left} onClick={prevTestimonial}>❮</button>
            
            <div 
              className={styles.testimonialContent} 
              key={currentIndex} 
            >
              <div className={styles.testimonialAvatar}>
                <img src={testimonials[currentIndex].image || 'https://via.placeholder.com/150'} alt="User" />
              </div>
              <h3 className={styles.testimonialName}>{testimonials[currentIndex].name}</h3>
              <p className={styles.testimonialRole}>{testimonials[currentIndex].role}</p>
              
              <div className={styles.quoteIcon}>“</div>
              <p className={styles.testimonialText}>
                {testimonials[currentIndex].text}
              </p>
            </div>

            <button className={styles.carouselArrow + ' ' + styles.right} onClick={nextTestimonial}>❯</button>
          </div>

          <div className={styles.testimonialIndicators}>
            {testimonials.map((_, index) => (
              <div 
                key={index} 
                className={`${styles.dot} ${index === currentIndex ? styles.active : ''}`}
                onClick={() => setCurrentIndex(index)}
              ></div>
            ))}
          </div>
        </section>
        <section className={styles.supportSection}>
          <div className={styles.supportHeader}>
            <p className={styles.supportHeaderSubtitle}>[Introducing]</p>
            <h2 className={styles.supportHeaderTitle}>Our Features</h2>
          </div>
          <InfoCardContainer items={infoData} />
        </section>
        <Footer />
    </div>
  )
}

export default AboutUs;
