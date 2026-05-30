import React, { useState, useEffect } from 'react';
import { db, storage, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AnimatedModal from '../AnimatedModal';
import styles from '../requests_and_events.module.css';

const CreateAidRequestModal = ({ isOpen, onClose, showAlert }) => {
  const [formData, setFormData] = useState({
    name: '',
    desc: '',
    category: '',
    aidType: 'In-Kind',
    fundraiserGoal: '',
    itemQuantity: '',
    postDurationDays: '1',
    acceptedItems: '',
  });

  const [images, setImages] = useState([]);
  const [photoError, setPhotoError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = ['Basic Needs', 'Health', 'Education', 'Disaster'];
  const aidTypes = ['In-Kind', 'Fundraiser'];

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, [images]);

  if (!isOpen) return null;

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const currentUser = auth.currentUser;
    if (!currentUser) {
      await showAlert("You must be logged in to submit an aid request.");
      return;
    }

    if (images.length === 0) {
      setPhotoError(true);
      return;
    }

    setIsSubmitting(true);
    try {
      let authorName = currentUser.displayName || '';

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
        console.log("Could not look up specific profile fields, falling back onto auth info", err);
      }

      if (!authorName.trim()) {
        authorName = currentUser.email ? currentUser.email.split('@')[0] : 'User';
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
        authorName: authorName,
        authorEmail: currentUser.email || '', 
        title: formData.name,
        description: formData.desc,
        category: formData.category,
        aidType: formData.aidType,
        fundraiserGoal: formData.aidType !== 'In-Kind' ? Number(formData.fundraiserGoal) : null,
        itemQuantity: formData.aidType !== 'Fundraiser' ? Number(formData.itemQuantity) : null,
        raised: 0,
        postDurationDays: Number(formData.postDurationDays),
        acceptedItems:
          formData.aidType !== 'Fundraiser' && formData.acceptedItems
            ? formData.acceptedItems.split(',').map((i) => i.trim()).filter(Boolean)
            : [],
        imageUrls,
        status: 'Pending',
        approvalStatus: 'Unread',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      });

      images.forEach((img) => URL.revokeObjectURL(img.preview));
      setImages([]);

      await showAlert('Your aid request has been submitted. An admin will review your post if it meets the established guidelines. If so, it will appear once approved.');
      onClose();
    } catch (error) {
      console.error("Error creating request: ", error);
      await showAlert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatedModal onClose={onClose}>
      <div className={styles.modalHeader}>
        <h3>Create New Aid Request</h3>
        <button className={styles.closeBtn} onClick={onClose} disabled={isSubmitting}>×</button>
      </div>

      <div className={styles.modalBody}>
        <form onSubmit={handleSubmit} className={styles.modalFormLayout}>
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
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
            <div className={styles.itemFieldContainer}>
              <label className={styles.itemLabel}>Accepted Items</label>
              <input
                type="text"
                placeholder="e.g. Rice, Canned Goods, Blankets (comma-separated)"
                value={formData.acceptedItems}
                onChange={(e) => setFormData({ ...formData, acceptedItems: e.target.value })}
                disabled={isSubmitting}
                maxLength="100"
              />
            </div>
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

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting ? 'Uploading…' : 'Submit Request'}
          </button>
        </form>
      </div>
    </AnimatedModal>
  );
};

export default CreateAidRequestModal;
