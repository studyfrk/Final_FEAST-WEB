import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; 
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
  const location = useLocation(); 
  const [showCreateModal, setShowCreateModal]         = useState(false);
  const [selectedEvent, setSelectedEvent]             = useState(null);
  const [activeFilters, setActiveFilters]             = useState([]);
  const [currentImageIndex, setCurrentImageIndex]     = useState(0);
  const [searchTerm, setSearchTerm]                   = useState('');
  const [photoError, setPhotoError]                   = useState(false);

  // Theme-modal state (replaces all browser alert/confirm dialogs)
  const [themeModal, setThemeModal] = useState(null);

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
    participantLimit: '', 
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
      where('status', 'in', ['Upcoming', 'Ongoing']),
      where('approvalStatus', '==', 'Approved'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const allEvents = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const uid = auth.currentUser?.uid;

      if (uid) {
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

  // Hook to handle incoming router tracking targets sent from clicking dashboard components
  useEffect(() => {
    const targetId = location.state?.targetId;
    if (targetId && events.length > 0) {
      const targetItem = events.find((item) => item.id === targetId); 
      if (targetItem) {
        setSelectedEvent(targetItem);
        window.history.replaceState({}, document.title); 
      }
    }
  }, [events, location.state]);

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

  // ── Time conflict check helper ────────────────────────────────────────────
  const timesOverlap = (startA, endA, startB, endB) => {
    return startA < endB && endA > startB;
  };

  const getEventDateTimeMs = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleCreateEvent = async (e) => {
    e.preventDefault();

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

    // ── Check for scheduling conflicts with existing events (same organizer) ──
    const currentUser = auth.currentUser;
    if (currentUser) {
      const newStart = getEventDateTimeMs(formData.date, formData.startTime);
      const newEnd = getEventDateTimeMs(formData.date, formData.endTime);
      if (newStart !== null && newEnd !== null) {
        try {
          const existingSnap = await getDocs(
            query(
              collection(db, 'charity_events'),
              where('approvalStatus', 'in', ['Pending', 'Approved', 'Processing']), 
              where('date', '==', formData.date)
            )
          );
          for (const docSnap of existingSnap.docs) {
            const ev = docSnap.data();
            
            // Skip checking the current form evaluation context if it's explicitly marked as Rejected
            if (ev.approvalStatus === 'Rejected') continue;

            const isOrganizer = ev.organizerId === currentUser.uid;
            const isCoOrganizer = (ev.coOrganizers || []).some(co => co.id === currentUser.uid);
            const isParticipant = (ev.anticipatedParticipants || []).includes(currentUser.uid);
            if (isOrganizer || isCoOrganizer || isParticipant) {
              const evStart = getEventDateTimeMs(ev.date, ev.startTime);
              const evEnd = getEventDateTimeMs(ev.date, ev.endTime);
              if (evStart !== null && evEnd !== null && timesOverlap(newStart, newEnd, evStart, evEnd)) {
                await showAlert(
                  `You cannot create this event because the date and time conflicts with another event you are organizing, co-organizing, or participating in: "${ev.title}" on ${formData.date} from ${formatTime(ev.startTime)} to ${formatTime(ev.endTime)}.`
                );
                return;
              }
            }
          }
        } catch (conflictErr) {
          console.error("Conflict check error:", conflictErr);
        }
      }
    }

    setIsSubmitting(true);

    try {
      let organizerName = 'Resident Volunteer';
      let organizerEmailStr = currentUser?.email || '';
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const udata = userDoc.data();
          organizerName = `${udata.firstName || ''} ${udata.lastName || ''}`.trim() || udata.fullName || currentUser.email;
        }
      }

      const uploadedImageUrls = [];
      for (const file of images) {
        const storageRef = ref(storage, `charity_events/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        uploadedImageUrls.push(url);
      }

      const coOrganizersList = selectedCoOrganizers.map((u) => ({
        id: u.id,
        fullName: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.displayName || u.email,
        email: u.email || '',
      }));

      const initialAcceptances = {};
      coOrganizersList.forEach((co) => {
        initialAcceptances[co.id] = 'pending';
      });

      const finalEventData = {
        title:                   formData.title.trim(),
        location:                formData.location.trim(),
        date:                    formData.date,
        startTime:               formData.startTime,
        endTime:                 formData.endTime,
        description:             formData.description.trim(),
        category:                formData.category,
        participantLimit:        formData.participantLimit ? parseInt(formData.participantLimit) : null,
        imageUrls:               uploadedImageUrls,
        status:                  'Upcoming',
        approvalStatus:          'Pending',
        organizerId:             currentUser ? currentUser.uid : null,
        organizerName:           organizerName,
        organizerEmail:          organizerEmailStr,
        coOrganizers:            coOrganizersList,
        coOrganizerAcceptances:  initialAcceptances,
        anticipatedParticipants: [],
        createdAt:               serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'charity_events'), finalEventData);

      for (const co of coOrganizersList) {
        const coNotifRef = collection(db, `users/${co.id}/notifications`);
        await addDoc(coNotifRef, {
          title:     'Co-Organizer Designation Request',
          body:      `${organizerName} added you as a co-organizer for "${formData.title.trim()}". Decision pending.`,
          type:      'Event',
          status:    'warning',
          read:      false,
          createdAt: serverTimestamp(),
          eventId:   docRef.id,
        });
      }

      setShowCreateModal(false);
      await showAlert('Your event proposal has been successfully submitted! It will appear on the calendar pending administrator approval.');
    } catch (error) {
      console.error('Error adding document: ', error);
      await showAlert('An unexpected database error occurred. Failed to submit proposal profile metrics.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Participation: Join / Leave ──────────────────────────────────────────
  const handleToggleParticipation = async (eventItem) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      await showAlert('You must be logged in to participate in events.');
      return;
    }

    const participantsList = eventItem.anticipatedParticipants || [];
    const isJoined = participantsList.includes(uid);

    if (isJoined) {
      const confirmLeave = await showConfirm(`Are you sure you want to leave "${eventItem.title}"?`);
      if (!confirmLeave) return;

      try {
        const eventRef = doc(db, 'charity_events', eventItem.id);
        await updateDoc(eventRef, { anticipatedParticipants: arrayRemove(uid) });
      } catch (err) {
        console.error('Error leaving event:', err);
      }
    } else {
      if (eventItem.participantLimit && participantsList.length >= eventItem.participantLimit) {
        await showAlert('Sorry, this event has already reached its maximum participant capacity.');
        return;
      }

      // ── Enforce Time overlap across user's active schedule commitments ──
      const newStart = getEventDateTimeMs(eventItem.date, eventItem.startTime);
      const newEnd = getEventDateTimeMs(eventItem.date, eventItem.endTime);

      if (newStart !== null && newEnd !== null) {
        try {
          const activeCommitmentsSnap = await getDocs(
            query(
              collection(db, 'charity_events'),
              where('approvalStatus', '==', 'Approved'),
              where('date', '==', eventItem.date)
            )
          );

          for (const docSnap of activeCommitmentsSnap.docs) {
            const ev = docSnap.data();
            if (ev.id === eventItem.id) continue; 

            const isOrg = ev.organizerId === uid;
            const isCo = (ev.coOrganizers || []).some(co => co.id === uid) && (ev.coOrganizerAcceptances?.[uid] === 'accepted');
            const isPart = (ev.anticipatedParticipants || []).includes(uid);

            if (isOrg || isCo || isPart) {
              const evStart = getEventDateTimeMs(ev.date, ev.startTime);
              const evEnd = getEventDateTimeMs(ev.date, ev.endTime);

              if (evStart !== null && evEnd !== null && timesOverlap(newStart, newEnd, evStart, evEnd)) {
                await showAlert(
                  `Schedule conflict! You cannot join this event because its timeline overlaps with another active project obligation: "${ev.title}" from ${formatTime(ev.startTime)} to ${formatTime(ev.endTime)}.`
                );
                return;
              }
            }
          }
        } catch (scErr) {
          console.error("Schedule conflict validation error:", scErr);
        }
      }

      try {
        const eventRef = doc(db, 'charity_events', eventItem.id);
        await updateDoc(eventRef, { anticipatedParticipants: arrayUnion(uid) });
      } catch (err) {
        console.error('Error joining event:', err);
      }
    }
  };

  // ── Show Registered Participants Modal Panel ─────────────────────────────────
  const openParticipantsModal = async (eventItem) => {
    const ids = eventItem.anticipatedParticipants || [];
    if (ids.length === 0) {
      setParticipantProfiles([]);
      setShowParticipantsModal(true);
      return;
    }

    setLoadingParticipants(true);
    setShowParticipantsModal(true);

    try {
      const usersCollection = collection(db, 'users');
      const fetchedProfiles = [];

      for (const userId of ids) {
        const userDocRef = doc(usersCollection, userId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          fetchedProfiles.push({ id: userId, ...userDocSnap.data() });
        } else {
          fetchedProfiles.push({ id: userId, firstName: 'User Profile', lastName: 'Anonymous', email: 'N/A' });
        }
      }
      setParticipantProfiles(fetchedProfiles);
    } catch (err) {
      console.error('Failed to resolve dynamic user identities: ', err);
    } finally {
      setLoadingParticipants(false);
    }
  };

  // ── Form Input Changes ─────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleFilter = (category) => {
    setActiveFilters((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  // ── Filter and Search Formatting logic computations ────────────────────────
  const filteredEvents = events.filter((ev) => {
    const matchesCategory = activeFilters.length === 0 || activeFilters.includes(ev.category);
    const matchesSearch =
      ev.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // ── Helpers: Formatting Date and Times strings ──────────────────────────────
  const formatDisplayDate = (dateString) => {
    if (!dateString) return '';
    const dateObj = new Date(dateString);
    return dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hours12 = h % 12 || 12;
    return `${hours12}:${minutes} ${ampm}`;
  };

  return (
    <div className={styles.container}>
      <Header />

      <main className={styles.mainContent}>
        {/* Banner Section */}
        <section className={styles.banner}>
          <div className={styles.bannerOverlay}>
            <h1 className={styles.title}>Barangay Charity Events</h1>
            <p className={styles.subtitle}>
              Discover upcoming health initiatives, collaborative relief operations, and educational programs organized for our community.
            </p>
            <button className={styles.createBtn} onClick={openCreateModal}>
              Propose New Event Setup
            </button>
          </div>
        </section>

        {/* Content Layout */}
        <div className={styles.layout}>
          {/* Left Column: Sidebar Filters */}
          <aside className={styles.sidebar}>
            <div className={styles.searchBox}>
              <h3 className={styles.sidebarTitle}>Search Events</h3>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Type keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className={styles.filterBox}>
              <h3 className={styles.sidebarTitle}>Categories</h3>
              <div className={styles.filterList}>
                {categories.map((cat) => {
                  const isChecked = activeFilters.includes(cat);
                  return (
                    <label key={cat} className={styles.filterItem}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFilter(cat)}
                        className={styles.checkbox}
                      />
                      <span className={isChecked ? styles.filterLabelChecked : styles.filterLabel}>
                        {cat}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Right Column: Events Grid Display */}
          <section className={styles.content}>
            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Loading approved event rosters from historical records...</p>
              </div>
            ) : filteredEvents.length > 0 ? (
              <div className={styles.grid}>
                {filteredEvents.map((item) => (
                  <Card
                    key={item.id}
                    event={item}
                    currentTime={currentTime}
                    onOpenDetails={() => setSelectedEvent(item)}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>No active public events found matching filter indices criteria.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Details Dialog Overlay Popup Modal */}
      {selectedEvent && (
        <div className={styles.modalOverlay} onClick={() => setSelectedEvent(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeModalBtn} onClick={() => setSelectedEvent(null)}>
              &times;
            </button>

            {/* Modal Image Carousel Container */}
            <div className={styles.modalCarouselContainer}>
              {selectedEvent.imageUrls && selectedEvent.imageUrls.length > 0 ? (
                <>
                  <img
                    src={selectedEvent.imageUrls[currentImageIndex]}
                    alt="Operational Context Presentation Display"
                    className={styles.modalImage}
                    onError={(e) => {
                      e.target.src = 'https://placehold.co/600x400?text=Image+Unavailable';
                    }}
                  />
                  {selectedEvent.imageUrls.length > 1 && (
                    <div className={styles.carouselControlsRow}>
                      {selectedEvent.imageUrls.map((_, idx) => (
                        <button
                          key={idx}
                          className={`${styles.carouselDot} ${idx === currentImageIndex ? styles.carouselDotActive : ''}`}
                          onClick={() => setCurrentImageIndex(idx)}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.noImagePlaceholder}>No Event Images Provided</div>
              )}
            </div>

            {/* Modal Grid/Details Form Area Context */}
            <div className={styles.modalDetailsWrapper}>
              <span className={styles.modalCategoryTag}>{selectedEvent.category}</span>
              <h2 className={styles.modalTitle}>{selectedEvent.title}</h2>

              <div className={styles.metaGridDetails}>
                <div>
                  <strong>Location Location:</strong> {selectedEvent.location}
                </div>
                <div>
                  <strong>Target Target Date:</strong> {formatDisplayDate(selectedEvent.date)}
                </div>
                <div>
                  <strong>Operational Time Slot:</strong> {formatTime(selectedEvent.startTime)} -{' '}
                  {formatTime(selectedEvent.endTime)}
                </div>
                <div>
                  <strong>Capacity Capacity Parameters:</strong>{' '}
                  {selectedEvent.participantLimit
                    ? `${selectedEvent.participantLimit} Total Capacity Seats Limit`
                    : 'Uncapped Public Reservation Availability'}
                </div>
              </div>

              {/* Dynamic Live Calculations Counter Widgets inside Details Overlay */}
              <div className={styles.progressSectionCard}>
                <div className={styles.progressTextRowLabels}>
                  <span>
                    Current Registry Checkins:{' '}
                    <strong>{(selectedEvent.anticipatedParticipants || []).length}</strong> Active Participants
                  </span>
                  {selectedEvent.participantLimit && (
                    <span>
                      {Math.max(
                        0,
                        selectedEvent.participantLimit - (selectedEvent.anticipatedParticipants || []).length
                      )}{' '}
                      Remaining Seats
                    </span>
                  )}
                </div>
                <div className={styles.progressBarTrackContainer}>
                  <div
                    className={styles.progressBarFillIndicator}
                    style={{
                      width: `${Math.min(
                        100,
                        selectedEvent.participantLimit
                          ? ((selectedEvent.anticipatedParticipants || []).length / selectedEvent.participantLimit) * 100
                          : 0
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className={styles.descriptionSection}>
                <h4>Detailed Description</h4>
                <p className={styles.descText}>{selectedEvent.description}</p>
              </div>

              {/* Dynamic Actions Modal Interactive Footnotes Grid Controls Row */}
              <div className={styles.modalActionsFooterRow}>
                <button
                  type="button"
                  className={styles.viewParticipantsBtn}
                  onClick={() => openParticipantsModal(selectedEvent)}
                >
                  View Enrolled Participants
                </button>

                <button
                  type="button"
                  className={
                    (selectedEvent.anticipatedParticipants || []).includes(auth.currentUser?.uid)
                      ? styles.leaveEventBtn
                      : styles.joinEventBtn
                  }
                  onClick={() => handleToggleParticipation(selectedEvent)}
                >
                  {(selectedEvent.anticipatedParticipants || []).includes(auth.currentUser?.uid)
                    ? 'Cancel Reservation / Leave'
                    : 'Reserve Seat / Join'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Creation Modal Form Panel Interface */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.formModalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Propose Barangay Event Program</h3>
              <button className={styles.closeModalX} onClick={() => setShowCreateModal(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className={styles.modalFormBody}>
              <div className={styles.formRowInputGroup}>
                <div className={styles.formFieldFlex}>
                  <label>Event Program Title *</label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Provide a descriptive event title..."
                  />
                </div>
                <div className={styles.formFieldFlex}>
                  <label>Operational Hub Location *</label>
                  <input
                    type="text"
                    name="location"
                    required
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Where will this take place?"
                  />
                </div>
              </div>

              <div className={styles.formRowInputGroup}>
                <div className={styles.formFieldFlex}>
                  <label>Scheduled Event Date *</label>
                  <input
                    type="date"
                    name="date"
                    required
                    min={todayStr}
                    value={formData.date}
                    onChange={handleInputChange}
                  />
                </div>
                <div className={styles.formFieldFlex}>
                  <label>Core Categorization Tag *</label>
                  <select name="category" value={formData.category} onChange={handleInputChange}>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formRowInputGroup}>
                <div className={styles.formFieldFlex}>
                  <label>Operation Start Time *</label>
                  <input
                    type="time"
                    name="startTime"
                    required
                    value={formData.startTime}
                    onChange={handleInputChange}
                  />
                </div>
                <div className={styles.formFieldFlex}>
                  <label>Operation Closing Time *</label>
                  <input
                    type="time"
                    name="endTime"
                    required
                    value={formData.endTime}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className={styles.formRowInputGroup}>
                <div className={styles.formFieldFlex}>
                  <label>Capacity Constraint Limit (Optional)</label>
                  <input
                    type="number"
                    name="participantLimit"
                    min="1"
                    value={formData.participantLimit}
                    onChange={handleInputChange}
                    placeholder="Leave empty for unlimited enrollment"
                  />
                </div>
                <div className={styles.formFieldFlex}>
                  <label>Staged Reference Image Coverage Files *</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    id="fileUploadInput"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="fileUploadInput" className={styles.customUploadLabelBtn}>
                    Select Visual Media Assets
                  </label>
                  {photoError && (
                    <span className={styles.inlineFormErrorMessageText}>
                      Uploading at least one visual asset reference file is mandatory.
                    </span>
                  )}
                </div>
              </div>

              {/* Render Selected Files Previews Horizontal Band inside Form */}
              {images.length > 0 && (
                <div className={styles.uploadedImagesHorizontalScrollBand}>
                  {images.map((img, idx) => (
                    <div key={idx} className={styles.imageThumbnailContainerSquare}>
                      <img src={URL.createObjectURL(img)} alt="Staged Preview asset thumbnail" />
                      <button
                        type="button"
                        className={styles.removeStagedImageBubbleBtn}
                        onClick={() => removeSelectedImage(idx)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Live Search Co-Organizer Inputs Dynamic Controls Box */}
              <div className={styles.coOrganizerFormAssignmentSection}>
                <label>Designated Operational Co-Organizers *</label>
                <input
                  type="text"
                  placeholder="Type name or email handle to invite users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                {searchResults.length > 0 && (
                  <div className={styles.liveUsersSearchFloatingResultsDropdownList}>
                    {searchResults.map((u) => (
                      <div
                        key={u.id}
                        className={styles.searchedUserDropdownOptionRow}
                        onClick={() => addCoOrganizer(u)}
                      >
                        {u.firstName} {u.lastName} ({u.email || u.displayName})
                      </div>
                    ))}
                  </div>
                )}
                {selectedCoOrganizers.length > 0 && (
                  <div className={styles.assignedChipsRowWrapperContainer}>
                    {selectedCoOrganizers.map((co) => (
                      <span key={co.id} className={styles.coOrganizerUserIdentityChip}>
                        {co.firstName} {co.lastName}
                        <button type="button" onClick={() => removeCoOrganizer(co.id)}>
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {coOrgError && (
                  <span className={styles.inlineFormErrorMessageText}>
                    Assigning at least 1 co-organizer volunteer profile is mandatory to launch event propositions.
                  </span>
                )}
              </div>

              <div className={styles.formTextAreaFullWidthBlock}>
                <label>Detailed Operational Context Overview Description *</label>
                <textarea
                  name="description"
                  required
                  rows="4"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your goals, requirements, expectations, and any important logistical preparation context..."
                />
              </div>

              <div className={styles.formActionsFooterControlsRow}>
                <button
                  type="button"
                  className={styles.formCancelBtn}
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel Proposal
                </button>
                <button type="submit" className={styles.formSubmitBtn} disabled={isSubmitting}>
                  {isSubmitting ? 'Uploading Metrics Proposals...' : 'Submit Authorization Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Registered Participants Checklist Overlaid Box Modal Panel */}
      {showParticipantsModal && (
        <div className={styles.modalOverlay} onClick={() => setShowParticipantsModal(false)}>
          <div className={styles.contentModal} style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Registered Event Participants</h3>
              <button className={styles.closeModalX} onClick={() => setShowParticipantsModal(false)}>
                &times;
              </button>
            </div>
            <div className={styles.modalBody} style={{ padding: '16px 20px', maxHeight: '360px', overflowY: 'auto' }}>
              {loadingParticipants ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#666' }}>
                  <div className={styles.spinner} style={{ margin: '0 auto 10px' }}></div>
                  <p style={{ fontSize: '14px' }}>Resolving registered user profile identities...</p>
                </div>
              ) : participantProfiles.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {participantProfiles.map((p, i) => (
                    <div
                      key={p.id || i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        background: '#f9f9f9',
                        borderRadius: '6px',
                        border: '1px solid #eee',
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: '#e8f5e9',
                          color: '#2e7d32',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '14px',
                        }}
                      >
                        {(p.firstName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600', fontSize: '14.5px', color: '#333' }}>
                          {p.firstName || ''} {p.lastName || ''}
                        </span>
                        <span style={{ fontSize: '12px', color: '#666' }}>{p.email || 'No email shared'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#777', fontSize: '14px', margin: '20px 0' }}>
                  No participants have reserved seats for this session yet.
                </p>
              )}
            </div>
            <div className={styles.modalFooter} style={{ padding: '12px 20px' }}>
              <button
                className={styles.submitBtn}
                style={{ margin: 0, width: '100%' }}
                onClick={() => setShowParticipantsModal(false)}
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Application level Theme Modal (Custom alert or confirm replacements) */}
      {themeModal && (
        <div className={styles.modalOverlay} onClick={() => {}}>
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
                    fontWeight: '700', day: 'numeric',
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