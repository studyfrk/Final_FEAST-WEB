import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer'; 
import styles from './AboutStyles';
import heroBg from '../assets/about-hero-bg.jpg'; 

const AboutLayout = ({ children }) => {
  return (
    <div style={{...styles.pageBackground, display: 'flex', flexDirection: 'column', minHeight: '100vh'}}>
      
      <header style={{
        ...styles.heroHeader, 
        backgroundImage: `url(${heroBg})`, 
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <Navbar />
        <div style={styles.heroContent}>
           <h1 style={styles.heroTitle}>Give a helping hand<br /> to those who need it most!</h1>
           <p style={styles.heroSubtitle}>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Purus rutrum donec ultricies cras id ac.</p>
           <button style={styles.joinUsButton}>JOIN US</button>
        </div>
      </header>

      <main style={{flex: 1}}> 
        {children}
      </main>

      <Footer /> 
    </div>
  );
};

export default AboutLayout;