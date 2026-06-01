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

              <div className={styles.itemFieldContainer} style={{ width: '100%', marginTop: '16px' }}>
                <span className={styles.itemLabel}>📎 Attached Documentation / Files</span>
                
                {/* The responsive horizontal scroll wrapper isolates table widths from the parent overlay container */}
                <div style={{ width: '100%', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#ffffff', fontSize: '0.9rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '10px 14px', fontWeight: '600', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase' }}>File Name</th>
                        <th style={{ padding: '10px 14px', fontWeight: '600', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase' }}>Size</th>
                        <th style={{ padding: '10px 14px', fontWeight: '600', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReport?.attachedFiles && selectedReport.attachedFiles.length > 0 ? (
                        selectedReport.attachedFiles.map((file, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            {/* Max-width paired with text-overflow stops long string paths from blowing out column widths */}
                            <td style={{ padding: '12px 14px', color: '#1e293b', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <span title={file.name} style={{ fontWeight: '500' }}>{file.name}</span>
                            </td>
                            <td style={{ padding: '12px 14px', color: '#64748b' }}>
                              {file.size || "N/A"}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                              <a href={file.url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600', fontSize: '0.85rem' }}>
                                View File
                              </a>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                            No document attachments found on this report record.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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