import React, { useState } from 'react';
import Header from '../components/header';
import Card from '../components/card';
import Footer from '../components/footer';
import '../components/home.css'; 

const CharityEvents = () => {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [events, setEvents] = useState([
    { 
      id: 2, 
      category: "Disaster Management",
      title: "Flood Relief Project",
      location: "BF Almanza, Almanza Dos",
      date: "2026-02-28",
      startTime: "09:00",
      endTime: "17:00",
      description: "Join us as we implement the F.E.A.S.T. system to provide nutritious food access to displaced families.",
      raised: "1,200",
      goal: "5,000",
      percentage: "24",
      image: 'event-image.jpg'
    }
  ]);

  const handleCreateEvent = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const file = formData.get('image');
    const imageUrl = file && file.size > 0 ? URL.createObjectURL(file) : 'default-event.jpg';

    const newEvent = {
      id: Date.now(),
      category: "Community Support", 
      title: formData.get('title'),
      location: formData.get('location'),
      date: formData.get('date'),
      startTime: formData.get('startTime'),
      endTime: formData.get('endTime'),
      description: formData.get('description'),
      raised: "0",
      goal: "10,000", 
      percentage: "0",
      image: imageUrl
    };

    setEvents([newEvent, ...events]); 
    setShowCreate(false);
  };

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
            <h2 className="about-title">Participate In Events Or Create Your Own!</h2>
          </div>
          <button className="read-more-btn" onClick={() => setShowCreate(true)}>
            + Create Event
          </button>
        </div>

        <div className="causes-grid">
          {events.map(event => (
            <div key={event.id} className="aid-card-wrapper" onClick={() => setSelectedEvent(event)}>
              <Card 
                category={event.category}
                title={event.title}
                description={event.description.substring(0, 60) + "..."}
                raised={`₱${event.raised}`}
                goal={`₱${event.goal}`}
                percentage={event.percentage}
                image={event.image}
              />
            </div>
          ))}
        </div>
      </section>

      {/* --- VIEW MODAL --- */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content large-view" onClick={e => e.stopPropagation()}>
            <div className="modal-hero" style={{ 
              backgroundImage: `url(${selectedEvent.image})`, 
              backgroundSize: 'cover', 
              backgroundPosition: 'center',
              backgroundColor: '#2196F3' 
            }}>
              <button className="close-btn" onClick={() => setSelectedEvent(null)}>✕</button>
            </div>
            <div className="detail-card event-blue">
              <h3>{selectedEvent.title}</h3>
              <div className="meta-info" style={{ marginTop: '10px' }}>
                <p>📍 {selectedEvent.location}</p>
                <p>⌛ {selectedEvent.startTime} - {selectedEvent.endTime} ({selectedEvent.date})</p>
              </div>
              <p className="description-text" style={{ marginTop: '10px' }}>{selectedEvent.description}</p>
            </div>
            <div className="modal-footer" style={{ padding: '15px' }}>
              <button className="modal-action-btn donate-items-btn" style={{ width: '100%' }}>JOIN US AS VOLUNTEER</button>
            </div>
          </div>
        </div>
      )}

      {/* --- CREATE MODAL --- */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          {/* Reduced padding from 30px/40px to 20px */}
          <div className="modal-content create-form" style={{ padding: '20px' }} onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowCreate(false)}>✕</button>
            <h2 style={{ marginBottom: '10px' }}>Create New Charity Event</h2>
            
            {/* Reduced gap and marginTop */}
            <form onSubmit={handleCreateEvent} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <input name="title" type="text" placeholder="Event Name" required style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd' }} />
              <input name="location" type="text" placeholder="Location" required style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '0.75rem', color: '#666' }}>Date</label>
                <input name="date" type="date" required style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', width: '100%' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '0.75rem', color: '#666' }}>From</label>
                <input name="startTime" type="time" required style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', width: '100%' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '0.75rem', color: '#666' }}>To</label>
                <input name="endTime" type="time" required style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', width: '100%' }} />
              </div>

              <textarea name="description" placeholder="Describe the event..." required style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '60px' }}></textarea>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '0.75rem', color: '#666' }}>Event Banner / Picture</label>
                <input name="image" type="file" accept="image/*" required style={{ fontSize: '0.75rem' }} />
              </div>

              <button type="submit" className="modal-action-btn donate-items-btn" style={{ padding: '10px' }}>Post Event</button>
            </form>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default CharityEvents;