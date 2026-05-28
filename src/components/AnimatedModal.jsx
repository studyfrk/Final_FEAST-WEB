import React, { useState } from 'react';
import styles from './requests_and_events.module.css';

const AnimatedModal = ({ children, onClose, maxWidth, noOverlayClose, style }) => {
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    if (noOverlayClose) return;
    setClosing(true);
    setTimeout(onClose, 180);
  };

  const handleDirectClose = () => {
    setClosing(true);
    setTimeout(onClose, 180);
  };

  return (
    <div
      className={`${styles.contentModalOverlay}${closing ? ' ' + styles.closing : ''}`}
      onClick={handleClose}
    >
      <div
        className={styles.contentModal}
        style={{ maxWidth: maxWidth || 560, ...style }}
        onClick={(e) => e.stopPropagation()}
      >
        {React.Children.map(children, child =>
          React.isValidElement(child) ? React.cloneElement(child, { _onClose: handleDirectClose }) : child
        )}
      </div>
    </div>
  );
};

export default AnimatedModal;
