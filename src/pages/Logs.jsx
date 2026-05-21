/* React & Firebase Imports */
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

/* Style Imports */
import styles from '../components/admin_pages.module.css';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredLogs = logs.filter(log => {
    const actor = (log.adminName || log.userName || 'System').toLowerCase();
    const action = (log.actionType || '').toLowerCase();
    const target = (log.targetName || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    const matchesSearch = actor.includes(search) || action.includes(search) || target.includes(search);
    const matchesType = typeFilter === 'All' || log.type?.toLowerCase() === typeFilter.toLowerCase();

    return matchesSearch && matchesType;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const formatTimestamp = (ts) => {
    if (!ts) return 'N/A';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getTypeClass = (type = 'default') => {
    const key = type.toLowerCase();
    return ['request', 'user', 'event', 'auth'].includes(key) ? key : 'default';
  };

  const getStatusClass = (status = 'success') => {
    const key = status.toLowerCase();
    return ['success', 'error', 'pending'].includes(key) ? key : 'success';
  };

  return (
    <div className={styles.logsPage}>
      <div className={styles.contentHeader}>
        <h2 className={styles.contentHeaderTitle}>System Audit Logs</h2>
        
        {/* Search and Filter Controls */}
        <div className={styles.headerControls}>
          <div className={styles.searchBar}>
            <input 
              type="text" 
              placeholder="Search actor, action, or target..." 
              value={searchTerm}
              onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
              className={styles.searchBarInput}
            />
          </div>
          
          <select 
            className={styles.sortSelect} 
            value={typeFilter} 
            onChange={(e) => {setTypeFilter(e.target.value); setCurrentPage(1);}}
          >
            <option value="All">All Types</option>
            <option value="request">Requests</option>
            <option value="user">User Management</option>
            <option value="event">Events</option>
          </select>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        {loading ? (
          <div className={styles.loader}>Loading system logs…</div>
        ) : (
          <>
            <table className={styles.logsTable}>
              <thead>
                <tr>
                  <th className={styles.headerCell}>Timestamp</th>
                  <th className={styles.headerCell}>Actor</th>
                  <th className={styles.headerCell}>Action Type</th>
                  <th className={styles.headerCell}>Details</th>
                  <th className={styles.headerCell}>Target</th>
                  <th className={styles.headerCell}>Status</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.loader}>No logs found.</td>
                  </tr>
                ) : (
                  currentItems.map((log) => (
                    <tr key={log.id} className={styles.clickableRow} onClick={() => setSelectedLog(log)}>
                      <td className={`${styles.tableCell} ${styles.timeCell}`}>
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className={styles.tableCell}>
                        <div className={styles.actorCell}>
                          <span className={styles.actorName}>{log.adminName || log.userName || 'System'}</span>
                          <span className={styles.actorRole}>{log.role || 'Administrator'}</span>
                        </div>
                      </td>
                      <td className={styles.tableCell}>
                        <span className={`${styles.typeTag} ${styles[getTypeClass(log.type)]}`}>
                          {log.actionType || '—'}
                        </span>
                      </td>
                      <td className={`${styles.tableCell} ${styles.truncateCell}`}>{log.actionDetails}</td>
                      <td className={styles.tableCell}>
                        <span className={styles.targetTitle}>{log.targetName || 'System Object'}</span>
                      </td>
                      <td className={styles.tableCell}>
                        <span className={`${styles.statusPill} ${styles[getStatusClass(log.status)]}`}>
                          {log.status || 'Success'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className={styles.paginationControls}>
              <button 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(prev => prev - 1)}
                className={styles.pageBtn}
              >
                Previous
              </button>
              
              <span className={styles.pageInfo}>
                Page <strong>{currentPage}</strong> of {totalPages}
              </span>
              
              <button 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(prev => prev + 1)}
                className={styles.pageBtn}
              >
                Next
              </button>
            </div>
          )}
          </>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className={styles.contentModalOverlay} onClick={() => setSelectedLog(null)}>
          <div className={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>Log Details</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedLog(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalFormLayout}>
                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Timestamp</span>
                  <div className={styles.modalDataField}>{formatTimestamp(selectedLog.timestamp)}</div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Actor</span>
                    <div className={styles.modalDataField}>{selectedLog.adminName || selectedLog.userName || 'System'}</div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Role</span>
                    <div className={styles.modalDataField}>{selectedLog.role || 'Administrator'}</div>
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Action Type</span>
                    <div className={styles.modalDataField}>
                      <span className={`${styles.typeTag} ${styles[getTypeClass(selectedLog.type)]}`}>
                        {selectedLog.actionType || '—'}
                      </span>
                    </div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Status</span>
                    <div className={styles.modalDataField}>
                      <span className={`${styles.statusPill} ${styles[getStatusClass(selectedLog.status)]}`}>
                        {selectedLog.status || 'Success'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Target</span>
                  <div className={styles.modalDataField}>{selectedLog.targetName || 'System Object'}</div>
                </div>
                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Action Details</span>
                  <div className={`${styles.modalDataField} ${styles.descriptionContainer}`}>
                    {selectedLog.actionDetails || 'No details recorded.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logs;
