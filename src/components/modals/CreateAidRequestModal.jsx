import React, { useState, useEffect, useRef } from 'react';
import { db, storage, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AnimatedModal from '../AnimatedModal';
import styles from '../requests_and_events.module.css';
import { checkFieldsForProfanity, PROFANITY_MESSAGE } from '../../utils/profanityFilter';

/* ─── Item Mapping based on Categories ──────────────────────────────────── */
const categoryItemsMap = {
  'Basic Needs': [
    'Rice', 'Canned Sardines', 'Canned Tuna', 'Canned Corned Beef', 'Canned Meat Loaf', 
    'Instant Noodles', 'Biscuits/Crackers', 'Powdered Milk', 'Coffee', 'Chocolate/Cereal Drink', 
    'Sugar', 'Cooking Oil', 'Bottled Drinking Water'
  ],
  'Health & Hygiene': [
    'Soap', 'Toothbrush', 'Toothpaste', 'Shampoo', 'Sanitary Napkins', 'Baby Diapers', 
    'Adult Diapers', 'Face Masks', 'Alcohol', 'First Aid Kit (without medicines)', 
    'Bandages', 'Gauze', 'Medical Tape'
  ],
  'Education': [
    'School Bag', 'Notebook', 'Writing Pad', 'Ballpen', 'Pencil', 'Eraser', 'Sharpener', 
    'Crayons', 'Colored Pencils', 'Ruler', 'Bond Paper', 'Intermediate Pad Paper', 
    'Story Books', 'Educational Books', 'School Supplies Kit'
  ],
  'Disaster & Emergency': [
    'Blanket', 'Sleeping Mat (Banig)', 'Mosquito Net', 'Pillow', 'Towel', 'Flashlight', 
    'Batteries', 'Solar Lamp', 'Emergency Light', 'Kitchen Kit', 'Cooking Pot', 'Frying Pan', 
    'Plates', 'Bowls', 'Cups', 'Spoons', 'Forks', 'Water Container', 'Bucket', 'Water Jug', 
    'Brand-New Clothing', 'Brand-New Slippers', 'Raincoat'
  ]
};

const categories = Object.keys(categoryItemsMap);
const aidTypes = ['In-Kind', 'Fundraiser'];

/* ─── Draft storage key ─────────────────────────────────────────────────── */
const DRAFT_KEY = 'aid_request_draft';

/* ─── Module-level image cache (survives re-renders, cleared on demand) ─── */
let _imageCache = [];

const saveImageCache = (imgs) => { _imageCache = imgs; };
const loadImageCache = () => _imageCache;
const clearImageCache = () => {
  _imageCache.forEach((img) => URL.revokeObjectURL(img.preview));
  _imageCache = [];
};

/* ─── Draft helpers ─────────────────────────────────────────────────────── */
const EMPTY_FORM = {
  name: '',
  desc: '',
  category: '',
  aidType: 'In-Kind',
  fundraiserGoal: '',
  itemQuantity: '',
  postDurationDays: '1',
  acceptedItems: [],
};

const saveDraft = (formData, imageNames, beneficiaryName = '') => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, imageNames, beneficiaryName, savedAt: Date.now() }));
};

const loadDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const clearDraft = () => localStorage.removeItem(DRAFT_KEY);

const hasMeaningfulData = (formData, images, beneficiaryName = '') => {
  const itemsHasData = Array.isArray(formData.acceptedItems) 
    ? formData.acceptedItems.length > 0 
    : formData.acceptedItems.trim() !== '';

  return (
    formData.name.trim() ||
    formData.desc.trim() ||
    formData.category ||
    itemsHasData ||
    formData.fundraiserGoal ||
    beneficiaryName.trim() ||
    images.length > 0
  );
};

/* ─── Component ─────────────────────────────────────────────────────────── */
const CreateAidRequestModal = ({ isOpen, onClose, showAlert, isAdminMode = false }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [images, setImages] = useState([]);
  const [photoError, setPhotoError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [draftExists, setDraftExists] = useState(false);
  const [draftBannerVisible, setDraftBannerVisible] = useState(false);
  const [draftSavedFlash, setDraftSavedFlash] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const flashTimer = useRef(null);

  /* ── On open: check for existing draft ── */
  useEffect(() => {
    if (!isOpen) return;
    const draft = loadDraft();
    if (draft) {
      setDraftExists(true);
      setDraftBannerVisible(true);
    }
  }, [isOpen]);

  /* ── Sync image cache → state on open (restores previews if modal re-opens) ── */
  useEffect(() => {
    if (isOpen) {
      const cached = loadImageCache();
      if (cached.length > 0) setImages(cached);
    }
  }, [isOpen]);

  /* ── Keep module cache in sync with state ── */
  useEffect(() => {
    saveImageCache(images);
  }, [images]);

  /* ── Cleanup previews only on unmount ── */
  useEffect(() => {
    return () => {
    };
  }, []);

  if (!isOpen) return null;

  /* ── Restore draft ── */
  const handleRestoreDraft = () => {
    const draft = loadDraft();
    if (!draft) return;
    
    let restoredFormData = draft.formData;
    
    if (typeof restoredFormData.acceptedItems === 'string') {
      restoredFormData.acceptedItems = restoredFormData.acceptedItems
        .split(',')
        .map(i => i.trim())
        .filter(Boolean);
    }

    setFormData(restoredFormData);
    if (draft.beneficiaryName) setBeneficiaryName(draft.beneficiaryName);
    
    const cached = loadImageCache();
    if (cached.length > 0) setImages(cached);
    setDraftBannerVisible(false);
    setDraftExists(false);
  };

  const handleDismissDraft = () => {
    setDraftBannerVisible(false);
    setDraftExists(false);
  };

  /* ── Save draft ── */
  const handleSaveDraft = () => {
    if (!hasMeaningfulData(formData, images, beneficiaryName)) return;
    saveDraft(formData, images.map((i) => i.file.name), beneficiaryName);
    setDraftExists(true);
    setDraftSavedFlash(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setDraftSavedFlash(false), 2000);
  };

  /* ── Reset ── */
  const handleResetConfirmed = () => {
    clearDraft();
    clearImageCache();
    setImages([]);
    setFormData(EMPTY_FORM);
    setBeneficiaryName('');
    setPhotoError(false);
    setDraftExists(false);
    setDraftSavedFlash(false);
    setShowResetConfirm(false);
  };

  /* ── File handling ── */
  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setImages((prev) => [...prev, ...newFiles]);
      setPhotoError(false);
    }
  };

  const removeSelectedImage = (index) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  /* ── Item Handling ── */
  const handleAddItem = (e) => {
    const val = e.target.value;
    if (val && !formData.acceptedItems.includes(val)) {
      setFormData({ ...formData, acceptedItems: [...formData.acceptedItems, val] });
    }
  };

  const handleRemoveItem = (itemToRemove) => {
    setFormData({ 
      ...formData, 
      acceptedItems: formData.acceptedItems.filter(item => item !== itemToRemove) 
    });
  };

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setFormData({ 
      ...formData, 
      category: newCategory, 
      acceptedItems: [] 
    });
  };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const itemsString = Array.isArray(formData.acceptedItems) 
      ? formData.acceptedItems.join(', ') 
      : formData.acceptedItems;

    if (checkFieldsForProfanity([formData.name, formData.desc, itemsString, beneficiaryName])) {
      await showAlert(PROFANITY_MESSAGE);
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      await showAlert('You must be logged in to submit an aid request.');
      return;
    }

    if (!isAdminMode) {
      try {
        const qOwn = query(
          collection(db, 'aid_requests'),
          where('authorId', '==', currentUser.uid)
        );
        const ownSnap = await getDocs(qOwn);
        const hasOngoing = ownSnap.docs.some((doc) => {
          const data = doc.data();
          const status = data.status;
          if (status === 'Ongoing' || status === 'Pending') {
            const approvedField = data.approvedAt || data.createdAt;
            if (approvedField && status === 'Ongoing') {
              const approvedMs = approvedField.toDate ? approvedField.toDate().getTime() : new Date(approvedField).getTime();
              const durationMs = Number(data.postDurationDays || 1) * 24 * 60 * 60 * 1000;
              if (Date.now() >= approvedMs + durationMs) {
                return false;
              }
            }
            return true;
          }
          return false;
        });

        if (hasOngoing) {
          await showAlert("You already have an ongoing or pending aid request. You cannot submit a new one until the current one is completed.");
          return;
        }
      } catch (err) {
        console.error("Error checking ongoing requests:", err);
      }
    }

    if (images.length === 0) {
      setPhotoError(true);
      return;
    }

    setIsSubmitting(true);
    try {
      let authorName = currentUser.displayName || '';

      if (isAdminMode && beneficiaryName.trim()) {
        authorName = beneficiaryName.trim();
      } else {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (userData.firstName && userData.lastName) {
              authorName = `${userData.firstName} ${userData.lastName}`;
            } else {
              authorName = userData.fullName || userData.name || userData.username || authorName;
            }
          }
        } catch (err) {
          console.log('Could not look up specific profile fields, falling back onto auth info', err);
        }

        if (!authorName.trim()) {
          authorName = currentUser.email ? currentUser.email.split('@')[0] : 'User';
        }
      }

      const imageUrls = [];
      for (const imgObj of images) {
        const storageRef = ref(storage, `requests/${Date.now()}_${imgObj.file.name}`);
        await uploadBytes(storageRef, imgObj.file);
        const downloadUrl = await getDownloadURL(storageRef);
        imageUrls.push(downloadUrl);
      }

      await addDoc(collection(db, 'aid_requests'), {
        authorId: currentUser.uid,
        authorName,
        authorEmail: isAdminMode ? '' : (currentUser.email || ''),
        title: formData.name,
        description: formData.desc,
        category: formData.category,
        aidType: formData.aidType,
        fundraiserGoal: formData.aidType !== 'In-Kind' ? Number(formData.fundraiserGoal) : null,
        itemQuantity: formData.aidType !== 'Fundraiser' ? Number(formData.itemQuantity) : null,
        raised: 0,
        postDurationDays: Number(formData.postDurationDays),
        acceptedItems: formData.aidType !== 'Fundraiser' ? formData.acceptedItems : [],
        imageUrls,
        status: isAdminMode ? 'Ongoing' : 'Pending',
        approvalStatus: isAdminMode ? 'Approved' : 'Unread',
        approvedAt: isAdminMode ? serverTimestamp() : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      });

      clearDraft();
      clearImageCache();
      setImages([]);
      setFormData(EMPTY_FORM);
      setBeneficiaryName('');
      setDraftExists(false);

      if (isAdminMode) {
        await showAlert('The aid request has been successfully created and approved.');
      } else {
        await showAlert(
          'Your aid request has been submitted. An admin will review your post if it meets the established guidelines. If so, it will appear once approved.'
        );
      }
      onClose();
    } catch (error) {
      console.error('Error creating request: ', error);
      await showAlert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSave = hasMeaningfulData(formData, images, beneficiaryName);

  return (
    <AnimatedModal onClose={onClose}>
      <div className={styles.modalHeader}>
        <h3>{isAdminMode ? 'Create Walk-In Aid Request' : 'Create New Aid Request'}</h3>
        <button className={styles.closeBtn} onClick={onClose} disabled={isSubmitting}>×</button>
      </div>

      <div className={styles.modalBody}>
        {draftBannerVisible && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            padding: '10px 14px',
            marginBottom: '14px',
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: '#92400e',
            flexWrap: 'wrap',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              You have an unsaved draft. Restore it?
            </span>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={handleRestoreDraft}
                style={{
                  padding: '4px 12px', borderRadius: '6px', border: 'none',
                  background: '#d97706', color: '#fff', fontWeight: '600',
                  fontSize: '0.8rem', cursor: 'pointer',
                }}
              >
                Restore
              </button>
              <button
                type="button"
                onClick={handleDismissDraft}
                style={{
                  padding: '4px 10px', borderRadius: '6px',
                  border: '1px solid #fcd34d', background: 'transparent',
                  color: '#92400e', fontWeight: '500',
                  fontSize: '0.8rem', cursor: 'pointer',
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.modalFormLayout}>
          {isAdminMode && (
            <div className={styles.itemFieldContainer}>
              <label className={styles.itemLabel}>Beneficiary Name (Person without device)</label>
              <input
                type="text"
                required
                placeholder="e.g. Juan dela Cruz"
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                disabled={isSubmitting}
                maxLength="120"
              />
            </div>
          )}

          <div className={styles.itemFieldContainer}>
            <label className={styles.itemLabel}>Request Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Typhoon Relief for Familia Santos"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isSubmitting}
              maxLength="60"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.itemFieldContainer}>
              <label className={styles.itemLabel}>Category</label>
              <select
                required
                value={formData.category}
                onChange={handleCategoryChange}
                disabled={isSubmitting}
              >
                <option value="">Select…</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className={styles.itemFieldContainer}>
              <label className={styles.itemLabel}>Aid Type</label>
              <select
                value={formData.aidType}
                onChange={(e) => setFormData({ ...formData, aidType: e.target.value })}
                disabled={isSubmitting}
              >
                {aidTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {formData.aidType === 'In-Kind' && (
            <div className={styles.formRow}>
              <div className={styles.itemFieldContainer}>
                <label className={styles.itemLabel}>Duration (days, max 14)</label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  required
                  placeholder="e.g. 1"
                  value={formData.postDurationDays}
                  onChange={(e) => setFormData({ ...formData, postDurationDays: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          {formData.aidType === 'Fundraiser' && (
            <div className={styles.formRow}>
              <div className={styles.itemFieldContainer}>
                <label className={styles.itemLabel}>Monetary Goal (₱)</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 10000"
                  value={formData.fundraiserGoal}
                  onChange={(e) => setFormData({ ...formData, fundraiserGoal: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
              <div className={styles.itemFieldContainer}>
                <label className={styles.itemLabel}>Duration (days, max 14)</label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  required
                  placeholder="e.g. 1"
                  value={formData.postDurationDays}
                  onChange={(e) => setFormData({ ...formData, postDurationDays: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          {formData.aidType !== 'Fundraiser' && (
            <>
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fef2f2', border: '1px solid #f87171', borderRadius: '8px', fontSize: '0.85rem', color: '#991b1b' }}>
                <strong style={{ display: 'block', marginBottom: '6px' }}>⚠️ Important: The barangay will NOT accept the following items and will immediately reject your request/donation:</strong>
                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.4' }}>
                  <li>Medicines (prescription or over-the-counter)</li>
                  <li>Expired or near-expiry food</li>
                  <li>Opened or damaged items</li>
                  <li>Hazardous materials</li>
                  <li>Tobacco and alcohol</li>
                </ul>
              </div>
              
              <div className={styles.itemFieldContainer}>
                <label className={styles.itemLabel}>Accepted Items</label>
                <select
                  value=""
                  onChange={handleAddItem}
                  disabled={isSubmitting || !formData.category}
                >
                  <option value="" disabled>
                    {!formData.category ? 'Please select a Category first' : 'Select an item to add...'}
                  </option>
                  {formData.category && categoryItemsMap[formData.category] && categoryItemsMap[formData.category].map((item) => (
                    <option 
                      key={item} 
                      value={item} 
                      disabled={formData.acceptedItems.includes(item)}
                    >
                      {item}
                    </option>
                  ))}
                </select>

                {formData.acceptedItems.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                    {formData.acceptedItems.map(item => (
                      <span 
                        key={item} 
                        style={{ 
                          background: '#f1f5f9', 
                          border: '1px solid #cbd5e1',
                          padding: '6px 10px', 
                          borderRadius: '6px', 
                          fontSize: '0.85rem', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          color: '#334155'
                        }}
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item)}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            fontWeight: 'bold', 
                            color: '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div className={styles.itemFieldContainer}>
            <label className={styles.itemLabel}>Description</label>
            <textarea
              required
              placeholder="Describe your situation and what kind of help you need…"
              value={formData.desc}
              onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
              disabled={isSubmitting}
              maxLength="400"
            />
          </div>

          <div className={styles.fileUploadFieldset} style={photoError ? { borderColor: '#e05a5a' } : {}}>
            <span className={styles.itemLabel} style={photoError ? { color: '#e05a5a' } : {}}>
              Photos (at least 1 required)
            </span>
            <div className={styles.fileInputWrapper}>
              <label className={styles.customBrowseBtn} style={{ opacity: isSubmitting ? 0.6 : 1, pointerEvents: isSubmitting ? 'none' : 'auto' }}>
                Browse…
                <input type="file" multiple accept="image/*" hidden onChange={handleFileChange} disabled={isSubmitting} />
              </label>
              <span className={styles.fileNameDisplay}>
                {images.length > 0 ? `${images.length} file(s) selected` : 'No file chosen'}
              </span>
            </div>
            {photoError && (
              <span className={styles.photoRequiredHint}>⚠ Please upload at least one photo to continue.</span>
            )}
            {images.length > 0 && (
              <div className={styles.thumbnailGrid}>
                {images.map((imgObj, index) => (
                  <div key={index} className={styles.thumbnailContainer}>
                    <img src={imgObj.preview} alt="preview" className={styles.thumbnailImg} />
                    <button
                      type="button"
                      className={styles.removeThumbBtn}
                      onClick={() => removeSelectedImage(index)}
                      disabled={isSubmitting}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: '4px',
          }}>
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              disabled={isSubmitting}
              title="Clear all fields and images"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1.5px solid #e2e8f0',
                background: '#f8fafc',
                color: '#64748b',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.5 : 1,
                transition: 'background 0.15s',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
              </svg>
              Reset
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSubmitting || !canSave}
              title="Save your progress as a draft"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1.5px solid #3b82f6',
                background: draftSavedFlash ? '#3b82f6' : '#eff6ff',
                color: draftSavedFlash ? '#fff' : '#1d4ed8',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: (isSubmitting || !canSave) ? 'not-allowed' : 'pointer',
                opacity: (isSubmitting || !canSave) ? 0.5 : 1,
                transition: 'background 0.2s, color 0.2s',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {draftSavedFlash ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Saved!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Save Draft
                </>
              )}
            </button>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
              style={{ flex: 1, minWidth: '120px', margin: 0 }}
            >
              {isSubmitting ? 'Uploading…' : isAdminMode ? 'Post Request' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>

      {showResetConfirm && (
        <div
          onClick={() => setShowResetConfirm(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15,23,42,0.45)',
            zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '14px',
              padding: '28px 24px 22px',
              maxWidth: '360px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              textAlign: 'center',
            }}
          >
            <div style={{
              width: '46px', height: '46px',
              background: '#fef2f2',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
              </svg>
            </div>
            <h4 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>
              Reset all fields?
            </h4>
            <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>
              This will clear all your inputs, uploaded images, and any saved draft. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: '8px',
                  border: '1.5px solid #e2e8f0', background: '#f8fafc',
                  color: '#475569', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetConfirmed}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: '8px',
                  border: 'none', background: '#ef4444',
                  color: '#fff', fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer',
                }}
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatedModal>
  );
};

export default CreateAidRequestModal;