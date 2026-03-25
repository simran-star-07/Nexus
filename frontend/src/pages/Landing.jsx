import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import GestureUnlock from '../components/GestureUnlock';
import { useAuth } from '../context/AuthContext';
import AlwaysOnMic from '../components/AlwaysOnMic';
import HandGestureNav from '../components/HandGestureNav';

const FEATURES = [
  { icon: '🎮', title: 'Gamified Wallet', desc: 'Earn XP, level up, unlock badges as you spend smart' },
  { icon: '👨‍👩‍👧', title: 'Parental Controls', desc: 'Real-time spend alerts, limits, wallet freeze & merchant whitelist' },
  { icon: '♿', title: 'Accessibility First', desc: 'Voice commands, audio feedback & giant touch-friendly UI for Divyang users' },
  { icon: '🎯', title: 'Savings Goals', desc: 'Set goals, track progress, celebrate milestones with animations' },
  { icon: '📊', title: 'Smart Insights', desc: 'AI-powered spending intelligence — know where your money goes' },
  { icon: '🔐', title: 'Triple-Layer Security', desc: 'Secure every payment with any combination of a 6-digit PIN, unique vibration tap pattern, or fingerprint.' },
];

function Particle({ x, y, size, delay, color }) {
  return (
    <motion.div
      className="absolute rounded-full opacity-30"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: color }}
      animate={{ y: [0, -30, 0], opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 3 + delay, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  );
}

export default function Landing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const particles = useRef(Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 20 + 6,
    delay: Math.random() * 3,
    color: i % 2 === 0 ? '#FF9933' : '#003366',
  }))).current;

  const { user } = useAuth();
  const [activeFeature, setActiveFeature] = useState(0);
  const [showGesture, setShowGesture] = useState(false);
  const [showCameraNav, setShowCameraNav] = useState(false);

  const handleGestureUnlock = () => {
    setShowGesture(false);
    if (user) {
      navigate(user.role === 'parent' ? '/parent' : user.role === 'student' ? '/student' : '/accessibility');
    } else {
      navigate('/auth');
    }
  };

  useEffect(() => {
    const t = setInterval(() => setActiveFeature(p => (p + 1) % FEATURES.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0e1a]">
      {/* Hero Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E"
          onError={(e) => { e.target.style.display = 'none'; }}
        >
          <source src="https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_30fps.mp4" type="video/mp4" />
        </video>
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e1a]/80 via-[#0a0e1a]/60 to-[#0a0e1a]/95" />
      </div>

      {/* Animated particles overlay */}
      <div className="absolute inset-0 z-[1]">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-saffron-500/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-navy-600/20 blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-saffron-600/5 blur-3xl" />
        {particles.map(p => <Particle key={p.id} {...p} />)}
      </div>

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center px-8 py-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-saffron rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-saffron-500/30">₹</div>
          <span className="font-display text-2xl font-bold text-white">Pay<span className="text-gradient-saffron">Bridge</span></span>
        </motion.div>
        <motion.button
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/auth')}
          className="px-6 py-2.5 gradient-saffron text-white rounded-xl font-semibold hover:opacity-90 hover:scale-105 transition-all shadow-lg shadow-saffron-500/30"
        >
          Get Started
        </motion.button>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-6xl mx-auto px-8 pb-24">
        <div className="text-center pt-16 pb-20">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <span className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full text-saffron-500 text-sm font-medium mb-8 border border-saffron-500/20">
              🇮🇳 Made for India · Powered by UPI
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="font-display text-6xl md:text-8xl font-bold text-white leading-tight mb-6"
          >
            Pay Smart.
            <br />
            <span className="text-gradient-saffron">Live Smarter.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="text-xl text-white/50 max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            PayBridge is India's most intelligent UPI wallet — with gamification for students, full parental controls, and an ultra-accessible interface for Divyang users.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button
              onClick={() => navigate('/auth')}
              className="group px-10 py-4 gradient-saffron text-white rounded-2xl font-bold text-lg hover:opacity-90 hover:scale-105 transition-all shadow-2xl shadow-saffron-500/40 flex items-center gap-3 justify-center"
            >
              <span>Start Your Journey</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
            <button
              onClick={() => setShowGesture(true)}
              className="px-10 py-4 glass text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all border border-white/10 flex items-center gap-2 justify-center"
            >
              <span className="text-xl">✋</span> Assistive Unlock
            </button>
          </motion.div>
        </div>

        <AnimatePresence>
          {showGesture && <GestureUnlock onUnlock={handleGestureUnlock} onCancel={() => setShowGesture(false)} />}
        </AnimatePresence>

        {/* Floating Wallet Card Demo */}
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, type: 'spring', stiffness: 100 }}
          className="max-w-sm mx-auto mb-24 animate-float"
        >
          <div className="gradient-saffron rounded-3xl p-6 shadow-2xl shadow-saffron-500/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full translate-y-6 -translate-x-6" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-white/70 text-sm">PayBridge Wallet</p>
                  <p className="text-white font-bold text-2xl font-display">Rahul Sharma</p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">₹</div>
              </div>
              <p className="text-white/60 text-xs mb-1">AVAILABLE BALANCE</p>
              <p className="text-white font-bold text-4xl font-display mb-6">₹4,280.50</p>
              <div className="flex justify-between items-center">
                <div className="flex gap-1">
                  {[1,2,3].map(i => <div key={i} className="w-8 h-1.5 bg-white/40 rounded-full" />)}
                  <div className="w-3 h-1.5 bg-white/60 rounded-full" />
                </div>
                <span className="text-white/70 text-xs">🏆 Smart Saver</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, viewport: { once: true } }}
              className={`glass rounded-2xl p-6 hover:border-saffron-500/30 transition-all cursor-default border ${activeFeature === i ? 'border-saffron-500/40 bg-saffron-500/5' : 'border-white/5'}`}
            >
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-white text-lg mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="mt-20 grid grid-cols-3 gap-8 text-center"
        >
          {[
            { value: '3', label: 'User Roles', sub: 'Student · Parent · Divyang' },
            { value: '6', label: 'Auth Layers', sub: 'Password + PIN + Vibration' },
            { value: '∞', label: 'Transactions', sub: 'Fully tracked in MongoDB' },
          ].map((s, i) => (
            <div key={i}>
              <div className="font-display text-5xl font-bold text-gradient-saffron mb-2">{s.value}</div>
              <div className="text-white font-semibold">{s.label}</div>
              <div className="text-white/40 text-sm">{s.sub}</div>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          className="mt-20 text-center glass rounded-3xl p-12 border border-saffron-500/20"
        >
          <h2 className="font-display text-4xl font-bold text-white mb-4">Ready to bridge the gap?</h2>
          <p className="text-white/50 mb-8">Join PayBridge and experience payments like never before.</p>
          <button
            onClick={() => navigate('/auth')}
            className="px-12 py-4 gradient-saffron text-white rounded-2xl font-bold text-lg hover:opacity-90 hover:scale-105 transition-all shadow-2xl shadow-saffron-500/30"
          >
            Create Free Account 🚀
          </button>
        </motion.div>
      </main>
      <AnimatePresence>
        {showCameraNav && <HandGestureNav basePath="/" onNavigate={(path) => navigate(path)} onClose={() => setShowCameraNav(false)} />}
      </AnimatePresence>
      <AlwaysOnMic
        user={user}
        basePath="/"
        navItems={[
          { label: 'Home', path: '', aliases: ['home', 'main', 'landing'] },
          { label: 'Login', path: 'auth', aliases: ['login', 'signup', 'authenticate', 'get started'] }
        ]}
        onNavigate={(path) => navigate(path)}
      />
      {/* Floating gesture toggle */}
      <button
        onClick={() => setShowCameraNav(s => !s)}
        className={`fixed bottom-20 right-4 z-40 p-3 rounded-full shadow-lg transition-all ${showCameraNav ? 'bg-saffron-500 text-white' : 'glass border border-white/20 text-white/60 hover:text-white'}`}
        title="Toggle Camera Gesture Nav"
      >
        ✋
      </button>
    </div>
  );
}
