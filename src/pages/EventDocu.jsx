import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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

const EventDocu = () => {
  const [documentedEvents, setDocumentedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedReport, setSelectedReport] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
      const reports = allEvents.filter(ev => ev.reportSubmittedAt || ev.postEventReport || (ev.reportFiles && ev.reportFiles.length > 0));
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
      console.error("Error marking report as reviewed:", error);
      alert("Failed to update status.");
    }
  };

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

              <div className={styles.fileSectionWrapper} style={{ marginTop: '20px' }}>
                <span className={styles.sleekSectionLabel} style={{ fontWeight: 'bold', display: 'block', marginBottom: '12px' }}>
                  Attached Files
                </span>

                {selectedReport.reportFiles && selectedReport.reportFiles.length > 0 ? (
                  <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #ccc' }}>
                        <th style={{ textAlign: 'left', paddingBottom: '8px', width: '80%' }}>Description</th>
                        <th style={{ textAlign: 'center', paddingBottom: '8px', width: '20%' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReport.reportFiles.map((file, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '12px 0', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                              
                              {/* Document Icon */}
                              <div style={{ flexShrink: 0, marginTop: '2px' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                  <polyline points="14 2 14 8 20 8"></polyline>
                                  <line x1="16" y1="13" x2="8" y2="13"></line>
                                  <line x1="16" y1="17" x2="8" y2="17"></line>
                                  <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                              </div>

                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                minWidth: 0, 
                                width: '100%'
                              }}>
                                <span style={{
                                  fontWeight: '500',
                                  wordBreak: 'break-word',
                                  overflowWrap: 'anywhere'
                                }}>
                                  {file.description}
                                </span>
                                {file.description && (
                                  <span style={{
                                    fontSize: '0.9em',
                                    color: '#666',
                                    marginTop: '4px',
                                    wordBreak: 'break-word',
                                    overflowWrap: 'anywhere'
                                  }}>
                                    {file.fileName || 'Unnamed File'}
                                  </span>
                                )}
                              </div>
                              
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', padding: '12px 0', verticalAlign: 'top' }}>
                            {file.fileUrl && (
                              <a 
                                href={file.fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={styles.viewDownloadLink}
                                style={{ color: '#007bff', textDecoration: 'none', fontWeight: '600' }}
                              >
                                View File
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className={styles.noProof} style={{ padding: '16px', textAlign: 'center', color: '#666', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
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
            {(!selectedReport.reportReviewStatus || selectedReport.reportReviewStatus === 'Pending') && (
              <button 
                className={`${styles.actionBtn} ${styles.approve}`} 
                onClick={() => handleMarkReviewed(selectedReport.id)}
              >
                Mark as Reviewed
              </button>
            )}
          </div>
        </AnimatedModal>
      )}
    </div>
  );
};

export default EventDocu;