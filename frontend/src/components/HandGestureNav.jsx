import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

// Finger-to-page mapping
const FINGER_MAP = [
  { fingers: 1, label: 'home', icon: '🏠', path: '' },
  { fingers: 2, label: 'pay', icon: '💸', path: 'pay' },
  { fingers: 3, label: 'recharge', icon: '📱', path: 'recharge' },
  { fingers: 4, label: 'history', icon: '📋', path: 'history' },
  { fingers: 5, label: 'profile', icon: '👤', path: 'profile' },
];

// Voice helper
const speak = (text) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-IN'; u.rate = 1; u.pitch = 1;
    window.speechSynthesis.speak(u);
  }
};

function countFingers(landmarks) {
  // MediaPipe hand landmarks: 21 points
  // Tip IDs: thumb=4, index=8, middle=12, ring=16, pinky=20
  // Base IDs: thumb=2, index=6, middle=10, ring=14, pinky=18
  if (!landmarks || landmarks.length < 21) return 0;

  let count = 0;

  // Thumb: compare x of tip vs IP joint (works for right hand facing camera)
  // Use absolute distance from wrist to determine hand orientation
  const thumbTip = landmarks[4];
  const thumbIP = landmarks[3];
  const wrist = landmarks[0];
  const indexMCP = landmarks[5];
  
  // Determine if it's a left or right hand based on thumb position relative to pinky
  const isRightHand = landmarks[17].x < landmarks[5].x;
  
  if (isRightHand) {
    if (thumbTip.x < thumbIP.x) count++;
  } else {
    if (thumbTip.x > thumbIP.x) count++;
  }

  // Other fingers: tip.y < pip.y means extended (y increases downward in screen coords)
  const fingerTips = [8, 12, 16, 20];
  const fingerPIPs = [6, 10, 14, 18];
  for (let i = 0; i < 4; i++) {
    if (landmarks[fingerTips[i]].y < landmarks[fingerPIPs[i]].y) count++;
  }

  return count;
}

export default function HandGestureNav({ basePath, onNavigate, onClose }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [active, setActive] = useState(false);
  const [fingerCount, setFingerCount] = useState(0);
  const [currentPage, setCurrentPage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const stableCountRef = useRef(0);
  const stableFramesRef = useRef(0);
  const lastNavRef = useRef('');
  const animFrameRef = useRef(null);

  const handleResults = useCallback((results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      // Draw hand skeleton
      ctx.strokeStyle = '#FF9933';
      ctx.lineWidth = 2;
      const connections = [
        [0,1],[1,2],[2,3],[3,4],
        [0,5],[5,6],[6,7],[7,8],
        [0,9],[9,10],[10,11],[11,12],
        [0,13],[13,14],[14,15],[15,16],
        [0,17],[17,18],[18,19],[19,20],
        [5,9],[9,13],[13,17]
      ];
      connections.forEach(([a,b]) => {
        ctx.beginPath();
        ctx.moveTo(landmarks[a].x * canvas.width, landmarks[a].y * canvas.height);
        ctx.lineTo(landmarks[b].x * canvas.width, landmarks[b].y * canvas.height);
        ctx.stroke();
      });

      // Draw landmarks
      landmarks.forEach((lm, i) => {
        ctx.beginPath();
        ctx.arc(lm.x * canvas.width, lm.y * canvas.height, [4,8,12,16,20].includes(i) ? 6 : 3, 0, 2 * Math.PI);
        ctx.fillStyle = [4,8,12,16,20].includes(i) ? '#FF9933' : '#fff';
        ctx.fill();
      });

      const count = countFingers(landmarks);
      setFingerCount(count);

      // Stability check: navigate only after same count for 15 frames (~0.5s)
      if (count === stableCountRef.current) {
        stableFramesRef.current++;
      } else {
        stableCountRef.current = count;
        stableFramesRef.current = 0;
      }

      if (stableFramesRef.current === 15 && count >= 1 && count <= 5) {
        const target = FINGER_MAP.find(f => f.fingers === count);
          lastNavRef.current = target.path;
          setCurrentPage(target.label);
          speak(`Navigating to ${target.label}`);
          const fullPath = `${basePath}/${target.path}`.replace(/\/+/g, '/');
          onNavigate(fullPath);
      }
    }
  }, [basePath, onNavigate]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Load MediaPipe Hands from CDN
        const script1 = document.createElement('script');
        script1.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
        script1.crossOrigin = 'anonymous';
        document.head.appendChild(script1);

        const script2 = document.createElement('script');
        script2.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
        script2.crossOrigin = 'anonymous';
        document.head.appendChild(script2);

        // Wait for scripts to load
        await new Promise((resolve) => {
          let loaded = 0;
          const check = () => { loaded++; if (loaded === 2) resolve(); };
          script1.onload = check;
          script2.onload = check;
          script1.onerror = () => { setError('Failed to load gesture library'); };
          script2.onerror = () => { setError('Failed to load camera library'); };
        });

        if (!mounted) return;

        const hands = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });

        hands.onResults(handleResults);
        handsRef.current = hands;

        // Get camera
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Frame loop
        const processFrame = async () => {
          if (videoRef.current && handsRef.current && mounted) {
            try {
              await handsRef.current.send({ image: videoRef.current });
            } catch (e) {}
            animFrameRef.current = requestAnimationFrame(processFrame);
          }
        };

        setLoading(false);
        setActive(true);
        processFrame();

      } catch (err) {
        setError('Camera access denied or gesture library failed to load');
        setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, [handleResults]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-20 right-4 z-50 w-[280px]"
    >
      <div className="glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-saffron-500/10">
          <div className="flex items-center gap-2">
            <span className="text-lg">✋</span>
            <span className="text-white font-bold text-xs">Gesture Nav</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-sm">✕</button>
        </div>

        {/* Camera Feed */}
        <div className="relative aspect-[4/3] bg-black/60">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-60" playsInline muted />
          <canvas ref={canvasRef} width="320" height="240" className="absolute inset-0 w-full h-full scale-x-[-1]" />
          
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-saffron-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <p className="text-red-400 text-xs text-center">{error}</p>
            </div>
          )}

          {/* Finger count overlay */}
          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-3 py-1 rounded-full">
            <span className="text-saffron-500 font-bold text-lg">{fingerCount}</span>
            <span className="text-white/50 text-[10px] ml-1">fingers</span>
          </div>

          {currentPage && (
            <div className="absolute bottom-2 left-2 right-2 bg-saffron-500/20 backdrop-blur rounded-lg px-3 py-1.5 text-center">
              <p className="text-saffron-500 font-bold text-xs">{currentPage}</p>
            </div>
          )}
        </div>

        {/* Finger Guide */}
        <div className="p-3 space-y-1.5">
          <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider">Finger Guide</p>
          <div className="grid grid-cols-5 gap-1">
            {FINGER_MAP.map(f => (
              <div key={f.fingers} className={`text-center p-1 rounded-lg text-[9px] ${fingerCount === f.fingers ? 'bg-saffron-500/20 text-saffron-500 border border-saffron-500/30' : 'text-white/40'}`}>
                <div className="text-sm">{f.icon}</div>
                <div className="truncate">{t(f.label)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
