import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import AnimatedModal from '../AnimatedModal';
import styles from '../requests_and_events.module.css';

const EventParticipantsModal = ({ isOpen, onClose, selectedEvent }) => {
  const [loading, setLoading] = useState(false);
  const [participantProfiles, setParticipantProfiles] = useState([]);

  useEffect(() => {
    if (!isOpen || !selectedEvent) return;

    const fetchParticipants = async () => {
      const uids = selectedEvent.anticipatedParticipants || [];
      if (uids.length === 0) {
        setParticipantProfiles([]);
        return;
      }

      setLoading(true);
      try {
        const profiles = await Promise.all(
          uids.map(async (uid) => {
            try {
              const snap = await getDoc(doc(db, 'users', uid));
              if (snap.exists()) {
                const d = snap.data();
                return { id: uid, name: `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.fullName || d.email || uid };
              }
              return { id: uid, name: uid };
            } catch {
              return { id: uid, name: uid };
            }
          })
        );
        setParticipantProfiles(profiles);
      } catch (err) {
        console.error("Error fetching participants:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [isOpen, selectedEvent]);

  if (!isOpen || !selectedEvent) return null;

  return (
    <AnimatedModal onClose={onClose} maxWidth={450}>
      <div className={styles.modalHeader}>
        <h3>Registered Participants</h3>
        <button className={styles.closeBtn} onClick={onClose}>×</button>
      </div>
      <div className={styles.modalBody}>
        {loading ? (
          <div className={styles.emptyState} style={{ padding: '40px 0' }}>
            <div className={styles.loadingSpinner}></div>
            <span>Loading participants…</span>
          </div>
        ) : participantProfiles.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '20px 0', fontFamily: 'var(--font)' }}>
            No participants have registered yet.
          </p>
        ) : (
          <div className={styles.participantList}>
            {participantProfiles.map((p, idx) => (
              <div key={p.id} className={styles.participantRow}>
                <span className={styles.participantNumber}>{idx + 1}</span>
                <span className={styles.participantName}>{p.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AnimatedModal>
  );
};

export default EventParticipantsModal;
