/* React & Firebase Imports */
import React, { useState, useEffect, useCallback } from 'react';

/* Asset Imports */
import heroImage from '../assets/homehero.jpg';
import aboutDist from '../assets/about-distribution.jpg'; 
import aboutGroup from '../assets/about-group-pic.jpg';
import profile from '../assets/profile.jpg';

/* Component Imports */
import Header from '../components/Header.jsx';
import Card from '../components/AidCard.jsx'; 
import Footer from '../components/Footer.jsx';

/* Style Imports */
import styles from '../components/home.module.css';

const Home = () => {
  const testimonials = [
    {
      id: 1,
      name: "Cameron Williamson",
      role: "Founder",
      text: "Sea Chub Demoiselle Whalefish Zebra Lionfish Mud Cat Pelican Eel. Minnow Snoek Icefish Velvet-Belly Shark, California Halibut Round Stingray Northern Sea Robin. Southern Grayling Trout-PerchSharksucker Sea Toad Candiru Rocket Danio Tilefish Stingray Deepwater Stingray Sacramento Splittail, Canthigaster Rostrata.",
      image: profile
    },
    {
      id: 2,
      name: "Jane Cooper",
      role: "Project Manager",
      text: "Supporting this cause has been an incredible journey. The transparency and impact are visible in every project they undertake. I am proud to be part of this community helping those in need.",
      image: profile
    },
    {
      id: 3,
      name: "Guy Hawkins",
      role: "Volunteer",
      text: "Never underestimate the difference you can make in the lives of the poor and helpless. This organization provides the perfect platform for global change-makers to act.",
      image: profile
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
    <div className={styles.homeContainer}>
      <Header />
      
      {/* Hero Section */}
      <section 
        className={styles.heroSection} 
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className={styles.heroOverlay}>
          <div className={styles.heroContent}>
            <p className={styles.heroSubtitle}>Give Hope For Homeless</p>
            <h1 className={styles.heroTitle}>Helping Each Other <br /> Can Make World Better</h1>
            <p className={styles.heroDescription}>
              We Seek Out World Changers And Difference Makers Around The <br />
              Globe, And Equip Them To Fulfill Their Unique Purpose.
            </p>
            <button className={styles.donateBtn}>Donate Now</button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className={styles.aboutSection}>
        <div className={styles.aboutContainer}>
          <div className={styles.aboutImages}>
            <div className={styles.imgWrapper + ' ' + styles.mainImg}>
              <img src={aboutGroup} alt="Children smiling" />
            </div>
            <div className={styles.imgWrapper + ' ' + styles.overlayImg}>
              <img src={aboutDist} alt="Giving support" />
            </div>
          </div>
          
          <div className={styles.aboutText}>
            <div className={styles.aboutLabel}>
              <span>About Us</span>
              <div className={styles.line}></div>
            </div>
            <h2 className={styles.aboutTitle}>Your Support Is Really Powerful.</h2>
            <p className={styles.aboutDescription}>
              The Secret To Happiness Lies In Helping Others. Never 
              Underestimate The Difference YOU Can Make In The 
              Lives Of The Poor, The Abused And The Helpless.
            </p>
            <button className={styles.readMoreBtn}>Read More</button>
          </div>
        </div>
      </section>

      {/* Request Aid Section */}
      <section className={styles.causesSection}>
        <div className={styles.causesHeader}>
          <div className={styles.headerInfo}>
            <div className={styles.aboutLabel}>
              <span>Request Aid</span>
              <div className={styles.line}></div>
            </div>
            <h2 className={styles.aboutTitle}>Find The Popular Request <br/> And Donate Them</h2>
          </div>
        </div>

        <div className={styles.causesGrid}>
          <Card 
            category="Medical"
            title="Donate For Poor Peoples Treatment And Medicine."
            description="Lorem Ipsum Dolor Sit Amet, Consete Sadipscing Elitr, Sed Diam Nonumy...."
            raised="600"
            goal="1,000"
            percentage="60"
          />
        </div>
      </section>

      {/* Testimonials Section */}
      <section className={styles.testimonialsSection}>
        <div className={styles.testimonialHeader}>
          <div className={styles.aboutLabel}>
            <div className={styles.line}></div>
            <span>Our Testimonials</span>
            <div className={styles.line}></div>
          </div>
          <h2 className={styles.testimonialMainTitle}>What People Say</h2>
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

      {/* Ongoing Charity Events Section */}
      <section className={styles.causesSection}>
        <div className={styles.causesHeader}>
          <div className={styles.headerInfo}>
            <div className={styles.aboutLabel}>
              <span>Latest Ongoing Charity events</span>
              <div className={styles.line}></div>
            </div>
            <h2 className={styles.aboutTitle}>Participate In Our <br/> Active Events</h2>
          </div>
        </div>

        <div className={styles.causesGrid}>
          <Card 
            category="Emergency Support"
            title="F.E.A.S.T. Charity Management System Launch Event."
            description="Join us as we implement the F.E.A.S.T. system to enhance transparency and support for those in need."
            raised="1,200"
            goal="5,000"
            percentage="24"
          />
        </div>
      </section>

      {/* Footer Section */}
      <Footer />
    </div>
  );
};

export default Home;
