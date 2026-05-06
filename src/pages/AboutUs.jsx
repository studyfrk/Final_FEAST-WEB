import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import gpcLogo from "../assets/GPC_Logo.png";
import Header from '../components/header';
import Footer from '../components/footer';
import DrawerHero from '../components/DrawerHero';
import "../components/home.css";
import aboutDist from '../assets/about-distribution.jpg'; 
import aboutGroup from '../assets/about-group-pic.jpg';
import InfoCardContainer from "../components/InfoCards.jsx";
import profile from '../assets/profile.jpg';
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

const AboutUs = () => {

  const infoData = [
    {
      icon: Registration,
      title: "User Registration and Authentication",
      description: "Securely create and manage your personal account to access all community services."
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
      text: "An established residential enclave known for its peaceful streets and long-standing community spirit. It offers a classic suburban atmosphere that has made it a preferred choice for families for decades.",
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
      text: "A premier lifestyle destination featuring contemporary architecture and high-end amenities. It seamlessly blends upscale residential living with a vibrant retail and dining strip along the Alabang West Parade.",
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
    <div>
        <Header />
        <DrawerHero 
          title="About Us"
          description="Learn more about our mission and values."
        />
        <section className="about-section" style={{fontFamily: "Outfit"}}>
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
                <span>The F.E.A.S.T. Story</span>
                <div className="line"></div>
              </div>
              <h2 className="about-title">Spirit of Bayanihan: Connecting Hearts, Changing Lives</h2>
              <p className="about-description">
                The heart of a thriving community lies in the spirit of Bayanihan.
                We believe that true progress is achieved when we look out for one another, ensuring that no neighbor is left behind.
                Through the <b>F.E.A.S.T. Charity Management System</b>, we are bridging the gap between those who wish to give and those in need within our barangay.
              </p>
            </div>
          </div>
        </section>
        <section className="about-section" style={{fontFamily: "Outfit"}}>
          <div className="about-container">
            <div className="about-text">
              <div className="about-label">
                <span>Our Heart for Almanza Dos</span>
                <div className="line"></div>
              </div>
              <h2 className="about-title">The Community Transforms Barangay Almanza Dos.</h2>
              <p className="about-description">
                Our platform serves as a dedicated hub for <b>Food, Emergency Aid, Support, and Transparency.</b>
                Whether you are pledging a donation, volunteering your time for local initiatives,
                or seeking essential assistance, your contribution creates a direct and lasting impact.
              </p>
            </div>
            <div className="about-images">
              <div className="img-wrapper main-img">
                <img src={aboutGroup} alt="Children smiling" />
              </div>
              <div className="img-wrapper overlay-img">
                <img src={aboutDist} alt="Giving support" />
              </div>
            </div>
          </div>
        </section>
        <section className="about-section" style={{fontFamily: "Outfit"}}>
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
                <span>Compassion in Action</span>
                <div className="line"></div>
              </div>
              <h2 className="about-title">Bridging the Gap Between Compassion and Action</h2>
              <p className="about-description">
                Never underestimate the difference <b>YOU</b> can make in the lives of the vulnerable and the hardworking members of our community.
                Together, we are building a more resilient, transparent, and compassionate Almanza Dos.
              </p>
            </div>
          </div>
        </section>
        {/* Testimonials Section */}
        <section className="testimonials-section" 
          style={{
            fontFamily: "Outfit",
            position: 'relative',
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.75)), url(${testimonials[currentIndex].image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transition: 'background-image 0.8s ease-in-out',
            padding: '80px 0',
            color: '#fff'
          }}>
          <div className="testimonial-header">
            <div className="about-label" style={{justifyContent: 'center'}}>
              <div className="line"></div>
              <span>Our Reach</span>
              <div className="line"></div>
            </div>
            <h2 className="testimonial-main-title">Where We Serve</h2>
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
              <h3 className="testimonial-name" style={{fontSize: 24}}>{testimonials[currentIndex].name}</h3>
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
        <section className="info-section">
          <div className="info-header">
            <p>Introducing</p>
            <br />
            <h2>Our Features</h2>
          </div>
          <InfoCardContainer items={infoData} />
        </section>
        <Footer />
    </div>
  )
}

export default AboutUs;
