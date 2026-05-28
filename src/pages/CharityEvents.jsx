import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { db, storage, auth } from '../firebase';
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/* Component Imports */
import Card from '../components/EventCard.jsx';
import Footer from '../components/Footer.jsx';
import GuestRestrictionModal from '../components/GuestRestrictionModal.jsx';
import CreateCharityEventModal from '../components/modals/CreateCharityEventModal.jsx';
import EventParticipantsModal from '../components/modals/EventParticipantsModal.jsx';
import ReportContentModal from '../components/modals/ReportContentModal.jsx';

/* Style Imports */
import styles from '../components/requests_and_events.module.css';

/* Asset Imports */
import alertIcon from '../assets/alert.png';

/* ── Animated Modal Wrapper ─────────────────────────────────────────────── */
const AnimatedModal = ({ children, onClose, maxWidth, noOverlayClose, style }) => {
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    if (noOverlayClose) return;
    setClosing(true);
    setTimeout(onClose, 180);
  };

  const handleDirectClose = () => {
    setClosing(true);
    setTimeout(onClose, 180);
  };

  return (
    <div
      className={`${styles.contentModalOverlay}${closing ? ' ' + styles.closing : ''}`}
      onClick={handleClose}
    >
      <div
        className={styles.contentModal}
        style={{ maxWidth: maxWidth || 560, ...style }}
        onClick={(e) => e.stopPropagation()}
      >
        {React.Children.map(children, child =>
          React.isValidElement(child)
            ? React.cloneElement(child, { _onClose: handleDirectClose })
            : child
        )}
      </div>
    </div>
  );
};

/* ── Search Icon ── */
const SearchIcon = () => (
  <span className={styles.searchIcon}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  </span>
);

const CharityEvents = () => {
  const location = useLocation();
  const [showCreateModal, setShowCreateModal]         = useState(false);
  const [showGuestModal, setShowGuestModal]           = useState(false);
  const [selectedEvent, setSelectedEvent]             = useState(null);
  const [activeFilters, setActiveFilters]             = useState([]);
  const [currentImageIndex, setCurrentImageIndex]     = useState(0);
  const [searchTerm, setSearchTerm]                   = useState('');
  const [photoError, setPhotoError]                   = useState(false);
  const [themeModal, setThemeModal] = useState(null);
  const sectionRef = useRef(null);

  // ── Sort & Pagination ────────────────────────────────────────
  const [sortOption, setSortOption] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const CARDS_PER_PAGE = 9;

  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [participantProfiles, setParticipantProfiles]     = useState([]);
  const [loadingParticipants, setLoadingParticipants]     = useState(false);

  const [events, setEvents]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages]             = useState([]);

  const [userSearch, setUserSearch]                       = useState('');
  const [searchResults, setSearchResults]                 = useState([]);
  const [selectedCoOrganizers, setSelectedCoOrganizers]   = useState([]);
  const [coOrgError, setCoOrgError]                       = useState(false);
  const [users, setUsers]                                 = useState([]);

  const [currentTime, setCurrentTime] = useState(new Date());

  const todayStr = new Date().toISOString().split('T')[0];

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

  // Report States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportProof, setReportProof] = useState(null);
  const [reportProofError, setReportProofError] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const categories = ['Health', 'Disaster Management', 'Community Support', 'Education', 'Environment', 'Feeding'];

  /* ── Helper: show themed modal ── */
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

  /* ── Live Clock ── */
  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  /* ── Fetch Approved Events ── */
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

  /* Sync details modal live */
  useEffect(() => {
    if (selectedEvent) {
      const liveMatch = events.find((e) => e.id === selectedEvent.id);
      if (liveMatch) setSelectedEvent(liveMatch);
    }
  }, [events, selectedEvent]);

  /* Handle incoming router tracking */
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

  /* ── Fetch Users List ── */
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

  /* ── Co-Organizer Search ── */
  useEffect(() => {
    const trimmed = userSearch.trim().toLowerCase();
    if (trimmed.length < 1) { setSearchResults([]); return; }

    const filtered = users.filter((u) => {
      const firstName = (u.firstName || '').toLowerCase();
      const lastName = (u.lastName || '').toLowerCase();
      const fullName = (u.fullName || `${firstName} ${lastName}`).toLowerCase();
      const email = (u.email || '').toLowerCase();
      const displayName = (u.displayName || '').toLowerCase();

      return firstName.includes(trimmed) || lastName.includes(trimmed) ||
             fullName.includes(trimmed) || email.includes(trimmed) ||
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

  /* ── Carousel auto-advance ── */
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

  /* ── File handling ── */
  const handleFileChange = (e) => {
    if (e.target.files) {
      setImages((prev) => [...prev, ...Array.from(e.target.files)]);
      setPhotoError(false);
    }
  };

  const removeSelectedImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  /* ── Open Create Modal ── */
  const handleGuestAction = (action) => {
    if (auth.currentUser?.isAnonymous || auth.currentUser?.email === 'guest@feast.app') {
      setShowGuestModal(true);
    } else {
      action();
    }
  };

  const openCreateModal = () => {
    if (auth.currentUser?.isAnonymous || auth.currentUser?.email === 'guest@feast.app') {
      setShowGuestModal(true);
      return;
    }
    setFormData({ title: '', location: '', date: '', startTime: '', endTime: '', description: '', category: 'Health', participantLimit: '', status: 'Upcoming', approvalStatus: 'Pending' });
    setSelectedCoOrganizers([]);
    setImages([]);
    setUserSearch('');
    setSearchResults([]);
    setPhotoError(false);
    setCoOrgError(false);
    setShowCreateModal(true);
  };

  /* ── Time conflict helpers ── */
  const timesOverlap = (startA, endA, startB, endB) => startA < endB && endA > startB;

  const getEventDateTimeMs = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
  };

  /* ── 24 Hour Reminder Check ── */
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser || events.length === 0) return;

    events.forEach(async (ev) => {
      // Must be joined
      if (!(ev.anticipatedParticipants || []).includes(currentUser.uid)) return;
      
      // Must not be reminded locally yet
      const reminderKey = `reminded_24h_${ev.id}_${currentUser.uid}`;
      if (localStorage.getItem(reminderKey)) return;

      if (ev.date && ev.startTime) {
        try {
          const eventStartTimeMs = getEventDateTimeMs(ev.date, ev.startTime);
          if (!eventStartTimeMs) return;
          
          const msRemaining = eventStartTimeMs - new Date().getTime();
          const hoursRemaining = msRemaining / (1000 * 60 * 60);

          if (hoursRemaining > 0 && hoursRemaining <= 24) {
            const notifRef = collection(db, `users/${currentUser.uid}/notifications`);
            await addDoc(notifRef, {
              title: "Event Starting Soon!",
              body: `The event "${ev.title}" is starting in less than 24 hours. As a reminder, you can no longer withdraw from this event.`,
              type: "Event",
              status: "warning",
              read: false,
              createdAt: serverTimestamp(),
              eventId: ev.id,
            });
            localStorage.setItem(reminderKey, 'true');
          }
        } catch (err) {
          console.error("Reminder error:", err);
        }
      }
    });
  }, [events]);

  /* ── Submit ── */
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
    
    if (formData.endTime <= formData.startTime) {
      await showAlert('End time must be later than the start time.');
      return;
    }

    let hasError = false;
    if (images.length === 0) { setPhotoError(true); hasError = true; }
    if (hasError) return;

    const currentUser = auth.currentUser;
    if (currentUser) {
      const newStart = getEventDateTimeMs(formData.date, formData.startTime);
      const newEnd   = getEventDateTimeMs(formData.date, formData.endTime);

      if (newStart !== null && newEnd !== null) {
        try {
          const existingSnap = await getDocs(
            query(
              collection(db, 'charity_events'),
              where('approvalStatus', 'in', ['Pending', 'Approved']),
              where('date', '==', formData.date)
            )
          );
          for (const docSnap of existingSnap.docs) {
            const ev = docSnap.data();
            const isOrganizer = ev.organizerId === currentUser.uid;
            const isCoOrganizer = (ev.coOrganizers || []).some(co => co.id === currentUser.uid);
            const isParticipant = (ev.anticipatedParticipants || []).includes(currentUser.uid);

            if (isOrganizer || isCoOrganizer || isParticipant) {
              const evStart = getEventDateTimeMs(ev.date, ev.startTime);
              const evEnd   = getEventDateTimeMs(ev.date, ev.endTime);
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

      const initialParticipants = currentUser ? [currentUser.uid] : [];
        selectedCoOrganizers.forEach((coOrg) => {
          if (!initialParticipants.includes(coOrg.id)) {
            initialParticipants.push(coOrg.id);
          }
      });

      const eventDocRef = await addDoc(collection(db, 'charity_events'), {
        ...formData,
        participantLimit: parsedLimit,
        organizerId: currentUser ? currentUser.uid : null,
        organizerName: organizerName,
        organizerEmail: currentUser ? currentUser.email : null,
        coOrganizers: selectedCoOrganizers.map((u) => ({
          id:    u.id,
          name:  `${u.firstName} ${u.lastName}`,
          email: u.email ?? '',
        })),
        coOrganizerAcceptances: selectedCoOrganizers.reduce((acc, curr) => {
          acc[curr.id] = 'accepted';
          return acc;
        }, {}),
        imageUrls,
        anticipatedParticipants: initialParticipants,
        createdAt: serverTimestamp(),
      });

      const eventId = eventDocRef.id;

      const coOrgNotifPromises = selectedCoOrganizers.map(async (coOrg) => {
        const notifRef = collection(db, `users/${coOrg.id}/notifications`);
        return addDoc(notifRef, {
          title: "Co-Organizer Added",
          body: `${organizerName} has added you as a co-organizer for the event "${formData.title}".`,
          type: "Event",
          status: "info",
          read: false,
          createdAt: serverTimestamp(),
          eventId: eventId,
          notifSubtype: "co_organizer_added",
          organizerName: organizerName,
          eventTitle: formData.title,
          eventDate: formData.date,
          eventStartTime: formData.startTime,
          eventEndTime: formData.endTime,
          eventLocation: formData.location,
          eventDescription: formData.description,
          triggeredBy: currentUser?.uid,
          requiresAction: false,
        });
      });
      await Promise.all(coOrgNotifPromises);

      await showAlert("Your charity event has been submitted. Your post will be published as soon as it meets our guidelines and is approved by an administrator.");
      setShowCreateModal(false);
    } catch (err) {
      console.error(err);
      await showAlert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Report Handlers ── */
  const closeReportModal = () => {
    setShowReportModal(false);
    setReportReason('');
    setReportDescription('');
    setReportProof(null);
    setReportProofError(false);
  };

  const handleReportSubmit = async (item) => {
    if (!auth.currentUser) {
      await showAlert("You must be logged in to submit a report.");
      return;
    }
    if (!reportReason) {
      await showAlert("Please select a reason for reporting.");
      return;
    }
    if (!reportProof) {
      setReportProofError(true);
      return;
    }

    setIsSubmittingReport(true);
    try {
      const storageRef = ref(storage, `reports_proof/${Date.now()}_${reportProof.name}`);
      await uploadBytes(storageRef, reportProof);
      const proofImageUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, "reports"), {
        reportedItemId: item.id || '',
        reportedType: 'Charity Event',
        reportedContent: item.title || item.name || 'Untitled Post',
        title: item.title || item.name || 'Untitled Post',
        reportedUserId: item.organizerId || item.userId || '', 
        reportedUserName: item.organizerName || item.userName || 'Unknown User',
        reportedUserEmail: item.organizerEmail || item.email || 'N/A',
        reporterId: auth.currentUser.uid,
        reporterEmail: auth.currentUser.email || '',
        reporterName: auth.currentUser.displayName || auth.currentUser.email || 'Anonymous User',
        reporter: auth.currentUser.displayName || auth.currentUser.email || 'Anonymous User',
        reason: reportReason,
        description: reportDescription,
        proofImageUrl: proofImageUrl,
        status: 'Pending',
        createdAt: serverTimestamp()
      });

      closeReportModal();
      await showAlert("Thank you. The content has been reported and will be reviewed by administration.");
    } catch (error) {
      console.error("Error submitting report: ", error);
      await showAlert("Failed to submit report. Please try again.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  /* ── Participant Join/Leave ── */
  const handleJoinOrLeaveEvent = async () => {
    const currentUser = auth.currentUser;
    if (currentUser?.isAnonymous) {
      setShowGuestModal(true);
      return;
    }
    if (!currentUser) {
      await showAlert("You must be logged in to participate in this event.");
      return;
    }

    const participantList = selectedEvent.anticipatedParticipants || [];
    const isJoined = participantList.includes(currentUser.uid);

    if (isJoined) {
      if (selectedEvent.date && selectedEvent.startTime) {
        try {
          const eventStartTimeMs = getEventDateTimeMs(selectedEvent.date, selectedEvent.startTime);
          if (eventStartTimeMs) {
            const millisecondsRemaining = eventStartTimeMs - currentTime.getTime();
            const hoursRemaining = millisecondsRemaining / (1000 * 60 * 60);

            if (hoursRemaining > 0 && hoursRemaining < 24) {
              await showAlert("You can only leave this event up to 24 hours before it starts. After that, withdrawal is no longer allowed.");
              return;
            }
          }
        } catch (err) {
          console.error("Time processing error:", err);
        }
      }

      const confirmedLeave = await showConfirm("Are you sure you want to leave this event?");
      if (!confirmedLeave) return;

      try {
        const eventDocRef = doc(db, 'charity_events', selectedEvent.id);
        await updateDoc(eventDocRef, { anticipatedParticipants: arrayRemove(currentUser.uid) });

        try {
          const gcSnap = await getDocs(query(collection(db, 'chats'), where('linkedEventId', '==', selectedEvent.id)));
          for (const gcDoc of gcSnap.docs) {
            await updateDoc(doc(db, 'chats', gcDoc.id), { participantIds: arrayRemove(currentUser.uid) });
          }
        } catch (gcErr) {
          console.error("GC leave error:", gcErr);
        }

        await showAlert("You have successfully left the event.");
      } catch (err) {
        console.error("Error leaving event: ", err);
        await showAlert("Failed to leave event. Please check your network connection.");
      }

    } else {
      const newStart = getEventDateTimeMs(selectedEvent.date, selectedEvent.startTime);
      const newEnd   = getEventDateTimeMs(selectedEvent.date, selectedEvent.endTime);

      if (newStart !== null && newEnd !== null) {
        const conflictingEvent = events.find((ev) => {
          if (ev.id === selectedEvent.id) return false;
          if (!(ev.anticipatedParticipants || []).includes(currentUser.uid)) return false;
          const evStart = getEventDateTimeMs(ev.date, ev.startTime);
          const evEnd   = getEventDateTimeMs(ev.date, ev.endTime);
          if (evStart === null || evEnd === null) return false;
          return timesOverlap(newStart, newEnd, evStart, evEnd);
        });

        if (conflictingEvent) {
          await showAlert("You cannot join the event because the date and time conflicts with another event you joined.");
          return;
        }
      }

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
        await updateDoc(eventDocRef, { anticipatedParticipants: arrayUnion(currentUser.uid) });

        try {
          const gcSnap = await getDocs(query(collection(db, 'chats'), where('linkedEventId', '==', selectedEvent.id)));
          for (const gcDoc of gcSnap.docs) {
            await updateDoc(doc(db, 'chats', gcDoc.id), { participantIds: arrayUnion(currentUser.uid) });
          }
        } catch (gcErr) {
          console.error("GC join error:", gcErr);
        }

        try {
          const notifRef = collection(db, `users/${currentUser.uid}/notifications`);
          await addDoc(notifRef, {
            title: "Successfully Joined Event",
            body: `You have successfully joined the charity event "${selectedEvent.title}".`,
            type: "Event",
            status: "success",
            read: false,
            createdAt: serverTimestamp(),
            eventId: selectedEvent.id,
          });
        } catch (notifErr) {
          console.error("Join notif error:", notifErr);
        }

        await showAlert("You have successfully registered as a participant!");
      } catch (err) {
        console.error("Error joining event: ", err);
        await showAlert("Failed to join event. Please check your network connection.");
      }
    }
  };

  /* ── View Participants ── */
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

  /* ── Filters / search ── */
  const toggleFilter = (cat) => {
    setActiveFilters((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setCurrentPage(1);
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

  const getEventStartMs = (ev) => {
    if (!ev.date || !ev.startTime) return 0;
    try {
      const [y, mo, d] = ev.date.split('-').map(Number);
      const [h, m] = ev.startTime.split(':').map(Number);
      return new Date(y, mo - 1, d, h, m, 0, 0).getTime();
    } catch { return 0; }
  };
  const getCreatedAtMs = (ev) => {
    const ts = ev?.createdAt;
    if (!ts) return 0;
    return ts.toDate ? ts.toDate().getTime() : new Date(ts).getTime();
  };

  const filteredEvents = events
    .filter((ev) => {
      if (ev.date && ev.startTime && ev.endTime) {
        try {
          const dateObj = parseDate(ev.date);
          const { hours: endH, minutes: endM } = parseTime(ev.endTime);
          const eventEndTime = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), endH, endM, 0, 0);
          if (currentTime >= eventEndTime) {
            if (selectedEvent && selectedEvent.id === ev.id) setSelectedEvent(null);
            return false;
          }
        } catch (err) {
          console.error("Error verifying end boundary:", err);
        }
      }
      const matchesSearch   = (ev.title || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeFilters.length === 0 || activeFilters.includes(ev.category);
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const uid = auth.currentUser?.uid;
      const aJoined = uid && (a.anticipatedParticipants || []).includes(uid);
      const bJoined = uid && (b.anticipatedParticipants || []).includes(uid);

      if (aJoined && !bJoined) return -1;
      if (!aJoined && bJoined) return 1;

      if (sortOption === 'newest')       return getCreatedAtMs(b) - getCreatedAtMs(a);
      if (sortOption === 'oldest')       return getCreatedAtMs(a) - getCreatedAtMs(b);
      if (sortOption === 'soonest')      return getEventStartMs(a) - getEventStartMs(b);
      if (sortOption === 'latest_start') return getEventStartMs(b) - getEventStartMs(a);
      
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / CARDS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedEvents = filteredEvents.slice((safePage - 1) * CARDS_PER_PAGE, safePage * CARDS_PER_PAGE);

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

  /* ── Carousel nav handlers (immediate) ── */
  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === 0 ? (selectedEvent?.imageUrls?.length || 1) - 1 : prev - 1
    );
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % (selectedEvent?.imageUrls?.length || 1));
  };

  return (
    <div className={styles.homeContainer}>

      {/* ── Blue patterned background for Charity Events ── */}
      <section ref={sectionRef} className={`${styles.causesSection} ${styles.causesSectionEvent}`}>
        <div className={styles.causesHeader}>
          <div className={styles.headerInfo}>
            <div className={styles.aboutLabel}>
              <span>Charity Events</span>
              <div className={`${styles.line} ${styles.evtAccentLine}`}></div>
            </div>
            <h2 className={styles.aboutTitle}>Participate In Or Create Your Own Events!</h2>
          </div>
          {/* Green "Create Event" button */}
          <button
            className={`${styles.readMoreBtn} ${styles.readMoreBtnGreen}`}
            onClick={openCreateModal}
          >
            + Create Charity Event
          </button>
        </div>

        {/* Search with magnifying glass icon */}
        <div className={styles.searchContainer}>
          <SearchIcon />
          <input
            className={`${styles.searchContainerInput} ${styles.searchEvent}`}
            type="text"
            placeholder="Search events by name…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter chips + sort — blue accent for Events page */}
        <div className={styles.filterContainer}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleFilter(cat)}
              className={`${styles.filterBtn} ${
                activeFilters.includes(cat)
                  ? styles.filterBtnActiveBlue
                  : styles.filterBtnBlue
              }`}
            >
              {cat}
            </button>
          ))}
          <div className={styles.sortSelectWrap}>
            <select
              className={`${styles.sortSelect} ${styles.sortSelectEvt}`}
              value={sortOption}
              onChange={(e) => { setSortOption(e.target.value); setCurrentPage(1); }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="soonest">Starting Soonest</option>
              <option value="latest_start">Starting Latest</option>
            </select>
          </div>
        </div>

        <div className={styles.causesGrid}>
          {loading ? (
            <div className={styles.emptyState}>
              <div className={styles.loadingSpinner}></div>
              <span>Loading Charity Events…</span>
            </div>
          ) : filteredEvents.length === 0 ? (
            <p className={styles.emptyState}>No events found.</p>
          ) : (
            paginatedEvents.map((ev) => (
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

        {/* ── Spacer so last card row isn't hidden under the pill ── */}
        {!loading && filteredEvents.length > CARDS_PER_PAGE && (
          <div className={styles.paginationSpacer} />
        )}
      </section>

      {/* ── Pagination pill — rendered outside <section> so fixed positioning is never clipped ── */}
      {!loading && filteredEvents.length > CARDS_PER_PAGE && (
        <div className={`${styles.paginationBar} ${styles.paginationBarEvt}`}>
          {/* First « */}
          <button
            className={`${styles.pageBtn} ${styles.pageBtnEvt}`}
            disabled={safePage === 1}
            onClick={() => { setCurrentPage(1); sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            aria-label="First page"
          >«</button>

          {/* Prev ‹ */}
          <button
            className={`${styles.pageBtn} ${styles.pageBtnEvt}`}
            disabled={safePage === 1}
            onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            aria-label="Previous page"
          >‹ Prev</button>

          <div className={styles.pageDivider} />

          {/* Smart page window */}
          <div className={styles.pageDots}>
            {(() => {
              const pages = [];
              const delta = 2;
              const left  = Math.max(2, safePage - delta);
              const right = Math.min(totalPages - 1, safePage + delta);

              pages.push(
                <button key={1}
                  className={`${styles.pageDot} ${safePage === 1 ? styles.pageDotActiveEvt : ''}`}
                  onClick={() => { setCurrentPage(1); sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                >1</button>
              );

              if (left > 2) pages.push(<span key="el1" className={styles.pageEllipsis}>…</span>);

              for (let i = left; i <= right; i++) {
                pages.push(
                  <button key={i}
                    className={`${styles.pageDot} ${safePage === i ? styles.pageDotActiveEvt : ''}`}
                    onClick={() => { setCurrentPage(i); sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                  >{i}</button>
                );
              }

              if (right < totalPages - 1) pages.push(<span key="el2" className={styles.pageEllipsis}>…</span>);

              if (totalPages > 1) pages.push(
                <button key={totalPages}
                  className={`${styles.pageDot} ${safePage === totalPages ? styles.pageDotActiveEvt : ''}`}
                  onClick={() => { setCurrentPage(totalPages); sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                >{totalPages}</button>
              );

              return pages;
            })()}
          </div>

          <div className={styles.pageDivider} />

          {/* Next › */}
          <button
            className={`${styles.pageBtn} ${styles.pageBtnEvt}`}
            disabled={safePage === totalPages}
            onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            aria-label="Next page"
          >Next ›</button>

          {/* Last » */}
          <button
            className={`${styles.pageBtn} ${styles.pageBtnEvt}`}
            disabled={safePage === totalPages}
            onClick={() => { setCurrentPage(totalPages); sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            aria-label="Last page"
          >»</button>
        </div>
      )}

      {/* ══════════════════════ CREATE MODAL ══════════════════════ */}
      {showCreateModal && (
        <AnimatedModal onClose={() => setShowCreateModal(false)}>
          <div className={styles.modalHeader}>
            <h3>New Charity Event</h3>
            <button className={styles.closeBtn} onClick={() => setShowCreateModal(false)}>×</button>
          </div>

          <div className={styles.modalBody}>
            <form onSubmit={handleCreateEvent} className={styles.modalFormLayout} noValidate>
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
                    Add Co-Organizers (Optional)
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
                          onClick={() => addCoOrganizer(user)}
                        >
                          {user.firstName} {user.lastName}
                          {user.email ? ` — ${user.email}` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedCoOrganizers.length > 0 && (
                  <div className={styles.coOrgTagsRow}>
                    {selectedCoOrganizers.map((u) => (
                      <span key={u.id} className={styles.coOrgTag}>
                        {u.firstName} {u.lastName}{u.email ? ` (${u.email})` : ''}
                        <button type="button" className={styles.coOrgTagRemove} onClick={() => removeCoOrganizer(u.id)}>×</button>
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
                    <input type="file" multiple accept="image/*" hidden onChange={handleFileChange} />
                  </label>
                  <span className={styles.fileNameDisplay}>
                    {images.length > 0 ? `${images.length} file${images.length > 1 ? 's' : ''} selected` : 'No file chosen'}
                  </span>
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
                {photoError && (
                  <span className={styles.photoRequiredHint}>At least one photo is required.</span>
                )}
              </div>

              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? 'Posting…' : 'Post Event'}
              </button>
            </form>
          </div>
        </AnimatedModal>
      )}

      {/* ══════════════════════ DETAIL MODAL ══════════════════════ */}
      {selectedEvent && (
        <AnimatedModal onClose={() => setSelectedEvent(null)}>
          <div className={styles.modalHeader}>
            <h3>Event Details</h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                className={styles.reportBtn}
                onClick={() => handleGuestAction(() => setShowReportModal(true))}
                title="Report Content"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: 0.7,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
              >
                <img src={alertIcon} alt="Report Content" style={{ width: '35px', height: '35px' }} />
              </button>
              
              <button className={styles.closeBtn} onClick={() => setSelectedEvent(null)}>×</button>
            </div>
          </div>

          <div className={styles.modalBody} style={{ padding: 0 }}>
            {selectedEvent.imageUrls?.length > 0 ? (
              <div className={styles.carouselContainer}>
                {selectedEvent.imageUrls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Slide ${i + 1}`}
                    className={`${styles.carouselImg}${i === currentImageIndex ? ' ' + styles.active : ''}`}
                  />
                ))}
                {selectedEvent.imageUrls.length > 1 && (
                  <>
                    <button className={`${styles.carouselNav} ${styles.prev}`} onClick={handlePrev}>‹</button>
                    <button className={`${styles.carouselNav} ${styles.next}`} onClick={handleNext}>›</button>
                    <div className={styles.carouselDots}>
                      {selectedEvent.imageUrls.map((_, i) => (
                        <button
                          key={i}
                          className={`${styles.carouselDot}${i === currentImageIndex ? ' ' + styles.carouselDotActive : ''}`}
                          onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i); }}
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
                  <div className={styles.modalDataField}>{selectedEvent.organizerName || 'Main Organizer'}</div>
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
                    ) : '—'}
                  </div>
                </div>
              </div>

              <div className={styles.itemFieldContainer}>
                <button
                  type="button"
                  className={styles.viewParticipantsBtn}
                  onClick={handleViewParticipants}
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
              className={`${styles.volunteerBtn}${currentUserJoined(selectedEvent) ? ' ' + styles.volunteerBtnJoined : ''}`}
              onClick={() => handleGuestAction(handleJoinOrLeaveEvent)}
            >
              {currentUserJoined(selectedEvent) ? 'LEAVE EVENT' : 'JOIN EVENT'}
            </button>
          </div>
        </AnimatedModal>
      )}

      {/* ══════════════════════ SUBMIT REPORT MODAL ══════════════════════ */}
      {showReportModal && (
        <AnimatedModal onClose={closeReportModal} maxWidth={450}>
          <div className={styles.modalHeader}>
            <h3>Report Misconduct</h3>
          </div>
          <div className={styles.modalBody} style={{ padding: '20px 24px' }}>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px', lineHeight: '1.4' }}>
              Help us maintain community standards. Your submission remains confidential.
            </p>
            
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
              Reason for Report <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <select 
              value={reportReason} 
              onChange={(e) => setReportReason(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                marginBottom: '16px',
                fontSize: '14px',
                background: '#fff'
              }}
            >
              <option value="">-- Choose a reason --</option>
              <option value="Scam or Fraud">Scam or Fraudulent Request</option>
              <option value="Inappropriate Content">Inappropriate or Offensive Material</option>
              <option value="Harassment">Harassment or Bullying</option>
              <option value="False Information">Spam / Misinformation</option>
              <option value="Other">Other</option>
            </select>

            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
              Image Proof <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <div style={{ marginBottom: '16px' }}>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setReportProof(e.target.files[0]);
                    setReportProofError(false);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: reportProofError ? '1px solid #dc3545' : '1px solid #ccc',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              {reportProofError && (
                <span style={{ color: '#dc3545', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                  Please attach a screenshot or image as evidence.
                </span>
              )}
              {reportProof && (
                <div style={{ position: 'relative', display: 'inline-block', marginTop: '10px' }}>
                  <img 
                    src={URL.createObjectURL(reportProof)} 
                    alt="Proof preview" 
                    style={{ height: '80px', borderRadius: '4px', border: '1px solid #ddd', objectFit: 'cover' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setReportProof(null)}
                    style={{
                      position: 'absolute', top: '-8px', right: '-8px', background: '#dc3545',
                      color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px',
                      cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >✕</button>
                </div>
              )}
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button 
              type="button"
              className={styles.cancelBtn} 
              onClick={closeReportModal}
              disabled={isSubmittingReport}
            >
              Cancel
            </button>
            <button 
              type="button"
              className={styles.submitBtn} 
              onClick={() => handleReportSubmit(selectedEvent)} 
              disabled={isSubmittingReport}
              style={{ 
                margin: 0, 
                backgroundColor: '#dc3545', 
                borderColor: '#dc3545',
                opacity: isSubmittingReport ? 0.6 : 1 
              }}
            >
              {isSubmittingReport ? 'Sending...' : 'Submit'}
            </button>
          </div>
        </AnimatedModal>
      )}

      {/* ══════════════════════ PARTICIPANTS LIST MODAL ══════════════════════ */}
      {showParticipantsModal && (
        <AnimatedModal onClose={() => setShowParticipantsModal(false)} maxWidth={450}>
          <div className={styles.modalHeader}>
            <h3>Registered Participants</h3>
            <button className={styles.closeBtn} onClick={() => setShowParticipantsModal(false)}>×</button>
          </div>
          <div className={styles.modalBody}>
            {loadingParticipants ? (
              <div className={styles.emptyState} style={{ padding: '40px 0' }}>
                <div className={styles.loadingSpinner}></div>
                <span>Loading participants…</span>
              </div>
            ) : participantProfiles.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999', padding: '20px 0', fontFamily: 'var(--font)' }}>
                No participants have registered yet.
              </p>
            ) : (
              <div className={styles.participantList}>
                {participantProfiles.map((p, idx) => (
                  <div key={p.id} className={styles.participantRow}>
                    <span className={styles.participantNumber}>{idx + 1}</span>
                    <span className={styles.participantName}>{p.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AnimatedModal>
      )}

      {/* ══════════════════════ THEME MODAL ══════════════════════ */}
      {themeModal && (
        <AnimatedModal onClose={themeModal.onCancel || themeModal.onConfirm} maxWidth={400} style={{ padding: '24px', textAlign: 'center' }}>
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#1a1a1a' }}>{themeModal.type === 'confirm' ? 'Confirm Action' : 'Notice'}</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '0.9rem', color: '#666', lineHeight: 1.5 }}>
              {themeModal.message}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {themeModal.type === 'confirm' && (
                <button className={styles.cancelBtn} onClick={themeModal.onCancel}>
                  Cancel
                </button>
              )}
              <button className={styles.submitBtn} onClick={themeModal.onConfirm} style={{ margin: 0 }}>
                {themeModal.type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        </AnimatedModal>
      )}

      <GuestRestrictionModal isOpen={showGuestModal} onClose={() => setShowGuestModal(false)} />

      <Footer />
    </div>
  );
};

export default CharityEvents;
