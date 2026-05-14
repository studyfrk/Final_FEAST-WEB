import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase'; 
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Header from '../components/header';
import Card from '../components/card';
import Footer from '../components/footer';
import styles from '../components/requests_and_events.module.css';

const CharityEvents = () => {
  // UI States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState(''); 
  
  // Data States
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState([]);

  // User Search States (New for Co-Organiser requirements)
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCoOrganisers, setSelectedCoOrganisers] = useState([]);

  // Form Data
  const [formData, setFormData] = useState({ 
    title: '', 
    location: 'BF Almanza, Almanza Dos', 
    date: '', 
    startTime: '', 
    endTime: '', 
    description: '', 
    category: 'Health'
  });

  const categories = ["Health", "Disaster Management", "Community Support", "Education", "Environment", "Feeding"];
  const locations = ["BF Almanza, Almanza Dos", "Great Plains, Almanza Dos", "Almanza Dos Hall", "Other"];

  // Fetch Approved Events
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

  // Co-Organiser Search Logic
  useEffect(() => {
    const fetchUsers = async () => {
      if (userSearch.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      const usersRef = collection(db, "users");
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

  // Carousel Logic
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
      alert("Please select at least 1 co-organiser.");
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
        imageUrls, 
        status: 'Unread', 
        createdAt: serverTimestamp(),
      });

      alert("Event submitted!");
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

  // FIXED: Added safety check for ev.title
  const filteredEvents = events.filter(ev => {
    const title = ev.title || '';
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeFilters.length === 0 || activeFilters.includes(ev.category);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className={styles.homeContainer}>
      <Header />
      
      <section className={styles.causesSection}>
        <div className={styles.causesHeader}>
          <div className={styles.headerInfo}>
            <div className={styles.aboutLabel}>
              <span>Ongoing Charity Events</span>
              <div className={styles.line}></div>
            </div>
            <h2 className={styles.aboutTitle}>Participate In Events Or Create Your Own!</h2>
          </div>
          <button className={styles.readMoreBtn} onClick={() => setShowCreateModal(true)}>
            + Create Event
          </button>
        </div>

        <div className={styles.searchContainer} style={{ marginBottom: '20px', width: '100%' }}>
          <input 
            className={styles.searchContainerInput}
            type="text" 
            placeholder="Search events by name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px 20px', 
              borderRadius: '25px', 
              border: '1px solid #ddd', 
              fontSize: '16px',
              outline: 'none'
            }}
          />
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

        <div className={styles.causesGrid}>
          {loading ? (
            <p>Loading...</p>
          ) : filteredEvents.map(ev => (
            <div key={ev.id} className={styles.aidCardWrapper} onClick={() => setSelectedEvent(ev)}>
              <Card 
                category={ev.category}
                title={ev.title} 
                description={ev.description?.substring(0, 80) + "..."}
                image={ev.imageUrls?.[0] || 'https://via.placeholder.com/300'}
                hideProgress={true} 
              />
            </div>
          ))}
        </div>
      </section>

      {/* --- CREATE MODAL --- */}
      {showCreateModal && (
        <div className={styles.contentModalOverlay}>
          <div className={styles.contentModal}>
            <div className={styles.modalHeader}>
              <h3>New Charity Event</h3>
              <button className={styles.closeBtn} onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleCreateEvent} className={styles.modalFormLayout}>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Event Title</label>
                  <input type="text" placeholder="e.g. Community Clean-up Drive" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Category</label>
                    <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Location</label>
                    <select required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>
                      {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                  </div>
                </div>

                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Add Co-Organisers (Required)</label>
                  <input 
                    type="text" 
                    placeholder="Search residents by name..." 
                    value={userSearch} 
                    onChange={e => setUserSearch(e.target.value)} 
                  />
                  {searchResults.length > 0 && (
                    <div className={styles.searchResultsDropdown}>
                      {searchResults.map(user => (
                        <div key={user.id} onClick={() => addCoOrganiser(user)} className={styles.suggestionItem}>
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

                <div className={styles.formRow}>
                    <div className={styles.itemFieldContainer}>
                        <label className={styles.itemLabel}>Event Date</label>
                        <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                </div>

                <div className={styles.formRow}>
                    <div className={styles.itemFieldContainer}>
                        <label className={styles.itemLabel}>Start Time</label>
                        <input type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                    </div>
                    <div className={styles.itemFieldContainer}>
                        <label className={styles.itemLabel}>End Time</label>
                        <input type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                    </div>
                </div>

                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Description</label>
                  <textarea required placeholder="Describe the charity activity..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>

                <div className={styles.fileUploadFieldset}>
                  <span className={styles.itemLabel}>EVENT BANNER / PICTURES</span>
                  <div className={styles.fileInputWrapper}>
                    <label className={styles.customBrowseBtn}>
                      Browse...
                      <input type="file" multiple accept="image/*" hidden onChange={handleFileChange} />
                    </label>
                    <span className={styles.fileNameDisplay}>{images.length > 0 ? `${images.length} files selected` : "No file chosen"}</span>
                  </div>
                  {images.length > 0 && (
                    <div className={styles.thumbnailGrid}>
                      {images.map((file, index) => (
                        <div key={index} className={styles.thumbnailContainer}>
                          <img src={URL.createObjectURL(file)} alt="preview" className={styles.thumbnailImg} />
                          <button type="button" className={styles.removeThumbBtn} onClick={() => removeSelectedImage(index)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                  {isSubmitting ? "Posting..." : "Post Event"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- DETAIL MODAL --- */}
      {selectedEvent && (
        <div className={styles.contentModalOverlay} onClick={() => setSelectedEvent(null)}>
          <div className={styles.contentModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Event Details</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedEvent(null)}>×</button>
            </div>

            <div className={styles.modalBody} style={{ padding: 0 }}>
              {selectedEvent.imageUrls?.length > 0 ? (
                <div className={styles.carouselContainer} style={{ width: '100%', height: '280px', position: 'relative', backgroundColor: '#000' }}>
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

              <div className={styles.modalFormLayout} style={{ padding: '25px 20px' }}>
                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Event Name</span>
                  <div className={styles.modalDataField}>{selectedEvent.title}</div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Category</span>
                    <div className={styles.modalDataField}>{selectedEvent.category}</div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Co-Organisers</span>
                    <div className={styles.modalDataField}>
                      {selectedEvent.coOrganisers?.map(u => u.name).join(', ') || 'FEAST Team'}
                    </div>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Location</span>
                    <div className={styles.modalDataField}>{selectedEvent.location}</div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Event Date</span>
                    <div className={styles.modalDataField}>{selectedEvent.date}</div>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Start Time</span>
                    <div className={styles.modalDataField}>
                      {selectedEvent.startTime?.toDate 
                        ? selectedEvent.startTime.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                        : selectedEvent.startTime}
                    </div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>End Time</span>
                    <div className={styles.modalDataField}>
                      {selectedEvent.endTime?.toDate 
                        ? selectedEvent.endTime.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                        : selectedEvent.endTime}
                    </div>
                  </div>
                </div>

                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Description</span>
                  <div className={styles.modalDataField}>{selectedEvent.description || selectedEvent.desc}</div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter} style={{ padding: '20px', borderTop: '1px solid #eee', display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button 
                className={styles.submitBtn} 
                onClick={() => alert("Joining as volunteer...")}
                style={{ margin: 0, flex: 1, padding: '12px 20px', backgroundColor: '#4CAF50', fontSize: '14px' }}
              >
                JOIN AS VOLUNTEER
              </button>
              <button 
                className={styles.submitBtn} 
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