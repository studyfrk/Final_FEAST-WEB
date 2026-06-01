/* React & Firebase Imports */
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';

/* Style Imports */
import styles from '../components/admin_pages.module.css';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [alertMessage, setAlertMessage] = useState(null);
  const itemsPerPage = 10;

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
      const adminUser = auth.currentUser;
      const userRef = doc(db, "users", userId);
      const userName = selectedUser.name || `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim() || "Unknown User";
      
      const updateData = { 
        status: newStatus.toLowerCase(),
        isResident: isResidentValue,
        verifiedAt: serverTimestamp()
      };

      // 1. Update the user document
      await updateDoc(userRef, updateData);

      // 2. Create Audit Log entry
      await addDoc(collection(db, "audit_logs"), {
        adminName: adminUser?.displayName || adminUser?.email || "Admin",
        role: "Administrator",
        actionType: "User Management",
        actionDetails: `Updated user status to ${newStatus} (${isResidentValue ? 'Resident' : 'Non-Resident'})`,
        targetName: userName,
        eventLifecycle: "Account Verification",
        status: "Success",
        timestamp: serverTimestamp(),
        type: "user"
      });

      // 3. Create Notification for the User
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
      setAlertMessage("Missing permissions or error updating status.");
    }
  };

  const filteredUsers = users.filter(user => {
    const fullName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || "Unknown";
    const email = user.email || "";
    const status = user.status || "unverified";

    // Never surface email_unconfirmed accounts — email not yet verified by the user
    if (status === "email_unconfirmed") return false;

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
              <th className={styles.headerCell}>Address/Location</th>
              <th className={styles.headerCell}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((user) => (
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

        {/* Pagination */}
        {Math.ceil(filteredUsers.length / itemsPerPage) > 1 && (
          <div className={styles.paginationControls}>
            <button className={styles.pageBtn} disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>← Prev</button>
            <div className={styles.pageNumbers}>
              {Array.from({ length: Math.ceil(filteredUsers.length / itemsPerPage) }, (_, i) => i + 1)
                .filter(n => n === 1 || n === Math.ceil(filteredUsers.length / itemsPerPage) || Math.abs(n - currentPage) <= 1)
                .reduce((acc, n, idx, arr) => { if (idx > 0 && n - arr[idx-1] > 1) acc.push('...'); acc.push(n); return acc; }, [])
                .map((item, idx) => item === '...'
                  ? <span key={`e${idx}`} className={styles.pageEllipsis}>…</span>
                  : <button key={item} className={`${styles.pageNumber} ${currentPage === item ? styles.activePage : ''}`} onClick={() => setCurrentPage(item)}>{item}</button>
                )}
            </div>
            <button className={styles.pageBtn} disabled={currentPage === Math.ceil(filteredUsers.length / itemsPerPage)} onClick={() => setCurrentPage(p => p + 1)}>Next →</button>
          </div>
        )}
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
                    <span className={styles.itemLabel}>Address/Location</span>
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
      {alertMessage && (
        <div className={styles.contentModalOverlay} onClick={() => setAlertMessage(null)}>
          <div className={styles.contentModal} style={{ maxWidth: '400px', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader} style={{ padding: 0, border: 'none', marginBottom: '12px' }}>
              <h3 className={styles.modalHeaderTitle}>Notice</h3>
              <button className={styles.closeBtn} onClick={() => setAlertMessage(null)}>×</button>
            </div>
            <div className={styles.modalBody} style={{ padding: 0, marginBottom: '20px' }}>
              <p style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b', lineHeight: 1.5 }}>{alertMessage}</p>
            </div>
            <div className={styles.modalActions} style={{ padding: 0, border: 'none', display: 'flex', justifyContent: 'flex-end' }}>
              <button className={styles.actionBtn + ' ' + styles.approve} onClick={() => setAlertMessage(null)} style={{ margin: 0, minWidth: '100px' }}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
