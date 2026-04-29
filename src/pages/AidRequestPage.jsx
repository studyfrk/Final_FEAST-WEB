import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import styles from '../components/AidRequestStyles';
import filterIcon from '../assets/filter-icon.png';

const AidRequestPage = () => {
  const navigate = useNavigate();

  // 1. Data Source
  const allRequests = [
    { id: 1, title: "Medical Assistance", name: "Juan Dela Cruz", category: "Health", amount: "₱5,000" },
    { id: 2, title: "School Supplies", name: "Maria Clara", category: "Education", amount: "₱2,500" },
    { id: 3, title: "Emergency Repair", name: "Regil Kent", category: "Personal", amount: "₱10,000" },
    { id: 4, title: "Surgery Fund", name: "Liza Soberano", category: "Health", amount: "₱50,000" },
  ];

  // 2. State for UI and Filtering
  const [showFilters, setShowFilters] = useState(false);
  const [activeCategories, setActiveCategories] = useState([]); // Array for multi-select
  const [filteredRequests, setFilteredRequests] = useState(allRequests);

  // 3. Multi-select Filter Logic
  const toggleCategory = (category) => {
    let updatedCategories;
    if (activeCategories.includes(category)) {
      // Remove category if already selected
      updatedCategories = activeCategories.filter(c => c !== category);
    } else {
      // Add category
      updatedCategories = [...activeCategories, category];
    }
    
    setActiveCategories(updatedCategories);

    // If no categories selected, show all. Otherwise, filter by the array.
    if (updatedCategories.length === 0) {
      setFilteredRequests(allRequests);
    } else {
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
          {/* Toggle Button */}
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
          
          {/* Animated/Conditional Filter Pills */}
          {showFilters && (
            <div style={styles.pillsContainer}>
              {['Health', 'Education', 'Personal'].map((cat) => {
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
              <div style={styles.cardContent}>
                <h3 style={styles.cardTitle}>{request.title}</h3>
                <p style={styles.cardDetail}>Requested by: {request.name}</p>
                <p style={styles.cardDetail}>Goal: {request.amount}</p>
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