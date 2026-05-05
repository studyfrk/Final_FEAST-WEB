import React, { useState } from 'react';
import Header from '../components/header';
import Card from '../components/card';
import Footer from '../components/footer';
import '../components/home.css'; 

const CharityEvents = () => {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  return (
    <div className="home-container">
      <Header />
      <section className="causes-section">
        <div className="causes-header">
          <div className="header-info">
            <div className="about-label">
              <span>Latest Ongoing Charity Events</span>
              <div className="line"></div>
            </div>
            <h2 className="about-title">Participate In Our Active Events</h2>
          </div>
          <button className="read-more-btn" onClick={() => setShowCreate(true)}>
            + Create Event
          </button>
        </div>

        <div className="causes-grid">
          <div onClick={() => setSelectedEvent({ 
            id: 2, 
            title: "Flood Relief Project",
            description: "Join us as we implement the F.E.A.S.T. system to provide nutritious food access to displaced families in BF Almanza."
          })}>
            <Card 
              category="Disaster Management"
              title="Flood Relief Project"
              description="Join us as we implement the F.E.A.S.T. system..."
              raised="1200"
              goal="5000"
              percentage="24"
            />
          </div>
        </div>
      </section>

      {/* --- VIEW MODAL --- */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content large-view" onClick={e => e.stopPropagation()}>
            <div className="modal-hero" style={{ backgroundImage: `url('event-image.jpg')`, backgroundColor: '#2196F3' }}>
              <button className="close-btn" onClick={() => setSelectedEvent(null)}>✕</button>
            </div>
            <div className="detail-card event-blue">
              <div className="header-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3>{selectedEvent.title}</h3>
                <span style={{ fontSize: '1.5rem' }}>📢</span>
              </div>
              <div className="meta-info" style={{ marginTop: '15px' }}>
                <p>📍 BF Almanza, Almanza Dos</p>
                <p>⌛ 9:00 AM - 5:00 PM (Feb 28, 2026)</p>
              </div>
              <p className="description-text" style={{ marginTop: '20px', lineHeight: '1.6' }}>
                {selectedEvent.description}
              </p>
            </div>
            <div className="modal-footer">
              <button className="join-btn" style={{ backgroundColor: '#2196F3', color: 'white', width: '100%', border: 'none', borderRadius: '12px', height: '55px', fontWeight: 'bold', cursor: 'pointer' }}>
                JOIN US AS VOLUNTEER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CREATE MODAL --- */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content create-form" onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Create New Charity Event</h2>
              <button className="close-btn" onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <form className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <label>Event Name</label>
              <input type="text" placeholder="e.g., Flood Relief Project" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
              <label>Location</label>
              <input type="text" placeholder="e.g., BF Almanza, Almanza Dos" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
              <label>Description</label>
              <textarea placeholder="Describe the event..." style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '100px' }}></textarea>
              <button type="submit" className="join-btn" style={{ backgroundColor: '#2196F3', color: 'white', padding: '15px', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Post Event</button>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default CharityEvents;