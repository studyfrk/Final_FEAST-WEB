/* React & Firebase Imports */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom'; // IMPORT USENAVIGATE

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
  const navigate = useNavigate(); // INITIALIZE NAVIGATE

  const testimonials = [
    { id: 1, name: "Cameron Williamson", role: "Founder", text: "...", image: profile },
    { id: 2, name: "Jane Cooper", role: "Project Manager", text: "...", image: profile },
    { id: 3, name: "Guy Hawkins", role: "Volunteer", text: "...", image: profile }
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
      where('status', 'in', ['Upcoming', 'Ongoing']),
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

  const dailyAidRequests = useMemo(() => getDailyRandom3(aidRequests), [aidRequests]);
  const dailyEvents      = useMemo(() => getDailyRandom3(events),      [events]);

  const getAidPercentage = (raised, goal) => {
    const r = Number(raised) || 0;
    const g = Number(goal) || 0;
    if (g <= 0) return 0;
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
            {/* Added onClick routing to the specific page */}
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
            {/* Added onClick routing to the about page */}
            <button className={styles.readMoreBtn} onClick={() => navigate('/about')}>
              Read More
            </button>
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
          {aidLoading ? (
            <p style={{ textAlign: 'center', color: '#999' }}>Loading aid requests…</p>
          ) : dailyAidRequests.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999' }}>No aid requests available at the moment.</p>
          ) : (
            dailyAidRequests.map((req) => {
              const targetGoal = req.aidType === 'Fundraiser' ? req.fundraiserGoal : req.itemQuantity;
              const currentRaised = req.raised || 0;

              const raisedText = req.aidType === 'Fundraiser' ? `₱${formatAmount(currentRaised)}` : `${currentRaised} items`;
              const goalText = req.aidType === 'Fundraiser' ? `₱${formatAmount(targetGoal)}` : `${targetGoal || '—'} items`;

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
                    percentage={getAidPercentage(currentRaised, targetGoal)}
                  />
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Ongoing Charity Events Section */}
      <section className={styles.causesSection}>
        <div className={styles.causesHeader}>
          <div className={styles.headerInfo}>
            <div className={styles.aboutLabel}>
              <span>Latest Charity Events</span>
              <div className={styles.line}></div>
            </div>
            <h2 className={styles.aboutTitle}>Participate In Our <br/> Active Events</h2>
          </div>
        </div>

        <div className={styles.causesGrid}>
          {eventsLoading ? (
            <p style={{ textAlign: 'center', color: '#999' }}>Loading events…</p>
          ) : dailyEvents.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999' }}>No active events at the moment.</p>
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
                  />
                </div>
              );
            })
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Home;