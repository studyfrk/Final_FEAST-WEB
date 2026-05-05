import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/header';
import Card from '../components/card'; 
import Footer from '../components/footer';
import heroImage from '../assets/homehero.jpg';
import aboutDist from '../assets/about-distribution.jpg'; 
import aboutGroup from '../assets/about-group-pic.jpg';
import profile from '../assets/profile.jpg';
import '../components/home.css';

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
    <div className="home-container">
      <Header />
      
      {/* Hero Section */}
      <section 
        className="hero-section" 
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="hero-overlay">
          <div className="hero-content">
            <p className="hero-subtitle">Give Hope For Homeless</p>
            <h1 className="hero-title">Helping Each Other <br /> Can Make World Better</h1>
            <p className="hero-description">
              We Seek Out World Changers And Difference Makers Around The <br />
              Globe, And Equip Them To Fulfill Their Unique Purpose.
            </p>
            <button className="donate-btn">Donate Now</button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section">
        <div className="about-container">
          <div className="about-images">
            <div className="img-wrapper main-img">
              <img src={aboutGroup} alt="Children smiling" />
            </div>
            <div className="img-wrapper overlay-img">
              <img src={aboutDist} alt="Giving support" />
            </div>
          </div>
          
          <div className="about-text">
            <div className="about-label">
              <span>About Us</span>
              <div className="line"></div>
            </div>
            <h2 className="about-title">Your Support Is Really Powerful.</h2>
            <p className="about-description">
              The Secret To Happiness Lies In Helping Others. Never 
              Underestimate The Difference YOU Can Make In The 
              Lives Of The Poor, The Abused And The Helpless.
            </p>
            <button className="read-more-btn">Read More</button>
          </div>
        </div>
      </section>

      {/* Request Aid Section */}
      <section className="causes-section">
        <div className="causes-header">
          <div className="header-info">
            <div className="about-label">
              <span>Request Aid</span>
              <div className="line"></div>
            </div>
            <h2 className="about-title">Find The Popular Request <br/> And Donate Them</h2>
          </div>
        </div>

        <div className="causes-grid">
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
      <section className="testimonials-section">
        <div className="testimonial-header">
          <div className="about-label" style={{justifyContent: 'center'}}>
            <div className="line"></div>
            <span>Our Testimonials</span>
            <div className="line"></div>
          </div>
          <h2 className="testimonial-main-title">What People Say</h2>
        </div>

        <div className="testimonial-carousel">
          <button className="carousel-arrow left" onClick={prevTestimonial}>❮</button>
          
          <div 
            className="testimonial-content" 
            key={currentIndex} 
            style={{ minHeight: '350px' }} 
          >
            <div className="testimonial-avatar">
              <img src={testimonials[currentIndex].image || 'https://via.placeholder.com/150'} alt="User" />
            </div>
            <h3 className="testimonial-name">{testimonials[currentIndex].name}</h3>
            <p className="testimonial-role">{testimonials[currentIndex].role}</p>
            
            <div className="quote-icon">“</div>
            <p className="testimonial-text">
              {testimonials[currentIndex].text}
            </p>
          </div>

          <button className="carousel-arrow right" onClick={nextTestimonial}>❯</button>
        </div>

        <div className="testimonial-indicators">
          {testimonials.map((_, index) => (
            <div 
              key={index} 
              className={`dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
            ></div>
          ))}
        </div>
      </section>

      {/* Ongoing Charity Events Section */}
      <section className="causes-section" style={{ backgroundColor: '#f9f9f9' }}>
        <div className="causes-header">
          <div className="header-info">
            <div className="about-label">
              <span>Latest Ongoing Charity events</span>
              <div className="line"></div>
            </div>
            <h2 className="about-title">Participate In Our <br/> Active Events</h2>
          </div>
        </div>

        <div className="causes-grid">
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

      {/* Added Footer Section */}
      <Footer />
    </div>
  );
};

export default Home;