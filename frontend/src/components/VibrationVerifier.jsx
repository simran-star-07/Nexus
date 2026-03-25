import { useState, useRef, useEffect } from 'react';

export default function VibrationVerifier({ storedPattern, onResult, tolerance = 250 }) {
  const [recording, setRecording] = useState(false);
  const [captured, setCaptured] = useState([]);
  const [result, setResult] = useState(null);
  const [tapping, setTapping] = useState(false);
  const pressStart = useRef(null);

  // Preview stored pattern
  const stored = storedPattern || [];

  const compare = (incoming) => {
    if (!stored.length || stored.length !== incoming.length) return false;
    for (let i = 0; i < stored.length; i++) {
      if (stored[i].type !== incoming[i].type) return false;
      if (Math.abs(stored[i].duration - incoming[i].duration) > tolerance) return false;
    }
    return true;
  };

  const startRecording = () => { setCaptured([]); setResult(null); setRecording(true); };

  const handlePressStart = () => {
    if (!recording) return;
    pressStart.current = Date.now();
    setTapping(true);
  };

  const handlePressEnd = () => {
    if (!recording || !pressStart.current) return;
    const duration = Date.now() - pressStart.current;
    const type = duration > 300 ? 'long' : 'short';
    const newCaptured = [...captured, { duration, type }];
    setCaptured(newCaptured);
    pressStart.current = null;
    setTapping(false);
    // Auto verify when pattern length matches
    if (stored.length > 0 && newCaptured.length >= stored.length) {
      setRecording(false);
      const match = compare(newCaptured);
      setResult(match ? 'success' : 'fail');
      setTimeout(() => onResult(match), 800);
    }
  };

  return (
    <div className="text-center">
      <p className="text-white/60 text-sm mb-3">
        {recording ? `Tap your vibration pattern (${captured.length}/${stored.length} taps)` : 'Press Start to enter your vibration pattern'}
      </p>
      {/* Pattern preview */}
      {stored.length > 0 && (
        <div className="flex gap-2 justify-center mb-3">
          {stored.map((p, i) => (
            <div key={i} className={`h-3 rounded-full opacity-30 ${captured[i] ? 'opacity-100' : ''} ${p.type === 'long' ? 'w-10 bg-saffron-500' : 'w-3 bg-white'}`} />
          ))}
        </div>
      )}
      {/* Tap zone */}
      <div
        className={`tap-zone mx-auto mb-4 h-28 flex items-center justify-center select-none ${tapping ? 'tapping' : ''} ${result === 'success' ? 'border-green-500 bg-green-500/10' : result === 'fail' ? 'border-red-500 bg-red-500/10' : ''}`}
        style={{ touchAction: 'none' }}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onTouchStart={e => { e.preventDefault(); handlePressStart(); }}
        onTouchEnd={handlePressEnd}
      >
        <div className="pointer-events-none text-center">
          <div className="text-3xl mb-1">
            {result === 'success' ? '✅' : result === 'fail' ? '❌' : recording ? (tapping ? '✊' : '👆') : '📳'}
          </div>
          <p className="text-white/40 text-xs">
            {result === 'success' ? 'Pattern matched!' : result === 'fail' ? 'Pattern did not match' : recording ? 'Tap here' : ''}
          </p>
        </div>
      </div>
      {!recording && !result && (
        <button onClick={startRecording}
          className="px-6 py-2.5 gradient-saffron rounded-xl text-white font-semibold hover:opacity-90 transition-all">
          📳 Start Vibration Input
        </button>
      )}
      {result === 'fail' && (
        <button onClick={startRecording}
          className="mt-3 px-6 py-2.5 glass rounded-xl text-white/70 hover:bg-white/10 transition-all text-sm">
          Try Again
        </button>
      )}
    </div>
  );
}
