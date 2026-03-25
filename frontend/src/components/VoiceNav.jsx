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

export default function VoiceNav({ basePath, navItems, onNavigate, onClose }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [matched, setMatched] = useState('');
  const recognitionRef = useRef(null);

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Voice not supported'); return; }
    if (recognitionRef.current) recognitionRef.current.stop();

    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-IN';

    r.onstart = () => { setListening(true); speak('Voice navigation active. Say open followed by the page name.'); };
    r.onresult = (e) => {
      const text = Array.from(e.results).map(res => res[0].transcript).join('').toLowerCase();
      setTranscript(text);

      // Match "open [page]" pattern
      for (const item of navItems) {
        const names = [item.label.toLowerCase(), ...(item.aliases || [])];
        for (const name of names) {
          if (text.includes(`open ${name}`) || text.includes(`go to ${name}`) || text.includes(`navigate to ${name}`) || text.includes(`show ${name}`)) {
            setMatched(item.label);
            speak(`Opening ${item.label}`);
            onNavigate(`${basePath}/${item.path}`.replace(/\/\/$/, '/'));
            // Reset after navigation
            setTimeout(() => { setTranscript(''); setMatched(''); }, 2000);
            return;
          }
        }
      }
    };
    r.onend = () => { if (listening) r.start(); }; // Auto-restart
    r.onerror = () => { setListening(false); };
    r.start();
    recognitionRef.current = r;
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }
    setListening(false);
  };

  useEffect(() => {
    startListening();
    return () => stopListening();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-20 left-4 z-50 w-[260px]"
    >
      <div className="glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-indigo-500/10">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎤</span>
            <span className="text-white font-bold text-xs">Voice Nav</span>
          </div>
          <button onClick={() => { stopListening(); onClose(); }} className="text-white/40 hover:text-white text-sm">✕</button>
        </div>

        {/* Status */}
        <div className="p-4 text-center">
          <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${listening ? 'bg-red-500/20 border-2 border-red-500 animate-pulse' : 'bg-white/10 border-2 border-white/20'}`}>
            <span className="text-3xl">🎤</span>
          </div>
          <p className="text-white font-semibold text-sm mb-1">{listening ? 'Listening...' : 'Starting...'}</p>
          
          {transcript && (
            <p className="text-white/50 text-xs italic mb-2 truncate">"{transcript}"</p>
          )}
          
          {matched && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-green-500/20 rounded-lg px-3 py-1.5 text-green-400 text-xs font-bold border border-green-500/30 mb-2">
              ✓ Opening {matched}
            </motion.div>
          )}
        </div>

        {/* Commands Guide */}
        <div className="px-3 pb-3 space-y-1">
          <p className="text-white/30 text-[9px] font-bold uppercase tracking-wider">Say any of:</p>
          <div className="grid grid-cols-2 gap-1">
            {navItems.slice(0, 6).map(item => (
              <div key={item.path} className="text-[10px] text-white/40 bg-white/3 rounded px-2 py-1">
                "Open <span className="text-indigo-400">{item.label}</span>"
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
