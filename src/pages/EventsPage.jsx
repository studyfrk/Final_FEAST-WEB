import React, { useState, useEffect } from 'react';
import { db, auth, storage } from '../firebase'; 
import { collection, onSnapshot, query, orderBy, addDoc, getDocs, serverTimestamp, updateDoc, doc, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import styles from './events_page.module.css';

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

  // Helper: Format Date to String
  const formatDisplayDate = (dateString) => {
    if (!dateString) return "N/A";
    // Handle Firestore Timestamp objects (from mobile)
    if (dateString.toDate) {
      return dateString.toDate().toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      });
    }
    const dateObj = new Date(dateString);
    return dateObj.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime12hr = (time24) => {
    if (!time24) return "N/A";
    // Handle Firestore Timestamp objects (from mobile)
    if (time24.toDate) {
      const d = time24.toDate();
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    // Handle HH:mm string (from web)
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hours12 = h % 12 || 12;
    return `${hours12}:${minutes} ${ampm}`;
  };

  // 1. Initial Data Fetch
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

  // Note: Time-based status (Upcoming/Ongoing/Completed) is now derived
  // client-side for display. The stored `status` field tracks the approval flow.

  const handleSelectEvent = async (ev) => {
    setSelectedEvent(ev);
    setCurrentImgIndex(0);
    const st = (ev.status || '').toLowerCase();
    if (st === 'unread' || st === 'pending') {
      try {
        await updateDoc(doc(db, "charity_events", ev.id), { status: 'Processing' });
      } catch (err) { console.error(err); }
    }
  };

  const updateApprovalStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "charity_events", id), { status: newStatus });
      setSelectedEvent(null); 
    } catch (err) { alert("Failed to update status."); }
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
      await addDoc(collection(db, "charity_events"), eventData);
      setShowCreateModal(false);
      resetForm();
    } catch (err) { alert("Error creating event."); }
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
    const matchesFilter = filterStatus === 'All' || (ev.status || '').toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <div className={styles.eventsPage}>
      <div>
        <h2 className={styles.contentHeaderTitle}>Events Management</h2>
      </div>

      <div className={styles.tableControls}>
        <select className={styles.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          <option value="Unread">Unread</option>
          <option value="pending">Pending</option>
          <option value="Processing">Processing</option>
          <option value="Approved">Approved</option>
          <option value="Denied">Denied</option>
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
            <tr className={styles.tableHeaderRow}>
              <th className={styles.headerCell}>EVENT TITLE</th>
              <th className={styles.headerCell}>CATEGORY</th>
              <th className={styles.headerCell}>LOCATION</th>
              <th className={styles.headerCell}>DATE</th>
              <th className={styles.headerCell}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((ev) => (
              <tr key={ev.id} className={`${styles.clickableRow} ${['unread', 'pending'].includes((ev.status || '').toLowerCase()) ? styles.unreadRow : ''}`} onClick={() => handleSelectEvent(ev)}>
                <td className={styles.tableCell}><span className={styles.evTitle}>{ev.title || "Untitled Event"}</span></td>
                <td className={`${styles.tableCell} ${styles.capitalizeText}`}>{ev.category || "N/A"}</td>
                <td className={styles.tableCell}>{ev.location || "N/A"}</td>
                <td className={styles.tableCell}>{formatDisplayDate(ev.date)}</td>
                <td className={`${styles.tableCell} ${styles.statusCell}`}>
                  <span className={`${styles.statusPill} ${(ev.status || 'pending').toLowerCase()}`}>{ev.status || "Pending"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE EVENT MODAL */}
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
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Event Images</label>
                  <input className={styles.itemFieldInput} type="file" accept="image/*" multiple onChange={handleMultipleFileChange} />
                  <div className={styles.creationPreviewGrid}>
                    {formData.imageUrls.map((url, index) => (
                      <div key={index} className={styles.previewItem}>
                        <img src={url} alt="upload-preview" className={styles.previewItemImg} />
                        <button type="button" onClick={() => setFormData(prev => ({...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== index)}))}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
                <button type="submit" className={styles.submitBtn} disabled={isUploading}>Publish Event</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DETAILS VIEW (EVENT OVERVIEW) */}
      {selectedEvent && (
        <div className={styles.contentModalOverlay} onClick={() => setSelectedEvent(null)}>
          <div className={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>Event Overview</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedEvent(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <label className={styles.itemLabel}>Event Gallery</label>
              {selectedEvent.imageUrls && selectedEvent.imageUrls.length > 0 ? (
                <div className={styles.eventGalleryContainer}>
                  <img src={selectedEvent.imageUrls[currentImgIndex]} alt="Event" className={styles.galleryMainImg} />
                  {selectedEvent.imageUrls.length > 1 && (
                    <>
                      <button className={styles.galleryNavBtn + ' ' + styles.prev} onClick={() => setCurrentImgIndex(prev => prev > 0 ? prev - 1 : selectedEvent.imageUrls.length - 1)}>‹</button>
                      <button className={styles.galleryNavBtn + ' ' + styles.next} onClick={() => setCurrentImgIndex(prev => prev < selectedEvent.imageUrls.length - 1 ? prev + 1 : 0)}>›</button>
                      <div className={styles.carouselDots}>
                        {selectedEvent.imageUrls.map((_, i) => (
                          <span key={i} className={`${styles.dot} ${i === currentImgIndex ? styles.active : ''}`} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : <div className={styles.noImagesPlaceholder}>No Images</div>}

              <div className={styles.modalFormLayout}>
                {/* Title */}
                <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Event Title</label>
                    <div className={styles.modalDataField}>{selectedEvent.title}</div>
                </div>

                {/* Category & Status */}
                <div className={styles.formRow}>
                    <div className={styles.itemFieldContainer}>
                        <label className={styles.itemLabel}>Category</label>
                        <div className={styles.modalDataField + ' ' + styles.capitalizeText}>{selectedEvent.category}</div>
                    </div>
                    <div className={styles.itemFieldContainer}>
                        <label className={styles.itemLabel}>Status</label>
                        <div className={styles.modalDataField}>{selectedEvent.status}</div>
                    </div>
                </div>

                {/* Location */}
                <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Location</label>
                    <div className={styles.modalDataField}>{selectedEvent.location}</div>
                </div>

                {/* Date & Time (12hr Format) */}
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

                {/* Co-Organisers (mobile) or Collaborators (web) */}
                {((selectedEvent.collaborators && selectedEvent.collaborators.length > 0) || (selectedEvent.coOrganiserIds && selectedEvent.coOrganiserIds.length > 0)) && (
                  <div className={styles.itemFieldContainer}>
                      <label className={styles.itemLabel}>Collaborators / Co-Organisers</label>
                      <div className={styles.tagInputSection}>
                        <div className={styles.activeTagsList}>
                          {selectedEvent.collaborators && users.filter(u => selectedEvent.collaborators.includes(u.id)).map(u => (
                            <span key={u.id} className={styles.userTag}>{u.name}</span>
                          ))}
                          {selectedEvent.coOrganiserIds && selectedEvent.coOrganiserIds.map((id, i) => (
                            <span key={i} className={styles.userTag}>{id}</span>
                          ))}
                        </div>
                      </div>
                  </div>
                )}

                {/* Description */}
                <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Description</label>
                    <div className={styles.modalDataField + ' ' + styles.descriptionContainer}>
                        <p className={styles.modalDescriptionText}>{selectedEvent.desc || selectedEvent.description}</p>
                    </div>
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
                <button className={styles.actionBtn + ' ' + styles.approve} onClick={() => updateApprovalStatus(selectedEvent.id, 'Approved')}>Approve Event</button>
                <button className={styles.actionBtn + ' ' + styles.decline} onClick={() => updateApprovalStatus(selectedEvent.id, 'Rejected')}>Reject Event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsPage;
