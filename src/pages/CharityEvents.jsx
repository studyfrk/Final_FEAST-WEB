import React, { useState, useEffect } from 'react';
import { db, storage, auth } from '../firebase';
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp, getDocs, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Header from '../components/header';
import Card from '../components/card';
import Footer from '../components/footer';
import styles from '../components/requests_and_events.module.css';

const CharityEvents = () => {
  // UI States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent]     = useState(null);
  const [activeFilters, setActiveFilters]     = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [searchTerm, setSearchTerm]           = useState('');
  const [photoError, setPhotoError]           = useState(false);

  // Data States
  const [events, setEvents]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages]           = useState([]);

  // Co-Organiser Search States
  const [userSearch, setUserSearch]               = useState('');
  const [searchResults, setSearchResults]         = useState([]);
  const [selectedCoOrganisers, setSelectedCoOrganisers] = useState([]);
  const [coOrgError, setCoOrgError]               = useState(false);

  // Today's date string (YYYY-MM-DD) for min date validation
  const todayStr = new Date().toISOString().split('T')[0];

  // Form Data
  const [formData, setFormData] = useState({
    title:            '',
    location:         '',
    date:             '',
    startTime:        '',
    endTime:          '',
    description:      '',
    category:         'Health',
    participantLimit: '', // Optional capacity configuration field
  });

  const categories = ['Health', 'Disaster Management', 'Community Support', 'Education', 'Environment', 'Feeding'];

  // ── Fetch Approved Events ────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'charity_events'),
      where('status', '==', 'Approved'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Firestore Error:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Sync details modal live if background updates occur to keep participant counters matching
  useEffect(() => {
    if (selectedEvent) {
      const liveMatch = events.find((e) => e.id === selectedEvent.id);
      if (liveMatch) {
        setSelectedEvent(liveMatch);
      }
    }
  }, [events, selectedEvent]);

  // ── Co-Organiser Search (debounced) ──────────────────────────────────────
  useEffect(() => {
    const fetchUsers = async () => {
      const trimmed = userSearch.trim();
      if (trimmed.length < 1) { setSearchResults([]); return; }

      try {
        // Search by firstName prefix
        const firstSnap = await getDocs(query(
          collection(db, 'users'),
          where('firstName', '>=', trimmed),
          where('firstName', '<=', trimmed + '\uf8ff')
        ));
        // Search by lastName prefix
        const lastSnap = await getDocs(query(
          collection(db, 'users'),
          where('lastName', '>=', trimmed),
          where('lastName', '<=', trimmed + '\uf8ff')
        ));

        // Merge and deduplicate
        const combined = new Map();
        [...firstSnap.docs, ...lastSnap.docs].forEach((d) => combined.set(d.id, { id: d.id, ...d.data() }));

        // Exclude already-selected co-organisers
        const selectedIds = new Set(selectedCoOrganisers.map((u) => u.id));
        setSearchResults([...combined.values()].filter((u) => !selectedIds.has(u.id)));
      } catch (err) {
        console.error('User search error:', err);
      }
    };

    const delay = setTimeout(fetchUsers, 150);
    return () => clearTimeout(delay);
  }, [userSearch, selectedCoOrganisers]);

  const addCoOrganiser = (user) => {
    setSelectedCoOrganisers((prev) => [...prev, user]);
    setUserSearch('');
    setSearchResults([]);
    setCoOrgError(false);
  };

  const removeCoOrganiser = (id) => {
    setSelectedCoOrganisers((prev) => prev.filter((u) => u.id !== id));
  };

  // ── Carousel auto-advance ────────────────────────────────────────────────
  useEffect(() => {
    let timer;
    if (selectedEvent?.imageUrls?.length > 1) {
      timer = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % selectedEvent.imageUrls.length);
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [selectedEvent]);

  useEffect(() => {
    if (!selectedEvent) setCurrentImageIndex(0);
  }, [selectedEvent]);

  // ── File handling ────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    if (e.target.files) {
      setImages((prev) => [...prev, ...Array.from(e.target.files)]);
      setPhotoError(false);
    }
  };

  const removeSelectedImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Open Create Modal (reset state) ─────────────────────────────────────
  const openCreateModal = () => {
    setFormData({ title: '', location: '', date: '', startTime: '', endTime: '', description: '', category: 'Health', participantLimit: '' });
    setSelectedCoOrganisers([]);
    setImages([]);
    setUserSearch('');
    setSearchResults([]);
    setPhotoError(false);
    setCoOrgError(false);
    setShowCreateModal(true);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleCreateEvent = async (e) => {
    e.preventDefault();

    let hasError = false;

    if (images.length === 0) {
      setPhotoError(true);
      hasError = true;
    }
    if (selectedCoOrganisers.length === 0) {
      setCoOrgError(true);
      hasError = true;
    }
    if (hasError) return;

    setIsSubmitting(true);
    try {
      const currentUser = auth.currentUser;
      let organizerName = "Main Organizer";

      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const uData = userDoc.data();
            if (uData.firstName && uData.lastName) {
              organizerName = `${uData.firstName} ${uData.lastName}`;
            } else {
              organizerName = uData.fullName || currentUser.displayName || currentUser.email.split('@')[0];
            }
          } else {
            organizerName = currentUser.displayName || currentUser.email.split('@')[0];
          }
        } catch (profileErr) {
          console.error("Profile name fetch failed: ", profileErr);
        }
      }

      const imageUrls = [];
      for (const image of images) {
        const storageRef = ref(storage, `charity_events/${Date.now()}_${image.name}`);
        await uploadBytes(storageRef, image);
        imageUrls.push(await getDownloadURL(storageRef));
      }

      // Convert optional input limits cleanly to numerical storage bounds
      const parsedLimit = formData.participantLimit.trim() === '' ? null : parseInt(formData.participantLimit, 10);

      await addDoc(collection(db, 'charity_events'), {
        ...formData,
        participantLimit: parsedLimit,
        organizerId: currentUser ? currentUser.uid : null,
        organizerName: organizerName,
        coOrganisers: selectedCoOrganisers.map((u) => ({
          id:   u.id,
          name: `${u.firstName} ${u.lastName}`,
          email: u.email ?? '',
        })),
        imageUrls,
        anticipatedParticipants: [],
        status:    'Unread',
        createdAt: serverTimestamp(),
      });

      alert('Event submitted! It will appear once approved.');
      setShowCreateModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Volunteer Join Handler ─────────────────────────────────────────────────
  const handleJoinEvent = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert("You must be logged in to participate in this event.");
      return;
    }

    const participantList = selectedEvent.anticipatedParticipants || [];
    
    // 1. Check if user is already locked in
    if (participantList.includes(currentUser.uid)) {
      alert("You have already joined this event.");
      return;
    }

    // 2. Validate capacity limit boundaries before confirmation prompt
    if (selectedEvent.participantLimit !== null && selectedEvent.participantLimit !== undefined) {
      if (participantList.length >= selectedEvent.participantLimit) {
        alert("The maximum number of participants for this event has been reached.");
        return;
      }
    }

    // 3. Prompt user for structural commitment confirmation
    const confirmPrompt = window.confirm(
      "Are you sure you want to participate in this event? There will be no backing out."
    );

    if (!confirmPrompt) return;

    try {
      const eventDocRef = doc(db, 'charity_events', selectedEvent.id);
      await updateDoc(eventDocRef, {
        anticipatedParticipants: arrayUnion(currentUser.uid)
      });
      alert("You have successfully registered as a volunteer!");
    } catch (err) {
      console.error("Error joining event: ", err);
      alert("Failed to join event. Please check your network connection.");
    }
  };

  // ── Filters / search ─────────────────────────────────────────────────────
  const toggleFilter = (cat) => {
    setActiveFilters((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const filteredEvents = events.filter((ev) => {
    const matchesSearch   = (ev.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeFilters.length === 0 || activeFilters.includes(ev.category);
    return matchesSearch && matchesCategory;
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatTime = (val) => {
    if (!val) return '—';
    if (val?.toDate) {
      return val.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    // "HH:MM" string → 12-hour format
    const [h, m] = val.split(':').map(Number);
    const ampm  = h >= 12 ? 'PM' : 'AM';
    const hour  = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.homeContainer}>
      <Header />

      <section className={styles.causesSection}>
        {/* Page Header */}
        <div className={styles.causesHeader}>
          <div className={styles.headerInfo}>
            <div className={styles.aboutLabel}>
              <span>Ongoing Charity Events</span>
              <div className={styles.line}></div>
            </div>
            <h2 className={styles.aboutTitle}>Participate In Events Or Create Your Own!</h2>
          </div>
          <button className={styles.readMoreBtn} onClick={openCreateModal}>
            + Create Event
          </button>
        </div>

        {/* Search */}
        <div className={styles.searchContainer}>
          <input
            className={styles.searchContainerInput}
            type="text"
            placeholder="Search events by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Chips */}
        <div className={styles.filterContainer}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleFilter(cat)}
              className={`${styles.filterBtn} ${activeFilters.includes(cat) ? styles.filterBtnActive : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Cards Grid */}
        <div className={styles.causesGrid}>
          {loading ? (
            <p className={styles.emptyState}>Loading events…</p>
          ) : filteredEvents.length === 0 ? (
            <p className={styles.emptyState}>No events found.</p>
          ) : (
            filteredEvents.map((ev) => (
              <div
                key={ev.id}
                className={styles.aidCardWrapper}
                onClick={() => { setSelectedEvent(ev); setCurrentImageIndex(0); }}
              >
                <Card
                  category={ev.category}
                  title={ev.title}
                  description={(ev.description || '').substring(0, 80) + '…'}
                  image={ev.imageUrls?.[0] || 'https://via.placeholder.com/300'}
                  hideProgress={true}
                  customButtonText="Join Now"
                />
              </div>
            ))
          )}
        </div>
      </section>

      {/* ══════════════════════ CREATE MODAL ══════════════════════ */}
      {showCreateModal && (
        <div className={styles.contentModalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>New Charity Event</h3>
              <button className={styles.closeBtn} onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <div className={styles.modalBody}>
              <form
                onSubmit={handleCreateEvent}
                className={styles.modalFormLayout}
                noValidate
              >
                {/* Title */}
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Event Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Community Clean-up Drive"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                {/* Category + Location */}
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Category</label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Almanza Dos Hall"
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                </div>

                {/* Co-Organisers */}
                <div style={{ position: 'relative' }}>
                  <div className={styles.itemFieldContainer} style={coOrgError ? { borderColor: '#e05a5a' } : {}}>
                    <label className={styles.itemLabel} style={coOrgError ? { color: '#e05a5a' } : {}}>
                      Add Co-Organisers (Required)
                    </label>
                    <input
                      type="text"
                      placeholder="Search residents by name…"
                      value={userSearch}
                      onChange={(e) => { setUserSearch(e.target.value); setCoOrgError(false); }}
                      autoComplete="off"
                    />
                    {searchResults.length > 0 && (
                      <div className={styles.searchResultsDropdown}>
                        {searchResults.map((user) => (
                          <div
                            key={user.id}
                            className={styles.suggestionItem}
                            onMouseDown={(e) => e.preventDefault()} // prevent input blur before click
                            onClick={() => addCoOrganiser(user)}
                          >
                            <div>{user.firstName} {user.lastName}</div>
                            <div style={{ fontSize: '12px', color: '#888' }}>{user.email}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {coOrgError && (
                    <span className={styles.photoRequiredHint}>
                      Please add at least one co-organiser.
                    </span>
                  )}
                  {selectedCoOrganisers.length > 0 && (
                    <div className={styles.coOrgTagsRow}>
                      {selectedCoOrganisers.map((u) => (
                        <span key={u.id} className={styles.coOrgTag}>
                          {u.firstName} {u.lastName}{u.email ? ` (${u.email})` : ''}
                          <button
                            type="button"
                            className={styles.coOrgTagRemove}
                            onClick={() => removeCoOrganiser(u.id)}
                          >×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Optional Maximum Participant Limits Field */}
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Limit Number of Participants (Optional)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Leave empty if you do not want to limit participants"
                    value={formData.participantLimit}
                    onChange={(e) => setFormData({ ...formData, participantLimit: e.target.value })}
                  />
                </div>

                {/* Event Date */}
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Event Date</label>
                  <input
                    type="date"
                    required
                    min={todayStr}
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                {/* Start + End Time */}
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Start Time</label>
                    <input
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>End Time</label>
                    <input
                      type="time"
                      required
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Description</label>
                  <textarea
                    required
                    placeholder="Describe the charity activity…"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Photo Upload */}
                <div className={styles.fileUploadFieldset} style={photoError ? { borderColor: '#e05a5a' } : {}}>
                  <span className={styles.itemLabel} style={photoError ? { color: '#e05a5a' } : {}}>
                    EVENT BANNER / PICTURES
                  </span>
                  <div className={styles.fileInputWrapper}>
                    <label className={styles.customBrowseBtn}>
                      Browse…
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        hidden
                        onChange={handleFileChange}
                      />
                    </label>
                    <span className={styles.fileNameDisplay}>
                      {images.length > 0 ? `${images.length} file${images.length > 1 ? 's' : ''} selected` : 'No file chosen'}
                    </span>
                  </div>
                  {images.length > 0 && (
                    <div className={styles.thumbnailGrid}>
                      {images.map((file, index) => (
                        <div key={index} className={styles.thumbnailContainer}>
                          <img
                            src={URL.createObjectURL(file)}
                            alt="preview"
                            className={styles.thumbnailImg}
                          />
                          <button
                            type="button"
                            className={styles.removeThumbBtn}
                            onClick={() => removeSelectedImage(index)}
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {photoError && (
                    <span className={styles.photoRequiredHint}>
                      At least one photo is required.
                    </span>
                  )}
                </div>

                {/* Submit */}
                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                  {isSubmitting ? 'Posting…' : 'Post Event'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ DETAIL MODAL ══════════════════════ */}
      {selectedEvent && (
        <div className={styles.contentModalOverlay} onClick={() => setSelectedEvent(null)}>
          <div className={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={styles.modalHeader}>
              <h3>Event Details</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedEvent(null)}>×</button>
            </div>

            {/* Scrollable Body */}
            <div className={styles.modalBody} style={{ padding: 0 }}>
              {/* Carousel */}
              {selectedEvent.imageUrls?.length > 0 ? (
                <div className={styles.carouselContainer}>
                  <img
                    src={selectedEvent.imageUrls[currentImageIndex]}
                    alt={`Slide ${currentImageIndex + 1}`}
                    className={styles.carouselImg}
                  />
                  {selectedEvent.imageUrls.length > 1 && (
                    <>
                      <button
                        className={`${styles.carouselNav} ${styles.prev}`}
                        onClick={() =>
                          setCurrentImageIndex((prev) =>
                            prev === 0 ? selectedEvent.imageUrls.length - 1 : prev - 1
                          )
                        }
                      >‹</button>
                      <button
                        className={`${styles.carouselNav} ${styles.next}`}
                        onClick={() =>
                          setCurrentImageIndex((prev) => (prev + 1) % selectedEvent.imageUrls.length)
                        }
                      >›</button>
                      <div className={styles.carouselDots}>
                        {selectedEvent.imageUrls.map((_, i) => (
                          <button
                            key={i}
                            className={`${styles.carouselDot} ${i === currentImageIndex ? styles.carouselDotActive : ''}`}
                            onClick={() => setCurrentImageIndex(i)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className={styles.noImagePlaceholder}>No Images Available</div>
              )}

              {/* Details */}
              <div className={styles.modalFormLayout} style={{ padding: '22px 20px' }}>
                {/* Event Name */}
                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Event Name</span>
                  <div className={styles.modalDataField}>{selectedEvent.title}</div>
                </div>

                {/* Organizers Fields */}
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Main Organizer</span>
                    <div className={styles.modalDataField}>
                      {selectedEvent.organizerName || 'Main Organizer'}
                    </div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Anticipated Participants</span>
                    <div className={styles.modalDataField}>
                      {selectedEvent.participantLimit === null || selectedEvent.participantLimit === undefined ? (
                        `${selectedEvent.anticipatedParticipants?.length || 0} registered`
                      ) : (
                        `${selectedEvent.anticipatedParticipants?.length || 0} / ${selectedEvent.participantLimit} slots filled (${Math.max(0, selectedEvent.participantLimit - (selectedEvent.anticipatedParticipants?.length || 0))} left)`
                      )}
                    </div>
                  </div>
                </div>

                {/* Category + Location */}
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Category</span>
                    <div className={styles.modalDataField}>{selectedEvent.category}</div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Location</span>
                    <div className={styles.modalDataField}>{selectedEvent.location || '—'}</div>
                  </div>
                </div>

                {/* Date + Time */}
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Event Date</span>
                    <div className={styles.modalDataField}>{selectedEvent.date || '—'}</div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Time</span>
                    <div className={styles.modalDataField}>
                      {formatTime(selectedEvent.startTime)} – {formatTime(selectedEvent.endTime)}
                    </div>
                  </div>
                </div>

                {/* Co-Organisers */}
                {selectedEvent.coOrganisers?.length > 0 && (
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Co-Organisers</span>
                    <div className={styles.coOrgTagsRow} style={{ marginTop: 6 }}>
                      {selectedEvent.coOrganisers.map((u) => (
                        <span key={u.id} className={styles.coOrgTag}>{u.name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Description</span>
                  <div className={styles.modalDataField}>
                    {selectedEvent.description || selectedEvent.desc || '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={styles.modalFooter}>
              <button
                className={styles.volunteerBtn}
                onClick={handleJoinEvent}
              >
                JOIN AS A VOLUNTEER
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