import React, { useState } from 'react';
import Header from '../components/header';
import Card from '../components/card';
import Footer from '../components/footer';
import '../components/home.css';

const AidRequests = () => {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  return (
    <div className="home-container">
      <Header />
      <section className="causes-section">
        <div className="causes-header">
          <div className="header-info">
            <div className="about-label">
              <span>Aid Requests</span>
              <div className="line"></div>
            </div>
            <h2 className="about-title">Find The Popular Request And Donate Them</h2>
          </div>
          <button className="read-more-btn" onClick={() => setShowCreate(true)}>
            + Create Aid Request
          </button>
        </div>

        <div className="causes-grid">
          <div onClick={() => setSelectedRequest({ 
            id: 1, 
            title: "Surgery Meds & Treatment",
            description: "Your generous contribution can provide life-saving surgery and medication for residents in need."
          })}>
            <Card 
              category="Health (Support & Supply)"
              title="Surgery Meds & Treatment"
              description="Your generous contribution can provide life-saving surgery..."
              raised="1000"
              goal="5000"
              percentage="20"
            />
          </div>
        </div>
      </section>

      {/* --- VIEW MODAL --- */}
      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal-content large-view" onClick={e => e.stopPropagation()}>
            <div className="modal-hero" style={{ backgroundImage: `url('meds-bg.jpg')`, backgroundColor: '#ffd700' }}>
              <button className="close-btn" onClick={() => setSelectedRequest(null)}>✕</button>
            </div>
            <div className="detail-card aid-yellow">
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>⚠️</div>
              <h3>{selectedRequest.title}</h3>
              <p>📍 DBP Village, Almanza Dos</p>
              <p>⌛ Time Remaining: 7 Days Left</p>
              <p className="description-text" style={{ marginTop: '15px', lineHeight: '1.6' }}>
                {selectedRequest.description}
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '15px', padding: '0 25px 40px 25px' }}>
              <button style={{ flex: 1, height: '55px', backgroundColor: '#eee', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>GIVE ITEMS</button>
              <button style={{ flex: 1, height: '55px', backgroundColor: '#ffd700', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>DONATE FUNDS</button>
            </div>
          </div>
        </div>
      )}

      {/* --- CREATE MODAL --- */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content create-form" onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Create New Aid Request</h2>
              <button className="close-btn" onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input type="text" placeholder="Title" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
              <textarea placeholder="Describe the need..." style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '100px' }}></textarea>
              <button type="submit" className="read-more-btn" style={{ backgroundColor: '#2196F3', color: '#333', padding: '15px', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Post Request</button>
            </form>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default AidRequests;