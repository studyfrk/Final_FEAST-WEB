/* React & Firebase Imports */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';

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
  const location = useLocation();

  const testimonials = [
    {
      id: 1,
      icon: "🤝",
      title: "Request Aid Without Hesitation",
      role: "For Those In Need",
      text: "If you or your family are going through a tough time with food, medical emergencies, or recovering from a disaster, F.E.A.S.T. is here for you. Asking for help is simple and nothing to be ashamed of. No neighbor should have to struggle alone when the community is ready to step up."
    },
    {
      id: 2,
      icon: "💛",
      title: "Your Donation Changes Lives",
      role: "For Donors & Supporters",
      text: "Even a small donation can provide a local family with food, medicine, or substantial support. Every peso or item you give through F.E.A.S.T. goes directly towards verified aid requests. It is completely transparent, traceable, and makes a real difference. Your generosity keeps Almanza Dos thriving."
    },
    {
      id: 3,
      icon: "📢",
      title: "Organize Events That Unite",
      role: "For Community Leaders",
      text: "Charity events are wonderful for bringing the barangay together. They help us build trust, spread the word, and multiply the good we can do. Planning a feeding program, a medical mission, or a relief drive? F.E.A.S.T. has the tools to help you plan, promote, and manage everything smoothly."
    },
    {
      id: 4,
      icon: "🌱",
      title: "Volunteer and Make a Difference",
      role: "For Active Citizens",
      text: "You don’t need money to make a real difference because your time and effort matter just as much. When you volunteer through F.E.A.S.T., you are directly helping the citizens of Almanza Dos. Every extra pair of hands brings us one step closer to a stronger, more compassionate community."
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
      where('status', '==', 'Ongoing'),
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

  // Updated query filters to align precisely with CharityEvents.jsx logic
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

  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [currentAnnIndex, setCurrentAnnIndex] = useState(0);

  useEffect(() => {
    setAnnouncementsLoading(true);
    const q = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const allAnnouncements = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      const activeAnnouncements = allAnnouncements.filter((ann) => {
        if (!ann.expiresAt) return true;
        const expiryDate = ann.expiresAt.toDate ? ann.expiresAt.toDate() : new Date(ann.expiresAt);
        return expiryDate > now;
      });

      setAnnouncements(activeAnnouncements.slice(0, 5));
      setAnnouncementsLoading(false);
    }, (err) => {
      console.error('Firestore Announcements Error:', err);
      setAnnouncementsLoading(false);
    });
    return () => unsub();
  }, []);

  const nextAnnouncement = useCallback(() => {
    setCurrentAnnIndex((prev) => (prev === announcements.length - 1 ? 0 : prev + 1));
  }, [announcements.length]);

  const prevAnnouncement = useCallback(() => {
    setCurrentAnnIndex((prev) => (prev === 0 ? announcements.length - 1 : prev - 1));
  }, [announcements.length]);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const interval = setInterval(nextAnnouncement, 6000);
    return () => clearInterval(interval);
  }, [announcements.length, nextAnnouncement]);

  const dailyAidRequests = useMemo(() => getDailyRandom3(aidRequests), [aidRequests]);
  const dailyEvents      = useMemo(() => getDailyRandom3(events),      [events]);

  // Handler to sync deeply nested redirection parameters from the active list state
  useEffect(() => {
    const targetId = location.state?.targetId;
    if (targetId) {
      if (events.length > 0) {
        const targetEvent = events.find((item) => item.id === targetId);
        if (targetEvent) {
          window.history.replaceState({}, document.title);
          navigate('/charity-events', { state: { targetId } });
          return;
        }
      }
      if (aidRequests.length > 0) {
        const targetAid = aidRequests.find((item) => item.id === targetId);
        if (targetAid) {
          window.history.replaceState({}, document.title);
          navigate('/aid-requests', { state: { targetId } });
          return;
        }
      }
    }
  }, [events, aidRequests, location.state, navigate]);

  const getAidPercentage = (raised, goal) => {
    const r = parseFloat(String(raised).replace(/,/g, '')) || 0;
    const g = parseFloat(String(goal).replace(/,/g, ''))  || 1;
    return Math.min(Math.round((r / g) * 100), 100);
  };

  const formatAmount = (val) =>
    val !== undefined && val !== null ? Number(val).toLocaleString() : '0';

  const currentUserJoined = (ev) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return false;
    return (ev.anticipatedParticipants || []).includes(uid);
  };

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
            <p className={styles.heroSubtitle}>Give Hope For Almanza Dos</p>
            <h1 className={styles.heroTitle}>Helping Each Other <br /> Can Strengthen Our Community</h1>
            <p className={styles.heroDescription}>
              We Seek Out Difference Makers and Those in Need Around the <br />
              Almanza Dos Community, and Help Them Fulfill Their Needs and Unique Purpose.
            </p>
            
            {/* New Button Container */}
            <div className={styles.heroButtonGroup}>
              <button 
                className={`${styles.heroBtn} ${styles.heroBtnYellow}`} 
                onClick={() => navigate('/aid-requests')}
              >
                Find & Give Help
              </button>
              <button 
                className={`${styles.heroBtn} ${styles.heroBtnBlue}`} 
                onClick={() => navigate('/charity-events')}
              >
                Explore Events
              </button>
            </div>

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
              <span>About F.E.A.S.T.</span>
              <div className={styles.line}></div>
            </div>
            <h2 className={styles.aboutTitle}>Helping The Almanza Dos Community</h2>
            <p className={styles.aboutDescription}>
              Here, at <b>F.E.A.S.T. (Food, Emergency Aid, Support, and Transparency)</b>,
              we believe a better community lies in lifting each other up.
              You should never underestimate or disregard the difference<b> YOUR SUPPORT </b>
              could make in providing help to those who need it most. And if you need help,
              don't be afraid to <b>REACH OUT</b> to people in your community.
            </p>
            <button className={styles.readMoreBtn} onClick={() => navigate('/about')}>
              Read More
            </button>
          </div>
        </div>
      </section>

      {/* ── Announcements Banner Section ── */}
      {!announcementsLoading && announcements.length > 0 && (
        <section className={styles.announcementBanner}>
          {/* Background Image */}
          <div
            className={styles.announcementBg}
            style={{
              backgroundImage: `url(${
                (announcements[currentAnnIndex].imageUrls && announcements[currentAnnIndex].imageUrls.length > 0)
                  ? announcements[currentAnnIndex].imageUrls[0]
                  : heroImage
              })`
            }}
          />
          {/* Dark Overlay */}
          <div className={styles.announcementOverlay} />

          {/* Left Arrow */}
          {announcements.length > 1 && (
            <button
              className={`${styles.annArrow} ${styles.annArrowLeft}`}
              onClick={prevAnnouncement}
              aria-label="Previous announcement"
            >❮</button>
          )}

          {/* Content */}
          <div className={styles.announcementContent} key={currentAnnIndex}>
            <div className={styles.annSectionLabel}>
              <div className={styles.line}></div>
              <span>Official Announcements</span>
              <div className={styles.line}></div>
            </div>
            <h2 className={styles.announcementTitle}>{announcements[currentAnnIndex].title}</h2>
            <p className={styles.announcementBody}>{announcements[currentAnnIndex].body}</p>
            <div className={styles.announcementDate}>
              Posted: {announcements[currentAnnIndex].createdAt?.toDate
                ? announcements[currentAnnIndex].createdAt.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : 'Recently'}
            </div>
          </div>

          {/* Right Arrow */}
          {announcements.length > 1 && (
            <button
              className={`${styles.annArrow} ${styles.annArrowRight}`}
              onClick={nextAnnouncement}
              aria-label="Next announcement"
            >❯</button>
          )}

          {/* Dots */}
          {announcements.length > 1 && (
            <div className={styles.announcementDots}>
              {announcements.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentAnnIndex(idx)}
                  className={`${styles.announcementDot} ${currentAnnIndex === idx ? styles.announcementDotActive : ''}`}
                  aria-label={`Announcement ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Request Aid Section ── */}
      <section className={styles.causesSection}>
        <div className={styles.causesHeader}>
          <div className={styles.headerInfo}>
            <div className={styles.aboutLabel}>
              <span>Featured Aid Requests</span>
              <div className={styles.line}></div>
            </div>
            <h2 className={styles.aboutTitle}>Aid The Community By<br/>Responding To Recent Requests</h2>
          </div>
        </div>

        <div className={styles.causesGrid}>
          {aidLoading ? (
            <p style={{ textAlign: 'center', color: '#999', gridColumn: '1 / -1' }}>Loading aid requests…</p>
          ) : dailyAidRequests.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', gridColumn: '1 / -1' }}>No aid requests available at the moment.</p>
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
            <span>Why It Matters</span>
            <div className={styles.line}></div>
          </div>
          <h2 className={styles.testimonialMainTitle}>Get Involved With The Almanza Dos Community</h2>
        </div>

        <div className={styles.testimonialCarousel}>
          <button className={styles.carouselArrow + ' ' + styles.left} onClick={prevTestimonial}>❮</button>

          <div className={styles.testimonialContent} key={currentIndex}>
            <div className={styles.testimonialIconBadge}>
              {testimonials[currentIndex].icon}
            </div>
            <h3 className={styles.testimonialName}>{testimonials[currentIndex].title}</h3>
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
            <h2 className={styles.aboutTitle}>We Encourage You To Participate<br/>In Our Active Events</h2>
          </div>
        </div>

        <div className={styles.causesGrid}>
          {eventsLoading ? (
            <p style={{ textAlign: 'center', color: '#999', gridColumn: '1 / -1' }}>Loading events…</p>
          ) : dailyEvents.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', gridColumn: '1 / -1' }}>No upcoming events at the moment.</p>
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
                    isJoined={currentUserJoined(ev)}
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
