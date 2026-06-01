/* React & Firebase Imports */
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, onSnapshot, query, orderBy,
  doc, updateDoc, serverTimestamp, addDoc
} from 'firebase/firestore';

/* Style Imports */
import styles from '../components/admin_pages.module.css';

const FAQManagement = () => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const q = query(collection(db, 'user_questions'), orderBy('submittedAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setInquiries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleSelectInquiry = async (iq) => {
    setSelectedInquiry(iq);
    setAnswer(iq.answer || '');

    if (iq.status === 'unread') {
      await updateDoc(doc(db, 'user_questions', iq.id), { status: 'processing' });
    }
  };

  const executeSendAnswer = async () => {
    if (!answer.trim()) return;
    setIsSubmitting(true);
    setShowConfirm(false); // Close modal

    try {
      await updateDoc(doc(db, 'user_questions', selectedInquiry.id), {
        answer,
        status: 'answered',
        answeredAt: serverTimestamp(),
      });

      const targetUserId = selectedInquiry.userId || selectedInquiry.uid; 
      
      if (targetUserId) {
        await addDoc(collection(db, `users/${targetUserId}/notifications`), {
          title: `Support Reply: ${selectedInquiry.title}`,
          body: `An administrator has responded to your inquiry.`,
          type: 'inquiry', 
          notifSubtype: 'faq_reply', 
          originalQuestion: selectedInquiry.description,
          adminAnswer: answer,
          createdAt: serverTimestamp(),
          read: false
        });
      }

      setSelectedInquiry(null);
    } catch (error) {
      console.error('Error answering inquiry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInquiries = inquiries.filter((iq) => {
    const matchesSearch =
      iq.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      iq.userName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' || iq.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusClass = (status = 'unread') => {
    const key = status.toLowerCase();
    const allowed = ['unread', 'processing', 'answered'];
    return allowed.includes(key) ? key : 'unread';
  };

  return (
    <div className={styles.faqPage}>
      {/* Header + controls */}
      <div>
        <h2 className={styles.contentHeaderTitle}>User Inquiries &amp; FAQ</h2>
      </div>

      <div className={styles.tableControls}>
        <select
          className={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="All">All Inquiries</option>
          <option value="unread">Unread</option>
          <option value="processing">Processing</option>
          <option value="answered">Answered</option>
        </select>

        <div className={styles.searchContainer}>
          <input
            className={styles.searchContainerInput}
            type="text"
            placeholder="Search by subject or name…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.faqTable}>
          <thead>
            <tr>
              <th className={styles.headerCell}>User Name</th>
              <th className={styles.headerCell}>Subject</th>
              <th className={styles.headerCell}>Date Received</th>
              <th className={styles.headerCell}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredInquiries.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.loader}>No inquiries found.</td>
              </tr>
            ) : (
              filteredInquiries
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((iq) => (
                <tr
                  key={iq.id}
                  className={`${styles.clickableRow} ${['unread', 'pending', 'processing'].includes((iq.status || '').toLowerCase()) ? styles.unreadRow : ''}`}
                  onClick={() => handleSelectInquiry(iq)}
                >
                  <td className={styles.tableCell}>{iq.userName || 'Guest'}</td>
                  <td className={`${styles.tableCell} ${styles.truncateCell}`}>
                    <span className={styles.faqSubject}>{iq.title}</span>
                  </td>
                  <td className={styles.tableCell}>
                    {iq.submittedAt?.toDate
                      ? iq.submittedAt.toDate().toLocaleDateString()
                      : 'Just now'}
                  </td>
                  <td className={styles.tableCell}>
                    <span className={`${styles.statusPill} ${styles[getStatusClass(iq.status)]}`}>
                      {iq.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {Math.ceil(filteredInquiries.length / itemsPerPage) > 1 && (
          <div className={styles.paginationControls}>
            <button className={styles.pageBtn} disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>← Prev</button>
            <div className={styles.pageNumbers}>
              {Array.from({ length: Math.ceil(filteredInquiries.length / itemsPerPage) }, (_, i) => i + 1)
                .filter(n => n === 1 || n === Math.ceil(filteredInquiries.length / itemsPerPage) || Math.abs(n - currentPage) <= 1)
                .reduce((acc, n, idx, arr) => { if (idx > 0 && n - arr[idx-1] > 1) acc.push('...'); acc.push(n); return acc; }, [])
                .map((item, idx) => item === '...'
                  ? <span key={`e${idx}`} className={styles.pageEllipsis}>…</span>
                  : <button key={item} className={`${styles.pageNumber} ${currentPage === item ? styles.activePage : ''}`} onClick={() => setCurrentPage(item)}>{item}</button>
                )}
            </div>
            <button className={styles.pageBtn} disabled={currentPage === Math.ceil(filteredInquiries.length / itemsPerPage)} onClick={() => setCurrentPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {/* Detail / Answer Modal */}
      {selectedInquiry && (
        <div
          className={styles.contentModalOverlay}
          onClick={() => setSelectedInquiry(null)}
        >
          <div
            className={styles.contentModal}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>Inquiry Details</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setSelectedInquiry(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div className={styles.modalBody}>
              <div className={styles.modalFormLayout}>
                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>From</span>
                  <div className={styles.modalDataField}>
                    {selectedInquiry.userName || 'Guest'}
                  </div>
                </div>

                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Subject</span>
                  <div className={styles.modalDataField}>
                    {selectedInquiry.title}
                  </div>
                </div>

                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>User Question</span>
                  <div className={`${styles.modalDataField} ${styles.descriptionContainer}`}>
                    {selectedInquiry.description}
                  </div>
                </div>

                <hr className={styles.modalDivider} />

                <div className={styles.itemFieldContainer}>
                  <span className={styles.itemLabel}>Your Response</span>
                  {selectedInquiry.status === 'answered' ? (
                    <div className={styles.modalDataField}>{selectedInquiry.answer}</div>
                  ) : (
                    <textarea
                      className={styles.answerTextarea}
                      placeholder="Type your answer here…"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      maxLength="400"
                    />
                  )}
                </div>

                {selectedInquiry.status !== 'answered' && (
                  <button
                    className={styles.submitBtn}
                    onClick={() => setShowConfirm(true)}
                    disabled={isSubmitting || !answer.trim()}
                  >
                    {isSubmitting ? 'Sending…' : 'Send Answer'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Disclaimer Modal */}
      {showConfirm && (
        <div className={styles.contentModalOverlay} onClick={() => setShowConfirm(false)}>
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '32px 28px 28px',
              maxWidth: '420px',
              width: 'calc(100% - 32px)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', fontSize: '2.5rem', lineHeight: 1 }}>💬</div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', textAlign: 'center' }}>
              Confirm Response
            </h3>
            <p style={{ margin: 0, fontSize: '0.975rem', color: '#475569', lineHeight: 1.6, textAlign: 'center' }}>
              Are you sure you want to send this answer?
              <br /><br />
              <strong style={{ color: '#1e293b' }}>Disclaimer:</strong> This is a one-time action and cannot be undone. The user will be notified automatically.
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                className={styles.cancelBtn}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '2px solid rgba(0,0,0,0.15)', background: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button
                className={styles.submitBtn}
                style={{ flex: 1, margin: 0 }}
                onClick={executeSendAnswer}
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FAQManagement;
