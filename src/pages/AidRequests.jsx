import React, { useState } from 'react';
import Header from '../components/header';
import Card from '../components/card';
import Footer from '../components/footer';
import '../components/home.css';

const AidRequests = () => {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);

  const categories = ["Health", "Food", "Education", "Disaster", "Financial"];
  
  // Initial data with Peso signs and goal types
  const [requests, setRequests] = useState([
    { 
      id: 1, 
      category: "Health", 
      title: "Surgery Meds & Treatment", 
      description: "Your generous contribution can provide life-saving surgery and medication.",
      location: "DBP Village, Almanza Dos",
      raised: "1,000", goal: "5,000", percentage: "20",
      goalType: "money",
      image: 'meds-bg.jpg'
    },
    { 
      id: 2, 
      category: "Food", 
      title: "Community Pantry Support", 
      description: "Help us restock the local pantry for displaced families.",
      location: "BF Almanza, Almanza Dos",
      raised: "50", goal: "200", percentage: "25",
      goalType: "items",
      image: 'pantry.jpg'
    }
  ]);

  const toggleFilter = (cat) => {
    setActiveFilters(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const filteredRequests = activeFilters.length === 0 
    ? requests 
    : requests.filter(req => activeFilters.includes(req.category));

  const handleCreateRequest = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const file = formData.get('image');
    
    const imageUrl = file ? URL.createObjectURL(file) : null;

    const newReq = {
      id: Date.now(),
      title: formData.get('title'),
      category: formData.get('category'),
      description: formData.get('description'),
      goal: formData.get('goal'),
      goalType: formData.get('goalType'),
      location: formData.get('location'), // <-- CHANGE THIS LINE
      raised: "0", 
      percentage: "0",
      image: imageUrl
    };

    setRequests([newReq, ...requests]);
    setShowCreate(false);
  };

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
            <h2 className="about-title">Help People With Their Aid Request Or Create Your Own!</h2>
          </div>
          <button className="read-more-btn" onClick={() => setShowCreate(true)}>
            + Create Aid Request
          </button>
        </div>

        <div className="filter-container" style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => toggleFilter(cat)}
              className={activeFilters.includes(cat) ? "filter-btn active" : "filter-btn"}
              style={{
                padding: '10px 20px', borderRadius: '20px', border: '1px solid #2196F3', cursor: 'pointer',
                backgroundColor: activeFilters.includes(cat) ? '#2196F3' : 'transparent',
                color: activeFilters.includes(cat) ? 'white' : '#2196F3', fontWeight: 'bold'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

{/* --- DYNAMIC GRID --- */}
<div className="causes-grid">
  {filteredRequests.map(req => (
    <div key={req.id} className="aid-card-wrapper" onClick={() => setSelectedRequest(req)}>
      <Card 
        category={req.category}
        title={req.title}
        description={req.description.substring(0, 60) + "..."}
        raised={`₱${req.raised}`}
        goal={`₱${req.goal}`}
        percentage={req.percentage}
        image={req.image}
      />
    </div>
  ))}
</div>
      </section>

      {/* --- VIEW MODAL --- */}
      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal-content large-view" onClick={e => e.stopPropagation()}>
            <div className="modal-hero" style={{ 
                backgroundImage: `url(${selectedRequest.image})`, 
                backgroundSize: 'cover',
                backgroundColor: '#ffd700' 
            }}>
              <button className="close-btn" onClick={() => setSelectedRequest(null)}>✕</button>
            </div>
            <div className="detail-card aid-yellow">
              <h3>{selectedRequest.title}</h3>
              <p>🏷️ {selectedRequest.category}</p>
              <p>📍 {selectedRequest.location}</p>
              <p className="description-text" style={{ marginTop: '15px' }}>{selectedRequest.description}</p>
              <h4 style={{marginTop: '10px'}}>
                Goal: {selectedRequest.goalType === 'money' ? '₱' : ''}{selectedRequest.goal} 
                {selectedRequest.goalType === 'items' ? ' items' : ''}
              </h4>
            </div>
            
            <div className="modal-footer" style={{ padding: '20px', display: 'flex', gap: '10px' }}>
  {/* Conditional Buttons based on Category/Goal Type */}
  {selectedRequest.goalType === 'money' || selectedRequest.category === 'Financial' ? (
    <button className="modal-action-btn donate-funds-btn">
      DONATE FUNDS
    </button>
  ) : (
    <button className="modal-action-btn donate-items-btn">
      DONATE ITEMS
    </button>
  )}
</div>
          </div>
        </div>
      )}

      {/* --- CREATE MODAL --- */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content create-form" onClick={e => e.stopPropagation()}>
            <h2>Create New Aid Request</h2>
            <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input name="title" type="text" placeholder="Title" required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
              
              <select name="category" required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <option value="">Select Category</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>

              <input name="location" type="text" placeholder="Location (e.g., Almanza Dos, Las Piñas)" requiredstyle={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />

              <div style={{ display: 'flex', gap: '10px' }}>
                <select name="goalType" required style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}>
                  <option value="money">Money (₱)</option>
                  <option value="items">Items (Quantity)</option>
                </select>
                <input name="goal" type="number" placeholder="Goal Amount/Qty" required style={{ flex: 2, padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
              </div>

              <textarea name="description" placeholder="Describe the need..." required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '80px' }}></textarea>
              
              <label style={{ fontSize: '0.9rem', color: '#666' }}>Upload Proof/Picture (Required)</label>
              <input name="image" type="file" accept="image/*" required style={{ padding: '10px' }} />

              <button className="close-btn" onClick={() => setShowCreate(false)}>✕</button>

              <button type="submit" className="read-more-btn" style={{ backgroundColor: '#2196F3', color: 'white', padding: '15px', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>Post Request</button>
            </form>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default AidRequests;