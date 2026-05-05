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
      // We save it as Title Case to help clean up the database over time
      await updateDoc(userRef, { status: formatStatus(newStatus) });
      setSelectedUser(null);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const filteredUsers = users.filter(user => {
    const name = user.name || "";
    const email = user.email || "";
    const status = user.status || "Unverified";

    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || 
                          status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="users-page">
      <div className="content-header">
        <h2>User Accounts</h2>
        <div className="header-controls">
          <div className="search-bar">
            <input 
              type="text" 
              placeholder="Search..." 
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
            <option value="Active">Active</option>
            <option value="Unverified">Unverified</option>
            <option value="Deactivated">Deactivated</option>
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
                <td className="user-name">{user.name || "Unavailable"}</td>
                <td>{user.phone || "Unavailable"}</td>
                <td>{user.email || "Unavailable"}</td>
                <td>{user.location || "Unavailable"}</td>
                {/* Apply formatStatus here to fix the "active" vs "Active" issue */}
                <td className={`status-cell ${formatStatus(user.status).toLowerCase()}`}>
                  {formatStatus(user.status)}
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
              <h3>User Profile</h3>
              <button className="close-btn" onClick={() => setSelectedUser(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-meta">
                <p><strong>Name:</strong> {selectedUser.name || "Unavailable"}</p>
                <p><strong>Email:</strong> {selectedUser.email || "Unavailable"}</p>
                <p><strong>Phone:</strong> {selectedUser.phone || "Unavailable"}</p>
                <p><strong>Location:</strong> {selectedUser.location || "Unavailable"}</p>
                <p><strong>Current Status:</strong> 
                   <span className={`status-badge ${formatStatus(selectedUser.status).toLowerCase()}`}>
                     {formatStatus(selectedUser.status)}
                   </span>
                </p>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="action-btn approve" 
                onClick={() => updateUserStatus(selectedUser.id, "Active")}
                disabled={formatStatus(selectedUser.status) === "Active"}
              >
                Verify User
              </button>
              <button 
                className="action-btn decline" 
                onClick={() => updateUserStatus(selectedUser.id, "Deactivated")}
                disabled={formatStatus(selectedUser.status) === "Deactivated"}
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;