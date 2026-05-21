/* React & Firebase Imports */
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import {collection, onSnapshot, query, orderBy,addDoc, serverTimestamp, updateDoc, doc,} from 'firebase/firestore';

/* Style Imports */
import styles from '../components/admin_pages.module.css';

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const sendWarning = async (report) => {
    try {
      const warningMsg =
        'Your account has been reported for misconduct. This is a formal warning to adhere to community guidelines. Further violations may lead to account deactivation.';

      await addDoc(collection(db, `users/${report.reportedUserId}/notifications`), {
        title: 'Account Warning',
        body: warningMsg,
        type: 'System',
        status: 'warning',
        read: false,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'reports', report.id), { status: 'Warned' });

      await addDoc(collection(db, 'audit_logs'), {
        adminName: auth.currentUser?.displayName || auth.currentUser?.email || 'Admin',
        role: 'Administrator',
        actionType: 'User Discipline',
        actionDetails: `Sent automated warning to ${report.reportedUserEmail}`,
        targetName: report.reportedUserEmail,
        timestamp: serverTimestamp(),
      });

      alert(`Warning successfully sent to ${report.reportedUserEmail}`);
      setSelectedReport(null);
    } catch (err) {
      console.error('Error sending warning:', err);
      alert('Failed to send warning.');
    }
  };

  const deactivateAccount = async (report) => {
    if (
      !window.confirm(
        `Are you sure you want to PERMANENTLY deactivate ${report.reportedUserEmail}?`
      )
    )
      return;

    try {
      const adminUser = auth.currentUser;
      const userRef = doc(db, 'users', report.reportedUserId);

      await updateDoc(userRef, {
        status: 'deactivated',
        disabled: true,
        verifiedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'reports', report.id), { status: 'Banned' });

      await addDoc(collection(db, 'audit_logs'), {
        adminName: adminUser?.displayName || adminUser?.email || 'Admin',
        role: 'Administrator',
        actionType: 'User Management',
        actionDetails: 'Your account has been deactivated by the administrator.',
        targetName: report.reportedUserEmail,
        eventLifecycle: 'Account Verification',
        status: 'Success',
        timestamp: serverTimestamp(),
        type: 'user',
      });

      await addDoc(collection(db, `users/${report.reportedUserId}/notifications`), {
        title: 'Account Deactivated',
        body: 'Your account has been deactivated by the administrator.',
        status: 'error',
        read: false,
        createdAt: serverTimestamp(),
        type: 'Account',
      });

      alert('Account has been deactivated.');
      setSelectedReport(null);
    } catch (err) {
      console.error('Error deactivating account:', err);
      alert('Failed to deactivate account.');
    }
  };

  const getStatusClass = (status = 'pending') => {
    const key = status.toLowerCase();
    const map = { pending: 'pending', warned: 'warned', banned: 'banned' };
    return map[key] || 'pending';
  };

  return (
    <div className={styles.reportsPage}>
      <div className={styles.contentHeader}>
        <h2 className={styles.contentHeaderTitle}>Reports Management</h2>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.reportsTable}>
          <thead>
            <tr>
              <th className={styles.headerCell}>Reported User</th>
              <th className={styles.headerCell}>Reason</th>
              <th className={styles.headerCell}>Reporter</th>
              <th className={styles.headerCell}>Date</th>
              <th className={styles.headerCell}>Status</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.loader}>No reports found.</td>
              </tr>
            ) : (
              reports
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((report) => (
                <tr
                  key={report.id}
                  className={styles.clickableRow}
                  onClick={() => setSelectedReport(report)}
                >
                  <td className={styles.tableCell}>
                    <span className={styles.repUser}>{report.reportedUserEmail}</span>
                  </td>
                  <td className={`${styles.tableCell} ${styles.truncateCell}`}>
                    {report.reason
                      ? report.reason.length > 35
                        ? report.reason.substring(0, 35) + '…'
                        : report.reason
                      : 'No reason provided'}
                  </td>
                  <td className={styles.tableCell}>
                    {report.reporterName || 'Anonymous'}
                  </td>
                  <td className={styles.tableCell}>
                    {report.createdAt?.toDate
                      ? report.createdAt.toDate().toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td className={styles.tableCell}>
                    <span
                      className={`${styles.statusPill} ${styles[getStatusClass(report.status)]}`}
                    >
                      {report.status || 'Pending'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {Math.ceil(reports.length / itemsPerPage) > 1 && (
          <div className={styles.paginationControls}>
            <button className={styles.pageBtn} disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>← Prev</button>
            <div className={styles.pageNumbers}>
              {Array.from({ length: Math.ceil(reports.length / itemsPerPage) }, (_, i) => i + 1)
                .filter(n => n === 1 || n === Math.ceil(reports.length / itemsPerPage) || Math.abs(n - currentPage) <= 1)
                .reduce((acc, n, idx, arr) => { if (idx > 0 && n - arr[idx-1] > 1) acc.push('...'); acc.push(n); return acc; }, [])
                .map((item, idx) => item === '...'
                  ? <span key={`e${idx}`} className={styles.pageEllipsis}>…</span>
                  : <button key={item} className={`${styles.pageNumber} ${currentPage === item ? styles.activePage : ''}`} onClick={() => setCurrentPage(item)}>{item}</button>
                )}
            </div>
            <button className={styles.pageBtn} disabled={currentPage === Math.ceil(reports.length / itemsPerPage)} onClick={() => setCurrentPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedReport && (
        <div
          className={styles.contentModalOverlay}
          onClick={() => setSelectedReport(null)}
        >
          <div
            className={styles.contentModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>Report Details</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setSelectedReport(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalFormLayout}>
                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Reported User</span>
                  <div className={styles.modalDataField}>
                    {selectedReport.reportedUserEmail}
                  </div>
                </div>

                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Reporter</span>
                  <div className={styles.modalDataField}>
                    {selectedReport.reporterName || 'Anonymous'}
                  </div>
                </div>

                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Reason for Report</span>
                  <div className={`${styles.modalDataField} ${styles.descriptionContainer}`}>
                    {selectedReport.reason || 'No reason provided.'}
                  </div>
                </div>

                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Proof</span>
                  <div className={styles.evidenceContainer}>
                    {selectedReport.proofImageUrl ? (
                      <a 
                        href={selectedReport.proofImageUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <img 
                          src={selectedReport.proofImageUrl} 
                          alt="Proof of violation" 
                          className={styles.proofPreview} 
                        />
                      </a>
                    ) : (
                      <div className={styles.noProof}>No image proof provided.</div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                className={`${styles.actionBtn} ${styles.warn}`}
                onClick={() => sendWarning(selectedReport)}
              >
                Send Warning
              </button>
              <button
                className={`${styles.actionBtn} ${styles.deactivate}`}
                onClick={() => deactivateAccount(selectedReport)}
                disabled={selectedReport.status === 'deactivated'}
              >
                Deactivate Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
