/* React & Firebase Imports */
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, onSnapshot, query, orderBy,
  doc, updateDoc, serverTimestamp,
} from 'firebase/firestore';

/* Style Imports */
import styles from '../components/admin_pages.module.css';

const FAQManagement = () => {
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

    if (iq.status === 'pending') {
      await updateDoc(doc(db, 'user_questions', iq.id), { status: 'processing' });
    }
  };

  const handleSendAnswer = async (e) => {
    e.preventDefault();
    if (!answer.trim()) return;
    setIsSubmitting(true);

    try {
      await updateDoc(doc(db, 'user_questions', selectedInquiry.id), {
        answer,
        status: 'answered',
        answeredAt: serverTimestamp(),
      });
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

  // Safe status → CSS class mapping
  const getStatusClass = (status = 'pending') => {
    const key = status.toLowerCase();
    const allowed = ['pending', 'processing', 'answered'];
    return allowed.includes(key) ? key : 'pending';
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
          <option value="pending">Pending</option>
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
                  className={`${styles.clickableRow} ${iq.status === 'pending' ? styles.unreadRow : ''}`}
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
                  <textarea
                    className={styles.answerTextarea}
                    placeholder="Type your answer here…"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                  />
                </div>

                <button
                  className={styles.submitBtn}
                  onClick={handleSendAnswer}
                  disabled={isSubmitting || !answer.trim()}
                >
                  {isSubmitting ? 'Sending…' : 'Send Answer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FAQManagement;
