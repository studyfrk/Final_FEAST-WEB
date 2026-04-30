import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import styles from '../components/AidRequestStyles';
import filterIcon from '../assets/filter-icon.png';

const AidRequestPage = () => {
  const navigate = useNavigate();

  // 1. Static Data Source
  const staticRequests = [
    { id: 1, title: "Medical Assistance", name: "Juan Dela Cruz", category: "Health", amount: "₱5,000" },
    { id: 2, title: "School Supplies", name: "Maria Clara", category: "Education", amount: "₱2,500" },
    { id: 3, title: "Emergency Repair", name: "Regil Kent", category: "Personal", amount: "₱10,000" },
    { id: 4, title: "Surgery Fund", name: "Liza Soberano", category: "Health", amount: "₱50,000" },
  ];

  // 2. State for UI and Combined Data
  const [showFilters, setShowFilters] = useState(false);
  const [activeCategories, setActiveCategories] = useState([]);
  const [allRequests, setAllRequests] = useState([]); // Combined static + localStorage
  const [filteredRequests, setFilteredRequests] = useState([]);

  // 3. Load and Merge Data on Mount
  useEffect(() => {
    // Get requests from localStorage (saved by CreateRequestPage)
    const savedRequests = JSON.parse(localStorage.getItem('aidRequests')) || [];
    
    // Merge: Saved requests appear first (newest), followed by static data
    const combined = [...savedRequests, ...staticRequests];
    
    setAllRequests(combined);
    setFilteredRequests(combined); // Initialize display with all data
  }, []);

  // 4. Multi-select Filter Logic
  const toggleCategory = (category) => {
    let updatedCategories;
    if (activeCategories.includes(category)) {
      updatedCategories = activeCategories.filter(c => c !== category);
    } else {
      updatedCategories = [...activeCategories, category];
    }
    
    setActiveCategories(updatedCategories);

    if (updatedCategories.length === 0) {
      setFilteredRequests(allRequests);
    } else {
      // Use "allRequests" which now includes the new items
      const filtered = allRequests.filter(req => updatedCategories.includes(req.category));
      setFilteredRequests(filtered);
    }
  };

  const handleCreateRequest = () => {
    navigate('/create-request');
  };

  return (
    <div style={styles.pageWrapper}>
      <Navbar />
      
      <main style={styles.contentContainer}>
        <div style={styles.filterRow}>
          <button 
            style={{
              ...styles.filterIconButton,
              backgroundColor: showFilters ? '#2D5A27' : '#FFF' 
            }} 
            onClick={() => setShowFilters(!showFilters)}
          >
            <img 
              src={filterIcon} 
              alt="filter" 
              style={{ 
                width: '20px', 
                filter: showFilters ? 'invert(1)' : 'none' 
              }} 
            />
          </button>
          
          {showFilters && (
            <div style={styles.pillsContainer}>
              {['Health', 'Education', 'Personal', 'Medical'].map((cat) => {
                const isActive = activeCategories.includes(cat);
                return (
                  <div 
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    style={{
                      ...styles.categoryPill,
                      backgroundColor: isActive ? '#2D5A27' : '#FFF',
                      color: isActive ? '#FFF' : '#000',
                    }}
                  >
                    {cat.toUpperCase()} 
                    <span style={{
                      ...styles.pillCount, 
                      backgroundColor: isActive ? '#FFF' : '#D4E4BC',
                      color: '#2D5A27'
                    }}>
                      {allRequests.filter(r => r.category === cat).length}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={styles.requestGrid}>
          {filteredRequests.map((request) => (
            <div key={request.id} style={styles.requestCard}>
              {/* Optional: Render image if it exists in the new request */}
              {request.imagePreview && (
                <img src={request.imagePreview} alt="Thumbnail" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '15px 15px 0 0' }} />
              )}
              <div style={styles.cardContent}>
                <h3 style={styles.cardTitle}>{request.title}</h3>
                <p style={styles.cardDetail}>Requested by: {request.name}</p>
                <p style={styles.cardDetail}>Goal: {request.targetDonation || request.amount}</p>
                <span style={styles.cardTag}>{request.category}</span>
              </div>
            </div>
          ))}
        </div>

        <button style={styles.createButton} onClick={handleCreateRequest}>+</button>
      </main>
      <Footer />
    </div>
  );
};

export default AidRequestPage;