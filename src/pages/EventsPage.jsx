import React, { useState } from 'react';
import './events_page.css';

const EventsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Dummy data for Events
  const allEvents = [
    { 
      id: 1, 
      title: 'Community Food Drive', 
      location: 'Northern District Hub', 
      date: 'May 15, 2026', 
      desc: 'Annual food collection for local families in need.', 
      status: 'Upcoming', 
      fullContent: 'We are targeting 500 households. Volunteers are needed for sorting and distribution. Sponsors include local grocery chains.' 
    },
    { 
      id: 2, 
      title: 'Health & Wellness Seminar', 
      location: 'City Hall Plaza', 
      date: 'May 4, 2026', 
      desc: 'Ongoing seminar about basic first aid and nutrition.', 
      status: 'Ongoing', 
      fullContent: 'Currently in progress at the main hall. Medical professionals are providing free consultations and maintenance medicine.' 
    },
    { 
      id: 3, 
      title: 'Back-to-School Distribution', 
      location: 'GPC Main Office', 
      date: 'April 20, 2026', 
      desc: 'Distribution of school supplies and uniforms.', 
      status: 'Completed', 
      fullContent: 'Successfully distributed kits to 200 students. Documentation and photos have been uploaded to the reports section.' 
    },
    { 
        id: 4, 
        title: 'Community Clean-up', 
        location: 'South Park', 
        date: 'May 20, 2026', 
        desc: 'General park cleaning and tree planting.', 
        status: 'Cancelled', 
        fullContent: 'This event was cancelled due to extreme weather warnings. It will be rescheduled for June.' 
    }   
  ];

  const filteredEvents = allEvents.filter(ev => {
    const matchesSearch = ev.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ev.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' || ev.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="events-page">
      <div className="table-controls">
        <select 
          className="filter-select" 
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="All">All Events</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <div className="search-container">
          <input 
            type="text" 
            placeholder="Search by title or location..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="events-table">
          <thead>
            <tr>
              <th className="id-column">#</th>
              <th>EVENT TITLE</th>
              <th>LOCATION</th>
              <th>DATE</th>
              <th className="status-header">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((ev) => (
              <tr 
                key={ev.id} 
                className="clickable-row" 
                onClick={() => setSelectedEvent(ev)}
              >
                <td className="id-column">{ev.id}</td>
                <td>
                  <div className="title-cell">
                    <span className="ev-title">{ev.title}</span>
                  </div>
                </td>
                <td className="loc-cell">{ev.location}</td>
                <td className="date-cell">{ev.date}</td>
                <td className="status-cell">
                  <span className={`status-pill ${ev.status.toLowerCase()}`}>
                    {ev.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

        {/* Detail View Side Panel */}
        {selectedEvent && (
        <div className="content-modal-overlay" onClick={() => setSelectedEvent(null)}>
            <div className="content-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
                <h3>Event Details</h3>
                <button className="close-btn" onClick={() => setSelectedEvent(null)}>×</button>
            </div>
            <div className="modal-body">
                <div className="modal-meta">
                <p><strong>Title:</strong> {selectedEvent.title}</p>
                <p><strong>Location:</strong> {selectedEvent.location}</p>
                <p><strong>Date:</strong> {selectedEvent.date}</p>
                <p><strong>Status:</strong> <span className={`status-pill ${selectedEvent.status.toLowerCase()}`}>{selectedEvent.status}</span></p>
                </div>
                
                <hr />
                
                <div className="modal-text">
                <span className="modal-section-title">Description & Logistics:</span>
                <p>{selectedEvent.fullContent}</p>
                </div>
            </div>
            <div className="modal-actions">
                <button className="action-btn edit">Edit Event</button>
                <button className="action-btn cancel">Cancel Event</button>
            </div>
            </div>
        </div>
        )}
    </div>
  );
};

export default EventsPage;