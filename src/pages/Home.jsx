/* React & Firebase Imports */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

/* Asset Imports */
import heroImage from '../assets/homehero.jpg';
import aboutDist from '../assets/about-distribution.jpg'; 
import aboutGroup from '../assets/about-group-pic.jpg';
import profile from '../assets/profile.jpg';

/* Component Imports */
import Header from '../components/Header.jsx';
import AidCard from '../components/AidCard.jsx'; 
import EventCard from '../components/EventCard.jsx';
import Footer from '../components/Footer.jsx';

/* Style Imports */
import styles from '../components/home.module.css';

function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h ^= h >>> 13;
    h = Math.imul(h, 1540483477);
    h ^= h >>> 15;
    return ((h >>> 0) / 0xffffffff);
  };
}

function getDailyRandom3(arr) {
  if (arr.length <= 3) return arr;
  const today = new Date().toISOString().split('T')[0];
  const rand = seededRandom(today);
  const shuffled = [...arr].sort(() => rand() - 0.5);
  return shuffled.slice(0, 3);
}

const Home = () => {
  const navigate = useNavigate();

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
    const interval = setInterval(nextTestimonial, 5000);
    return () => clearInterval(interval);
  }, [nextTestimonial]);

  const [aidRequests, setAidRequests]       = useState([]);
  const [aidLoading, setAidLoading]         = useState(true);

  useEffect(() => {
    setAidLoading(true);
    const q = query(
      collection(db, 'aid_requests'),
      where('approvalStatus', '==', 'Approved'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setAidRequests(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setAidLoading(false);
    }, (err) => {
      console.error('Firestore Aid Requests Error:', err);
      setAidLoading(false);
    });
    return () => unsub();
  }, []);

  const [events, setEvents]         = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    setEventsLoading(true);
    const q = query(
      collection(db, 'charity_events'),
      where('approvalStatus', '==', 'Approved'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const uid = auth.currentUser?.uid;
      const all = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      if (uid) {
        const joined = all.filter(ev => (ev.anticipatedParticipants || []).includes(uid));
        const others = all.filter(ev => !(ev.anticipatedParticipants || []).includes(uid));
        setEvents([...joined, ...others]);
      } else {
        setEvents(all);
      }
      setEventsLoading(false);
    }, (err) => {
      console.error('Firestore Events Error:', err);
      setEventsLoading(false);
    });
    return () => unsub();
  }, []);

  // ─── Announcements Fetching Logic ──────────────────────────────────────────
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  useEffect(() => {
    setAnnouncementsLoading(true);
    const q = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const allAnnouncements = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      // Filter out expired updates client-side
      const activeAnnouncements = allAnnouncements.filter((ann) => {
        if (!ann.expiresAt) return true;
        const expiryDate = ann.expiresAt.toDate ? ann.expiresAt.toDate() : new Date(ann.expiresAt);
        return expiryDate > now;
      });

      // Keep only the 3 latest active announcements for the homepage layout
      setAnnouncements(activeAnnouncements.slice(0, 3));
      setAnnouncementsLoading(false);
    }, (err) => {
      console.error('Firestore Announcements Error:', err);
      setAnnouncementsLoading(false);
    });
    return () => unsub();
  }, []);

  const dailyAidRequests = useMemo(() => getDailyRandom3(aidRequests), [aidRequests]);
  const dailyEvents      = useMemo(() => getDailyRandom3(events),      [events]);

  const getAidPercentage = (raised, goal) => {
    const r = parseFloat(String(raised).replace(/,/g, '')) || 0;
    const g = parseFloat(String(goal).replace(/,/g, ''))  || 1;
    return Math.min(Math.round((r / g) * 100), 100);
  };

  const formatAmount = (val) =>
    val !== undefined && val !== null ? Number(val).toLocaleString() : '0';

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
            <button className={styles.donateBtn} onClick={() => navigate('/aid-requests')}>
              Donate Now
            </button>
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
            <button className={styles.readMoreBtn} onClick={() => navigate('/about')}>
              Read More
            </button>
          </div>
        </div>
      </section>

      {/* ── Announcements Section ── */}
      <section className={styles.causesSection} style={{ background: '#fcfcfc' }}>
        <div className={styles.causesHeader}>
          <div className={styles.headerInfo}>
            <div className={styles.aboutLabel}>
              <span>Latest Announcements</span>
              <div className={styles.line}></div>
            </div>
            <h2 className={styles.aboutTitle}>Stay Updated With <br/> Our Community News</h2>
          </div>
        </div>

        <div className={styles.causesGrid}>
          {announcementsLoading ? (
            <p style={{ textAlign: 'center', color: '#999', gridColumn: '1 / -1' }}>Loading announcements…</p>
          ) : announcements.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', gridColumn: '1 / -1' }}>No recent announcements available.</p>
          ) : (
            announcements.map((ann) => (
              <div 
                key={ann.id} 
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease',
                  border: '1px solid #eaeaea'
                }}
              >
                {ann.imageUrl && (
                  <div style={{ height: '180px', overflow: 'hidden' }}>
                    <img 
                      src={ann.imageUrl} 
                      alt={ann.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}
                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.5rem', fontWeight: 500 }}>
                    {ann.createdAt?.toDate ? ann.createdAt.toDate().toLocaleDateString() : 'Just now'}
                  </span>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem', color: '#111', fontWeight: 600 }}>
                    {ann.title}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: '1.5', flex: 1, whiteSpace: 'pre-wrap' }}>
                    {ann.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── Request Aid Section ── */}
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
          {aidLoading ? (
            <p style={{ textAlign: 'center', color: '#999' }}>Loading aid requests…</p>
          ) : dailyAidRequests.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999' }}>No aid requests available at the moment.</p>
          ) : (
            dailyAidRequests.map((req) => {
              const currentRaised = Number(req.raised || 0);

              let targetPercent = 0;
              let raisedText = '';
              let goalText = '';

              if (req.aidType === 'Fundraiser') {
                const targetGoal = Number(req.fundraiserGoal) || 0;
                targetPercent = targetGoal > 0 
                  ? Math.min(Math.round((currentRaised / targetGoal) * 100), 100) 
                  : 0;
                raisedText = `₱${formatAmount(currentRaised)}`;
                goalText = req.fundraiserGoal ? `₱${formatAmount(req.fundraiserGoal)}` : '—';
              } else {
                const itemsList = req.acceptedItems?.length > 0 ? req.acceptedItems.join(', ') : '—';
                raisedText = `${currentRaised} items donated so far`;
                goalText = `Needed: ${itemsList}`;
              }

              return (
                <div 
                  key={req.id} 
                  className={styles.aidCardWrapper}
                  onClick={() => navigate('/aid-requests', { state: { targetId: req.id } })}
                  style={{ cursor: 'pointer' }}
                >
                  <AidCard
                    category={req.category || 'General'}
                    title={req.title || req.name || 'Untitled Request'}
                    description={req.description || req.desc || ''}
                    raised={raisedText}
                    goal={goalText}
                    percentage={targetPercent}
                    image={req.imageUrls?.[0] || 'https://via.placeholder.com/300'}
                    hideProgressBar={req.aidType === 'In-Kind'}
                  />
                </div>
              );
            })
          )}
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
          
          <div className={styles.testimonialContent} key={currentIndex}>
            <div className={styles.testimonialAvatar}>
              <img src={testimonials[currentIndex].image || 'https://via.placeholder.com/150'} alt="User" />
            </div>
            <h3 className={styles.testimonialName}>{testimonials[currentIndex].name}</h3>
            <p className={styles.testimonialRole}>{testimonials[currentIndex].role}</p>
            <div className={styles.quoteIcon}>"</div>
            <p className={styles.testimonialText}>{testimonials[currentIndex].text}</p>
          </div>

          <button className={styles.carouselArrow + ' ' + styles.right} onClick={nextTestimonial}>❯</button>
        </div>

        <div className={styles.testimonialIndicators}>
          {testimonials.map((_, index) => (
            <div 
              key={index} 
              className={`${styles.dot} ${index === currentIndex ? styles.active : ''}`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      </section>

      {/* ── Ongoing Charity Events Section ── */}
      <section className={styles.causesSection}>
        <div className={styles.causesHeader}>
          <div className={styles.headerInfo}>
            <div className={styles.aboutLabel}>
              <span>Latest Ongoing Charity Events</span>
              <div className={styles.line}></div>
            </div>
            <h2 className={styles.aboutTitle}>Participate In Our <br/> Active Events</h2>
          </div>
        </div>

        <div className={styles.causesGrid}>
          {eventsLoading ? (
            <p style={{ textAlign: 'center', color: '#999' }}>Loading events…</p>
          ) : dailyEvents.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999' }}>No upcoming events at the moment.</p>
          ) : (
            dailyEvents.map((ev) => {
              const joinedCount = (ev.anticipatedParticipants || []).length;
              const limit = ev.participantLimit || 0;

              return (
                <div 
                  key={ev.id}
                  className={styles.aidCardWrapper}
                  onClick={() => navigate('/charity-events', { state: { targetId: ev.id } })}
                  style={{ cursor: 'pointer' }}
                >
                  <EventCard
                    category={ev.category || 'General'}
                    title={ev.title || 'Untitled Event'}
                    description={ev.description || ev.desc || ''}
                    raised={`${joinedCount} Joined`}
                    goal={limit > 0 ? `Limit: ${limit}` : 'No Limit'}
                    percentage={limit > 0 ? getAidPercentage(joinedCount, limit) : 0}
                    image={ev.imageUrls?.[0] || 'https://via.placeholder.com/300'}
                  />
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Footer Section */}
      <Footer />
    </div>
  );
};

export default Home;