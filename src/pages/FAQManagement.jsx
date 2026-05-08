import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import './faq_page.css';

const FAQManagement = () => {
  const [inquiries, setInquiries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "user_questions"), orderBy("submittedAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setInquiries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleSelectInquiry = async (iq) => {
    setSelectedInquiry(iq);
    setAnswer(iq.answer || '');
    
    if (iq.status === 'pending') {
      await updateDoc(doc(db, "user_questions", iq.id), { status: 'processing' });
    }
  };

  const handleSendAnswer = async (e) => {
    e.preventDefault();
    if (!answer.trim()) return;
    setIsSubmitting(true);

    try {
      await updateDoc(doc(db, "user_questions", selectedInquiry.id), {
        answer: answer,
        status: 'answered',
        answeredAt: serverTimestamp()
      });
      setSelectedInquiry(null);
    } catch (error) {
      console.error("Error answering inquiry:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInquiries = inquiries.filter(iq => {
    const matchesSearch = iq.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          iq.userName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' || iq.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="faq-page">
      <div className="table-header-row">
        <h2>User Inquiries & FAQ</h2>
      </div>

      <div className="table-controls">
        <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="All">All Inquiries</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="answered">Answered</option>
        </select>
        <div className="search-container">
          <input 
            type="text" 
            placeholder="Search by subject or name..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="faq-table">
          <thead>
            <tr>
              <th>USER NAME</th>
              <th>SUBJECT</th>
              <th>DATE RECEIVED</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredInquiries.map((iq) => (
              <tr 
                key={iq.id} 
                className={`clickable-row ${iq.status === 'pending' ? 'unread-row' : ''}`} 
                onClick={() => handleSelectInquiry(iq)}
              >
                <td>{iq.userName || "Guest"}</td>
                <td className="truncate-cell"><strong>{iq.title}</strong></td>
                <td>{iq.submittedAt?.toDate ? iq.submittedAt.toDate().toLocaleDateString() : 'Just now'}</td>
                <td>
                  <span className={`status-pill ${iq.status}`}>
                    {iq.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedInquiry && (
        <div className="content-modal-overlay" onClick={() => setSelectedInquiry(null)}>
          <div className="content-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedInquiry(null)}>×</button>
            <div className="modal-header">
              <h3>Inquiry Details</h3>
            </div>
            <div className="modal-body">
              <div className="modal-form-layout">
                <div className="item-field-container">
                  <label className="item-label">From</label>
                  <div className="modal-data-field">{selectedInquiry.userName || "Guest"}</div>
                </div>
                <div className="item-field-container">
                  <label className="item-label">Subject</label>
                  <div className="modal-data-field">{selectedInquiry.title}</div>
                </div>
                <div className="item-field-container">
                  <label className="item-label">User Question</label>
                  <div className="modal-data-field textarea-view">{selectedInquiry.description}</div>
                </div>

                <div className="modal-divider-container">
                    <hr className="modal-divider" />
                </div>

                <form onSubmit={handleSendAnswer}>
                  <div className="item-field-container">
                    <label className="item-label">Your Response</label>
                    <textarea 
                      placeholder="Type your answer here..." 
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? "Sending..." : "Send Answer"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FAQManagement;