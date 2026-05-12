import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import styles from './logs.module.css';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const logData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLogs(logData);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const formatTimestamp = (ts) => {
    if (!ts) return "N/A";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={styles.logsPage}>
      <div className={styles.header}>
        <h2 className={styles.title}>System Audit Logs</h2>
        <p className={styles.subtitle}>Full accountability trail of administrative and user actions</p>
      </div>

      <div className={styles.logsWrapper}>
        {loading ? (
          <div className={styles.loader}>Loading system logs...</div>
        ) : (
          <table className={styles.logsTable}>
            <thead>
              <tr>
                <th>TIMESTAMP</th>
                <th>ACTOR</th>
                <th>ACTION TYPE</th>
                <th>DETAILS</th>
                <th>TARGET</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className={styles.logRow}>
                  <td className={styles.timeCell}>{formatTimestamp(log.timestamp)}</td>
                  <td className={styles.actorCell}>
                    <span className={styles.actorName}>{log.adminName || log.userName || "System"}</span>
                    <span className={styles.actorRole}>{log.role || "Administrator"}</span>
                  </td>
                  <td>
                    <span className={`${styles.typeTag} ${styles[(log.type || 'default').toLowerCase()]}`}>
                      {log.actionType}
                    </span>
                  </td>
                  <td className={styles.actionCell}>{log.actionDetails}</td>
                  <td className={styles.targetCell}>
                    <span className={styles.targetTitle}>{log.targetName || "System Object"}</span>
                  </td>
                  <td>
                    <span className={`${styles.statusPill} ${styles[(log.status || 'success').toLowerCase()]}`}>
                      {log.status || "Success"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Logs;