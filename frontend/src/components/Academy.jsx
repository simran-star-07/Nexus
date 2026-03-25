import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const ACADEMY_VIDEOS = [
  {
    id: 1,
    title: 'How UPI Works',
    desc: 'Learn the basics of UPI payments in 2 minutes',
    emoji: '💸',
    category: 'basics',
    url: 'https://www.youtube.com/embed/RkGKIpnYXqs',
    duration: '2:15',
    color: '#FF9933',
  },
  {
    id: 2,
    title: 'Save Smart with SIPs',
    desc: 'How Systematic Investment Plans grow your wealth',
    emoji: '📈',
    category: 'finance',
    url: 'https://www.youtube.com/embed/2iaSA-ECmLo',
    duration: '3:40',
    color: '#22c55e',
  },
  {
    id: 3,
    title: 'Stay Safe Online',
    desc: 'Protect yourself from UPI fraud & phishing',
    emoji: '🔐',
    category: 'security',
    url: 'https://www.youtube.com/embed/aO858HyFbKI',
    duration: '4:10',
    color: '#ef4444',
  },
  {
    id: 4,
    title: 'Budget Like a Pro',
    desc: 'Master the 50/30/20 budgeting rule',
    emoji: '🍰',
    category: 'finance',
    url: 'https://www.youtube.com/embed/HQzoZfc3GwQ',
    duration: '3:20',
    color: '#8b5cf6',
  },
  {
    id: 5,
    title: 'Using Voice & Gestures',
    desc: 'Navigate PayBridge hands-free with accessibility tools',
    emoji: '✋',
    category: 'accessibility',
    url: 'https://www.youtube.com/embed/0VqTwnAuHws',
    duration: '1:50',
    color: '#06b6d4',
  },
  {
    id: 6,
    title: 'Credit Score Explained',
    desc: 'Why your credit score matters and how to improve it',
    emoji: '📊',
    category: 'finance',
    url: 'https://www.youtube.com/embed/KRBJBB3x3-8',
    duration: '5:00',
    color: '#f59e0b',
  },
];

const CATEGORIES = [
  { key: 'all', label: 'All', icon: '🎬' },
  { key: 'basics', label: 'Basics', icon: '💡' },
  { key: 'finance', label: 'Finance', icon: '📈' },
  { key: 'security', label: 'Security', icon: '🔐' },
  { key: 'accessibility', label: 'Access', icon: '♿' },
];

export default function Academy() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('all');
  const [playingVideo, setPlayingVideo] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const filtered = activeCategory === 'all'
    ? ACADEMY_VIDEOS
    : ACADEMY_VIDEOS.filter(v => v.category === activeCategory);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="glass rounded-2xl border border-white/10 overflow-hidden cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-lg shadow-lg shadow-red-500/30">
              🎬
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">PayBridge Academy</h3>
              <p className="text-white/40 text-xs">Learn finance, security & more</p>
            </div>
          </div>
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            className="text-white/40 text-lg"
          >
            ▾
          </motion.span>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {/* Category filters */}
            <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  onClick={() => setActiveCategory(c.key)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    activeCategory === c.key
                      ? 'bg-saffron-500/15 text-saffron-400 border border-saffron-500/30'
                      : 'glass text-white/50 hover:text-white border border-white/5'
                  }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>

            {/* Video grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((video, i) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass rounded-2xl border border-white/10 overflow-hidden hover:border-saffron-500/20 transition-all group cursor-pointer"
                  onClick={() => setPlayingVideo(playingVideo?.id === video.id ? null : video)}
                >
                  {/* Thumbnail / Player */}
                  <div className="aspect-video relative bg-black/40">
                    {playingVideo?.id === video.id ? (
                      <iframe
                        src={`${video.url}?autoplay=1&rel=0&modestbranding=1`}
                        title={video.title}
                        className="absolute inset-0 w-full h-full"
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                        frameBorder="0"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className="absolute inset-0 opacity-20"
                          style={{ background: `radial-gradient(circle at center, ${video.color}40, transparent 70%)` }}
                        />
                        <div className="text-5xl mb-2 relative z-10">{video.emoji}</div>
                        {/* Play button overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
                            <span className="text-white text-xl ml-0.5">▶</span>
                          </div>
                        </div>
                        {/* Duration badge */}
                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur px-2 py-0.5 rounded text-white/70 text-[10px] font-mono">
                          {video.duration}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h4 className="text-white font-semibold text-xs mb-0.5 truncate">{video.title}</h4>
                    <p className="text-white/40 text-[10px] line-clamp-1">{video.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-8 text-white/30 text-sm">
                No videos in this category yet 🎥
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Video Modal */}
      <AnimatePresence>
        {playingVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setPlayingVideo(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-full max-w-3xl aspect-video relative rounded-2xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <iframe
                src={`${playingVideo.url}?autoplay=1&rel=0&modestbranding=1`}
                title={playingVideo.title}
                className="w-full h-full"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                frameBorder="0"
              />
              <button
                onClick={() => setPlayingVideo(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all"
              >
                ✕
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <h3 className="text-white font-bold text-sm">{playingVideo.title}</h3>
                <p className="text-white/50 text-xs">{playingVideo.desc}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
