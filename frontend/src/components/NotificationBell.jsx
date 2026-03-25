import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  const fetch = () => {
    api.get('/notifications').then(r => {
      setNotifications(r.data.notifications || []);
      setUnread(r.data.unreadCount || 0);
    }).catch(() => {});
  };

  useEffect(() => { fetch(); const t = setInterval(fetch, 30000); return () => clearInterval(t); }, []);

  const markRead = () => {
    api.post('/notifications/mark-read', {}).then(() => { setUnread(0); fetch(); }).catch(() => {});
  };

  const icon = { allowance: '🎁', blocked: '🚫', limit_warning: '⚠️', money_received: '💰', request: '🙋', system: '📢' };
  const timeAgo = (d) => {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'now';
    if (s < 3600) return `${Math.floor(s/60)}m`;
    if (s < 86400) return `${Math.floor(s/3600)}h`;
    return `${Math.floor(s/86400)}d`;
  };

  return (
    <div className="relative">
      <button onClick={() => { setOpen(o => !o); if (!open && unread > 0) markRead(); }} className="relative p-2 rounded-lg glass border border-white/10 hover:border-saffron-500/30 transition-all" aria-label="Notifications">
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center animate-pulse">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-12 w-[300px] max-h-[400px] z-50 glass rounded-2xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center">
              <span className="text-white font-bold text-sm">Notifications</span>
              {notifications.length > 0 && <button onClick={markRead} className="text-[10px] text-saffron-500 hover:underline">Mark all read</button>}
            </div>
            <div className="overflow-y-auto max-h-[340px] scrollbar-hide">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-3xl mb-2">🔕</p>
                  <p className="text-white/30 text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n._id} className={`px-4 py-3 border-b border-white/5 hover:bg-white/3 transition-all ${!n.isRead ? 'bg-saffron-500/5' : ''}`}>
                    <div className="flex gap-3">
                      <span className="text-lg">{icon[n.type] || '📢'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs leading-relaxed">{n.message}</p>
                        <p className="text-white/30 text-[10px] mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.isRead && <div className="w-2 h-2 bg-saffron-500 rounded-full flex-shrink-0 mt-1" />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
