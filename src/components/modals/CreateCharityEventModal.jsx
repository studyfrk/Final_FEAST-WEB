import React, { useState, useEffect } from 'react';
import { db, storage, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AnimatedModal from '../AnimatedModal';
import styles from '../requests_and_events.module.css';

const CreateCharityEventModal = ({ isOpen, onClose, showAlert }) => {
  const [formData, setFormData] = useState({
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
  });

  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCoOrganizers, setSelectedCoOrganizers] = useState([]);
  const [images, setImages] = useState([]);
  
  const [photoError, setPhotoError] = useState(false);
  const [coOrgError, setCoOrgError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = ['Basic Needs', 'Health', 'Education', 'Disaster'];
  const todayStr = new Date().toISOString().split('T')[0];

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

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files) {
      setImages((prev) => [...prev, ...Array.from(e.target.files)]);
      setPhotoError(false);
    }
  };

  const removeSelectedImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const addCoOrganizer = (user) => {
    setSelectedCoOrganizers((prev) => [...prev, user]);
    setUserSearch('');
    setSearchResults([]);
    setCoOrgError(false);
  };

  const removeCoOrganizer = (id) => {
    setSelectedCoOrganizers((prev) => prev.filter((u) => u.id !== id));
  };

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
    
    if (formData.endTime <= formData.startTime) {
      await showAlert('End time must be later than the start time.');
      return;
    }

    if (images.length === 0) { 
      setPhotoError(true); 
      return; 
    }

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
      onClose();
    } catch (err) {
      console.error(err);
      await showAlert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatedModal onClose={onClose}>
      <div className={styles.modalHeader}>
        <h3>New Charity Event</h3>
        <button className={styles.closeBtn} onClick={onClose} disabled={isSubmitting}>×</button>
      </div>

      <div className={styles.modalBody}>
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
                {images.map((file, index) => (
                  <div key={index} className={styles.thumbnailContainer}>
                    <img src={URL.createObjectURL(file)} alt="preview" className={styles.thumbnailImg} />
                    <button type="button" className={styles.removeThumbBtn} onClick={() => removeSelectedImage(index)} disabled={isSubmitting}>×</button>
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
  );
};

export default CreateCharityEventModal;
