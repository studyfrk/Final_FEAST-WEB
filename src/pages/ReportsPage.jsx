import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import styles from './reports_page.module.css';

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const sendWarning = async (report) => {
    try {
      const warningMsg = "Your account has been reported for misconduct. This is a formal warning to adhere to community guidelines. Further violations may lead to account deactivation.";

      const notifRef = collection(db, `users/${report.reportedUserId}/notifications`);
      await addDoc(notifRef, {
        title: "Account Warning",
        body: warningMsg,
        type: "System",
        status: "warning",
        read: false,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "reports", report.id), { status: "Warned" });

      await addDoc(collection(db, "audit_logs"), {
        adminName: auth.currentUser?.email || "Admin",
        actionType: "User Discipline",
        actionDetails: `Sent automated warning to ${report.reportedUserEmail}`,
        targetName: report.reportedUserEmail,
        timestamp: serverTimestamp(),
      });

      alert(`Warning successfully sent to ${report.reportedUserEmail}`);
      setSelectedReport(null);
    } catch (err) {
      console.error("Error sending warning:", err);
      alert("Failed to send warning.");
    }
  };

  const deactivateAccount = async (report) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY deactivate ${report.reportedUserEmail}?`)) return;

    try {
      //Update user document status
      await updateDoc(doc(db, "users", report.reportedUserId), {
        accountStatus: "Deactivated",
        disabled: true
      });

      //Update report status to show action was taken
      await updateDoc(doc(db, "reports", report.id), { status: "Banned" });

      //Audit Log
      await addDoc(collection(db, "audit_logs"), {
        adminName: auth.currentUser?.email || "Admin",
        actionType: "Account Deactivation",
        actionDetails: `Deactivated account: ${report.reportedUserEmail}`,
        targetName: report.reportedUserEmail,
        timestamp: serverTimestamp(),
      });

      alert("Account has been deactivated.");
      setSelectedReport(null);
    } catch (err) {
      console.error("Error deactivating account:", err);
      alert("Failed to deactivate account.");
    }
  };

  return (
    <div className={styles.eventsPage}>
      <h2 className={styles.contentHeaderTitle}>Reports Management</h2>

      <div className={styles.tableWrapper}>
        <table className={styles.eventsTable}>
          <thead>
            <tr className={styles.tableHeaderRow}>
              <th className={styles.headerCell}>REPORTED USER</th>
              <th className={styles.headerCell}>REASON</th>
              <th className={styles.headerCell}>REPORTER</th>
              <th className={styles.headerCell}>DATE</th>
              <th className={styles.headerCell}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className={styles.clickableRow} onClick={() => setSelectedReport(report)}>
                <td className={styles.tableCell}><strong>{report.reportedUserEmail}</strong></td>
                <td className={styles.tableCell}>
                    {report.reason ? (report.reason.length > 30 ? report.reason.substring(0, 30) + "..." : report.reason) : "No reason provided"}
                </td>
                <td className={styles.tableCell}>{report.reporterName || "Anonymous"}</td>
                <td className={styles.tableCell}>
                  {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleDateString() : "N/A"}
                </td>
                <td className={styles.tableCell}>
                  <span className={`${styles.statusPill} ${(report.status || "pending").toLowerCase()}`}>
                    {report.status || "Pending"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedReport && (
        <div className={styles.contentModalOverlay} onClick={() => setSelectedReport(null)}>
          <div className={styles.contentModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>Report Details</h3>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.itemFieldContainer}>
                <label className={styles.itemLabel}>Reported User</label>
                <div className={styles.modalDataField}>{selectedReport.reportedUserEmail}</div>
              </div>
              <div className={styles.itemFieldContainer}>
                <label className={styles.itemLabel}>Reporter</label>
                <div className={styles.modalDataField}>{selectedReport.reporterName || "Anonymous"}</div>
              </div>
              <div className={styles.itemFieldContainer}>
                <label className={styles.itemLabel}>Reason for Report</label>
                <div className={`${styles.modalDataField} ${styles.descriptionContainer}`}>
                    {selectedReport.reason}
                </div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button 
                className={`${styles.actionBtn} ${styles.approve}`} 
                onClick={() => sendWarning(selectedReport)}
              >
                Send Warning
              </button>
              <button 
                className={`${styles.actionBtn} ${styles.decline}`} 
                onClick={() => deactivateAccount(selectedReport)}
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