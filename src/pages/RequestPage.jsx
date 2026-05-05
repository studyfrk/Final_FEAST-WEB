import React, { useState } from 'react';
import './request_page.css';

const RequestPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Dummy data
  const allRequests = [
    { id: 1, name: 'Ahmad Rosser', phone: '5684236527', date: 'May 4, 2026', desc: 'Need urgent food assistance for a family of five in the northern district.', status: 'Valid', fullContent: 'Full details: The family has been without steady income for two months. They require rice, canned goods, and basic hygiene kits.' },
    { id: 2, name: 'Ahmad Rosser', phone: '5684236527', date: 'May 3, 2026', desc: 'Inquiry regarding the next distribution event.', status: 'Invalid', fullContent: 'This request was flagged because the user is registered in a different jurisdiction.' },
    { id: 3, name: 'Ahmad Rosser', phone: '5684236527', date: 'May 2, 2026', desc: 'Requesting medical supplies for elderly neighbor.', status: 'Unread', fullContent: 'Neighbor requires maintenance medicine for hypertension and basic first aid supplies.' },
    { id: 4, name: 'Ahmad Rosser', phone: '5684236527', date: 'May 1, 2026', desc: 'Applying for the community scholarship program.', status: 'Processing', fullContent: 'Documents submitted: Birth certificate, Grade 12 report card, and Indigency certificate.' },
  ];

  const filteredData = allRequests.filter(req => {
    const matchesSearch = req.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          req.desc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' || req.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="request-page">
      <div className="table-controls">
        <select 
          className="filter-select" 
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Valid">Valid</option>
          <option value="Invalid">Invalid</option>
          <option value="Unread">Unread</option>
          <option value="Processing">Processing</option>
        </select>

        <div className="search-container">
          <input 
            type="text" 
            placeholder="Search by name or content..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="request-table">
          <thead>
            <tr>
              <th className="id-column">#</th>
              <th>NAME</th>
              <th>DESCRIPTION</th>
              <th className="status-header">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((req) => (
              <tr 
                key={req.id} 
                className="clickable-row" 
                onClick={() => setSelectedRequest(req)}
              >
                <td className="id-column">{req.id}</td>
                <td>
                  <div className="name-cell">
                    <span className="req-name">{req.name}</span>
                    <span className="req-subtext">{req.phone}</span>
                  </div>
                </td>
                <td className="desc-cell">{req.desc}</td>
                <td>
                  <span className={`status-pill ${req.status.toLowerCase()}`}>
                    {req.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Panel */}
      {selectedRequest && (
        <div className="content-modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="content-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Details</h3>
              <button className="close-btn" onClick={() => setSelectedRequest(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-meta">
                <p><strong>From:</strong> {selectedRequest.name}</p>
                <p><strong>Phone:</strong> {selectedRequest.phone}</p>
                <p><strong>Date:</strong> {selectedRequest.date}</p>
                <p><strong>Status:</strong> <span className={`status-pill ${selectedRequest.status.toLowerCase()}`}>{selectedRequest.status}</span></p>
              </div>
              <hr />
              <div className="modal-text">
                <h4>Message Body:</h4>
                <p>{selectedRequest.fullContent}</p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="action-btn approve">Approve</button>
              <button className="action-btn decline">Decline</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestPage;