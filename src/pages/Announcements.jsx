/* React & Firebase Imports */
import React, { useState, useEffect } from 'react';
import { db, auth, storage } from '../firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/* Style Imports */
import styles from '../components/admin_pages.module.css';

const ANNOUNCEMENTS_COLLECTION = 'announcements';
const ANNOUNCEMENTS_LIMIT = 50;

const calculateCountdown = (expiresAt) => {
  if (!expiresAt) return 'No expiry';
  
  const targetTime = expiresAt.toDate().getTime();
  const now = new Date().getTime();
  const diff = targetTime - now;

  if (diff <= 0) {
    return 'Expired';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  let parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(' ');
};

const isExpired = (ann) => {
  if (!ann.expiresAt) return false;
  return ann.expiresAt.toDate() < new Date();
};

const getTomorrowMin = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
};

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Live countdown state map
  const [countdowns, setCountdowns] = useState({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form states
  const [formData, setFormData] = useState({ title: '', body: '', expiresAt: '' });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  // Interaction states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  // Modal close animation helpers
  const [closingModal, setClosingModal] = useState(null);

  const closeWithAnimation = (closeFn) => {
    setClosingModal(true);
    setTimeout(() => { closeFn(); setClosingModal(false); }, 280);
  };

  useEffect(() => {
    const q = query(
      collection(db, ANNOUNCEMENTS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(ANNOUNCEMENTS_LIMIT)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setAnnouncements(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (selectedAnnouncement) {
      const updated = announcements.find(a => a.id === selectedAnnouncement.id);
      if (updated) setSelectedAnnouncement(updated);
    }
  }, [announcements, selectedAnnouncement]);

  useEffect(() => {
    const updateAllCountdowns = () => {
      const newMap = {};
      announcements.forEach((ann) => {
        newMap[ann.id] = calculateCountdown(ann.expiresAt);
      });
      setCountdowns(newMap);
    };

    updateAllCountdowns();
    const intervalId = setInterval(updateAllCountdowns, 1000);

    return () => clearInterval(intervalId);
  }, [announcements]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', body: '', expiresAt: '' });
    clearImage();
    setError(null);
  };

  const handleOpenEdit = () => {
    if (!selectedAnnouncement) return;
    let localExpiry = '';
    if (selectedAnnouncement.expiresAt) {
      const dateObj = selectedAnnouncement.expiresAt.toDate();
      const tzOffset = dateObj.getTimezoneOffset() * 60000;
      localExpiry = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 16);
    }
    
    setFormData({
      title: selectedAnnouncement.title || '',
      body: selectedAnnouncement.body || '',
      expiresAt: localExpiry
    });
    
    const existingImageUrl = selectedAnnouncement.imageUrls && selectedAnnouncement.imageUrls.length > 0 
      ? selectedAnnouncement.imageUrls[0] 
      : null;
      
    setImagePreview(existingImageUrl);
    setImage(null);
    setError(null);
    setShowEditModal(true);
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      let uploadedImageUrl = null;
      if (image) {
        const storageRef = ref(storage, `announcements/${Date.now()}_${image.name}`);
        await uploadBytes(storageRef, image);
        uploadedImageUrl = await getDownloadURL(storageRef);
      }

      const expiresAt = formData.expiresAt
        ? Timestamp.fromDate(new Date(formData.expiresAt))
        : null;

      const adminUser = auth.currentUser;

      await addDoc(collection(db, ANNOUNCEMENTS_COLLECTION), {
        title: formData.title,
        body: formData.body,
        type: 'announcement', 
        imageUrls: uploadedImageUrl ? [uploadedImageUrl] : [], 
        expiresAt,
        authorId: adminUser?.uid ?? null,
        createdAt: serverTimestamp(),
      });

      resetForm();
      setShowCreateModal(false);
    } catch (err) {
      setError('Failed to post announcement: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAnnouncement = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      let newImageUrls = selectedAnnouncement.imageUrls || [];
      const hasExistingImage = newImageUrls.length > 0;

      if (image) {
        if (hasExistingImage) {
          try { await deleteObject(ref(storage, newImageUrls[0])); } catch (_) {}
        }
        const storageRef = ref(storage, `announcements/${Date.now()}_${image.name}`);
        await uploadBytes(storageRef, image);
        const dlUrl = await getDownloadURL(storageRef);
        newImageUrls = [dlUrl];
      } else if (!imagePreview && hasExistingImage) {
        try { await deleteObject(ref(storage, newImageUrls[0])); } catch (_) {}
        newImageUrls = [];
      }

      const expiresAt = formData.expiresAt
        ? Timestamp.fromDate(new Date(formData.expiresAt))
        : null;

      const docRef = doc(db, ANNOUNCEMENTS_COLLECTION, selectedAnnouncement.id);
      await updateDoc(docRef, {
        title: formData.title,
        body: formData.body,
        imageUrls: newImageUrls,
        expiresAt,
        updatedAt: serverTimestamp()
      });

      setShowEditModal(false);
      resetForm();
    } catch (err) {
      setError('Failed to update announcement: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!selectedAnnouncement) return;
    setIsDeleting(true);
    try {
      if (selectedAnnouncement.imageUrls && selectedAnnouncement.imageUrls.length > 0) {
        for (const url of selectedAnnouncement.imageUrls) {
          try {
            await deleteObject(ref(storage, url));
          } catch (_) {}
        }
      }
      await deleteDoc(doc(db, ANNOUNCEMENTS_COLLECTION, selectedAnnouncement.id));
      setShowDeleteModal(false);
      setSelectedAnnouncement(null);
    } catch (err) {
      setError('Failed to delete: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.announcementsPage}>
      {/* Header with inline Create button */}
      <div className={styles.announcementsHeader}>
        <h2 className={styles.contentHeaderTitle}>Announcements</h2>
        <button
          className={styles.createBtn}
          onClick={() => { resetForm(); setShowCreateModal(true); }}
        >
          + Create Announcement
        </button>
      </div>

      {/* ── Announcements Table ── */}
      <div className={styles.tableWrapper}>
        <table className={styles.requestTable}>
          <thead>
            <tr>
              <th className={styles.headerCell}>TITLE</th>
              <th className={styles.headerCell}>POSTED</th>
              <th className={styles.headerCell}>TIME REMAINING / EXPIRY</th>
              <th className={styles.headerCell}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {announcements.length === 0 ? (
              <tr>
                <td
                  className={styles.tableCell}
                  colSpan={4}
                  style={{ textAlign: 'center', color: '#888' }}
                >
                  No announcements yet.
                </td>
              </tr>
            ) : (
              announcements
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((ann) => {
                const expired = isExpired(ann);
                return (
                  <tr 
                    key={ann.id} 
                    className={styles.clickableRow}
                    style={{ opacity: expired ? 0.65 : 1 }}
                    onClick={() => setSelectedAnnouncement(ann)}
                  >
                    <td className={styles.tableCell}>
                      <span className={styles.evTitle}>{ann.title}</span>
                    </td>
                    <td className={styles.tableCell}>
                      {ann.createdAt?.toDate().toLocaleDateString() ?? 'Just now'}
                    </td>
                    <td className={styles.tableCell} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: '500' }}>
                      {countdowns[ann.id] || 'Calculating...'}
                    </td>
                    <td className={`${styles.tableCell} ${styles.statusCell}`}>
                      <span
                        className={styles.statusPill}
                        style={{
                          background: expired ? '#fee2e2' : '#dcfce7',
                          color: expired ? '#b91c1c' : '#15803d',
                        }}
                      >
                        {expired ? 'Expired' : 'Active'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {Math.ceil(announcements.length / itemsPerPage) > 1 && (
          <div className={styles.paginationControls}>
            <button
              className={styles.pageBtn}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              ← Prev
            </button>
            <div className={styles.pageNumbers}>
              {Array.from({ length: Math.ceil(announcements.length / itemsPerPage) }, (_, i) => i + 1)
                .filter(n => n === 1 || n === Math.ceil(announcements.length / itemsPerPage) || Math.abs(n - currentPage) <= 1)
                .reduce((acc, n, idx, arr) => {
                  if (idx > 0 && n - arr[idx - 1] > 1) acc.push('...');
                  acc.push(n);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === '...' ? (
                    <span key={`e${idx}`} className={styles.pageEllipsis}>…</span>
                  ) : (
                    <button
                      key={item}
                      className={`${styles.pageNumber} ${currentPage === item ? styles.activePage : ''}`}
                      onClick={() => setCurrentPage(item)}
                    >
                      {item}
                    </button>
                  )
                )}
            </div>
            <button
              className={styles.pageBtn}
              disabled={currentPage === Math.ceil(announcements.length / itemsPerPage)}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ── Details Review Modal ── */}
      {selectedAnnouncement && !showEditModal && !showDeleteModal && (
        <div className={styles.contentModalOverlay} onClick={() => setSelectedAnnouncement(null)}>
          <div className={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>Announcement Details</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedAnnouncement(null)}>×</button>
            </div>

            <div className={styles.modalBody}>
              {selectedAnnouncement.imageUrls && selectedAnnouncement.imageUrls.length > 0 ? (
                <div className={styles.carouselContainer} style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                  <img 
                    src={selectedAnnouncement.imageUrls[0]} 
                    alt="Announcement Visual" 
                    className={styles.carouselImg} 
                    style={{ maxHeight: '240px', objectFit: 'contain', width: 'auto', borderRadius: '6px' }}
                  />
                </div>
              ) : (
                <div className={styles.noImagesPlaceholder} style={{ marginBottom: '1.5rem' }}>No image attached</div>
              )}

              <div className={styles.modalFormLayout}>
                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Title</label>
                  <div className={styles.modalDataField}>{selectedAnnouncement.title}</div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Posted Date</label>
                    <div className={styles.modalDataField}>
                      {selectedAnnouncement.createdAt?.toDate().toLocaleString() ?? 'Just now'}
                    </div>
                  </div>
                  <div className={styles.itemFieldContainer}>
                    <label className={styles.itemLabel}>Time Remaining</label>
                    <div 
                      className={styles.modalDataField} 
                      style={{ 
                        fontVariantNumeric: 'tabular-nums', 
                        fontWeight: '600', 
                        color: isExpired(selectedAnnouncement) ? '#b91c1c' : '#15803d' 
                      }}
                    >
                      {countdowns[selectedAnnouncement.id] || "Calculating..."}
                    </div>
                  </div>
                </div>

                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Content Body</label>
                  <div className={styles.modalDataField + " " + styles.textareaView}>
                    {selectedAnnouncement.body}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button 
                className={styles.actionBtn + " " + styles.decline} 
                onClick={() => setShowDeleteModal(true)}
              >
                Delete Announcement
              </button>
              <button 
                className={styles.actionBtn + " " + styles.approve} 
                onClick={handleOpenEdit}
              >
                Edit Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <div className={styles.contentModalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>Create New Announcement</h3>
              <button className={styles.closeBtn} onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <div className={styles.modalBody}>
              <form onSubmit={handleCreateAnnouncement} className={styles.modalFormLayout}>
                {error && <p style={{ color: 'red', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{error}</p>}

                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Title</label>
                  <input
                    className={styles.itemFieldInput}
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    maxLength="60"
                  />
                </div>

                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Content</label>
                  <textarea
                    className={styles.itemFieldTextarea}
                    required
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    maxLength="400"
                  />
                </div>

                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>
                    Expiry Date & Time
                    <span style={{ fontWeight: 400, color: '#888', marginLeft: '6px', fontSize: '0.8rem' }}>
                      (leave blank for no expiry)
                    </span>
                  </label>
                  <input
                    type="datetime-local"
                    className={styles.itemFieldInput}
                    min={getTomorrowMin()}
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  />
                </div>

                <div className={styles.fileUploadFieldset}>
                  <span className={styles.itemLabel}>ATTACHMENT IMAGE (OPTIONAL)</span>
                  <div className={styles.fileInputWrapper}>
                    <label className={styles.customBrowseBtn}>
                      Browse...
                      <input type="file" accept="image/*" hidden onChange={handleFileChange} />
                    </label>
                    <span className={styles.fileNameDisplay}>
                      {image ? image.name : "No file chosen"}
                    </span>
                  </div>

                  {imagePreview && (
                    <div className={styles.thumbnailGrid}>
                      <div className={styles.thumbnailContainer}>
                        <img src={imagePreview} alt="Preview" className={styles.thumbnailImg} />
                        <button type="button" className={styles.removeThumbBtn} onClick={clearImage}>×</button>
                      </div>
                    </div>
                  )}
                </div>

                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                  {isSubmitting ? 'Uploading...' : 'Post Announcement'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {showEditModal && (
        <div className={styles.contentModalOverlay} onClick={() => { setShowEditModal(false); resetForm(); }}>
          <div className={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>Edit Announcement</h3>
              <button className={styles.closeBtn} onClick={() => { setShowEditModal(false); resetForm(); }}>×</button>
            </div>

            <div className={styles.modalBody}>
              <form onSubmit={handleUpdateAnnouncement} className={styles.modalFormLayout}>
                {error && <p style={{ color: 'red', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{error}</p>}

                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Title</label>
                  <input
                    className={styles.itemFieldInput}
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    maxLength="60"
                  />
                </div>

                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Content</label>
                  <textarea
                    className={styles.itemFieldTextarea}
                    required
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    maxLength="400"
                  />
                </div>

                <div className={styles.itemFieldContainer}>
                  <label className={styles.itemLabel}>Expiry Date & Time</label>
                  <input
                    type="datetime-local"
                    className={styles.itemFieldInput}
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  />
                </div>

                <div className={styles.fileUploadFieldset}>
                  <span className={styles.itemLabel}>REPLACE ATTACHMENT IMAGE</span>
                  <div className={styles.fileInputWrapper}>
                    <label className={styles.customBrowseBtn}>
                      Browse...
                      <input type="file" accept="image/*" hidden onChange={handleFileChange} />
                    </label>
                    <span className={styles.fileNameDisplay}>
                      {image ? image.name : "Retaining active file..."}
                    </span>
                  </div>

                  {imagePreview && (
                    <div className={styles.thumbnailGrid}>
                      <div className={styles.thumbnailContainer}>
                        <img src={imagePreview} alt="Active preview" className={styles.thumbnailImg} />
                        <button type="button" className={styles.removeThumbBtn} onClick={clearImage}>×</button>
                      </div>
                    </div>
                  )}
                </div>

                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && selectedAnnouncement && (
        <div
          className={styles.dialogOverlay}
          onClick={() => !isDeleting && setShowDeleteModal(false)}
        >
          <div
            className={styles.dialogContainer}
            style={{ maxWidth: '460px', '--dialog-theme-color': '#ef4444', '--dialog-theme-shadow': 'rgba(239,68,68,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={styles.dialogHeader}>
              <h3 className={styles.dialogTitle}>Delete Announcement</h3>
              <button
                className={styles.dialogCloseBtn}
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className={styles.dialogBody}>
              <div className={styles.dialogIcon}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="52"
                  height="52"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </div>
              <p className={styles.dialogMessage}>
                Are you sure you want to permanently delete{' '}
                <strong>"{selectedAnnouncement.title}"</strong>?
                This action cannot be reversed.
              </p>
              <p
                className={styles.dialogMessage}
                style={{ marginTop: '12px', fontSize: '0.875rem' }}
              >
                <strong>Disclaimer:</strong> All users who received this announcement
                will no longer be able to view it. This cannot be undone.
              </p>
              {error && (
                <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '10px', textAlign: 'center' }}>
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className={styles.dialogFooter}>
              <button
                className={styles.dialogCancelBtn}
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className={styles.dialogConfirmBtn}
                onClick={handleDeleteAnnouncement}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
