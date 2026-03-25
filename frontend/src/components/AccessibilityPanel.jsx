import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export default function AccessibilityPanel() {
  const { t, i18n } = useTranslation();
  const [show, setShow] = useState(false);
  const [scale, setScale] = useState(() => Number(localStorage.getItem('pb_font_scale')) || 1);
  const [tts, setTTS] = useState(() => localStorage.getItem('pb_tts') === 'true');

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', scale);
    localStorage.setItem('pb_font_scale', scale);
  }, [scale]);

  useEffect(() => {
    localStorage.setItem('pb_tts', tts);
  }, [tts]);

  const speak = (text) => {
    if (!tts) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = i18n.language === 'hi' ? 'hi-IN' : 'en-IN';
    window.speechSynthesis.speak(utterance);
  };

  const toggleLanguage = () => {
    const next = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(next);
    toast.success(next === 'hi' ? 'भाषा बदली गई: हिंदी' : 'Language changed: English');
    speak(next === 'hi' ? 'भाषा बदली गई' : 'Language changed');
  };

  return (
    <div className="relative">
      <button onClick={() => setShow(s => !s)} className="p-2 rounded-lg glass border border-white/10 hover:border-saffron-500/30 transition-all" title={t('accessibility')}>
        <span className="text-lg">♿</span>
      </button>

      <AnimatePresence>
        {show && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute right-0 top-12 w-64 glass rounded-2xl border border-white/10 p-4 z-50 shadow-2xl space-y-4">
            
            <div className="flex justify-between items-center">
              <span className="text-white font-bold text-sm">{t('accessibility')}</span>
              <button onClick={() => setShow(false)} className="text-white/30 hover:text-white">✕</button>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-white/50 font-bold uppercase tracking-wider">
                <span>{t('font_size')}</span>
                <span>{Math.round(scale * 100)}%</span>
              </div>
              <input type="range" min="0.8" max="1.5" step="0.1" value={scale} onChange={e => setScale(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-saffron-500" />
            </div>

            {/* TTS */}
            <div className="flex justify-between items-center">
              <span className="text-white/70 text-sm font-medium">{t('voice_enabled')}</span>
              <button onClick={() => { setTTS(!tts); speak(!tts ? 'वॉइस फीडबैक ऑन' : 'Voice off'); }}
                className={`w-10 h-5 rounded-full transition-all relative ${tts ? 'bg-saffron-500' : 'bg-white/10'}`}>
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${tts ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            {/* Language */}
            <div className="flex justify-between items-center">
              <span className="text-white/70 text-sm font-medium">{t('language')}</span>
              <button onClick={toggleLanguage} className="text-xs font-bold text-saffron-500 hover:underline uppercase">
                {i18n.language === 'en' ? 'हिन्दी' : 'English'}
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
