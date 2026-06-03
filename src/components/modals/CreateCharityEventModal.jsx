import React, { useState, useEffect, useRef } from 'react';
import { db, storage, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AnimatedModal from '../AnimatedModal';
import styles from '../requests_and_events.module.css';

/* ─── Draft storage key ─────────────────────────────────────────────────── */
const DRAFT_KEY = 'charity_event_draft';

/* ─── Module-level image cache (survives re-renders, cleared on demand) ─── */
let _imageCache = []; // [{ file: File, preview: string }]

const saveImageCache = (imgs) => { _imageCache = imgs; };
const loadImageCache = () => _imageCache;
const clearImageCache = () => {
  _imageCache.forEach((img) => URL.revokeObjectURL(img.preview));
  _imageCache = [];
};

/* ─── Draft helpers ─────────────────────────────────────────────────────── */
const EMPTY_FORM = {
  title: '',
  location: '',
  date: '',
  startTime: '',
  endTime: '',
  description: '',
  category: 'Health',
  participantLimit: '',
  status: 'Upcoming',
  approvalStatus: 'Pending'
};

const saveDraft = (formData, imageNames, selectedCoOrganizers) => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, imageNames, selectedCoOrganizers, savedAt: Date.now() }));
};

const loadDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const clearDraft = () => localStorage.removeItem(DRAFT_KEY);

const hasMeaningfulData = (formData, images, coOrganizers) => {
  return (
    formData.title.trim() ||
    formData.location.trim() ||
    formData.description.trim() ||
    formData.date ||
    images.length > 0 ||
    coOrganizers.length > 0
  );
};

/* ─── Component ─────────────────────────────────────────────────────────── */
const CreateCharityEventModal = ({ isOpen, onClose, showAlert }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [images, setImages] = useState([]); // [{ file: File, preview: string }]

  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCoOrganizers, setSelectedCoOrganizers] = useState([]);
  
  const [photoError, setPhotoError] = useState(false);
  const [coOrgError, setCoOrgError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Draft & Reset states
  const [draftExists, setDraftExists] = useState(false);
  const [draftBannerVisible, setDraftBannerVisible] = useState(false);
  const [draftSavedFlash, setDraftSavedFlash] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const flashTimer = useRef(null);

  const categories = ['Basic Needs', 'Health', 'Education', 'Disaster', 'Community Support', 'Environment', 'Feeding'];
  const todayStr = new Date().toISOString().split('T')[0];

  /* ── Fetch Users List ── */
  useEffect(() => {
    if (!isOpen) return;
    const fetchUsersList = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching users list: ", err);
      }
    };
    fetchUsersList();
  }, [isOpen]);

  /* ── Co-Organizer Search Filter ── */
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

  /* ── On open: check for existing draft ── */
  useEffect(() => {
    if (!isOpen) return;
    const draft = loadDraft();
    if (draft) {
      setDraftExists(true);
      setDraftBannerVisible(true);
    }
  }, [isOpen]);

  /* ── Sync image cache → state on open (restores previews if modal re-opens) ── */
  useEffect(() => {
    if (isOpen) {
      const cached = loadImageCache();
      if (cached.length > 0) setImages(cached);
    }
  }, [isOpen]);

  /* ── Keep module cache in sync with state ── */
  useEffect(() => {
    saveImageCache(images);
  }, [images]);

  if (!isOpen) return null;

  /* ── Draft Handlers ── */
  const handleRestoreDraft = () => {
    const draft = loadDraft();
    if (!draft) return;
    setFormData(draft.formData);
    setSelectedCoOrganizers(draft.selectedCoOrganizers || []);
    
    const cached = loadImageCache();
    if (cached.length > 0) setImages(cached);
    
    setDraftBannerVisible(false);
    setDraftExists(false);
  };

  const handleDismissDraft = () => {
    setDraftBannerVisible(false);
    setDraftExists(false);
  };

  const handleSaveDraft = () => {
    if (!hasMeaningfulData(formData, images, selectedCoOrganizers)) return;
    saveDraft(formData, images.map((i) => i.file.name), selectedCoOrganizers);
    setDraftExists(true);
    setDraftSavedFlash(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setDraftSavedFlash(false), 2000);
  };

  const handleResetConfirmed = () => {
    clearDraft();
    clearImageCache();
    setImages([]);
    setFormData(EMPTY_FORM);
    setSelectedCoOrganizers([]);
    setUserSearch('');
    setSearchResults([]);
    setPhotoError(false);
    setCoOrgError(false);
    setDraftExists(false);
    setDraftSavedFlash(false);
    setShowResetConfirm(false);
  };

  /* ── File handling ── */
  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setImages((prev) => [...prev, ...newFiles]);
      setPhotoError(false);
    }
  };

  const removeSelectedImage = (index) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  /* ── Co-Organizer Handlers ── */
  const addCoOrganizer = (user) => {
    setSelectedCoOrganizers((prev) => [...prev, user]);
    setUserSearch('');
    setSearchResults([]);
    setCoOrgError(false);
  };

  const removeCoOrganizer = (id) => {
    setSelectedCoOrganizers((prev) => prev.filter((u) => u.id !== id));
  };

  /* ── Helpers for Time Conflict Check ── */
  const timesOverlap = (startA, endA, startB, endB) => startA < endB && endA > startB;

  const getEventDateTimeMs = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
  };

  const formatTime = (time24) => {
    if (!time24) return '';
    const [hoursStr, minutesStr] = time24.split(':');
    let hours = parseInt(hoursStr, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    return `${hours}:${minutesStr} ${ampm}`;
  };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
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

    if (images.length === 0) { 
      setPhotoError(true); 
      return; 
    }

    const currentUser = auth.currentUser;
    let newStart = getEventDateTimeMs(formData.date, formData.startTime);
    let newEnd   = getEventDateTimeMs(formData.date, formData.endTime);

    if (newStart !== null && newEnd !== null && newEnd <= newStart) {
      newEnd += 24 * 60 * 60 * 1000;
    }

    if (currentUser) {
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
              let evStart = getEventDateTimeMs(ev.date, ev.startTime);
              let evEnd   = getEventDateTimeMs(ev.date, ev.endTime);
              
              if (evStart !== null && evEnd !== null && evEnd <= evStart) {
                evEnd += 24 * 60 * 60 * 1000;
              }

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
      for (const imgObj of images) {
        const storageRef = ref(storage, `charity_events/${Date.now()}_${imgObj.file.name}`);
        await uploadBytes(storageRef, imgObj.file);
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

      // Reset everything after submission
      clearDraft();
      clearImageCache();
      setImages([]);
      setFormData(EMPTY_FORM);
      setSelectedCoOrganizers([]);
      setDraftExists(false);

      await showAlert("Your charity event has been submitted. Your post will be published as soon as it meets our guidelines and is approved by an administrator.");
      onClose();
    } catch (err) {
      console.error(err);
      await showAlert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSave = hasMeaningfulData(formData, images, selectedCoOrganizers);

  return (
    <AnimatedModal onClose={onClose}>
      <div className={styles.modalHeader}>
        <h3>New Charity Event</h3>
        <button className={styles.closeBtn} onClick={onClose} disabled={isSubmitting}>×</button>
      </div>

      <div className={styles.modalBody}>
        {/* ── Draft restore banner ── */}
        {draftBannerVisible && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            padding: '10px 14px',
            marginBottom: '14px',
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: '#92400e',
            flexWrap: 'wrap',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              You have an unsaved draft. Restore it?
            </span>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={handleRestoreDraft}
                style={{
                  padding: '4px 12px', borderRadius: '6px', border: 'none',
                  background: '#d97706', color: '#fff', fontWeight: '600',
                  fontSize: '0.8rem', cursor: 'pointer',
                }}
              >
                Restore
              </button>
              <button
                type="button"
                onClick={handleDismissDraft}
                style={{
                  padding: '4px 10px', borderRadius: '6px',
                  border: '1px solid #fcd34d', background: 'transparent',
                  color: '#92400e', fontWeight: '500',
                  fontSize: '0.8rem', cursor: 'pointer',
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.modalFormLayout} noValidate>
          <div className={styles.itemFieldContainer}>
            <label className={styles.itemLabel}>Event Title</label>
            <input
              type="text"
              placeholder="e.g. Community Clean-up Drive"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={isSubmitting}
              maxLength="60"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.itemFieldContainer}>
              <label className={styles.itemLabel}>Category</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                disabled={isSubmitting}
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
                disabled={isSubmitting}
                maxLength="80"
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
                disabled={isSubmitting}
                maxLength="50"
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
                    <button type="button" className={styles.coOrgTagRemove} onClick={() => removeCoOrganizer(u.id)} disabled={isSubmitting}>×</button>
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </div>
            <div className={styles.itemFieldContainer}>
              <label className={styles.itemLabel}>End Time</label>
              <input
                type="time"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                disabled={isSubmitting}
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
              disabled={isSubmitting}
              maxLength="400"
            />
          </div>

          <div className={styles.fileUploadFieldset} style={photoError ? { borderColor: '#e05a5a' } : {}}>
            <span className={styles.itemLabel} style={photoError ? { color: '#e05a5a' } : {}}>
              EVENT BANNER / PICTURES
            </span>
            <div className={styles.fileInputWrapper}>
              <label className={styles.customBrowseBtn} style={{ opacity: isSubmitting ? 0.6 : 1, pointerEvents: isSubmitting ? 'none' : 'auto' }}>
                Browse…
                <input type="file" multiple accept="image/*" hidden onChange={handleFileChange} disabled={isSubmitting} />
              </label>
              <span className={styles.fileNameDisplay}>
                {images.length > 0 ? `${images.length} file${images.length > 1 ? 's' : ''} selected` : 'No file chosen'}
              </span>
            </div>
            {images.length > 0 && (
              <div className={styles.thumbnailGrid}>
                {images.map((imgObj, index) => (
                  <div key={index} className={styles.thumbnailContainer}>
                    <img src={imgObj.preview} alt="preview" className={styles.thumbnailImg} />
                    <button type="button" className={styles.removeThumbBtn} onClick={() => removeSelectedImage(index)} disabled={isSubmitting}>×</button>
                  </div>
                ))}
              </div>
            )}
            {photoError && (
              <span className={styles.photoRequiredHint}>At least one photo is required.</span>
            )}
          </div>

          {/* ── Draft / Reset / Submit action bar ── */}
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: '4px',
          }}>
            {/* Reset */}
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              disabled={isSubmitting}
              title="Clear all fields and images"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1.5px solid #e2e8f0',
                background: '#f8fafc',
                color: '#64748b',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.5 : 1,
                transition: 'background 0.15s',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.background = '#f1f5f9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
              </svg>
              Reset
            </button>

            {/* Save Draft */}
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSubmitting || !canSave}
              title="Save your progress as a draft"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1.5px solid #3b82f6',
                background: draftSavedFlash ? '#3b82f6' : '#eff6ff',
                color: draftSavedFlash ? '#fff' : '#1d4ed8',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: (isSubmitting || !canSave) ? 'not-allowed' : 'pointer',
                opacity: (isSubmitting || !canSave) ? 0.5 : 1,
                transition: 'background 0.2s, color 0.2s',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {draftSavedFlash ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Saved!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Save Draft
                </>
              )}
            </button>

            {/* Submit */}
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
              style={{ flex: 1, minWidth: '120px', margin: 0 }}
            >
              {isSubmitting ? 'Posting…' : 'Post Event'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Reset confirmation overlay ── */}
      {showResetConfirm && (
        <div
          onClick={() => setShowResetConfirm(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15,23,42,0.45)',
            zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '14px',
              padding: '28px 24px 22px',
              maxWidth: '360px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              textAlign: 'center',
            }}
          >
            <div style={{
              width: '46px', height: '46px',
              background: '#fef2f2',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
              </svg>
            </div>
            <h4 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>
              Reset all fields?
            </h4>
            <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>
              This will clear all your inputs, uploaded images, and any saved draft. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: '8px',
                  border: '1.5px solid #e2e8f0', background: '#f8fafc',
                  color: '#475569', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetConfirmed}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: '8px',
                  border: 'none', background: '#ef4444',
                  color: '#fff', fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer',
                }}
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatedModal>
  );
};

export default CreateCharityEventModal;
