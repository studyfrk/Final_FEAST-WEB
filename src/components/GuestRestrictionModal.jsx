import React from 'react';
import ReactDOM from 'react-dom'; // 1. Import ReactDOM
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GuestRestrictionModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  if (!isOpen) return null;

  // 2. Wrap the return statement in ReactDOM.createPortal
  return ReactDOM.createPortal(
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease'
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        backgroundColor: '#fff', padding: '32px', borderRadius: '12px',
        maxWidth: '400px', width: '90%', textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        fontFamily: '"Outfit", sans-serif'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <AlertCircle size={48} color="#f5a623" style={{ margin: '0 auto' }} />
        </div>
        <h3 style={{ marginBottom: '12px', fontSize: '1.25rem', color: '#333' }}>Feature Restricted</h3>
        <p style={{ marginBottom: '24px', color: '#666', lineHeight: '1.5', fontSize: '0.95rem' }}>
          You are currently signed in as a guest. To use this function, please sign in or create an account.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button 
            style={{ padding: '10px 20px', background: '#f1f1f1', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer', color: '#333', fontWeight: 'bold' }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            style={{ padding: '10px 20px', background: '#2e7d32', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#fff', fontWeight: 'bold' }}
            onClick={() => { onClose(); navigate('/'); }}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>,
    document.body // 3. Target the body element
  );
};

export default GuestRestrictionModal;
