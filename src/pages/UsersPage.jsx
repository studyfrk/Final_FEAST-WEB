import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import './users_page.css';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);

  const formatStatus = (status) => {
    if (!status) return "Unverified";
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      const userList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(userList);
    });
    return () => unsub();
  }, []);

  const updateUserStatus = async (userId, newStatus) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { 
        status: newStatus.toLowerCase() 
      });
      setSelectedUser(null);
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Missing permissions or error updating status.");
    }
  };

  const filteredUsers = users.filter(user => {
    const name = user.name || "";
    const email = user.email || "";
    const status = user.status || "unverified";

    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || 
                          status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="users-page">
      <div className="content-header">
        <h2>User Accounts Management</h2>
        <div className="header-controls">
          <div className="search-bar">
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select 
            className="sort-select" 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
            <option value="unverified">Unverified</option>
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
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="clickable-row" onClick={() => setSelectedUser(user)}>
                <td className="user-name">{user.name || "Unavailable"}</td>
                <td>{user.phone || "Unavailable"}</td>
                <td>{user.email || "Unavailable"}</td>
                <td>{user.location || "Unavailable"}</td>
                <td className={`status-cell ${formatStatus(user.status).toLowerCase()}`}>
                  <span className="status-pill">{formatStatus(user.status)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <div className="content-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="content-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User Details</h3>
              <button className="close-btn" onClick={() => setSelectedUser(null)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="modal-form-layout">
                <span className="modal-section-title">Personal Information</span>

                <div className="form-row">
                  <div className="item-field-container">
                    <span className="item-label">Full Name</span>
                    <div className="modal-data-field">{selectedUser.name}</div>
                  </div>
                </div>

                <div className="form-row">
                    <div className="item-field-container">
                        <span className="item-label">Middle Name</span>
                        <div className="modal-data-field">{selectedUser.middleName || "N/A"}</div>
                    </div>
                    <div className="item-field-container">
                        <span className="item-label">Gender</span>
                        <div className="modal-data-field">{selectedUser.gender || "Not Set"}</div>
                    </div>
                </div>

                <div className="form-row">
                  <div className="item-field-container">
                    <span className="item-label">Date of Birth</span>
                    <div className="modal-data-field">{selectedUser.dob || "Not Provided"}</div>
                  </div>
                </div>

                <span className="modal-section-title">Contact & Location</span>
                <div className="form-row">
                  <div className="item-field-container">
                    <span className="item-label">Email Address</span>
                    <div className="modal-data-field">{selectedUser.email}</div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="item-field-container">
                    <span className="item-label">Phone Number</span>
                    <div className="modal-data-field">{selectedUser.phone}</div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="item-field-container">
                    <span className="item-label">Location</span>
                    <div className="modal-data-field">{selectedUser.location}</div>
                  </div>
                </div>

                <span className="modal-section-title">Account Security</span>
                <div className="form-row">
                  <div className="item-field-container">
                    <span className="item-label">Role</span>
                    <div className="modal-data-field" style={{textTransform: 'capitalize'}}>{selectedUser.role}</div>
                  </div>
                  <div className="item-field-container">
                    <span className="item-label">Account Status</span>
                    <div className="modal-data-field">
                        <span className={`status-pill ${formatStatus(selectedUser.status).toLowerCase()}`}>
                            {formatStatus(selectedUser.status)}
                        </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="action-btn approve"
                onClick={() => updateUserStatus(selectedUser.id, "active")}
                disabled={selectedUser.status === "active"}
              >
                Verify & Activate
              </button>
              <button 
                className="action-btn cancel"
                onClick={() => updateUserStatus(selectedUser.id, "deactivated")}
                disabled={selectedUser.status === "deactivated"}
              >
                Deactivate User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;