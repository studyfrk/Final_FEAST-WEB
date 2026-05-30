/* React & Firebase Imports */
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore';

/* Style Imports */
import styles from '../components/admin_pages.module.css';

const DEFAULT_WARNING_MSG = 'Your account has been reported. This is a formal warning to adhere to community guidelines. Further violations may lead to account deactivation.';

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const itemsPerPage = 10;

  const [warningType, setWarningType] = useState('default');
  const [customWarning, setCustomWarning] = useState('');
  const [resolvedEmail, setResolvedEmail] = useState('');

  const [dialog, setDialog] = useState({
    isOpen: false,
    type: 'confirm',
    actionType: '',
    reportData: null,
    title: '',       
    icon: '',        
    heading: '',     
    message: '',     
    themeColor: '',  
  });

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const getProofImagesArray = (report) => {
    if (!report) return [];
    if (report.proofImageUrls && Array.isArray(report.proofImageUrls)) {
      return report.proofImageUrls.filter(Boolean);
    }
    if (report.proofImageUrl) {
      return [report.proofImageUrl];
    }
    return [];
  };

  const handleOpenModal = async (report) => {
    setSelectedReport(report);
    setCurrentImgIndex(0); 
    if (report.reportedUserEmail && report.reportedUserEmail !== 'N/A') {
      setResolvedEmail(report.reportedUserEmail);
    } else if (report.reportedUserId) {
      setResolvedEmail('Loading email...');
      try {
        const userDocRef = doc(db, 'users', report.reportedUserId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const email = userSnap.data().email;
          setResolvedEmail(email || 'N/A');
        } else {
          setResolvedEmail('N/A');
        }
      } catch (err) {
        console.error('Error fetching reported user email:', err);
        setResolvedEmail('N/A');
      }
    } else {
      setResolvedEmail('N/A');
    }
  };

  const handlePrevImage = (e, totalImages) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev - 1 + totalImages) % totalImages);
  };

  const handleNextImage = (e, totalImages) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev + 1) % totalImages);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeDialog = () => setDialog(prev => ({ ...prev, isOpen: false }));
  
  const handleDialogConfirm = async () => {
    if (dialog.actionType === 'sendWarning') {
      const report = dialog.reportData;
      const targetMessage = warningType === 'default' ? DEFAULT_WARNING_MSG : customWarning.trim();

      closeDialog();
      try {
        await addDoc(collection(db, `users/${report.reportedUserId}/notifications`), {
          title: 'Account Warning',
          body: targetMessage,
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
          actionDetails: `Issued warning notice to ${report.reportedUserEmail || report.reportedUserName}`,
          targetName: report.reportedUserEmail || report.reportedUserName,
          eventLifecycle: 'Warning Issued',
          status: 'Success',
          timestamp: serverTimestamp(),
          type: 'report' 
        });

        setDialog({
          isOpen: true,
          type: 'alert',
          actionType: 'alert',
          title: 'Action Processed',
          heading: 'Warning Issued Successfully!',
          message: `The system notice has been dispatched to ${report.reportedUserName || report.reportedUserEmail}.`,
          themeColor: '#10b981',
        });
      } catch (err) {
        console.error('Error sending warning:', err);
      }
    } else if (dialog.actionType === 'deactivate') {
      const report = dialog.reportData;
      closeDialog();
      try {
        await updateDoc(doc(db, 'users', report.reportedUserId), { status: 'deactivated', disabled: true });
        await updateDoc(doc(db, 'reports', report.id), { status: 'Banned' });

        await addDoc(collection(db, 'audit_logs'), {
          adminName: auth.currentUser?.displayName || auth.currentUser?.email || 'Admin',
          role: 'Administrator',
          actionType: 'Account Deactivation',
          actionDetails: `Permanently deactivated account via user report.`,
          targetName: report.reportedUserEmail || report.reportedUserName,
          eventLifecycle: 'Banned',
          status: 'Success',
          timestamp: serverTimestamp(),
          type: 'report'
        });

        setDialog({
          isOpen: true,
          type: 'alert',
          actionType: 'alert',
          title: 'Action Processed',
          heading: 'Account Deactivated!',
          message: 'The selected user account access has been disabled.',
          themeColor: '#10b981',
        });
      } catch (err) {
        console.error('Error deactivating account:', err);
      }
    } else {
      closeDialog();
      setSelectedReport(null);
    }
  };

  const sendWarning = (report) => {
    setWarningType('default');
    setCustomWarning('');
    setDialog({
      isOpen: true,
      type: 'confirm',
      actionType: 'sendWarning',
      reportData: report,
      title: 'Issue Account Warning',
      icon: '⚠️',
      heading: 'Send Account Warning?',
      message: 'Choose whether you want to issue the pre-written system notice text or override it with a personalized message.',
      themeColor: '#f59e0b',
    });
  };

  const deactivateAccount = (report) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      actionType: 'deactivate',
      reportData: report,
      title: 'Deactivate Account',
      icon: '🚫',
      heading: 'Permanently Deactivate Account?',
      message: `Are you sure you want to deactivate ${report.reportedUserName || report.reportedUserEmail}?`,
      themeColor: '#ef4444',
    });
  };

  const getStatusClass = (status = 'pending') => {
    const key = status.toLowerCase();
    const map = { pending: 'pending', warned: 'warned', banned: 'banned' };
    return map[key] || 'pending';
  };

  const carouselImages = getProofImagesArray(selectedReport);
  const isConfirmDisabled = dialog.actionType === 'sendWarning' && warningType === 'custom' && !customWarning.trim();

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
              <th className={styles.headerCell}>Content Type</th>
              <th className={styles.headerCell}>Reported Content Title</th>
              <th className={styles.headerCell}>Reason</th>
              <th className={styles.headerCell}>Reporter</th>
              <th className={styles.headerCell}>Date</th>
              <th className={styles.headerCell}>Status</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.loader}>No reports found.</td>
              </tr>
            ) : (
              reports
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((report) => (
                <tr key={report.id} className={styles.clickableRow} onClick={() => handleOpenModal(report)}>
                  <td className={styles.tableCell}>
                    <span className={styles.repUser}>{report.reportedUserName || report.reportedUserEmail || 'Unknown'}</span>
                  </td>
                  <td className={styles.tableCell}>{report.reportedType || 'N/A'}</td>
                  <td className={`${styles.tableCell} ${styles.truncateCell}`}>
                    {report.reportedContent || report.title || 'Untitled Content'}
                  </td>
                  <td className={`${styles.tableCell} ${styles.truncateCell}`}>
                    {/* Ellipsis handled by styles.truncateCell CSS */}
                    {report.reason || 'No reason provided'}
                  </td>
                  <td className={styles.tableCell}>{report.reporterName || 'Anonymous'}</td>
                  <td className={styles.tableCell}>
                    {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleDateString() : 'N/A'}
                  </td>
                  <td className={styles.tableCell}>
                    <span className={`${styles.statusPill} ${styles[getStatusClass(report.status)]}`}>
                      {report.status || 'Pending'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {Math.ceil(reports.length / itemsPerPage) > 1 && (
          <div className={styles.paginationControls}>
            <button type="button" className={styles.pageBtn} disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>← Prev</button>
            <div className={styles.pageNumbers}>
              {Array.from({ length: Math.ceil(reports.length / itemsPerPage) }, (_, i) => i + 1).map((item) => (
                <button type="button" key={item} className={`${styles.pageNumber} ${currentPage === item ? styles.activePage : ''}`} onClick={() => handlePageChange(item)}>{item}</button>
              ))}
            </div>
            <button type="button" className={styles.pageBtn} disabled={currentPage === Math.ceil(reports.length / itemsPerPage)} onClick={() => handlePageChange(currentPage + 1)}>Next →</button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedReport && (
        <div className={styles.contentModalOverlay} onClick={() => setSelectedReport(null)}>
          <div className={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>Report Details</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedReport(null)} aria-label="Close">×</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalFormLayout}>
                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Reported User</span>
                    <div className={styles.modalDataField}>
                      {selectedReport.reportedUserName || 'Unknown'} <br/>
                      <small style={{ color: '#64748b' }}>{resolvedEmail}</small>
                    </div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Content Type</span>
                    <div className={styles.modalDataField}>{selectedReport.reportedType || 'N/A'}</div>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Submitted By (Reporter)</span>
                    <div className={styles.modalDataField}>
                      {selectedReport.reporterName || 'Anonymous'} <br/>
                      <small style={{ color: '#64748b' }}>{selectedReport.reporterEmail || 'N/A'}</small>
                    </div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <span className={styles.itemLabel}>Date Submitted</span>
                    <div className={styles.modalDataField}>
                      {selectedReport.createdAt?.toDate ? selectedReport.createdAt.toDate().toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Reported Content Title</span>
                  <div className={styles.modalDataField}>{selectedReport.reportedContent || selectedReport.title || 'Untitled Content'}</div>
                </div>

                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Reason for Report</span>
                  <div className={`${styles.modalDataField} ${styles.descriptionContainer}`}>
                    {selectedReport.reason || 'No reason provided.'}
                  </div>
                </div>

                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Proof Images</span>
                  <div className={styles.evidenceContainer}>
                    {carouselImages.length > 0 ? (
                      <div className={styles.carouselContainer} style={{ marginBottom: 0 }}>
                        <div className={styles.carouselTrack} style={{ transform: `translateX(-${currentImgIndex * 100}%)` }}>
                          {carouselImages.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', flex: '0 0 100%', width: '100%', height: '100%' }}>
                              <img src={url} alt={`Proof ${i + 1}`} className={styles.carouselImg} style={{ objectFit: 'contain', backgroundColor: '#f8fafc' }} />
                            </a>
                          ))}
                        </div>
                        {carouselImages.length > 1 && (
                          <>
                            <button type="button" className={`${styles.carouselNav} ${styles.prev}`} onClick={(e) => handlePrevImage(e, carouselImages.length)}>&#10094;</button>
                            <button type="button" className={`${styles.carouselNav} ${styles.next}`} onClick={(e) => handleNextImage(e, carouselImages.length)}>&#10095;</button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className={styles.noProof}>No image proof provided.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {selectedReport.status === 'Pending' && (
              <div className={styles.modalActions}>
                <button type="button" className={`${styles.actionBtn} ${styles.warn}`} onClick={() => sendWarning(selectedReport)}>Send Warning</button>
                <button type="button" className={`${styles.actionBtn} ${styles.deactivate}`} onClick={() => deactivateAccount(selectedReport)}>Deactivate Account</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Dialog */}
      {dialog.isOpen && (
        <div className={styles.dialogOverlay} onClick={closeDialog} style={{ '--dialog-theme-color': dialog.themeColor, '--dialog-theme-shadow': `${dialog.themeColor}33` }}>
          <div className={styles.dialogContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dialogHeader}>
              <h3 className={styles.dialogTitle}>{dialog.title}</h3>
              <button className={styles.dialogCloseBtn} onClick={closeDialog}>✕</button>
            </div>
            <div className={styles.dialogBody}>
              <div className={styles.dialogIcon}>{dialog.icon}</div>
              <h4 className={styles.dialogHeading}>{dialog.heading}</h4>
              <p className={styles.dialogMessage}>{dialog.message}</p>
              
              {/* Disclaimer Block Added Here */}
              {dialog.type === 'confirm' && (
                <p style={{ margin: '16px 0 0 0', fontSize: '0.9rem', color: '#1e293b', lineHeight: 1.5, textAlign: 'left', backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '6px' }}>
                  <strong>Disclaimer:</strong> This is a one-time action and cannot be undone. Relevant users will be notified automatically upon confirmation.
                </p>
              )}

              {dialog.actionType === 'sendWarning' && (
                <div className={styles.warningInputContainer}>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}><input type="radio" checked={warningType === 'default'} onChange={() => setWarningType('default')} /> Use Default</label>
                    <label className={styles.radioLabel}><input type="radio" checked={warningType === 'custom'} onChange={() => setWarningType('custom')} /> Custom Message</label>
                  </div>
                  {warningType === 'default' ? (
                    <div className={styles.defaultPreview}>
                      <span className={styles.previewLabel}>Message Template Preview:</span>
                      "{DEFAULT_WARNING_MSG}"
                    </div>
                  ) : (
                    <textarea className={styles.dialogTextarea} placeholder="Type the account warning details here..." value={customWarning} onChange={(e) => setCustomWarning(e.target.value)} rows={4} maxLength="400" />
                  )}
                </div>
              )}
            </div>
            <div className={styles.dialogFooter}>
              {dialog.type === 'confirm' && <button className={styles.dialogCancelBtn} onClick={closeDialog}>Cancel</button>}
              <button className={styles.dialogConfirmBtn} onClick={handleDialogConfirm} disabled={isConfirmDisabled} style={{ opacity: isConfirmDisabled ? 0.4 : 1, cursor: isConfirmDisabled ? 'not-allowed' : 'pointer' }}>
                {dialog.type === 'confirm' ? 'Confirm Action' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;