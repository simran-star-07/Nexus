import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export default function SessionTimeout({ onTimeout }) {
  const [remaining, setRemaining] = useState(TIMEOUT_MS);
  const [showWarning, setShowWarning] = useState(false);

  const resetTimer = useCallback(() => {
    setRemaining(TIMEOUT_MS);
    setShowWarning(false);
  }, []);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    return () => events.forEach(e => window.removeEventListener(e, resetTimer));
  }, [resetTimer]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(prev => {
        const next = prev - 1000;
        if (next <= 0) {
          clearInterval(interval);
          toast.error('Session expired. Please login again.');
          if (onTimeout) onTimeout();
          return 0;
        }
        if (next <= 2 * 60 * 1000 && !showWarning) {
          setShowWarning(true);
          toast('⏰ Session expires in 2 minutes. Move your mouse to stay logged in.', { icon: '⚠️', duration: 5000 });
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showWarning, onTimeout]);

  return null; // Invisible component — just monitors activity
}
