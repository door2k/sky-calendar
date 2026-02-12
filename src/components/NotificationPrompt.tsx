import { useEffect, useState } from 'react';
import { usePushSubscription } from '../hooks/usePushSubscription';

export function NotificationPrompt() {
  const [show, setShow] = useState(false);
  const { subscribe } = usePushSubscription();

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      const timer = setTimeout(() => setShow(true), 30000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  const handleEnable = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await subscribe();
    }
    setShow(false);
  };

  return (
    <div style={{
      position: 'fixed', bottom: 16, left: 16, right: 16,
      background: '#1e293b', color: 'white', padding: '12px 16px',
      borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <span>Get notified when the schedule changes?</span>
      <div>
        <button onClick={() => setShow(false)} style={{ marginRight: 8, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
          Later
        </button>
        <button onClick={handleEnable} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 16px', borderRadius: 6, cursor: 'pointer' }}>
          Enable
        </button>
      </div>
    </div>
  );
}
