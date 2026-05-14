import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import styles from '../components/admin_pages.module.css';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const formatTimestamp = (ts) => {
    if (!ts) return 'N/A';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeClass = (type = 'default') => {
    const key = type.toLowerCase();
    return ['request', 'event', 'auth'].includes(key) ? key : 'default';
  };

  const getStatusClass = (status = 'success') => {
    const key = status.toLowerCase();
    return ['success', 'error', 'pending'].includes(key) ? key : 'success';
  };

  return (
    <div className={styles.logsPage}>
      <div className={styles.contentHeader}>
        <h2 className={styles.contentHeaderTitle}>System Audit Logs</h2>
      </div>

      <div className={styles.tableWrapper}>
        {loading ? (
          <div className={styles.loader}>Loading system logs…</div>
        ) : (
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
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.loader}>No logs found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className={styles.clickableRow}
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className={`${styles.tableCell} ${styles.timeCell}`}>
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.actorCell}>
                        <span className={styles.actorName}>
                          {log.adminName || log.userName || 'System'}
                        </span>
                        <span className={styles.actorRole}>
                          {log.role || 'Administrator'}
                        </span>
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.typeTag} ${styles[getTypeClass(log.type)]}`}>
                        {log.actionType || '—'}
                      </span>
                    </td>
                    <td className={`${styles.tableCell} ${styles.truncateCell}`}>
                      {log.actionDetails}
                    </td>
                    <td className={styles.tableCell}>
                      <span className={styles.targetTitle}>
                        {log.targetName || 'System Object'}
                      </span>
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
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div
          className={styles.contentModalOverlay}
          onClick={() => setSelectedLog(null)}
        >
          <div
            className={styles.contentModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>Log Details</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setSelectedLog(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalFormLayout}>

                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Timestamp</span>
                  <div className={styles.modalDataField}>
                    {formatTimestamp(selectedLog.timestamp)}
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Actor</span>
                    <div className={styles.modalDataField}>
                      {selectedLog.adminName || selectedLog.userName || 'System'}
                    </div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Role</span>
                    <div className={styles.modalDataField}>
                      {selectedLog.role || 'Administrator'}
                    </div>
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
                  <div className={styles.modalDataField}>
                    {selectedLog.targetName || 'System Object'}
                  </div>
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
