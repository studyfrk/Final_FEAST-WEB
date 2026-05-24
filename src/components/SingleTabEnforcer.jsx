import { useEffect, useState } from 'react';

const SingleTabEnforcer = ({ children }) => {
  const [isDuplicate, setIsDuplicate] = useState(false);

  useEffect(() => {
    const channel = new BroadcastChannel('feast_tab_sync');

    channel.postMessage({ type: 'NEW_TAB_OPENED' });

    channel.onmessage = (event) => {
      if (event.data.type === 'NEW_TAB_OPENED') {
        channel.postMessage({ type: 'ALREADY_ACTIVE' });
      } else if (event.data.type === 'ALREADY_ACTIVE') {
        setIsDuplicate(true);
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  if (isDuplicate) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', padding: '20px' }}>
        <h2>Session Already Active</h2>
        <p>You already have F.E.A.S.T. open in another tab or window.</p>
        <p>Please close this tab to continue using your active session.</p>
      </div>
    );
  }

  return children;
};

export default SingleTabEnforcer;