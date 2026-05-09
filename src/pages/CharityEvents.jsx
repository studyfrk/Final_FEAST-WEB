import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase'; 
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Header from '../components/header';
import Card from '../components/card';
import Footer from '../components/footer';
import '../components/home.css';

const CharityEvents = () => {
  // UI States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Data States
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState([]);

  // User Search States (New for Co-Organiser requirements)
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCoOrganisers, setSelectedCoOrganisers] = useState([]);

  // Form Data - Goal removed, location synced with mobile
  const [formData, setFormData] = useState({ 
    title: '', 
    location: 'BF Almanza, Almanza Dos', 
    date: '', 
    startTime: '', 
    endTime: '', 
    description: '', 
    category: 'Health'
  });

  // Sync with mobile options
  const categories = ["Health", "Disaster Management", "Community Support", "Education", "Environment", "Feeding"];
  const locations = ["BF Almanza, Almanza Dos", "Great Plains, Almanza Dos", "Almanza Dos Hall", "Other"];

  // Fetch Approved Events (matching admin approval status)
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "charity_events"), 
      where("status", "==", "Approved"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Search Users logic for Co-Organisers
  useEffect(() => {
    const fetchUsers = async () => {
      if (userSearch.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      const usersRef = collection(db, "users");
      // Search by firstName (Case sensitive search pattern)
      const q = query(
        usersRef, 
        where("firstName", ">=", userSearch), 
        where("firstName", "<=", userSearch + "\uf8ff")
      );
      const snap = await getDocs(q);
      setSearchResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    const delayDebounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(delayDebounce);
  }, [userSearch]);

  const addCoOrganiser = (user) => {
    if (!selectedCoOrganisers.find(u => u.id === user.id)) {
      setSelectedCoOrganisers([...selectedCoOrganisers, user]);
    }
    setUserSearch('');
    setSearchResults([]);
  };

  const removeCoOrganiser = (id) => {
    setSelectedCoOrganisers(selectedCoOrganisers.filter(u => u.id !== id));
  };

  // Carousel Logic for Detail View
  useEffect(() => {
    let timer;
    if (selectedEvent && selectedEvent.imageUrls?.length > 1) {
      timer = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % selectedEvent.imageUrls.length);
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [selectedEvent]);

  useEffect(() => {
    if (!selectedEvent) setCurrentImageIndex(0);
  }, [selectedEvent]);

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImages(prev => [...prev, ...newFiles]);
    }
  };

  const removeSelectedImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (selectedCoOrganisers.length === 0) {
      alert("Please select at least 1 co-organiser from the search results.");
      return;
    }

    setIsSubmitting(true);
    try {
      const imageUrls = [];
      for (const image of images) {
        const storageRef = ref(storage, `charity_events/${Date.now()}_${image.name}`);
        await uploadBytes(storageRef, image);
        const url = await getDownloadURL(storageRef);
        imageUrls.push(url);
      }

      await addDoc(collection(db, "charity_events"), {
        ...formData,
        coOrganisers: selectedCoOrganisers.map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}` })),
        imageUrls: imageUrls, 
        status: 'Unread', 
        createdAt: serverTimestamp(),
      });

      alert("Charity Event submitted for approval!");
      setFormData({ title: '', location: 'BF Almanza, Almanza Dos', date: '', startTime: '', endTime: '', description: '', category: 'Health' });
      setSelectedCoOrganisers([]);
      setImages([]);
      setShowCreateModal(false);
    } catch (error) {
      console.error(error);
      alert("Failed to submit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFilter = (cat) => {
    setActiveFilters(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const filteredEvents = activeFilters.length === 0 
    ? events 
    : events.filter(ev => activeFilters.includes(ev.category));

  return (
    <div className="home-container">
      <Header />
      
      <section className="causes-section">
        <div className="causes-header">
          <div className="header-info">
            <div className="about-label">
              <span>Charity Events</span>
              <div className="line"></div>
            </div>
            <h2 className="about-title">Participate Or Create Your Own Events!</h2>
          </div>
          <button className="read-more-btn" onClick={() => setShowCreateModal(true)}>
            + Create Event
          </button>
        </div>

        {/* Filter Bar */}
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

        <div className="causes-grid">
          {loading ? (
            <p>Loading...</p>
          ) : filteredEvents.map(ev => (
            <div key={ev.id} className="aid-card-wrapper" onClick={() => setSelectedEvent(ev)}>
              <Card 
                category={ev.category}
                title={ev.title} 
                description={(ev.description || ev.desc || '').substring(0, 80) + "..."}
                image={ev.imageUrls?.[0] || 'https://placehold.co/300'}
                hideProgress={true} // Goal is removed, so we hide progress bars
              />
            </div>
          ))}
        </div>
      </section>

      {/* --- CREATE MODAL --- */}
      {showCreateModal && (
        <div className="content-modal-overlay">
          <div className="content-modal">
            <div className="modal-header">
              <h3>New Charity Event</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateEvent} className="modal-form-layout">
                <div className="item-field-container">
                  <label className="item-label">Event Title</label>
                  <input type="text" placeholder="e.g. Community Clean-up Drive" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                
                <div className="form-row">
                  <div className="item-field-container">
                    <label className="item-label">Category</label>
                    <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="item-field-container">
                    <label className="item-label">Location</label>
                    <select required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>
                      {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                  </div>
                </div>

                {/* --- CO-ORGANISER SEARCH SECTION --- */}
                <div className="item-field-container">
                  <label className="item-label">Add Co-Organisers (Required)</label>
                  <input 
                    type="text" 
                    placeholder="Search username" 
                    value={userSearch} 
                    onChange={e => setUserSearch(e.target.value)} 
                  />
                  {searchResults.length > 0 && (
                    <div className="search-results-dropdown" style={{ border: '1px solid #ddd', borderRadius: '8px', marginTop: '5px', maxHeight: '150px', overflowY: 'auto', background: 'white', position: 'relative', zIndex: 100 }}>
                      {searchResults.map(user => (
                        <div key={user.id} onClick={() => addCoOrganiser(user)} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' }}>
                          {user.firstName} {user.lastName}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px' }}>
                    {selectedCoOrganisers.map(u => (
                      <span key={u.id} style={{ background: '#2196F3', color: 'white', padding: '5px 12px', borderRadius: '15px', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                        {u.firstName} {u.lastName}
                        <button type="button" onClick={() => removeCoOrganiser(u.id)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '8px', fontWeight: 'bold' }}>×</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                    <div className="item-field-container">
                        <label className="item-label">Event Date</label>
                        <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                </div>

                <div className="form-row">
                    <div className="item-field-container">
                        <label className="item-label">Start Time</label>
                        <input type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                    </div>
                    <div className="item-field-container">
                        <label className="item-label">End Time</label>
                        <input type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                    </div>
                </div>

                <div className="item-field-container">
                  <label className="item-label">Description</label>
                  <textarea required placeholder="Describe the charity activity..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>

                <div className="file-upload-fieldset">
                  <span className="item-label">EVENT BANNER / PICTURES</span>
                  <div className="file-input-wrapper">
                    <label className="custom-browse-btn">
                      Browse...
                      <input type="file" multiple accept="image/*" hidden onChange={handleFileChange} />
                    </label>
                    <span className="file-name-display">{images.length > 0 ? `${images.length} files selected` : "No file chosen"}</span>
                  </div>
                  {images.length > 0 && (
                    <div className="thumbnail-grid">
                      {images.map((file, index) => (
                        <div key={index} className="thumbnail-container">
                          <img src={URL.createObjectURL(file)} alt="preview" className="thumbnail-img" />
                          <button type="button" className="remove-thumb-btn" onClick={() => removeSelectedImage(index)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button type="submit" className="submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Posting..." : "Post Event"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- DETAIL MODAL --- */}
      {selectedEvent && (
        <div className="content-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="content-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Event Details</h3>
              <button className="close-btn" onClick={() => setSelectedEvent(null)}>×</button>
            </div>

            <div className="modal-body" style={{ padding: 0 }}>
              {/* Carousel */}
              {selectedEvent.imageUrls?.length > 0 ? (
                <div className="carousel-container" style={{ width: '100%', height: '280px', position: 'relative', backgroundColor: '#000' }}>
                  <img 
                    src={selectedEvent.imageUrls[currentImageIndex]} 
                    alt="Event Slide" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.4s ease' }}
                  />
                  {selectedEvent.imageUrls.length > 1 && (
                    <>
                      <button 
                        onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? selectedEvent.imageUrls.length - 1 : prev - 1))}
                        style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', fontSize: '20px', zIndex: 10 }}
                      >‹</button>
                      <button 
                        onClick={() => setCurrentImageIndex((prev) => (prev + 1) % selectedEvent.imageUrls.length)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', fontSize: '20px', zIndex: 10 }}
                      >›</button>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ width: '100%', height: '150px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>No Images Available</div>
              )}

              <div className="modal-form-layout" style={{ padding: '25px 20px' }}>
                <div className="item-field-container">
                  <span className="item-label">Event Name</span>
                  <div className="modal-data-field">{selectedEvent.title}</div>
                </div>

                <div className="form-row">
                  <div className="item-field-container">
                    <span className="item-label">Category</span>
                    <div className="modal-data-field">{selectedEvent.category}</div>
                  </div>
                  <div className="item-field-container">
                    <span className="item-label">Co-Organisers</span>
                    <div className="modal-data-field">
                      {selectedEvent.coOrganisers?.map(u => u.name).join(', ') || 'FEAST Team'}
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="item-field-container">
                    <span className="item-label">Location</span>
                    <div className="modal-data-field">{selectedEvent.location}</div>
                  </div>
                  <div className="item-field-container">
                    <span className="item-label">Event Date</span>
                    <div className="modal-data-field">
                      {selectedEvent.date?.toDate 
                        ? selectedEvent.date.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                        : (selectedEvent.startTime?.toDate
                          ? selectedEvent.startTime.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                          : selectedEvent.date)}
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="item-field-container">
                    <span className="item-label">Start Time</span>
                    <div className="modal-data-field">
                      {selectedEvent.startTime?.toDate
                        ? selectedEvent.startTime.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                        : selectedEvent.startTime}
                    </div>
                  </div>
                  <div className="item-field-container">
                    <span className="item-label">End Time</span>
                    <div className="modal-data-field">
                      {selectedEvent.endTime?.toDate
                        ? selectedEvent.endTime.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                        : selectedEvent.endTime}
                    </div>
                  </div>
                </div>

                <div className="item-field-container">
                  <span className="item-label">Description</span>
                  <div className="modal-data-field">{selectedEvent.description || selectedEvent.desc}</div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '20px', borderTop: '1px solid #eee', display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button 
                className="submit-btn" 
                onClick={() => alert("Joining as volunteer...")}
                style={{ margin: 0, flex: 1, padding: '12px 20px', backgroundColor: '#4CAF50', fontSize: '14px' }}
              >
                JOIN AS VOLUNTEER
              </button>
              <button 
                className="submit-btn" 
                onClick={() => alert("Redirecting to Donation Page...")}
                style={{ margin: 0, flex: 1, padding: '12px 20px', backgroundColor: '#2196F3', fontSize: '14px' }}
              >
                DONATE FUNDS
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default CharityEvents;