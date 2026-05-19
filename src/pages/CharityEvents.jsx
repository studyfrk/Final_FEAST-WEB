/* React & Firebase Imports */
import React, { useState, useEffect } from 'react';
import { db, storage, auth } from '../firebase';
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/* Component Imports */
import Header from '../components/Header.jsx';
import Card from '../components/EventCard.jsx';
import Footer from '../components/Footer.jsx';

/* Style Imports */
import styles from '../components/requests_and_events.module.css';

const CharityEvents = () => {
  // UI States
  const [showCreateModal, setShowCreateModal]         = useState(false);
  const [selectedEvent, setSelectedEvent]             = useState(null);
  const [activeFilters, setActiveFilters]             = useState([]);
  const [currentImageIndex, setCurrentImageIndex]     = useState(0);
  const [searchTerm, setSearchTerm]                   = useState('');
  const [photoError, setPhotoError]                   = useState(false);

  // Theme-modal state (replaces all browser alert/confirm dialogs)
  const [themeModal, setThemeModal] = useState(null);
  // themeModal shape: { type: 'alert' | 'confirm', message: string, onConfirm?: fn }

  // Participants modal state
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [participantProfiles, setParticipantProfiles]     = useState([]);
  const [loadingParticipants, setLoadingParticipants]     = useState(false);

  // Data States
  const [events, setEvents]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages]             = useState([]);

  // Co-Organizer Search States
  const [userSearch, setUserSearch]                       = useState('');
  const [searchResults, setSearchResults]                 = useState([]);
  const [selectedCoOrganizers, setSelectedCoOrganizers]   = useState([]);
  const [coOrgError, setCoOrgError]                       = useState(false);
  const [users, setUsers]                                 = useState([]);

  // Live clock tick to automatically trigger list re-filtering when events reach 100%
  const [currentTime, setCurrentTime] = useState(new Date());

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
    status:           'Upcoming',
    approvalStatus:   'Pending'
  });

  const categories = ['Health', 'Disaster Management', 'Community Support', 'Education', 'Environment', 'Feeding'];

  // ── Helper: show themed modal ──────────────────────────────────────────────
  const showAlert = (message) => {
    return new Promise((resolve) => {
      setThemeModal({ type: 'alert', message, onConfirm: () => { setThemeModal(null); resolve(); } });
    });
  };

  const showConfirm = (message) => {
    return new Promise((resolve) => {
      setThemeModal({
        type: 'confirm',
        message,
        onConfirm: () => { setThemeModal(null); resolve(true); },
        onCancel:  () => { setThemeModal(null); resolve(false); },
      });
    });
  };

  // ── Live Clock Interval ──────────────────────────────────────────────────
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // ── Fetch Approved Events ────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'charity_events'),
      where('approvalStatus', '==', 'Approved'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const allEvents = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const uid = auth.currentUser?.uid;

      if (uid) {
        // Prioritize events that user has joined at the very top as recent
        const joinedEvents = allEvents.filter(ev => (ev.anticipatedParticipants || []).includes(uid));
        const otherEvents = allEvents.filter(ev => !(ev.anticipatedParticipants || []).includes(uid));
        setEvents([...joinedEvents, ...otherEvents]);
      } else {
        setEvents(allEvents);
      }
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

  // ── Fetch Users List for Search on mount ───────────────────────────────────
  useEffect(() => {
    const fetchUsersList = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching users list: ", err);
      }
    };
    fetchUsersList();
  }, []);

  // ── Co-Organizer Search (local client-side) ────────────────────────────────
  useEffect(() => {
    const trimmed = userSearch.trim().toLowerCase();
    if (trimmed.length < 1) { setSearchResults([]); return; }

    const filtered = users.filter((u) => {
      const firstName = (u.firstName || '').toLowerCase();
      const lastName = (u.lastName || '').toLowerCase();
      const fullName = (u.fullName || `${firstName} ${lastName}`).toLowerCase();
      const email = (u.email || '').toLowerCase();
      const displayName = (u.displayName || '').toLowerCase();

      return firstName.includes(trimmed) ||
             lastName.includes(trimmed) ||
             fullName.includes(trimmed) ||
             email.includes(trimmed) ||
             displayName.includes(trimmed);
    });

    // Exclude already-selected co-organizers
    const selectedIds = new Set(selectedCoOrganizers.map((u) => u.id));
    setSearchResults(filtered.filter((u) => !selectedIds.has(u.id)));
  }, [userSearch, selectedCoOrganizers, users]);

  const addCoOrganizer = (user) => {
    setSelectedCoOrganizers((prev) => [...prev, user]);
    setUserSearch('');
    setSearchResults([]);
    setCoOrgError(false);
  };

  const removeCoOrganizer = (id) => {
    setSelectedCoOrganizers((prev) => prev.filter((u) => u.id !== id));
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
    setFormData({ title: '', location: '', date: '', startTime: '', endTime: '', description: '', category: 'Health', participantLimit: '', status: 'Upcoming', approvalStatus: 'Pending' });
    setSelectedCoOrganizers([]);
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

    // Explicit JS Validation Checks for text, date, and time variables
    if (!formData.title.trim() || !formData.location.trim() || !formData.description.trim() || !formData.category) {
      await showAlert('Please fill out all required text and category fields.');
      return;
    }

    if (!formData.date) {
      await showAlert('Event Date is required. Please select a valid event date.');
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      await showAlert('Both Start Time and End Time fields are required.');
      return;
    }

    let hasError = false;

    if (images.length === 0) {
      setPhotoError(true);
      hasError = true;
    }
    if (selectedCoOrganizers.length === 0) {
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

      const parsedLimit = formData.participantLimit.trim() === '' ? null : parseInt(formData.participantLimit, 10);

      await addDoc(collection(db, 'charity_events'), {
        ...formData,
        participantLimit: parsedLimit,
        organizerId: currentUser ? currentUser.uid : null,
        organizerName: organizerName,
        coOrganizers: selectedCoOrganizers.map((u) => ({
          id:    u.id,
          name:  `${u.firstName} ${u.lastName}`,
          email: u.email ?? '',
        })),
        imageUrls,
        anticipatedParticipants: [],
        createdAt: serverTimestamp(),
      });

      await showAlert('Event submitted! It will appear once approved.');
      setShowCreateModal(false);
    } catch (err) {
      console.error(err);
      await showAlert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Participant Join/Leave Handler ───────────────────────────────────────────
  const handleJoinOrLeaveEvent = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      await showAlert("You must be logged in to participate in this event.");
      return;
    }

    const participantList = selectedEvent.anticipatedParticipants || [];
    const isJoined = participantList.includes(currentUser.uid);

    if (isJoined) {
      // ── LEAVE EVENT LOGIC (24-hour verification block) ──
      if (selectedEvent.date && selectedEvent.startTime) {
        try {
          const dateObj = parseDate(selectedEvent.date);
          const { hours: startH, minutes: startM } = parseTime(selectedEvent.startTime);
          const eventStartTime = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), startH, startM, 0, 0);

          const millisecondsRemaining = eventStartTime.getTime() - currentTime.getTime();
          const hoursRemaining = millisecondsRemaining / (1000 * 60 * 60);

          if (hoursRemaining < 24) {
            await showAlert("You can only leave this event up to 24 hours before it starts. Withdrawal is no longer allowed.");
            return;
          }
        } catch (err) {
          console.error("Time processing error:", err);
        }
      }

      const confirmedLeave = await showConfirm("Are you sure you want to leave this event?");
      if (!confirmedLeave) return;

      try {
        const eventDocRef = doc(db, 'charity_events', selectedEvent.id);
        await updateDoc(eventDocRef, {
          anticipatedParticipants: arrayRemove(currentUser.uid)
        });
        await showAlert("You have successfully left the event.");
      } catch (err) {
        console.error("Error leaving event: ", err);
        await showAlert("Failed to leave event. Please check your network connection.");
      }

    } else {
      // ── JOIN EVENT LOGIC ──
      if (selectedEvent.participantLimit !== null && selectedEvent.participantLimit !== undefined) {
        if (participantList.length >= selectedEvent.participantLimit) {
          await showAlert("The maximum number of participants for this event has been reached.");
          return;
        }
      }

      const confirmedJoin = await showConfirm(
        "Are you sure you want to participate in this event? You can only leave up to 24 hours before it begins."
      );

      if (!confirmedJoin) return;

      try {
        const eventDocRef = doc(db, 'charity_events', selectedEvent.id);
        await updateDoc(eventDocRef, {
          anticipatedParticipants: arrayUnion(currentUser.uid)
        });
        await showAlert("You have successfully registered as a participant!");
      } catch (err) {
        console.error("Error joining event: ", err);
        await showAlert("Failed to join event. Please check your network connection.");
      }
    }
  };

  // ── View Participants Handler ──────────────────────────────────────────────
  const handleViewParticipants = async () => {
    const uids = selectedEvent.anticipatedParticipants || [];
    if (uids.length === 0) {
      setParticipantProfiles([]);
      setShowParticipantsModal(true);
      return;
    }
    setLoadingParticipants(true);
    setShowParticipantsModal(true);
    try {
      const profiles = await Promise.all(
        uids.map(async (uid) => {
          try {
            const snap = await getDoc(doc(db, 'users', uid));
            if (snap.exists()) {
              const d = snap.data();
              return { id: uid, name: `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.fullName || d.email || uid };
            }
            return { id: uid, name: uid };
          } catch {
            return { id: uid, name: uid };
          }
        })
      );
      setParticipantProfiles(profiles);
    } catch (err) {
      console.error("Error fetching participants:", err);
    } finally {
      setLoadingParticipants(false);
    }
  };

  // ── Filters / search / 100% End-Time Hiding Logic ─────────────────────────
  const toggleFilter = (cat) => {
    setActiveFilters((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const parseTime = (val) => {
    if (!val) return { hours: 0, minutes: 0 };
    if (val?.toDate) {
      const date = val.toDate();
      return { hours: date.getHours(), minutes: date.getMinutes() };
    }
    if (typeof val === 'string') {
      const [h, m] = val.split(':').map(Number);
      return { hours: h || 0, minutes: m || 0 };
    }
    return { hours: 0, minutes: 0 };
  };

  const parseDate = (val) => {
    if (!val) return new Date();
    if (val?.toDate) return val.toDate();
    if (typeof val === 'string') {
      const [year, month, day] = val.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(val);
  };

  const filteredEvents = events.filter((ev) => {
    // ── Check if event has completed (reached 100%) and hide it ──
    if (ev.date && ev.startTime && ev.endTime) {
      try {
        const dateObj = parseDate(ev.date);
        const { hours: endH, minutes: endM } = parseTime(ev.endTime);
        const eventEndTime = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), endH, endM, 0, 0);

        // If current time is past or equal to the end time, filter it out completely
        if (currentTime >= eventEndTime) {
          // If the detail modal is currently looking at this active event, close it
          if (selectedEvent && selectedEvent.id === ev.id) {
            setSelectedEvent(null);
          }
          return false;
        }
      } catch (err) {
        console.error("Error verifying end boundary:", err);
      }
    }

    const matchesSearch   = (ev.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeFilters.length === 0 || activeFilters.includes(ev.category);
    return matchesSearch && matchesCategory;
  });

  const formatTime = (val) => {
    if (!val) return '—';
    if (val?.toDate) {
      return val.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    if (typeof val === 'string') {
      const [h, m] = val.split(':').map(Number);
      const ampm  = h >= 12 ? 'PM' : 'AM';
      const hour  = h % 12 || 12;
      return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
    }
    return '—';
  };

  const currentUserJoined = (ev) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return false;
    return (ev.anticipatedParticipants || []).includes(uid);
  };

  const getSlotLabel = (ev) => {
    const joined = (ev.anticipatedParticipants || []).length;
    if (ev.participantLimit !== null && ev.participantLimit !== undefined) {
      return `View Participants (${joined}/${ev.participantLimit})`;
    }
    return `View Participants (${joined})`;
  };

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
                  date={ev.date}
                  startTime={ev.startTime}
                  endTime={ev.endTime}
                  volunteerCount={(ev.anticipatedParticipants || []).length}
                  isJoined={currentUserJoined(ev)}
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

                <div style={{ position: 'relative' }}>
                  <div className={styles.itemFieldContainer} style={coOrgError ? { borderColor: '#e05a5a' } : {}}>
                    <label className={styles.itemLabel} style={coOrgError ? { color: '#e05a5a' } : {}}>
                      Add Co-Organizers (Required)
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
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => addCoOrganizer(user)}
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
                      Please add at least one co-organizer.
                    </span>
                  )}
                  {selectedCoOrganizers.length > 0 && (
                    <div className={styles.coOrgTagsRow}>
                      {selectedCoOrganizers.map((u) => (
                        <span key={u.id} className={styles.coOrgTag}>
                          {u.firstName} {u.lastName}{u.email ? ` (${u.email})` : ''}
                          <button
                            type="button"
                            className={styles.coOrgTagRemove}
                            onClick={() => removeCoOrganizer(u.id)}
                          >×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

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

                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Description</label>
                  <textarea
                    required
                    placeholder="Describe the charity activity…"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

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
            <div className={styles.modalHeader}>
              <h3>Event Details</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedEvent(null)}>×</button>
            </div>

            <div className={styles.modalBody} style={{ padding: 0 }}>
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

              <div className={styles.modalFormLayout} style={{ padding: '22px 20px' }}>
                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Event Name</span>
                  <div className={styles.modalDataField}>{selectedEvent.title}</div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Main Organizer</span>
                    <div className={styles.modalDataField}>
                      {selectedEvent.organizerName || 'Main Organizer'}
                    </div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Co-Organizers</span>
                    <div className={styles.modalDataField}>
                      {((selectedEvent.coOrganizers || selectedEvent.coOrganisers) || []).length > 0 ? (
                        <div className={styles.coOrgTagsRow} style={{ marginTop: 0 }}>
                          {(selectedEvent.coOrganizers || selectedEvent.coOrganisers).map((u) => (
                            <span key={u.id} className={styles.coOrgTag}>{u.name}</span>
                          ))}
                        </div>
                      ) : (
                        '—'
                      )}
                    </div>
                  </div>
                </div>

                {/* Hollow Styled View Participants Button */}
                <div className={styles.itemFieldContainer}>
                  <button
                    type="button"
                    onClick={handleViewParticipants}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      backgroundColor: 'transparent',
                      color: '#28a786',
                      border: '2px solid #28a786',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {getSlotLabel(selectedEvent)}
                  </button>
                </div>

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

                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Description</span>
                  <div className={styles.modalDataField}>
                    {selectedEvent.description || selectedEvent.desc || '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={`${styles.volunteerBtn} ${currentUserJoined(selectedEvent) ? styles.volunteerBtnJoined : ''}`}
                onClick={handleJoinOrLeaveEvent}
                style={currentUserJoined(selectedEvent) ? { backgroundColor: '#d9534f' } : {}}
              >
                {currentUserJoined(selectedEvent) ? 'LEAVE' : 'JOIN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ PARTICIPANTS LIST MODAL ══════════════════════ */}
      {showParticipantsModal && (
        <div className={styles.contentModalOverlay} onClick={() => setShowParticipantsModal(false)}>
          <div className={styles.contentModal} style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Registered Participants</h3>
              <button className={styles.closeBtn} onClick={() => setShowParticipantsModal(false)}>×</button>
            </div>
            <div className={styles.modalBody} style={{ padding: '20px' }}>
              {loadingParticipants ? (
                <p style={{ textAlign: 'center', color: '#666' }}>Loading participant records...</p>
              ) : participantProfiles.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '10px 0' }}>No participants have registered yet.</p>
              ) : (
                <div 
                  style={{ 
                    maxHeight: '320px', 
                    overflowY: 'auto', 
                    border: '1px solid #eef0f2', 
                    borderRadius: '8px' 
                  }}
                >
                  {participantProfiles.map((p, idx) => (
                    <div 
                      key={p.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        padding: '12px 16px', 
                        borderBottom: idx === participantProfiles.length - 1 ? 'none' : '1px solid #f1f3f5',
                        backgroundColor: idx % 2 === 0 ? '#fafbfc' : '#ffffff' 
                      }}
                    >
                      <span 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '50%', 
                          backgroundColor: '#28a786', 
                          color: '#ffffff', 
                          fontSize: '11px', 
                          fontWeight: '700' 
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#2c3e50' }}>{p.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ THEME MODAL ══════════════════════ */}
      {themeModal && (
        <div className={styles.contentModalOverlay} onClick={() => {}}>
          <div className={styles.contentModal} style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{themeModal.type === 'confirm' ? 'Confirm Action' : 'Notice'}</h3>
            </div>
            <div className={styles.modalBody} style={{ padding: '24px 20px' }}>
              <p style={{ margin: 0, lineHeight: '1.6', fontSize: '14.5px', color: '#333' }}>{themeModal.message}</p>
            </div>
            <div className={styles.modalFooter}>
              {themeModal.type === 'confirm' && (
                <button 
                  className={styles.closeBtn} 
                  onClick={themeModal.onCancel}
                  style={{ 
                    flex: 1, 
                    fontSize: '14px', 
                    fontWeight: '700', 
                    padding: '13px 20px', 
                    border: '1.5px solid #bbb'
                  }}
                >
                  Cancel
                </button>
              )}
              <button 
                className={styles.submitBtn} 
                onClick={themeModal.onConfirm}
                style={{ margin: 0 }}
              >
                {themeModal.type === 'confirm' ? 'Confirm' : 'OK'}
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