import React, { useState } from 'react';
import AboutLayout from '../components/AboutLayout';
import styles from '../components/AboutStyles';
import mainAboutGroup from '../assets/about-group-pic.jpg'; 
import distributionPic from '../assets/about-distribution.jpg';
import Footer from '../components/Footer'; 

const AboutPage = () => {
  const [activeTab, setActiveTab] = useState('mission');

  const tabContent = {
    mission: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Purus rutrum donec ultricies cras id ac. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    values: "Core values description goes here... Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    history: "Organizational history description goes here... Lorem ipsum dolor sit amet."
  };

  return (
    <AboutLayout>
      <section style={styles.cardGrid}>
        {[
          { title: "Our Vision", content: "Lorem ipsum dolor sit amet... Purus rutrum donec ultricies cras id ac." },
          { title: "Our Mission", content: "Lorem ipsum dolor sit amet... Purus rutrum donec ultricies cras id ac." },
        ].map(card => (
          <div key={card.title} style={styles.infoCard}>
            <div style={styles.cardHeaderAccent}></div>
            <div style={styles.cardBody}>
              <h3 style={styles.cardTitle}>{card.title}</h3>
              <p style={styles.cardContent}>{card.content}</p>
              <a href="#learn-more" style={styles.learnMoreLink}>Learn More</a>
            </div>
          </div>
        ))}
      </section>

      {/* 2. Full-width Quote Section */}
      <section style={styles.quoteSection}>
        <div style={styles.quoteOverlay}></div>
        <div style={styles.quoteContent}>
          <blockquote style={styles.quoteText}>
            “Lorem Ipsum dolor sit amet, consectetur adipiscing elit. Purus rutrum donec”
          </blockquote>
          <cite style={styles.quoteCite}>-Tony Fowler</cite>
        </div>
      </section>

      {/* 3. About Us Tabbed Section */}
      <section style={styles.aboutUsSection}>
        <div style={styles.aboutTextContainer}>
          <h2 style={styles.aboutUsHeader}>About Us</h2>
          <p style={styles.aboutUsSubtitle}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Purus rutrum donec ultricies cras id ac.
          </p>

          {/* Interactive Tabs */}
          <div style={styles.tabContainer}>
            {['mission', 'values', 'history'].map(tab => (
              <button 
                key={tab}
                style={activeTab === tab ? {...styles.tabButton, ...styles.activeTabButton} : styles.tabButton}
                onClick={() => setActiveTab(tab)}
              >
                Our {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div style={styles.tabContentArea}>
            <h4 style={styles.activeTabTitle}>Our {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h4>
            <p style={styles.activeTabText}>{tabContent[activeTab]}</p>
          </div>
        </div>

        {/* Diagonal Image Layout */}
        <div style={styles.aboutImagesContainer}>
          <img src={mainAboutGroup} alt="Community Group" style={styles.mainGroupImage} />
          <img src={distributionPic} alt="Volunteers distributing aid" style={styles.subImage} />
        </div>
      </section>
    </AboutLayout>
  );
};

export default AboutPage;