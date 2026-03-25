import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const REWARDS = [10, 20, 5, 50, 15, 30, 0, 25, 100, 10];
const LABELS = ['🎁 10 XP', '🎁 20 XP', '🎁 5 XP', '🎉 50 XP', '🎁 15 XP', '🎁 30 XP', '😢 Try Again', '🎁 25 XP', '💎 100 XP', '🎁 10 XP'];
const COLORS = ['#FF9933', '#003366', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#06b6d4', '#FFD700', '#FF9933'];

export default function SpinWheel({ onReward }) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [canSpin, setCanSpin] = useState(true);

  useEffect(() => {
    const lastSpin = localStorage.getItem('pb_last_spin');
    if (lastSpin === new Date().toDateString()) setCanSpin(false);
  }, []);

  const spin = () => {
    if (spinning || !canSpin) return;
    setSpinning(true);
    setResult(null);
    const winIndex = Math.floor(Math.random() * REWARDS.length);
    const spins = 5 + Math.random() * 3;
    const deg = spins * 360 + (winIndex * (360 / REWARDS.length));
    setRotation(prev => prev + deg);

    setTimeout(() => {
      setSpinning(false);
      const reward = REWARDS[winIndex];
      setResult({ xp: reward, label: LABELS[winIndex] });
      setCanSpin(false);
      localStorage.setItem('pb_last_spin', new Date().toDateString());
      if (reward > 0) {
        toast.success(`You won ${reward} XP! 🎉`);
        if (onReward) onReward(reward);
      } else {
        toast('Better luck tomorrow! 😢', { icon: '🎰' });
      }
    }, 4000);
  };

  return (
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="glass rounded-3xl p-6 border border-white/10 text-center">
      <h3 className="text-white font-bold text-lg mb-1">🎰 Daily Spin</h3>
      <p className="text-white/40 text-xs mb-4">Spin once daily to earn bonus XP!</p>
      
      <div className="relative w-48 h-48 mx-auto mb-4">
        {/* Pointer */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 text-2xl">▼</div>
        
        {/* Wheel */}
        <svg viewBox="0 0 200 200" className="w-full h-full" style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? 'transform 4s cubic-bezier(0.2, 0.8, 0.3, 1)' : 'none' }}>
          {REWARDS.map((_, i) => {
            const angle = (i * 360) / REWARDS.length;
            const rad = (angle * Math.PI) / 180;
            const nextRad = ((angle + 360 / REWARDS.length) * Math.PI) / 180;
            const x1 = 100 + 95 * Math.cos(rad);
            const y1 = 100 + 95 * Math.sin(rad);
            const x2 = 100 + 95 * Math.cos(nextRad);
            const y2 = 100 + 95 * Math.sin(nextRad);
            const midRad = (rad + nextRad) / 2;
            const tx = 100 + 60 * Math.cos(midRad);
            const ty = 100 + 60 * Math.sin(midRad);
            return (
              <g key={i}>
                <path d={`M100,100 L${x1},${y1} A95,95 0 0,1 ${x2},${y2} Z`} fill={COLORS[i]} stroke="#0a0e1a" strokeWidth="1" />
                <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="7" fontWeight="bold" transform={`rotate(${angle + 360/(REWARDS.length*2)}, ${tx}, ${ty})`}>
                  {REWARDS[i] || '💔'}
                </text>
              </g>
            );
          })}
          <circle cx="100" cy="100" r="18" fill="#0a0e1a" stroke="#FF9933" strokeWidth="2" />
          <text x="100" y="100" textAnchor="middle" dominantBaseline="middle" fill="#FF9933" fontSize="10" fontWeight="bold">SPIN</text>
        </svg>
      </div>

      {result && (
        <motion.div initial={{scale:0}} animate={{scale:1}} className={`mb-3 px-4 py-2 rounded-xl inline-block font-bold text-sm ${result.xp > 0 ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-white/40 border border-white/10'}`}>
          {result.label}
        </motion.div>
      )}

      <button onClick={spin} disabled={spinning || !canSpin}
        className={`w-full py-3 rounded-xl font-bold text-lg transition-all ${canSpin && !spinning ? 'gradient-saffron text-white hover:opacity-90 shadow-lg shadow-saffron-500/30' : 'bg-white/5 text-white/30 cursor-not-allowed'}`}>
        {spinning ? '🎰 Spinning...' : !canSpin ? '✓ Come back tomorrow!' : 'Spin the Wheel! 🎰'}
      </button>
    </motion.div>
  );
}
