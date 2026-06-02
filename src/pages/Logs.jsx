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
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
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
    // String matching variables
    const actor = (log.adminName || log.userName || 'System').toLowerCase();
    const action = (log.actionType || '').toLowerCase();
    const target = (log.targetName || '').toLowerCase();
    const details = (log.actionDetails || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    // Condition Checkers
    const matchesSearch = actor.includes(search) || action.includes(search) || target.includes(search) || details.includes(search);
    const matchesType = typeFilter === 'All' || log.type?.toLowerCase() === typeFilter.toLowerCase();
    const matchesStatus = statusFilter === 'All' || log.status?.toLowerCase() === statusFilter.toLowerCase();
    
    // Date Range Checker
    let matchesDate = true;
    if (startDate || endDate) {
      const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && logDate >= start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && logDate <= end;
      }
    }

    return matchesSearch && matchesType && matchesStatus && matchesDate;
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
    return ['request', 'user', 'event', 'auth', 'report'].includes(key) ? key : 'default';
  };

  const getStatusClass = (status = 'success') => {
    const key = status.toLowerCase();
    return ['success', 'error', 'pending'].includes(key) ? key : 'success';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('All');
    setStatusFilter('All');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
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
              placeholder="Search actor, action, details..." 
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
            <option value="All">All Module Types</option>
            <option value="request">Aid Requests</option>
            <option value="user">User Management</option>
            <option value="event">Charity Events</option>
            <option value="auth">Donations</option>
            <option value="report">Reports & Moderation</option>
          </select>

          <select 
            className={styles.sortSelect} 
            value={statusFilter} 
            onChange={(e) => {setStatusFilter(e.target.value); setCurrentPage(1);}}
          >
            <option value="All">All Statuses</option>
            <option value="success">Success</option>
            <option value="error">Error / Reject</option>
            <option value="pending">Pending</option>
          </select>

          <div className={styles.dateFilterLabel}>
            <span className={styles.dateFilterText}>From:</span>
            <input 
              type="date" 
              className={styles.sortSelect} 
              value={startDate} 
              onChange={(e) => {setStartDate(e.target.value); setCurrentPage(1);}}
            />
          </div>

          <div className={styles.dateFilterLabel}>
            <span className={styles.dateFilterText}>To:</span>
            <input 
              type="date" 
              className={styles.sortSelect} 
              value={endDate} 
              onChange={(e) => {setEndDate(e.target.value); setCurrentPage(1);}}
            />
          </div>

          {(searchTerm !== '' || typeFilter !== 'All' || statusFilter !== 'All' || startDate !== '' || endDate !== '') && (
            <button 
              onClick={clearFilters} 
              className={`${styles.pageBtn} ${styles.clearFiltersBtn}`}
            >
              Clear Filters
            </button>
          )}
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
                    <td colSpan={6} className={styles.loader}>No logs match your filters.</td>
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
                
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Timestamp</span>
                    <div className={styles.modalDataField}>{formatTimestamp(selectedLog.timestamp)}</div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Module Reference Type</span>
                    <div className={styles.modalDataField}>
                      <span className={`${styles.typeTag} ${styles[getTypeClass(selectedLog.type)]}`}>
                        {selectedLog.type?.toUpperCase() || 'SYSTEM'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Actor Name</span>
                    <div className={styles.modalDataField}>{selectedLog.adminName || selectedLog.userName || 'System'}</div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Actor Role</span>
                    <div className={styles.modalDataField}>{selectedLog.role || 'Administrator'}</div>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Action Dispatched</span>
                    <div className={styles.modalDataField}>{selectedLog.actionType || '—'}</div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Resulting Status</span>
                    <div className={styles.modalDataField}>
                      <span className={`${styles.statusPill} ${styles[getStatusClass(selectedLog.status)]}`}>
                        {selectedLog.status || 'Success'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Target Object / Subject</span>
                    <div className={styles.modalDataField}>{selectedLog.targetName || 'System Object'}</div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Lifecycle Data State</span>
                    <div className={styles.modalDataField}>{selectedLog.eventLifecycle || 'N/A'}</div>
                  </div>
                </div>

                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Action Details</span>
                  <div className={`${styles.modalDataField} ${styles.descriptionContainer}`}>
                    {selectedLog.actionDetails || 'No detailed description recorded.'}
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
