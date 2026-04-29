import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import styles from '../components/CreateRequestStyles';

const CreateRequestPage = () => {
  const navigate = useNavigate();
  
  // Form State (Ready for Firebase)
  const [formData, setFormData] = useState({
    title: '',
    name: '',
    date: '',
    category: 'Personal',
    targetDonation: ''
  });
  const [images, setImages] = useState([]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    // Limit to 4 images for the gallery preview
    setImages((prev) => [...prev, ...files].slice(0, 4));
  };

  const handleCreate = () => {
    // Validation Check
    if (!formData.title || !formData.name || !formData.date || !formData.targetDonation) {
      alert("Aid request failed: Please fill out the required fields.");
      return;
    }

    // Success Logic
    alert("Aid request made successfully!");
    navigate('/requests'); 
  };

  return (
    <div style={styles.pageWrapper}>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.formCard}>
          
          {/* Left: Media Gallery */}
          <div style={styles.mediaSection}>
            <h2 style={styles.sectionTitle}>Media Gallery</h2>
            <div style={styles.mainPlaceholder}>
              {images[0] ? (
                <img src={URL.createObjectURL(images[0])} alt="Main" style={styles.previewImg} />
              ) : (
                <span style={{color: '#999'}}>Main Preview</span>
              )}
            </div>
            <div style={styles.thumbnailRow}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={styles.smallPlaceholder}>
                  {images[i] && (
                    <img src={URL.createObjectURL(images[i])} alt={`Thumb ${i}`} style={styles.previewImg} />
                  )}
                </div>
              ))}
            </div>
            <input 
              type="file" 
              multiple 
              onChange={handleImageUpload} 
              style={styles.fileInput} 
              id="file-upload" 
            />
            <label htmlFor="file-upload" style={styles.uploadBtn}>Add Images</label>
          </div>

          {/* Right: Details Form */}
          <div style={styles.detailsSection}>
            <h2 style={styles.sectionTitle}>Details</h2>
            
            <label style={styles.label}>Title</label>
            <input 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              style={styles.input} 
              placeholder="Help ASAP" 
            />

            <label style={styles.label}>Name</label>
            <input 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              style={styles.input} 
              placeholder="Regil Kent" 
            />

            <label style={styles.label}>Date</label>
            <input 
              name="date" 
              type="date" 
              value={formData.date} 
              onChange={handleChange} 
              style={styles.input} 
            />

            <label style={styles.label}>Category</label>
            <select 
              name="category" 
              value={formData.category} 
              onChange={handleChange} 
              style={styles.input}
            >
              <option value="Personal">Personal</option>
              <option value="Medical">Medical</option>
              <option value="Education">Education</option>
            </select>

            <label style={styles.label}>Targeted Total Donation</label>
            <input 
              name="targetDonation" 
              value={formData.targetDonation} 
              onChange={handleChange} 
              style={styles.input} 
              placeholder="₱1000.00" 
            />

            <div style={styles.buttonRow}>
              {/* Back Button - Navigates to previous page */}
              <button 
                style={styles.backBtn} 
                onClick={() => navigate(-1)}
              >
                BACK
              </button>
              
              <button 
                style={styles.createBtn} 
                onClick={handleCreate}
              >
                CREATE REQUEST
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CreateRequestPage;