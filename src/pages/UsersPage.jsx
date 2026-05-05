import React, { useState } from 'react';
import './users_page.css';

const UsersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  // Dummy User Data
  const users = [
    { id: 1, name: 'Ahmad Rosser', phone: '934 344 8917', email: 'sample@email.com', location: 'Brngy. Kahitsaan', status: 'Active' },
    { id: 2, name: 'Ahmad Rosser', phone: '934 344 8917', email: 'sample@email.com', location: 'Brngy. Kahitsaan', status: 'Deactivated' },
    { id: 3, name: 'Ahmad Rosser', phone: '934 344 8917', email: 'sample@email.com', location: 'Brngy. Kahitsaan', status: 'Active' },
    { id: 4, name: 'Ahmad Rosser', phone: '934 344 8917', email: 'sample@email.com', location: 'Brngy. Kahitsaan', status: 'Deactivated' },
  ];

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="users-page">
      <div className="content-header">
        <h2>User Accounts</h2>
        <div className="header-controls">
          <div className="search-bar">
            <input 
              type="text" 
              placeholder="Search" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="sort-select">
            <option>Short by : Newest</option>
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone Number</th>
              <th>Email</th>
              <th>Location</th>
              <th className="status-header">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="clickable-row" onClick={() => setSelectedUser(user)}>
                <td className="user-name">{user.name}</td>
                <td>{user.phone}</td>
                <td>{user.email}</td>
                <td>{user.location}</td>
                <td className={`status-cell ${user.status.toLowerCase()}`}>
                  {user.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Side Panel for User Details */}
      {selectedUser && (
        <div className="content-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="content-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User Profile</h3>
              <button className="close-btn" onClick={() => setSelectedUser(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-meta">
                <p><strong>Name:</strong> {selectedUser.name}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
                <p><strong>Location:</strong> {selectedUser.location}</p>
                <p><strong>Status:</strong> {selectedUser.status}</p>
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="action-btn approve">Verify User</button>
              <button className="action-btn decline">Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;