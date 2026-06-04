import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import styles from '../components/admin_pages.module.css';

const AnimatedModal = ({ children, onClose, maxWidth, noOverlayClose, style }) => {
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    if (noOverlayClose) return;
    setClosing(true);
    setTimeout(onClose, 180);
  };

  const handleDirectClose = () => {
    setClosing(true);
    setTimeout(onClose, 180);
  };

  return (
    <div
      className={`${styles.contentModalOverlay}${closing ? ' ' + styles.closing : ''}`}
      onClick={handleClose}
    >
      <div
        className={styles.contentModal}
        style={{ maxWidth: maxWidth || 600, ...style }}
        onClick={(e) => e.stopPropagation()}
      >
        {React.Children.map(children, child =>
          React.isValidElement(child)
            ? React.cloneElement(child, { _onClose: handleDirectClose })
            : child
        )}
      </div>
    </div>
  );
};

const IconError = (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconSent = (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const EventDocu = () => {
  const [documentedEvents, setDocumentedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  
  const [isReminding, setIsReminding] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [alertMessage, setAlertMessage] = useState(null);
  const [dialogClosing, setDialogClosing] = useState(false);
  
  const closeDialog = () => {
    setDialogClosing(true);
    setTimeout(() => {
      setAlertMessage(null);
      setDialogClosing(false);
    }, 200);
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return "N/A";
    if (dateString.toDate) {
      return dateString.toDate().toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      });
    }
    const dateObj = new Date(dateString);
    return dateObj.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  };

  useEffect(() => {
    const q = query(collection(db, "charity_events"), orderBy("createdAt", "desc"));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const allEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const reports = allEvents.filter(ev => ev.status === 'Completed' || ev.status === 'Ended' || ev.reportSubmittedAt || ev.postEventReport || (ev.reportFiles && ev.reportFiles.length > 0));
      setDocumentedEvents(reports);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching event documentations:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handleMarkReviewed = async (eventId) => {
    try {
      const eventRef = doc(db, 'charity_events', eventId);
      await updateDoc(eventRef, {
        reportReviewStatus: 'Reviewed',
        reportReviewedAt: serverTimestamp()
      });
      setSelectedReport(prev => ({ ...prev, reportReviewStatus: 'Reviewed' }));
    } catch (error) {
      console.error("Error updating report review status:", error);
      setAlertMessage({
        title: "Update Failed",
        heading: "Permission Error",
        message: "Failed to update the report. Please check permissions.",
        icon: IconError,
        themeColor: "#ef4444"
      });
    }
  };

  const handleRemindUser = async (eventObj) => {
    if (!eventObj.organizerId) {
      setAlertMessage({
        title: "Reminder Failed",
        heading: "No Organizer Found",
        message: "No organizer ID found for this event.",
        icon: IconError,
        themeColor: "#ef4444"
      });
      return;
    }
    try {
      setIsReminding(true);
      const notifRef = collection(db, `users/${eventObj.organizerId}/notifications`);
      await addDoc(notifRef, {
        title: "Action Required: Submit Event Documentation",
        body: `Please submit the post-event documentation for your completed event "${eventObj.title}".`,
        type: "Event",
        status: "warning",
        read: false,
        createdAt: serverTimestamp(),
        eventId: eventObj.id,
        requiresAction: true
      });
      setAlertMessage({
        title: "Reminder Sent",
        heading: "Notification Dispatched",
        message: `Reminder sent to the organizer of ${eventObj.title}.`,
        icon: IconSent,
        themeColor: "#10b981"
      });
    } catch (error) {
      console.error("Error sending reminder:", error);
      setAlertMessage({
        title: "Reminder Failed",
        heading: "Network Error",
        message: "Failed to send reminder. Please check permissions.",
        icon: IconError,
        themeColor: "#ef4444"
      });
    } finally {
      setIsReminding(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  const filteredReports = documentedEvents.filter(ev => {
    const matchesSearch = (ev.title || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (ev.organizerName || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const currentStatus = ev.reportReviewStatus || 'Pending';
    const matchesFilter = filterStatus === 'All' || currentStatus.toLowerCase() === filterStatus.toLowerCase();
    
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const currentReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className={`${styles.eventsPage} ${styles.eventDocsPage}`}>
      <div>
        <h2 className={styles.contentHeaderTitle}>Event Documentation</h2>
      </div>

      <div className={styles.tableControls}>
        <div className={styles.controlsLeft}>
          <select 
            className={styles.filterSelect} 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending Review</option>
            <option value="Reviewed">Reviewed</option>
          </select>
          <div className={styles.searchContainer}>
            <input 
              className={styles.searchContainerInput} 
              type="text" 
              placeholder="Search by event title or organizer..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.eventsTable}>
          <thead>
            <tr>
              <th className={styles.headerCell}>EVENT TITLE</th>
              <th className={styles.headerCell}>ORGANIZER</th>
              <th className={styles.headerCell}>EVENT DATE</th>
              <th className={styles.headerCell}>SUBMITTED ON</th>
              <th className={styles.headerCell}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className={styles.loader}>Loading documentations...</td>
              </tr>
            ) : currentReports.length === 0 ? (
              <tr>
                <td colSpan="5" className={styles.loader}>No documentation found.</td>
              </tr>
            ) : (
              currentReports.map((ev) => (
                <tr 
                  key={ev.id} 
                  className={`${styles.clickableRow} ${['unread', 'pending', 'processing'].includes((ev.reportReviewStatus || 'pending').toLowerCase()) ? styles.unreadRow : ''}`} 
                  onClick={() => setSelectedReport(ev)}
                >
                  <td className={styles.tableCell}><span className={styles.evTitle}>{ev.title || "Untitled Event"}</span></td>
                  <td className={styles.tableCell}>{ev.organizerName || "N/A"}</td>
                  <td className={styles.tableCell}>{formatDisplayDate(ev.date)}</td>
                  <td className={styles.tableCell}>{formatDisplayDate(ev.reportSubmittedAt)}</td>
                  <td className={`${styles.tableCell} ${styles.statusCell}`}>
                    <span className={`${styles.statusPill} ${ev.reportReviewStatus === 'Reviewed' ? styles.approved : styles.pending}`}>
                      {ev.reportReviewStatus || "Pending"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.paginationControls}>
            <button className={styles.pageBtn} disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>← Prev</button>
            <div className={styles.pageNumbers}>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1)
                .reduce((acc, n, idx, arr) => { if (idx > 0 && n - arr[idx-1] > 1) acc.push('...'); acc.push(n); return acc; }, [])
                .map((item, idx) => item === '...'
                  ? <span key={`e${idx}`} className={styles.pageEllipsis}>…</span>
                  : <button key={item} className={`${styles.pageNumber} ${currentPage === item ? styles.activePage : ''}`} onClick={() => setCurrentPage(item)}>{item}</button>
                )}
            </div>
            <button className={styles.pageBtn} disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {/* DOCUMENTATION MODAL */}
      {selectedReport && (
        <AnimatedModal onClose={() => setSelectedReport(null)} maxWidth={800}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalHeaderTitle}>Post-Event Report</h3>
            <button className={styles.closeBtn} onClick={() => setSelectedReport(null)}>×</button>
          </div>
          
          <div className={styles.modalBody}>
            <div className={styles.modalFormLayout}>
              
              <div className={styles.formRow}>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Event Title</label>
                  <div className={styles.modalDataField}>{selectedReport.title}</div>
                </div>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Organizer</label>
                  <div className={styles.modalDataField}>{selectedReport.organizerName || 'N/A'}</div>
                </div>
              </div>

              <div className={styles.itemFieldContainer}>
                <label className={styles.itemLabel}>Event Summary & Documentation</label>
                <div className={`${styles.modalDataField} ${styles.descriptionContainer}`}>
                  <p className={styles.modalDescriptionText}>
                    {selectedReport.postEventReport || <i>No written summary provided.</i>}
                  </p>
                </div>
              </div>

              <div className={styles.attachedFilesSection}>
                <span className={styles.attachedFilesLabel}>
                  Attached Files
                </span>

                {selectedReport.reportFiles && selectedReport.reportFiles.length > 0 ? (
                  <table className={styles.attachedFilesTable}>
                    <thead className={styles.attachedFilesTableHead}>
                      <tr>
                        <th className={styles.attachedFilesColDesc}>Description</th>
                        <th className={styles.attachedFilesColAction}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReport.reportFiles.map((file, idx) => (
                        <tr key={idx} className={styles.attachedFilesRow}>
                          <td className={styles.attachedFilesDescCell}>
                            <div className={styles.attachedFilesMeta}>
                              <div className={styles.attachedFilesIcon}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                  <polyline points="14 2 14 8 20 8"></polyline>
                                  <line x1="16" y1="13" x2="8" y2="13"></line>
                                  <line x1="16" y1="17" x2="8" y2="17"></line>
                                  <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                              </div>
                              <div className={styles.attachedFilesText}>
                                <span className={styles.attachedFilesName}>{file.description}</span>
                                <span className={styles.attachedFilesFilename}>
                                  {file.fileName || 'Unnamed File'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className={styles.attachedFilesActionCell}>
                            {file.fileUrl ? (
                              <a
                                href={file.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.viewFileLink}
                              >
                                View File
                              </a>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className={styles.attachedFilesEmpty}>
                    No files attached.
                  </div>
                )}
              </div>

            </div>
          </div>

          <div className={styles.modalActions}>
            <button className={`${styles.actionBtn} ${styles.cancel}`} onClick={() => setSelectedReport(null)}>
              Close
            </button>
            {(!selectedReport.reportSubmittedAt && !selectedReport.postEventReport && (!selectedReport.reportFiles || selectedReport.reportFiles.length === 0)) ? (
              <button 
                className={`${styles.actionBtn} ${styles.warn}`} 
                onClick={() => handleRemindUser(selectedReport)}
                disabled={isReminding}
              >
                {isReminding ? 'Sending...' : 'Remind User to Submit Proof'}
              </button>
            ) : (
              (!selectedReport.reportReviewStatus || selectedReport.reportReviewStatus === 'Pending') && (
                <button 
                  className={`${styles.actionBtn} ${styles.approve}`} 
                  onClick={() => handleMarkReviewed(selectedReport.id)}
                >
                  Mark as Reviewed
                </button>
              )
            )}
          </div>
        </AnimatedModal>
      )}

      {/* ALERT DIALOG MODAL */}
      {alertMessage && (
        <div className={`${styles.dialogOverlay}${dialogClosing ? ' ' + styles.closing : ''}`} onClick={closeDialog} style={{ '--dialog-theme-color': alertMessage.themeColor || '#3b82f6', '--dialog-theme-shadow': `${alertMessage.themeColor || '#3b82f6'}33` }}>
          <div className={styles.dialogContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dialogHeader}>
              <h3 className={styles.dialogTitle}>{alertMessage.title || 'Notice'}</h3>
              <button className={styles.dialogCloseBtn} onClick={closeDialog}>×</button>
            </div>
            <div className={styles.dialogBody}>
              {alertMessage.icon && <div className={styles.dialogIcon}>{alertMessage.icon}</div>}
              {alertMessage.heading && <h4 className={styles.dialogHeading}>{alertMessage.heading}</h4>}
              <p className={styles.dialogMessage}>{typeof alertMessage === 'string' ? alertMessage : alertMessage.message}</p>
            </div>
            <div className={styles.dialogFooter}>
              <button className={styles.dialogConfirmBtn} onClick={closeDialog}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EventDocu;
