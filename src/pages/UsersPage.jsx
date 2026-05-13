import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import styles from './users_page.module.css';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('unverified');
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

  const updateUserStatus = async (userId, newStatus, isResidentValue) => {
    try {
      const userRef = doc(db, "users", userId);
      
      const updateData = { 
        status: newStatus.toLowerCase(),
        isResident: isResidentValue,
        verifiedAt: serverTimestamp()
      };

      await updateDoc(userRef, updateData);

      // Create Notification for the User
      const notifRef = collection(db, `users/${userId}/notifications`);
      
      let notifData = {
        read: false,
        createdAt: serverTimestamp(),
        type: "Account",
      };

      if (newStatus.toLowerCase() === "active") {
        notifData.title = "Account Verified";
        notifData.body = `Your account has been successfully verified as a ${isResidentValue ? 'Resident' : 'Non-Resident'}.`;
        notifData.status = "success";
      } else if (newStatus.toLowerCase() === "deactivated") {
        notifData.title = "Account Deactivated";
        notifData.body = "Your account has been deactivated by the administrator.";
        notifData.status = "error";
      }

      if (notifData.title) {
        await addDoc(notifRef, notifData);
      }

      setSelectedUser(null);
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Missing permissions or error updating status.");
    }
  };

  const filteredUsers = users.filter(user => {
    const fullName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || "Unknown";
    const email = user.email || "";
    const status = user.status || "unverified";

    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || 
                          status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  const getStatusClass = (status) => {
    const s = status?.toLowerCase() || 'unverified';
    if (s === 'active') return styles.pillActive;
    if (s === 'deactivated') return styles.pillDeactivated;
    return styles.pillUnverified;
  };

  return (
    <div className={styles.usersPage}>
      <div className={styles.contentHeader}>
        <h2 className={styles.contentHeaderTitle}>User Accounts Management</h2>
        <div className={styles.headerControls}>
          <div className={styles.searchBar}>
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchBarInput}
            />
          </div>
          
          <select 
            className={styles.sortSelect} 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="unverified">Pending Verification</option>
            <option value="All">All Statuses</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.usersTable}>
          <thead>
            <tr className={styles.tableHeaderRow}>
              <th className={styles.headerCell}>Name</th>
              <th className={styles.headerCell}>Phone Number</th>
              <th className={styles.headerCell}>Email</th>
              <th className={styles.headerCell}>Location</th>
              <th className={styles.headerCell}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className={styles.clickableRow} onClick={() => setSelectedUser(user)}>
                <td className={`${styles.username} ${styles.tableCell}`}>
                    {user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || "Unavailable"}
                </td>
                <td className={styles.tableCell}>{user.contactNumber || user.phone || "Unavailable"}</td>
                <td className={styles.tableCell}>{user.email || "Unavailable"}</td>
                <td className={styles.tableCell}>{user.location || "Unavailable"}</td>
                <td className={`${styles.statusCell} ${styles.tableCell}`}>
                  <span className={`${styles.statusPill} ${getStatusClass(user.status)}`}>
                    {formatStatus(user.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <div className={styles.contentModalOverlay} onClick={() => setSelectedUser(null)}>
          <div className={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>User Details</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedUser(null)}>×</button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.modalFormLayout}>
                <span className={styles.modalSectionTitle}>Personal Information</span>
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Full Name</span>
                    <div className={styles.modalDataField}>
                        {selectedUser.name || `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()}
                    </div>
                  </div>
                </div>

                <div className={styles.formRow}>
                    <div className={styles.itemFieldContainer}>
                        <span className={styles.itemLabel}>Middle Name</span>
                        <div className={styles.modalDataField}>{selectedUser.middleName || "N/A"}</div>
                    </div>
                    <div className={styles.itemFieldContainer}>
                        <span className={styles.itemLabel}>Gender</span>
                        <div className={styles.modalDataField}>{selectedUser.gender || "Not Set"}</div>
                    </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Date of Birth</span>
                    <div className={styles.modalDataField}>{selectedUser.dateOfBirth || selectedUser.dob || "Not Provided"}</div>
                  </div>
                </div>

                <span className={styles.modalSectionTitle}>Contact & Location</span>
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Email Address</span>
                    <div className={styles.modalDataField}>{selectedUser.email}</div>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Phone Number</span>
                    <div className={styles.modalDataField}>{selectedUser.contactNumber || selectedUser.phone}</div>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Location</span>
                    <div className={styles.modalDataField}>{selectedUser.location}</div>
                  </div>
                </div>

                <span className={styles.modalSectionTitle}>Account Status</span>
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Resident Status</span>
                    <div className={styles.modalDataField}>
                        {selectedUser.isResident ? "Resident" : "Non-Resident"}
                    </div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Current Status</span>
                    <div className={styles.modalDataField}>
                        <span className={`${styles.statusPill} ${getStatusClass(selectedUser.status)}`}>
                            {formatStatus(selectedUser.status)}
                        </span>
                    </div>
                  </div>
                </div>

                <span className={styles.modalSectionTitle}>Legal ID Verification</span>
                <div style={{ marginTop: '8px' }}>
                  {selectedUser.legalIdUrl ? (
                    <div style={{
                      width: '100%',
                      backgroundColor: '#f8fffe',
                      border: '2px solid #28a786',
                      borderRadius: '12px',
                      padding: '16px',
                      boxShadow: '0 2px 8px rgba(40, 167, 134, 0.15)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px',
                        color: '#28a786',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        <span style={{ fontSize: '1.1rem' }}>✅</span> Valid ID Submitted
                      </div>
                      <img 
                        src={selectedUser.legalIdUrl} 
                        alt="Legal ID Document" 
                        style={{ 
                          width: '100%',
                          height: 'auto',
                          minHeight: '280px',
                          maxHeight: '450px',
                          objectFit: 'contain',
                          borderRadius: '8px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e0e0e0',
                          display: 'block'
                        }} 
                      />
                    </div>
                  ) : (
                    <div style={{ 
                      padding: '20px', 
                      backgroundColor: '#fef2f2', 
                      border: '2px solid #fca5a5', 
                      borderRadius: '12px', 
                      color: '#991b1b', 
                      fontSize: '0.9rem', 
                      fontWeight: '600',
                      textAlign: 'center'
                    }}>
                      ⚠️ No valid ID has been uploaded by this user.
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className={styles.modalActions}>
              <button 
                className={`${styles.actionBtn} ${styles.approve}`}
                onClick={() => updateUserStatus(selectedUser.id, "active", true)}
              >
                Verify as Resident
              </button>
              <button 
                className={`${styles.actionBtn} ${styles.approve}`}
                onClick={() => updateUserStatus(selectedUser.id, "active", false)}
                disabled={selectedUser.status === "active" && selectedUser.isResident === false}
              >
                Verify as Non-Resident
              </button>
              <button 
                className={`${styles.actionBtn} ${styles.cancel}`}
                onClick={() => updateUserStatus(selectedUser.id, "deactivated", selectedUser.isResident)}
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