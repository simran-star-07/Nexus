import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const speak = (text) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-IN'; u.rate = 1; u.pitch = 1;
    window.speechSynthesis.speak(u);
  }
};

/**
 * AlwaysOnMic: A persistent floating mic button that is visible at all times.
 * Tap to speak. Handles:
 *  - Navigation: "open pay", "go to recharge", "show history"
 *  - Payments:   "send 500 to rahul@ybl", "pay 200 to shopkeeper"  
 *  - Balance:    "check balance", "how much money"
 *  - Goals:      "check goals", "my savings"
 */
export default function AlwaysOnMic({ user, basePath, navItems, onNavigate, onPaymentIntent }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [expanded, setExpanded] = useState(false);
  const recognitionRef = useRef(null);
  const feedbackTimer = useRef(null);

  const showFeedback = (msg, duration = 3000) => {
    setFeedback(msg);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(''), duration);
  };

  const processCommand = (text) => {
    const t = text.toLowerCase().trim();
    setTranscript(text);

    // 1. Navigation: "open pay", "go to recharge", etc.
    for (const item of navItems) {
      const names = [item.label.toLowerCase(), ...(item.aliases || [])];
      for (const name of names) {
        if (t.includes(`open ${name}`) || t.includes(`go to ${name}`) || t.includes(`show ${name}`) || t.includes(`navigate ${name}`)) {
          speak(`Opening ${item.label}`);
          showFeedback(`📂 Opening ${item.label}`);
          onNavigate(`${basePath}/${item.path}`.replace(/\/\/$/, '/'));
          return;
        }
      }
    }

    // 2. Payment: "send 500 to rahul@ybl" or "pay 1000 to merchant"
    const payMatch = t.match(/(?:send|pay|transfer)\s+(\d+)\s+(?:to|rupees?\s+to)\s+(\S+)/i);
    if (payMatch) {
      const amount = payMatch[1];
      const to = payMatch[2];
      speak(`Preparing payment of ${amount} rupees to ${to}`);
      showFeedback(`💸 ₹${amount} → ${to}`);
      // Navigate to pay page and pre-fill
      onNavigate(`${basePath}/pay`);
      if (onPaymentIntent) onPaymentIntent({ amount, to });
      return;
    }

    // 3. Balance check
    if (t.includes('balance') || t.includes('how much money') || t.includes('wallet')) {
      if (!user) {
        speak('Please login to check your balance');
        showFeedback('🔒 Login required');
        return;
      }
      const bal = user?.walletBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00';
      speak(`Your balance is ${user?.walletBalance || 0} rupees`);
      showFeedback(`💰 Balance: ₹${bal}`);
      return;
    }

    // 4. Goals / Savings
    if (t.includes('goal') || t.includes('saving') || t.includes('sip')) {
      speak('Opening savings goals');
      showFeedback('🎯 Opening Goals');
      onNavigate(`${basePath}/goals`);
      return;
    }

    // 5. History
    if (t.includes('history') || t.includes('transaction')) {
      speak('Opening transaction history');
      showFeedback('📋 Opening History');
      onNavigate(`${basePath}/history`);
      return;
    }

    // 6. Recharge shortcut
    if (t.includes('recharge') || t.includes('mobile')) {
      speak('Opening mobile recharge');
      showFeedback('📱 Opening Recharge');
      onNavigate(`${basePath}/recharge`);
      return;
    }

    // Fallback
    speak(`I heard: ${text}. Try saying send 500 to someone, or open pay.`);
    showFeedback(`❓ "${text}"`);
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Voice not supported in this browser'); return; }
    if (recognitionRef.current) recognitionRef.current.stop();

    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = 'en-IN';

    r.onstart = () => { setListening(true); setTranscript(''); };
    r.onresult = (e) => {
      const text = e.results[0][0].transcript;
      processCommand(text);
    };
    r.onend = () => setListening(false);
    r.onerror = () => { setListening(false); };
    r.start();
    recognitionRef.current = r;
  };

  // Notify user mic is ready on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      toast('🎤 Tap the mic to speak commands', { icon: '✨', duration: 3000 });
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Feedback Bubble */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#0a1628] border border-saffron-500/30 rounded-2xl px-5 py-3 shadow-2xl shadow-black/50 text-center max-w-xs"
          >
            <p className="text-white font-semibold text-sm">{feedback}</p>
            {transcript && <p className="text-white/40 text-[11px] mt-1 italic">"{transcript}"</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Guide */}
      <AnimatePresence>
        {expanded && !listening && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-24 left-4 z-50 w-[220px] glass rounded-2xl border border-white/10 p-3 shadow-xl"
          >
            <p className="text-white/50 text-[9px] font-bold uppercase tracking-wider mb-2">Voice Commands</p>
            <div className="space-y-1 text-[11px]">
              <p className="text-white/60">💸 <span className="text-saffron-400">"Send 500 to rahul@ybl"</span></p>
              <p className="text-white/60">📂 <span className="text-saffron-400">"Open Pay"</span></p>
              <p className="text-white/60">💰 <span className="text-saffron-400">"Check balance"</span></p>
              <p className="text-white/60">🎯 <span className="text-saffron-400">"Open Goals"</span></p>
              <p className="text-white/60">📱 <span className="text-saffron-400">"Open Recharge"</span></p>
              <p className="text-white/60">📋 <span className="text-saffron-400">"Show History"</span></p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Mic Button — always visible, bottom-left */}
      <motion.button
        onClick={() => {
          if (listening) {
            if (recognitionRef.current) recognitionRef.current.stop();
          } else {
            startListening();
          }
        }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all ${
          listening
            ? 'bg-red-500 shadow-red-500/40 animate-pulse'
            : 'gradient-saffron shadow-saffron-500/40 hover:scale-110'
        }`}
        whileTap={{ scale: 0.9 }}
        aria-label="Voice assistant - tap to speak"
      >
        <span className="text-2xl text-white">{listening ? '⏹' : '🎤'}</span>
      </motion.button>
    </>
  );
}
