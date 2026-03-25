import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CelebrationOverlay: Shows a celebration animation when a user earns a badge or levels up.
 * Props:
 *   - show: boolean (triggers celebration)
 *   - type: 'badge' | 'levelup' | 'reward'
 *   - title: string (e.g. "First Transaction!")
 *   - subtitle: string (e.g. "Badge Earned")
 *   - emoji: string (e.g. "🏅")
 *   - onDone: callback when animation finishes
 */
export default function CelebrationOverlay({ show, type = 'badge', title, subtitle, emoji = '🎉', onDone }) {
  const [particles, setParticles] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      // Generate confetti particles
      const newParticles = Array.from({ length: 60 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        size: Math.random() * 10 + 4,
        color: ['#FF9933', '#FFD700', '#22c55e', '#8b5cf6', '#ef4444', '#06b6d4', '#f59e0b'][i % 7],
        delay: Math.random() * 0.5,
        rotation: Math.random() * 360,
        duration: 2 + Math.random() * 2,
      }));
      setParticles(newParticles);

      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => onDone?.(), 500);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [show]);

  const gradients = {
    badge: 'from-saffron-500 to-amber-600',
    levelup: 'from-purple-500 to-indigo-600',
    reward: 'from-emerald-500 to-teal-600',
  };

  const icons = {
    badge: '🏅',
    levelup: '⭐',
    reward: '🎁',
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          onClick={() => { setVisible(false); setTimeout(() => onDone?.(), 300); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

          {/* Confetti particles */}
          {particles.map(p => (
            <motion.div
              key={p.id}
              className="absolute rounded-sm"
              style={{
                left: `${p.x}%`,
                width: p.size,
                height: p.size * 1.5,
                background: p.color,
                transform: `rotate(${p.rotation}deg)`,
              }}
              initial={{ y: '-10vh', opacity: 1 }}
              animate={{
                y: '110vh',
                opacity: [1, 1, 0.5, 0],
                rotate: p.rotation + 720,
                x: [0, (Math.random() - 0.5) * 100],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: 'easeIn',
              }}
            />
          ))}

          {/* Central card */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 10 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="relative z-10 text-center"
          >
            {/* Glow ring */}
            <motion.div
              className={`w-28 h-28 mx-auto mb-6 rounded-full bg-gradient-to-br ${gradients[type] || gradients.badge} flex items-center justify-center shadow-2xl`}
              animate={{
                boxShadow: [
                  '0 0 30px rgba(255,153,51,0.3)',
                  '0 0 60px rgba(255,153,51,0.6)',
                  '0 0 30px rgba(255,153,51,0.3)',
                ],
              }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <motion.span
                className="text-5xl"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                {emoji || icons[type]}
              </motion.span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-white font-display font-bold text-3xl mb-2"
            >
              {title || 'Achievement Unlocked!'}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-white/60 text-sm mb-6"
            >
              {subtitle || 'You earned a new badge!'}
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-white/30 text-xs"
            >
              Tap anywhere to continue
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
