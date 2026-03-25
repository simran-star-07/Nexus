import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function GestureUnlock({ onUnlock, onCancel }) {
  const [method, setMethod] = useState('both'); // camera, voice, both
  const [cameraActive, setCameraActive] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [status, setStatus] = useState('Initializing sensors...');
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const recognitionRef = useRef(null);
  const requestRef = useRef(null);
  const lastFrameRef = useRef(null);

  // --- Voice Logic ---
  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError('Voice recognition not supported');
      return;
    }
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-IN';

    r.onstart = () => { setVoiceActive(true); setStatus('Listening for "Unlock PayBridge"...'); };
    r.onresult = (e) => {
      const t = Array.from(e.results).map(res => res[0].transcript).join('').toLowerCase();
      if (t.includes('unlock') || t.includes('open paybridge') || t.includes('bridge')) {
        r.stop();
        toast.success('Voice Unlock Successful!');
        onUnlock();
      }
    };
    r.onerror = () => setVoiceActive(false);
    r.onend = () => { if (voiceActive) r.start(); }; // Restart if still active
    r.start();
    recognitionRef.current = r;
  };

  // --- Camera Logic ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        requestRef.current = requestAnimationFrame(detectMotion);
      }
    } catch (err) {
      setError('Camera access denied');
    }
  };

  const detectMotion = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(videoRef.current, 0, 0, 160, 120);
    const frame = ctx.getImageData(0, 0, 160, 120);
    const data = frame.data;

    if (lastFrameRef.current) {
      let diff = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = Math.abs(data[i] - lastFrameRef.current[i]);
        const g = Math.abs(data[i + 1] - lastFrameRef.current[i + 1]);
        const b = Math.abs(data[i + 2] - lastFrameRef.current[i + 2]);
        if (r + g + b > 100) diff++;
      }
      // If > 10% of pixels changed significantly, it's a wave
      if (diff > (160 * 120 * 0.15)) {
        setStatus('Motion Detected!');
        setTimeout(() => {
          stopAll();
          onUnlock();
        }, 800);
        return;
      }
    }
    lastFrameRef.current = data;
    requestRef.current = requestAnimationFrame(detectMotion);
  };

  const stopAll = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }
  };

  useEffect(() => {
    startCamera();
    startVoice();
    return stopAll;
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        className="glass rounded-3xl p-8 max-w-md w-full text-center space-y-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 gradient-saffron animate-shimmer" />
        
        <h2 className="text-2xl font-bold text-white mb-2">Assistive Unlock</h2>
        <p className="text-white/60 text-sm">Wave your hand at the camera or say "Unlock PayBridge" to enter.</p>

        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/10 group">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          <canvas ref={canvasRef} width="160" height="120" className="hidden" />
          
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className={`w-16 h-16 rounded-full border-4 border-dashed animate-spin flex items-center justify-center mb-4 ${status.includes('Detected') ? 'border-green-500' : 'border-saffron-500/50'}`}>
               <span className="text-3xl text-saffron-500 font-bold rotate-[-45deg] animate-pulse">✋</span>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex justify-between">
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider ${cameraActive ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
              CAMERA: {cameraActive ? 'ON' : 'OFF'}
            </div>
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider ${voiceActive ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
              VOICE: {voiceActive ? 'LISTENING' : 'OFF'}
            </div>
          </div>
        </div>

        <div className="py-2">
          <p className="text-saffron-500 font-bold animate-pulse" aria-live="polite">
            {error || status}
          </p>
        </div>

        <button onClick={() => { stopAll(); onCancel(); }} className="w-full py-3 text-white/40 hover:text-white transition-colors">
          Cancel & Use Password →
        </button>
      </motion.div>
    </div>
  );
}
