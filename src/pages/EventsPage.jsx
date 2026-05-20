import React, { useState, useEffect, useRef } from 'react';
import { db, auth, storage } from '../firebase'; 
import { collection, onSnapshot, query, orderBy, addDoc, getDocs, serverTimestamp, updateDoc, doc, where, writeBatch, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import styles from '../components/admin_pages.module.css';

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  // Synchronized States with CharityEvents.jsx
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCoOrganizers, setSelectedCoOrganizers] = useState([]);
  const [coOrgError, setCoOrgError] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '', 
    location: '', 
    date: '', 
    startTime: '',
    endTime: '',
    category: 'Health',
    description: '', 
    participantLimit: '',
    imageUrls: [],
    status: 'Upcoming', 
    approvalStatus: 'Pending' 
  });

  const categories = ['Health', 'Disaster Management', 'Community Support', 'Education', 'Environment', 'Feeding'];
  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 2);
  const maxDateString = maxDate.toISOString().split('T')[0];

  const getEventDateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    return new Date(`${dateStr}T${timeStr}`);
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return "N/A";
    if (dateString.toDate) {
      return dateString.toDate().toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      });
    }
    const dateObj = new Date(dateString);
    return dateObj.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  };

  const formatTime12hr = (time24) => {
    if (!time24) return "N/A";
    if (time24.toDate) {
      const d = time24.toDate();
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hours12 = h % 12 || 12;
    return `${hours12}:${minutes} ${ampm}`;
  };

  useEffect(() => {
    if (events.length === 0) return;

    const updateEventStatuses = async () => {
      const now = new Date();
      const batch = writeBatch(db);
      let hasChanges = false;

      for (const ev of events) {
        const start = getEventDateTime(ev.date, ev.startTime);
        const end = getEventDateTime(ev.date, ev.endTime);
        if (!start || !end) continue;

        let updates = {};

        if (now > start && (ev.approvalStatus === 'Pending' || ev.approvalStatus === 'Processing')) {
          updates.approvalStatus = 'Rejected';
          updates.updatedAt = serverTimestamp();
          hasChanges = true;

          if (ev.organizerId) {
            const notifRef = collection(db, `users/${ev.organizerId}/notifications`);
            addDoc(notifRef, {
              title: "Event Automatically Rejected",
              body: `Your event "${ev.title || 'Untitled'}" was automatically rejected because it reached its start time without being approved.`,
              type: "Event",
              status: "error",
              read: false,
              createdAt: serverTimestamp(),
              eventId: ev.id
            }).catch(err => console.error("Notification failed:", err));

            addDoc(collection(db, "audit_logs"), {
              adminName: "System System",
              role: "Automated Service",
              actionType: "Auto-Moderation",
              actionDetails: `Automatically rejected event due to expiration.`,
              targetName: ev.title || "Untitled",
              eventLifecycle: ev.status || "Upcoming",
              status: "Success",
              timestamp: serverTimestamp(),
              type: "event" 
            }).catch(err => console.error("Audit log failed:", err));
          }
        }

        if (ev.approvalStatus === 'Approved' && ev.status === 'Upcoming' && now >= start && now <= end) {
          updates.status = 'Ongoing';
          hasChanges = true;
        }

        if (ev.status !== 'Completed' && now > end) {
          updates.status = 'Completed';
          hasChanges = true;
        }

        if (Object.keys(updates).length > 0) {
          const eventRef = doc(db, "charity_events", ev.id);
          batch.update(eventRef, updates);
        }
      }

      if (hasChanges) {
        try {
          await batch.commit();
          console.log("Automatic status updates applied.");
        } catch (err) {
          console.error("Batch update failed:", err);
        }
      }
    };

    const timer = setTimeout(updateEventStatuses, 1000); 
    return () => clearTimeout(timer);
  }, [events]);

  useEffect(() => {
    const q = query(collection(db, "charity_events"), orderBy("createdAt", "desc"));
    const unsubEvents = onSnapshot(q, (snapshot) => {
      const allEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const visibleEvents = allEvents.filter(ev => {
        if (ev.approvalStatus === 'Approved' || ev.approvalStatus === 'Rejected') return true;
        const coOrgs = ev.coOrganizers || [];
        if (coOrgs.length === 0) return false;
        const acceptances = ev.coOrganizerAcceptances || {};
        return coOrgs.every(co => acceptances[co.id] === 'accepted');
      });
      setEvents(visibleEvents);
    });
    return () => unsubEvents();
  }, []);

  // Case-Insensitive Dropdown Realtime Fetch Synchronized with CharityEvents
  useEffect(() => {
    const fetchUsers = async () => {
      const trimmed = userSearch.trim();
      if (trimmed.length < 1) { setSearchResults([]); return; }
      
      // Convert raw search to capitalized Title Case (e.g., 'john doe' -> 'John Doe')
      const formattedSearch = trimmed
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      try {
        const firstSnap = await getDocs(query(
          collection(db, 'users'),
          where('firstName', '>=', formattedSearch),
          where('firstName', '<=', formattedSearch + '\uf8ff')
        ));
        const lastSnap = await getDocs(query(
          collection(db, 'users'),
          where('lastName', '>=', formattedSearch),
          where('lastName', '<=', formattedSearch + '\uf8ff')
        ));
        
        const combined = new Map();
        [...firstSnap.docs, ...lastSnap.docs].forEach((d) => combined.set(d.id, { id: d.id, ...d.data() }));
        const selectedIds = new Set(selectedCoOrganizers.map((u) => u.id));
        setSearchResults([...combined.values()].filter((u) => !selectedIds.has(u.id)));
      } catch (err) {
        console.error('User search error:', err);
      }
    };
    const delay = setTimeout(fetchUsers, 150);
    return () => clearTimeout(delay);
  }, [userSearch, selectedCoOrganizers]);

  const addCoOrganizer = (user) => {
    setSelectedCoOrganizers((prev) => [...prev, user]);
    setUserSearch('');
    setSearchResults([]);
    setCoOrgError(false);
  };

  const removeCoOrganizer = (id) => {
    setSelectedCoOrganizers((prev) => prev.filter((u) => u.id !== id));
  };

  const handleSelectEvent = async (ev) => {
    setSelectedEvent(ev);
    setCurrentImgIndex(0);
    if (['unread', 'pending'].includes((ev.approvalStatus || '').toLowerCase())) {
      try {
        await updateDoc(doc(db, "charity_events", ev.id), { approvalStatus: 'Processing' });
      } catch (err) { console.error(err); }
    }
  };

  const rejectEventWithReason = async (id, reason) => {
    try {
      await updateDoc(doc(db, "charity_events", id), { 
        approvalStatus: 'Rejected',
        rejectionReason: reason,
        updatedAt: serverTimestamp() 
      });

      const eventTitle = selectedEvent.title || "your event";

      await addDoc(collection(db, "audit_logs"), {
        adminName: auth.currentUser?.displayName || auth.currentUser?.email || "Admin",
        role: "Administrator",
        actionType: "Event Moderation",
        actionDetails: `Rejected event. Reason: ${reason}`,
        targetName: eventTitle,
        eventLifecycle: selectedEvent.status || "Upcoming",
        status: "Success",
        timestamp: serverTimestamp(),
        type: "event" 
      });

      const recipientId = selectedEvent.organizerId;
      if (recipientId) {
        const notifRef = collection(db, `users/${recipientId}/notifications`);
        await addDoc(notifRef, {
          title: "Event Rejected",
          body: `Unfortunately, your event "${eventTitle}" was not approved at this time. Reason: ${reason}`,
          type: "Event",
          status: "error",
          read: false,
          createdAt: serverTimestamp(),
          eventId: id,
          rejectionReason: reason
        });
      }

      setSelectedEvent(null); 
      setShowRejectModal(false);
    } catch (err) { 
      console.error("Error in rejectEventWithReason:", err);
      alert("Failed to reject event."); 
    }
  };

  const updateApprovalStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "charity_events", id), { 
        approvalStatus: newStatus,
        updatedAt: serverTimestamp() 
      });

      const eventTitle = selectedEvent.title || "your event";

      await addDoc(collection(db, "audit_logs"), {
        adminName: auth.currentUser?.displayName || auth.currentUser?.email || "Admin",
        role: "Administrator",
        actionType: "Event Moderation",
        actionDetails: `Changed approval to ${newStatus}`,
        targetName: eventTitle,
        eventLifecycle: selectedEvent.status || "Upcoming",
        status: "Success",
        timestamp: serverTimestamp(),
        type: "event" 
      });

      const recipientId = selectedEvent.organizerId;
      if (recipientId) {
        const notifRef = collection(db, `users/${recipientId}/notifications`);
        const isApproved = newStatus === 'Approved';

        await addDoc(notifRef, {
          title: isApproved ? "Event Approved" : "Event Rejected",
          body: isApproved 
            ? `Your event "${eventTitle}" has been approved and is now live.`
            : `Unfortunately, your event "${eventTitle}" was not approved at this time.`,
          type: "Event",
          status: isApproved ? "success" : "error",
          read: false,
          createdAt: serverTimestamp(),
          eventId: id
        });
      }

      // ── Create group chat only when event is approved ──
      if (newStatus === 'Approved') {
        try {
          const eventSnap = await getDoc(doc(db, 'charity_events', id));
          if (eventSnap.exists()) {
            const evData = eventSnap.data();
            const allParticipantIds = [
              evData.organizerId,
              ...(evData.coOrganizers || []).map(co => co.id)
            ].filter(Boolean);

            await addDoc(collection(db, 'chats'), {
              participantIds: allParticipantIds,
              adminIds: [evData.organizerId].filter(Boolean),
              creatorId: evData.organizerId,
              isGroup: true,
              groupName: evData.title || 'Event Group Chat',
              groupPhoto: evData.imageUrls?.[0] || '',
              description: evData.description || '',
              lastMessage: `Group chat created for approved event "${evData.title}"`,
              lastMessageAt: serverTimestamp(),
              createdAt: serverTimestamp(),
              hiddenBy: [],
              linkedEventId: id
            });
          }
        } catch (gcErr) {
          console.error('Error creating event group chat on approval:', gcErr);
        }
      }

      setSelectedEvent(null); 
    } catch (err) { 
      console.error("Error in updateApprovalStatus:", err);
      alert("Failed to update status."); 
    }
  };

  const handleMultipleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setIsUploading(true);
    setPhotoError(false);
    try {
      const uploadPromises = files.map(async (file) => {
        const storageRef = ref(storage, `charity_events/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
      });
      const urls = await Promise.all(uploadPromises);
      setFormData(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ...urls] }));
    } catch (error) { alert("Failed to upload images."); }
    finally { setIsUploading(false); }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    let hasError = false;

    if (formData.imageUrls.length === 0) {
      setPhotoError(true);
      hasError = true;
    }
    if (selectedCoOrganizers.length === 0) {
      setCoOrgError(true);
      hasError = true;
    }
    if (hasError) return;

    try {
      const currentUser = auth.currentUser;
      let organizerName = "Admin Organizer";

      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const uData = userDoc.data();
          organizerName = uData.firstName && uData.lastName ? `${uData.firstName} ${uData.lastName}` : (uData.fullName || currentUser.email.split('@')[0]);
        }
      }

      const parsedLimit = formData.participantLimit.trim() === '' ? null : parseInt(formData.participantLimit, 10);

      const eventData = {
        title: formData.title,
        location: formData.location,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        category: formData.category,
        description: formData.description,
        participantLimit: parsedLimit,
        imageUrls: formData.imageUrls,
        status: formData.status,
        approvalStatus: formData.approvalStatus,
        organizerId: currentUser ? currentUser.uid : null,
        organizerName: organizerName,
        coOrganizers: selectedCoOrganizers.map((u) => ({
          id: u.id,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.fullName || u.email,
          email: u.email ?? '',
        })),
        coOrganizerAcceptances: {},
        anticipatedParticipants: [],
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "charity_events"), eventData);
      const eventId = docRef.id;

      const notificationPromises = selectedCoOrganizers.map(async (collab) => {
        const collabNotifRef = collection(db, `users/${collab.id}/notifications`);
        return addDoc(collabNotifRef, {
          title: "Co-Organizer Invitation",
          body: `${organizerName} has invited you to be a co-organizer for the event "${formData.title}".`,
          type: "Event",
          status: "info",
          read: false,
          createdAt: serverTimestamp(),
          eventId: eventId,
          notifSubtype: "co_organizer_invite",
          organizerName: organizerName,
          eventTitle: formData.title,
          eventDate: formData.date,
          eventStartTime: formData.startTime,
          eventEndTime: formData.endTime,
          eventLocation: formData.location,
          eventDescription: formData.description,
          triggeredBy: currentUser?.uid,
          requiresAction: true,
          actionStatus: 'pending',
        });
      });

      await Promise.all(notificationPromises);
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      console.error("Error creating event:", err);
      alert("Error creating event.");
    }
  };

  const resetForm = () => {
    setFormData({ 
      title: '', location: '', date: '', startTime: '', endTime: '', 
      category: 'Health', description: '', participantLimit: '', imageUrls: [], 
      status: 'Upcoming', approvalStatus: 'Pending' 
    });
    setSelectedCoOrganizers([]);
    setUserSearch('');
    setSearchResults([]);
    setCoOrgError(false);
    setPhotoError(false);
  };

  const filteredEvents = events.filter(ev => {
    const matchesSearch = (ev.title || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (ev.location || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'All' || 
                          (ev.status || '').toLowerCase() === filterStatus.toLowerCase() ||
                          (ev.approvalStatus || '').toLowerCase() === filterStatus.toLowerCase();
    
    return matchesSearch && matchesFilter;
  });

  const handleNextImage = (e) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev + 1) % selectedEvent.imageUrls.length);
  };

  const handlePrevImage = (e) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev - 1 + selectedEvent.imageUrls.length) % selectedEvent.imageUrls.length);
  };

  return (
    <div className={styles.eventsPage}>
      <div>
        <h2 className={styles.contentHeaderTitle}>Events Management</h2>
      </div>

      <div className={styles.tableControls}>
        <select className={styles.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="All">All Filter</option>
          <option disabled>── Lifecycle ──</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
          <option disabled>── Admin ──</option>
          <option value="pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
        <div className={styles.searchContainer}>
          <input className={styles.searchContainerInput} type="text" placeholder="Search events..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <button className={styles.createBtn} onClick={() => { resetForm(); setShowCreateModal(true); }}>
          Add New Event
        </button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.eventsTable}>
          <thead>
            <tr>
              <th className={styles.headerCell}>EVENT TITLE</th>
              <th className={styles.headerCell}>CATEGORY</th>
              <th className={styles.headerCell}>LOCATION</th>
              <th className={styles.headerCell}>DATE</th>
              <th className={styles.headerCell}>STATUS</th>
              <th className={styles.headerCell}>APPROVAL</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((ev) => (
              <tr key={ev.id} className={`${styles.clickableRow} ${['unread', 'pending'].includes((ev.approvalStatus || '').toLowerCase()) ? styles.unreadRow : ''}`} onClick={() => handleSelectEvent(ev)}>
                <td className={styles.tableCell}><span className={styles.evTitle}>{ev.title || "Untitled Event"}</span></td>
                <td className={`${styles.tableCell} ${styles.capitalizeText}`}>{ev.category || "N/A"}</td>
                <td className={styles.tableCell}>{ev.location || "N/A"}</td>
                <td className={styles.tableCell}>{formatDisplayDate(ev.date)}</td>
                <td className={`${styles.tableCell} ${styles.statusCell}`}>
                  <span className={`${styles.statusPill} ${styles[(ev.status || 'upcoming').toLowerCase()]}`}>
                    {ev.status || "Upcoming"}
                  </span>
                </td>
                <td className={`${styles.tableCell} ${styles.statusCell}`}>
                  <span className={`${styles.statusPill} ${styles[(ev.approvalStatus || 'pending').toLowerCase()]}`}>
                    {ev.approvalStatus || "Pending"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className={styles.contentModalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>New Charity Event</h3>
              <button className={styles.closeBtn} onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleCreateEvent} className={styles.modalFormLayout}>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Event Title</label>
                  <input className={styles.itemFieldInput} placeholder="e.g. Community Clean-up Drive" type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Category</label>
                    <select className={styles.itemFieldSelect} required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Location</label>
                    <input className={styles.itemFieldInput} type="text" required placeholder="e.g. Almanza Dos Hall" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                  </div>
                </div>

                <div style={{ position: 'relative' }}>
                  <div className={styles.itemFieldContainer} style={coOrgError ? { borderColor: '#e05a5a' } : {}}>
                    <label className={styles.itemLabel} style={coOrgError ? { color: '#e05a5a' } : {}}>
                      Add Co-Organizers (Required)
                    </label>
                    <input className={styles.itemFieldInput} type="text" placeholder="Search residents by name…" value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setCoOrgError(false); }} autoComplete="off" />
                    {searchResults.length > 0 && (
                      <div className={styles.suggestionsDropdown} style={{ display: 'block', zIndex: 10 }}>
                        {searchResults.map((user) => (
                          <div key={user.id} className={styles.suggestionItem} onClick={() => addCoOrganizer(user)}>
                            <div>{user.firstName} {user.lastName}</div>
                            <div style={{ fontSize: '12px', color: '#888' }}>{user.email}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {coOrgError && <span style={{ color: '#e05a5a', fontSize: '12px', marginTop: '4px', display: 'block' }}>Please add at least one co-organizer.</span>}
                  {selectedCoOrganizers.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {selectedCoOrganizers.map((u) => (
                        <span key={u.id} className={styles.userTag}>
                          {u.firstName} {u.lastName}
                          <button className={styles.userTagButton} type="button" onClick={() => removeCoOrganizer(u.id)}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Limit Number of Participants (Optional)</label>
                  <input className={styles.itemFieldInput} type="number" min="1" placeholder="Leave empty if you do not want to limit participants" value={formData.participantLimit} onChange={(e) => setFormData({ ...formData, participantLimit: e.target.value })} />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Event Date</label>
                    <input className={styles.itemFieldInput} type="date" required min={today} max={maxDateString} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Start Time</label>
                    <input className={styles.itemFieldInput} type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>End Time</label>
                    <input className={styles.itemFieldInput} type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                  </div>
                </div>

                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Description</label>
                  <textarea className={styles.itemFieldTextArea} required placeholder="Describe the charity activity…" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>

                <div className={styles.fileUploadFieldset} style={photoError ? { borderColor: '#e05a5a' } : {}}>
                  <span className={styles.itemLabel} style={photoError ? { color: '#e05a5a' } : {}}>EVENT BANNER / PICTURES</span>
                  <div className={styles.fileInputWrapper}>
                    <label className={styles.customBrowseBtn}>
                      Browse...
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={handleMultipleFileChange}
                      />
                    </label>
                    <span className={styles.fileNameDisplay}>
                      {formData.imageUrls.length > 0
                        ? `${formData.imageUrls.length} image${formData.imageUrls.length > 1 ? 's' : ''} selected`
                        : 'No file chosen'}
                    </span>
                  </div>
                  {photoError && <span style={{ color: '#e05a5a', fontSize: '12px', marginTop: '4px', display: 'block' }}>At least one photo is required.</span>}
                  {formData.imageUrls.length > 0 && (
                    <div className={styles.thumbnailGrid}>
                      {formData.imageUrls.map((url, index) => (
                        <div key={index} className={styles.thumbnailContainer}>
                          <img src={url} alt="upload-preview" className={styles.thumbnailImg} />
                          <button
                            type="button"
                            className={styles.removeThumbBtn}
                            onClick={() => setFormData(prev => ({ ...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== index) }))}
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button type="submit" className={styles.submitBtn} disabled={isUploading}>Post Event</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className={styles.contentModalOverlay} onClick={() => setSelectedEvent(null)}>
          <div className={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>Event Overview</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedEvent(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              {selectedEvent.imageUrls && selectedEvent.imageUrls.length > 0 ? (
                <div className={styles.carouselContainer}>
                  <div
                    className={styles.carouselTrack}
                    style={{ transform: `translateX(-${currentImgIndex * 100}%)` }}
                  >
                    {selectedEvent.imageUrls.map((url, i) => (
                      <img key={i} src={url} alt={`event-${i}`} className={styles.carouselImg} />
                    ))}
                  </div>
                  {selectedEvent.imageUrls.length > 1 && (
                    <>
                      <button className={`${styles.carouselNav} ${styles.prev}`} onClick={handlePrevImage}>&#10094;</button>
                      <button className={`${styles.carouselNav} ${styles.next}`} onClick={handleNextImage}>&#10095;</button>
                      <div className={styles.carouselDots}>
                        {selectedEvent.imageUrls.map((_, i) => (
                          <span
                            key={i}
                            className={`${styles.dot} ${i === currentImgIndex ? styles.active : ''}`}
                            onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(i); }}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : <div className={styles.noImagesPlaceholder}>No images uploaded</div>}

              <div className={styles.modalFormLayout}>
                <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Event Title</label>
                    <div className={styles.modalDataField}>{selectedEvent.title}</div>
                </div>

                <div className={styles.formRow}>
                    <div className={styles.itemFieldContainer}>
                        <label className={styles.itemLabel}>Category</label>
                        <div className={styles.modalDataField + ' ' + styles.capitalizeText}>{selectedEvent.category}</div>
                    </div>
                    <div className={styles.itemFieldContainer}>
                        <label className={styles.itemLabel}>Lifecycle Status</label>
                        <div className={styles.modalDataField}>{selectedEvent.status}</div>
                    </div>
                </div>

                <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Location</label>
                    <div className={styles.modalDataField}>{selectedEvent.location}</div>
                </div>

                <div className={styles.formRow}>
                    <div className={styles.itemFieldContainer}>
                        <label className={styles.itemLabel}>Event Date</label>
                        <div className={styles.modalDataField}>{formatDisplayDate(selectedEvent.date)}</div>
                    </div>
                    <div className={styles.itemFieldContainer}>
                        <label className={styles.itemLabel}>Time Slot</label>
                        <div className={styles.modalDataField}>
                          {formatTime12hr(selectedEvent.startTime)} - {formatTime12hr(selectedEvent.endTime)}
                        </div>
                    </div>
                </div>

                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Description</label>
                  <div className={styles.modalDataField + ' ' + styles.descriptionContainer}>
                      <p className={styles.modalDescriptionText}>{selectedEvent.description || selectedEvent.desc}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
                <button className={styles.actionBtn + ' ' + styles.decline} onClick={() => { setShowRejectModal(true); setRejectionReason(''); }}>Reject Event</button>
                <button className={styles.actionBtn + ' ' + styles.approve} onClick={() => updateApprovalStatus(selectedEvent.id, 'Approved')}>Approve Event</button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className={styles.contentModalOverlay} onClick={() => setShowRejectModal(false)}>
          <div className={styles.contentModal} style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>Reject Event</h3>
              <button className={styles.closeBtn} onClick={() => setShowRejectModal(false)}>×</button>
            </div>
            <div className={styles.modalBody} style={{ padding: '20px' }}>
              <div className={styles.itemFieldContainer}>
                <label className={styles.itemLabel}>Reason for Rejection</label>
                <textarea
                  className={styles.itemFieldTextArea}
                  required
                  placeholder="Please specify why this event is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div className={styles.modalActions} style={{ display: 'flex', gap: '10px', marginTop: '20px', padding: 0 }}>
                <button
                  className={styles.actionBtn + ' ' + styles.decline}
                  style={{ flex: 1, margin: 0 }}
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </button>
                <button
                  className={styles.actionBtn + ' ' + styles.approve}
                  style={{ flex: 1, margin: 0, backgroundColor: '#d32f2f' }}
                  onClick={() => {
                    if (!rejectionReason.trim()) {
                      alert("Please provide a reason for rejection.");
                      return;
                    }
                    rejectEventWithReason(selectedEvent.id, rejectionReason.trim());
                  }}
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsPage;