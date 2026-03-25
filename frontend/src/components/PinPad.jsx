import { useState } from 'react';

export default function PinPad({ onComplete, onCancel, title = 'Enter PIN' }) {
  const [pin, setPin] = useState('');

  const press = (char) => {
    if (char === 'C') { setPin(''); return; }
    if (char === '⌫') { setPin(p => p.slice(0, -1)); return; }
    if (pin.length >= 6) return;
    const newPin = pin + char;
    setPin(newPin);
    if (newPin.length === 6) setTimeout(() => onComplete(newPin), 100);
  };

  const KEYS = ['1','2','3','4','5','6','7','8','9','C','0','⌫'];

  return (
    <div className="text-center">
      <h3 className="text-white font-bold text-lg mb-6">{title}</h3>
      {/* Dots */}
      <div className="flex justify-center gap-3 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${i < pin.length ? 'bg-saffron-500 border-saffron-500 scale-110' : 'border-white/30 bg-transparent'}`} />
        ))}
      </div>
      {/* Keypad */}
      <div className="grid grid-cols-3 gap-4 max-w-[260px] mx-auto">
        {KEYS.map(k => (
          <button key={k} onClick={() => press(k)}
            className={`pin-btn text-white mx-auto transition-all ${k === 'C' ? 'text-red-400 text-sm font-bold' : k === '⌫' ? 'text-saffron-400' : ''}`}>
            {k}
          </button>
        ))}
      </div>
      {onCancel && (
        <button onClick={onCancel} className="mt-6 text-white/40 text-sm hover:text-white/60 transition-colors">
          Cancel
        </button>
      )}
    </div>
  );
}
