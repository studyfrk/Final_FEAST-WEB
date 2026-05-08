import React, { useState, useEffect } from 'react';
import { db, auth, storage } from '../firebase'; 
import { collection, onSnapshot, query, orderBy, addDoc, getDocs, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './events_page.css';

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
    const dateObj = new Date(dateString);
    return dateObj.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime12hr = (time24) => {
    if (!time24) return "N/A";
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hours12 = h % 12 || 12;
    return `${hours12}:${minutes} ${ampm}`;
  };

  // 1. Initial Data Fetch
  useEffect(() => {
    const q = query(collection(db, "charity_events"), orderBy("date", "asc"));
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

  // 2. Automatic Status Updater
  useEffect(() => {
    const updateEventStatuses = async () => {
      const now = new Date();
      for (const ev of events) {
        if (!ev.date || !ev.startTime || !ev.endTime) continue;
        const eventStart = new Date(`${ev.date}T${ev.startTime}`);
        const eventEnd = new Date(`${ev.date}T${ev.endTime}`);
        
        let calculatedStatus = ev.status;
        if (now > eventEnd) calculatedStatus = 'Completed';
        else if (now >= eventStart && now <= eventEnd) calculatedStatus = 'Ongoing';
        else if (now < eventStart) calculatedStatus = 'Upcoming';

        if (calculatedStatus !== ev.status) {
          try {
            await updateDoc(doc(db, "charity_events", ev.id), { status: calculatedStatus });
          } catch (err) { console.error("Auto-status update error:", err); }
        }
      }
    };
    if (events.length > 0) updateEventStatuses();
    const interval = setInterval(updateEventStatuses, 60000);
    return () => clearInterval(interval);
  }, [events]);

  const updateApprovalStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "charity_events", id), { approvalStatus: newStatus });
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
    const matchesFilter = filterStatus === 'All' || ev.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="events-page">
      <div className="table-header-row">
        <h2>Events Management</h2>
      </div>

      <div className="table-controls">
        <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
        </select>
        <div className="search-container">
          <input type="text" placeholder="Search events..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <button className="create-btn" onClick={() => setShowCreateModal(true)}>+ New Event</button>
      </div>

      <div className="table-wrapper">
        <table className="events-table">
          <thead>
            <tr>
              <th>EVENT TITLE</th>
              <th>CATEGORY</th>
              <th>LOCATION</th>
              <th>DATE</th>
              <th>STATUS</th>
              <th>APPROVAL</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((ev) => (
              <tr key={ev.id} className="clickable-row" onClick={() => { setSelectedEvent(ev); setCurrentImgIndex(0); }}>
                <td><span className="ev-title">{ev.title || "Untitled Event"}</span></td>
                <td className="capitalize-text">{ev.category || "N/A"}</td>
                <td>{ev.location || "N/A"}</td>
                <td>{formatDisplayDate(ev.date)}</td>
                <td className="status-cell">
                  <span className={`status-pill ${ev.status?.toLowerCase()}`}>{ev.status}</span>
                </td>
                <td>
                   <span className={`status-pill ${ev.approvalStatus?.toLowerCase() || 'pending'}`}>
                    {ev.approvalStatus || "Pending"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE EVENT MODAL */}
      {showCreateModal && (
        <div className="content-modal-overlay">
          <div className="content-modal">
            <div className="modal-header">
              <h3>New Charity Event</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateEvent} className="modal-form-layout">
                <div className="item-field-container">
                  <label className="item-label">Charity Event Name</label>
                  <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div className="item-field-container">
                  <label className="item-label">Description</label>
                  <textarea required placeholder="Explain the cause..." value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} />
                </div>
                <div className="form-row">
                  <div className="item-field-container">
                    <label className="item-label">Category</label>
                    <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      <option value="">Select Category</option>
                      <option value="health">Health</option>
                      <option value="education">Education</option>
                      <option value="disastermanagement">Disaster Management</option>
                      <option value="basicneeds">Basic Needs</option>
                    </select>
                  </div>
                  <div className="item-field-container">
                    <label className="item-label">Location</label>
                    <input type="text" required placeholder="Event address" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="item-field-container">
                    <label className="item-label">Date</label>
                    <input type="date" required min={today} max={maxDateString} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                  <div className="item-field-container">
                    <label className="item-label">Start Time</label>
                    <input type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                  </div>
                  <div className="item-field-container">
                    <label className="item-label">End Time</label>
                    <input type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                  </div>
                </div>
                <div className="item-field-container">
                  <label className="item-label">Tag Collaborators</label>
                  <div className="tag-input-section">
                    <div className="active-tags-list">
                      {formData.collaborators.map(user => (
                        <span key={user.id} className="user-tag">{user.name} <button type="button" onClick={() => removeCollaborator(user.id)}>×</button></span>
                      ))}
                    </div>
                    <input type="text" placeholder="Search..." value={collabSearch} onChange={(e) => { setCollabSearch(e.target.value); setShowSuggestions(true); }} />
                    {showSuggestions && collabSearch && (
                      <div className="suggestions-dropdown">
                        {users.filter(u => u.name.toLowerCase().includes(collabSearch.toLowerCase())).map(u => (
                          <div key={u.id} className="suggestion-item" onClick={() => addCollaborator(u)}>{u.name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="item-field-container">
                  <label className="item-label">Event Images</label>
                  <input type="file" accept="image/*" multiple onChange={handleMultipleFileChange} />
                  <div className="creation-preview-grid">
                    {formData.imageUrls.map((url, index) => (
                      <div key={index} className="preview-item">
                        <img src={url} alt="upload-preview" />
                        <button type="button" onClick={() => setFormData(prev => ({...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== index)}))}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
                <button type="submit" className="submit-btn" disabled={isUploading}>Publish Event</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DETAILS VIEW (EVENT OVERVIEW) */}
      {selectedEvent && (
        <div className="content-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="content-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Event Overview</h3>
              <button className="close-btn" onClick={() => setSelectedEvent(null)}>×</button>
            </div>
            <div className="modal-body">
              <label className="item-label">Event Gallery</label>
              {selectedEvent.imageUrls && selectedEvent.imageUrls.length > 0 ? (
                <div className="event-gallery-container">
                  <img src={selectedEvent.imageUrls[currentImgIndex]} alt="Event" className="gallery-main-img" />
                  {selectedEvent.imageUrls.length > 1 && (
                    <>
                      <button className="gallery-nav-btn prev" onClick={() => setCurrentImgIndex(prev => prev > 0 ? prev - 1 : selectedEvent.imageUrls.length - 1)}>‹</button>
                      <button className="gallery-nav-btn next" onClick={() => setCurrentImgIndex(prev => prev < selectedEvent.imageUrls.length - 1 ? prev + 1 : 0)}>›</button>
                    </>
                  )}
                </div>
              ) : <div className="no-images-placeholder">No Images</div>}

              <div className="modal-form-layout">
                {/* Title */}
                <div className="item-field-container">
                    <label className="item-label">Event Title</label>
                    <div className="modal-data-field">{selectedEvent.title}</div>
                </div>

                {/* Category & Status */}
                <div className="form-row">
                    <div className="item-field-container">
                        <label className="item-label">Category</label>
                        <div className="modal-data-field capitalize-text">{selectedEvent.category}</div>
                    </div>
                    <div className="item-field-container">
                        <label className="item-label">Status</label>
                        <div className="modal-data-field">{selectedEvent.status}</div>
                    </div>
                </div>

                {/* Location */}
                <div className="item-field-container">
                    <label className="item-label">Location</label>
                    <div className="modal-data-field">{selectedEvent.location}</div>
                </div>

                {/* Date & Time (12hr Format) */}
                <div className="form-row">
                    <div className="item-field-container">
                        <label className="item-label">Event Date</label>
                        <div className="modal-data-field">{formatDisplayDate(selectedEvent.date)}</div>
                    </div>
                    <div className="item-field-container">
                        <label className="item-label">Time Slot</label>
                        <div className="modal-data-field">
                          {formatTime12hr(selectedEvent.startTime)} - {formatTime12hr(selectedEvent.endTime)}
                        </div>
                    </div>
                </div>

                {/* Collaborators */}
                {selectedEvent.collaborators && selectedEvent.collaborators.length > 0 && (
                  <div className="item-field-container">
                      <label className="item-label">Collaborators</label>
                      <div className="tag-input-section">
                        <div className="active-tags-list">
                          {users.filter(u => selectedEvent.collaborators.includes(u.id)).map(u => (
                            <span key={u.id} className="user-tag">{u.name}</span>
                          ))}
                        </div>
                      </div>
                  </div>
                )}

                {/* Description */}
                <div className="item-field-container">
                    <label className="item-label">Description</label>
                    <div className="modal-data-field description-container">
                        <p className="modal-description-text">{selectedEvent.desc}</p>
                    </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
                <button className="action-btn approve" onClick={() => updateApprovalStatus(selectedEvent.id, 'Approved')}>Approve Event</button>
                <button className="action-btn decline" onClick={() => updateApprovalStatus(selectedEvent.id, 'Rejected')}>Reject Event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsPage;