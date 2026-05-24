/* React & Firebase Imports */
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';

/* Style Imports */
import styles from '../components/admin_pages.module.css';

// Global baseline template for warnings
const DEFAULT_WARNING_MSG = 'Your account has been reported for misconduct. This is a formal warning to adhere to community guidelines. Further violations may lead to account deactivation.';

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const itemsPerPage = 10;

  // States to hold admin warning customization inputs
  const [warningType, setWarningType] = useState('default'); // 'default' or 'custom'
  const [customWarning, setCustomWarning] = useState('');

  // Dialog window visibility structure
  const [dialog, setDialog] = useState({
    isOpen: false,
    type: 'confirm', // 'confirm' or 'alert'
    actionType: '',  // 'sendWarning', 'deactivate', 'alert'
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

  const handleOpenModal = (report) => {
    setSelectedReport(report);
    setCurrentImgIndex(0); 
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
  
  // Evaluates text entries right at execution confirmation frame context
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
        
        // Log down tracking record to Audit history collection
        await addDoc(collection(db, 'audit_logs'), {
          adminName: auth.currentUser?.displayName || auth.currentUser?.email || 'Admin',
          role: 'Administrator',
          actionType: 'User Discipline',
          actionDetails: `Issued warning notice to ${report.reportedUserEmail}`,
          targetName: report.reportedUserEmail,
          timestamp: serverTimestamp(),
        });

        // Trigger action complete alert interface screen state configuration
        setDialog({
          isOpen: true,
          type: 'alert',
          actionType: 'alert',
          title: 'Action Processed',
          heading: 'Warning Issued Successfully!',
          message: `The system notice notification has been dispatched to ${report.reportedUserEmail}.`,
          themeColor: '#10b981',
        });
      } catch (err) {
        console.error('Error sending custom warning:', err);
      }
    } else if (dialog.actionType === 'deactivate') {
      const report = dialog.reportData;
      closeDialog();
      try {
        await updateDoc(doc(db, 'users', report.reportedUserId), { status: 'deactivated', disabled: true });
        await updateDoc(doc(db, 'reports', report.id), { status: 'Banned' });

        setDialog({
          isOpen: true,
          type: 'alert',
          actionType: 'alert',
          title: 'Action Processed',
          heading: 'Account Deactivated!',
          message: 'The selected user account access tokens have been completely turned off.',
          themeColor: '#10b981',
        });
      } catch (err) {
        console.error('Error deactivating account:', err);
      }
    } else {
      // Clear parent background overlay frames when dismiss is complete
      closeDialog();
      setSelectedReport(null);
    }
  };

  const sendWarning = (report) => {
    // Reset inputs prior to displaying view pane configuration overlay frames
    setWarningType('default');
    setCustomWarning('');
    
    setDialog({
      isOpen: true,
      type: 'confirm',
      actionType: 'sendWarning',
      reportData: report,
      title: 'Issue Account Warning',
      icon: '⚠️',
      heading: 'Send Misconduct Warning?',
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
      message: `Are you absolutely sure you want to deactivate ${report.reportedUserEmail}?`,
      themeColor: '#ef4444',
    });
  };

  const getStatusClass = (status = 'pending') => {
    const key = status.toLowerCase();
    const map = { pending: 'pending', warned: 'warned', banned: 'banned' };
    return map[key] || 'pending';
  };

  const carouselImages = getProofImagesArray(selectedReport);

  // Verification helper block to block submission actions if target field entries remain blank
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
                <tr key={report.id} className={styles.clickableRow} onClick={() => handleOpenModal(report)}>
                  <td className={styles.tableCell}><span className={styles.repUser}>{report.reportedUserEmail}</span></td>
                  <td className={`${styles.tableCell} ${styles.truncateCell}`}>
                    {report.reason ? (report.reason.length > 35 ? report.reason.substring(0, 35) + '…' : report.reason) : 'No reason provided'}
                  </td>
                  <td className={styles.tableCell}>{report.reporterName || 'Anonymous'}</td>
                  <td className={styles.tableCell}>{report.createdAt?.toDate ? report.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
                  <td className={styles.tableCell}>
                    <span className={`${styles.statusPill} ${styles[getStatusClass(report.status)]}`}>{report.status || 'Pending'}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
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
                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Reported User</span>
                  <div className={styles.modalDataField}>{selectedReport.reportedUserEmail}</div>
                </div>
                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Reporter</span>
                  <div className={styles.modalDataField}>{selectedReport.reporterName || 'Anonymous'}</div>
                </div>
                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Reason for Report</span>
                  <div className={`${styles.modalDataField} ${styles.descriptionContainer}`}>{selectedReport.reason || 'No reason provided.'}</div>
                </div>

                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Proof Images</span>
                  <div className={styles.evidenceContainer}>
                    {carouselImages.length > 0 ? (
                      <div className={styles.carouselContainer} style={{ marginBottom: 0 }}>
                        <div className={styles.carouselTrack} style={{ transform: `translateX(-${currentImgIndex * 100}%)` }}>
                          {carouselImages.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', flex: '0 0 100%', width: '100%', height: '100%' }}>
                              <img src={url} alt={`Proof step ${i + 1}`} className={styles.carouselImg} style={{ objectFit: 'contain', backgroundColor: '#f8fafc' }} />
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

            <div className={styles.modalActions}>
              <button type="button" className={`${styles.actionBtn} ${styles.warn}`} onClick={() => sendWarning(selectedReport)}>Send Warning</button>
              <button type="button" className={`${styles.actionBtn} ${styles.deactivate}`} onClick={() => deactivateAccount(selectedReport)} disabled={selectedReport.status === 'deactivated'}>Deactivate Account</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Image-accurate Reusable Modal Component (Includes custom switches conditionally) */}
      {dialog.isOpen && (
        <div
          className={styles.dialogOverlay}
          onClick={closeDialog}
          style={{
            '--dialog-theme-color': dialog.themeColor,
            '--dialog-theme-shadow': `${dialog.themeColor}33`
          }}
        >
          <div className={styles.dialogContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dialogHeader}>
              <h3 className={styles.dialogTitle}>{dialog.title}</h3>
              <button className={styles.dialogCloseBtn} onClick={closeDialog} aria-label="Close modal">✕</button>
            </div>

            <div className={styles.dialogBody}>
              <div className={styles.dialogIcon}>{dialog.icon}</div>
              <h4 className={styles.dialogHeading}>{dialog.heading}</h4>
              <p className={styles.dialogMessage}>{dialog.message}</p>

              {/* Dynamic Warning Configuration Options Panel */}
              {dialog.actionType === 'sendWarning' && (
                <div className={styles.warningInputContainer}>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="warningType"
                        value="default"
                        checked={warningType === 'default'}
                        onChange={() => setWarningType('default')}
                      />
                      Use Default Message
                    </label>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="warningType"
                        value="custom"
                        checked={warningType === 'custom'}
                        onChange={() => setWarningType('custom')}
                      />
                      Write Custom Message
                    </label>
                  </div>

                  {warningType === 'default' ? (
                    <div className={styles.defaultPreview}>
                      <span className={styles.previewLabel}>Message Template Preview:</span>
                      "{DEFAULT_WARNING_MSG}"
                    </div>
                  ) : (
                    <textarea
                      className={styles.dialogTextarea}
                      placeholder="Type the custom account misconduct details here..."
                      value={customWarning}
                      onChange={(e) => setCustomWarning(e.target.value)}
                      rows={4}
                    />
                  )}
                </div>
              )}
            </div>

            <div className={styles.dialogFooter}>
              {dialog.type === 'confirm' && (
                <button type="button" className={styles.dialogCancelBtn} onClick={closeDialog}>Cancel</button>
              )}
              <button 
                type="button" 
                className={styles.dialogConfirmBtn} 
                onClick={handleDialogConfirm}
                disabled={isConfirmDisabled}
                style={{ opacity: isConfirmDisabled ? 0.4 : 1, cursor: isConfirmDisabled ? 'not-allowed' : 'pointer' }}
              >
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