import React, { useState, useEffect, useRef } from 'react';
import { db, auth, storage } from '../firebase'; 
import { collection, onSnapshot, query, orderBy, addDoc, getDocs, serverTimestamp, updateDoc, doc, where, writeBatch } from 'firebase/firestore';
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

  const [collabSearch, setCollabSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '', 
    location: '', 
    date: '', 
    startTime: '',
    endTime: '',
    category: '',
    desc: '', 
    collaborators: [],
    imageUrls: [],
    status: 'Upcoming', 
    approvalStatus: 'Pending' 
  });

  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 2);
  const maxDateString = maxDate.toISOString().split('T')[0];

  const getEventDateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    let tStr = timeStr;
    if (timeStr?.toDate) {
      const d = timeStr.toDate();
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      tStr = `${h}:${m}`;
    }
    return new Date(`${dateStr}T${tStr}`);
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

          if (ev.organiserId) {
            const notifRef = collection(db, `users/${ev.organiserId}/notifications`);
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
          console.log("Automatic status updates and notifications applied.");
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
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, "users"));
      setUsers(snapshot.docs.map(doc => ({ 
        id: doc.id, 
        name: doc.data().fullName || doc.data().email,
        email: doc.data().email 
      })));
    };

    fetchUsers();
    return () => unsubEvents();
  }, []);

  const handleSelectEvent = async (ev) => {
    setSelectedEvent(ev);
    setCurrentImgIndex(0);
    if (['unread', 'pending'].includes((ev.approvalStatus || '').toLowerCase())) {
      try {
        await updateDoc(doc(db, "charity_events", ev.id), { approvalStatus: 'Processing' });
      } catch (err) { console.error(err); }
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

      const recipientId = selectedEvent.organiserId;
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

  const addCollaborator = (user) => {
    if (!formData.collaborators.find(c => c.id === user.id)) {
      setFormData(prev => ({ ...prev, collaborators: [...prev.collaborators, user] }));
    }
    setCollabSearch('');
    setShowSuggestions(false);
  };

  const removeCollaborator = (userId) => {
    setFormData(prev => ({ ...prev, collaborators: prev.collaborators.filter(c => c.id !== userId) }));
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (formData.imageUrls.length === 0) return alert("Please upload at least one image.");
    if (formData.collaborators.length === 0) return alert("Please tag at least one collaborator.");

    try {
      const eventData = {
        ...formData,
        collaborators: formData.collaborators.map(c => c.id), 
        organiserId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "charity_events"), eventData);
      const eventId = docRef.id;

      const notificationPromises = formData.collaborators.map(async (collab) => {
        const collabNotifRef = collection(db, `users/${collab.id}/notifications`);
        return addDoc(collabNotifRef, {
          title: "Tagged in a New Event",
          body: `${auth.currentUser?.displayName || 'An organiser'} tagged you as a collaborator for the event: "${formData.title}".`,
          type: "Event",
          status: "info",
          read: false,
          createdAt: serverTimestamp(),
          eventId: eventId,
          triggeredBy: auth.currentUser?.uid
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
      category: '', desc: '', collaborators: [], imageUrls: [], 
      status: 'Upcoming', approvalStatus: 'Pending' 
    });
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
        <button className={styles.createBtn} onClick={() => setShowCreateModal(true)}>
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

      {showCreateModal && (
        <div className={styles.contentModalOverlay}>
          <div className={styles.contentModal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>Create New Charity Event</h3>
              <button className={styles.closeBtn} onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleCreateEvent} className={styles.modalFormLayout}>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Charity Event Name</label>
                  <input className={styles.itemFieldInput} type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Description</label>
                  <textarea className={styles.itemFieldTextArea} required placeholder="Explain the cause..." value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} />
                </div>
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Category</label>
                    <select className={styles.itemFieldSelect} required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      <option value="">Select Category</option>
                      <option value="health">Health</option>
                      <option value="education">Education</option>
                      <option value="disastermanagement">Disaster Management</option>
                      <option value="basicneeds">Basic Needs</option>
                    </select>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Location</label>
                    <input className={styles.itemFieldInput} type="text" required placeholder="Event address" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Date</label>
                    <input className={styles.itemFieldInput}type="date" required min={today} max={maxDateString} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
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
                  <label className={styles.itemLabel}>Tag Collaborators</label>
                  <div className={styles.tagInputSection}>
                    <div className={styles.activeTagsList}>
                      {formData.collaborators.map(user => (
                        <span key={user.id} className={styles.userTag}>{user.name} <button className={styles.userTagButton} type="button" onClick={() => removeCollaborator(user.id)}>×</button></span>
                      ))}
                    </div>
                    <input className={styles.itemFieldInput} type="text" placeholder="Search..." value={collabSearch} onChange={(e) => { setCollabSearch(e.target.value); setShowSuggestions(true); }} />
                    {showSuggestions && collabSearch && (
                      <div className={styles.suggestionsDropdown}>
                        {users.filter(u => u.name.toLowerCase().includes(collabSearch.toLowerCase())).map(u => (
                          <div key={u.id} className={styles.suggestionItem} onClick={() => addCollaborator(u)}>{u.name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.fileUploadFieldset}>
                  <span className={styles.itemLabel}>Event Images</span>
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
                <button type="submit" className={styles.submitBtn} disabled={isUploading}>Publish Event</button>
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
                      <p className={styles.modalDescriptionText}>{selectedEvent.desc || selectedEvent.description}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
                <button className={styles.actionBtn + ' ' + styles.decline} onClick={() => updateApprovalStatus(selectedEvent.id, 'Rejected')}>Reject Event</button>
                <button className={styles.actionBtn + ' ' + styles.approve} onClick={() => updateApprovalStatus(selectedEvent.id, 'Approved')}>Approve Event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsPage;
