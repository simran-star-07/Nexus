import { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import PinPad from '../../components/PinPad';
import VibrationVerifier from '../../components/VibrationVerifier';
import { startAuthentication } from '@simplewebauthn/browser';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Confetti from 'react-confetti';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import HandGestureNav from '../../components/HandGestureNav';
import BankChatbot from '../../components/BankChatbot';
import VoiceNav from '../../components/VoiceNav';
import AlwaysOnMic from '../../components/AlwaysOnMic';
import NotificationBell from '../../components/NotificationBell';
import SpinWheel from '../../components/SpinWheel';
import BudgetPlanner from '../../components/BudgetPlanner';
import SplitBill from '../../components/SplitBill';
import SessionTimeout from '../../components/SessionTimeout';
import ThemeToggle from '../../components/ThemeToggle';
import AccessibilityPanel from '../../components/AccessibilityPanel';
import Academy from '../../components/Academy';
import CelebrationOverlay from '../../components/CelebrationOverlay';

const COLORS = { food:'#FF9933', transport:'#003366', shopping:'#FFD700', education:'#22c55e', others:'#8b5cf6', wallet_load:'#06b6d4', goal:'#ec4899', allowance:'#f59e0b', recharge:'#10b981', transfer:'#6366f1', rewards:'#f97316', investment:'#14b8a6', bills:'#8b5cf6' };
const LEVELS = [
  { name:'Beginner Spender', min:0, emoji:'🌱' },
  { name:'Smart Saver', min:200, emoji:'💡' },
  { name:'Money Master', min:500, emoji:'👑' },
  { name:'Finance Hero', min:1000, emoji:'🦸' }
];

const NAV = [
  { path:'', label: 'home', icon: '🏠' },
  { path:'pay', label: 'pay', icon: '💸' },
  { path:'recharge', label: 'recharge', icon: '📱' },
  { path:'tickets', label: 'tickets', icon: '🎫' },
  { path:'goals', label: 'goals', icon: '🎯' },
  { path:'history', label: 'history', icon: '📋' },
  { path:'insights', label: 'insights', icon: '📊' },
  { path:'profile', label: 'profile', icon: '👤' },
];

// ======= AUTH MODAL =======
function AuthModal({ show, info, user, onDone, onCancel }) {
  const [step, setStep] = useState('choose');
  if (!show) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4">
        <motion.div initial={{y:100}} animate={{y:0}} exit={{y:100}} className="glass rounded-3xl p-6 w-full max-w-sm border border-white/10">
          {step === 'choose' ? (
            <div className="text-center">
              <h3 className="text-white font-bold text-lg mb-2">Confirm {info}</h3>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button onClick={() => setStep('pin')} className="p-4 glass rounded-2xl border border-white/10 hover:border-saffron-500/40 transition-all text-center">
                  <div className="text-3xl mb-2">🔢</div><p className="text-white font-semibold text-sm">PIN</p>
                </button>
                <button onClick={() => setStep('vibration')} className="p-4 glass rounded-2xl border border-white/10 hover:border-saffron-500/40 transition-all text-center">
                  <div className="text-3xl mb-2">📳</div><p className="text-white font-semibold text-sm">Vibration</p>
                </button>
                <button onClick={async () => {
                  try {
                    const { data: options } = await api.post('/auth/webauthn/login-options', { email: user.email });
                    const attResp = await startAuthentication(options);
                    onDone('fingerprint', attResp);
                  } catch (err) { toast.error('Fingerprint failed'); }
                }} className="p-4 glass rounded-2xl border border-white/10 hover:border-saffron-500/40 transition-all text-center col-span-2">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl">☝️</span>
                    <p className="text-white font-semibold text-sm">Fingerprint</p>
                  </div>
                </button>
              </div>
              <button onClick={onCancel} className="mt-4 text-white/40 text-sm w-full">Cancel</button>
            </div>
          ) : step === 'pin' ? (
            <PinPad onComplete={pin => onDone('pin', pin)} onCancel={() => setStep('choose')} title="Enter 6-digit PIN" />
          ) : (
            <div>
              <h3 className="text-white font-bold text-lg mb-4 text-center">Vibration Pattern</h3>
              <VibrationVerifier storedPattern={user?.vibrationPattern||[]} onResult={match => {
                if (match) onDone('vibration', user?.vibrationPattern||[]);
                else { toast.error('Pattern mismatch!'); setStep('choose'); }
              }} />
              <button onClick={() => setStep('choose')} className="mt-4 text-white/40 text-sm w-full text-center">← Back</button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ======= WALLET CARD =======
function WalletCard({ user }) {
  const currentLevel = LEVELS.slice().reverse().find(l => (user?.xpPoints||0) >= l.min) || LEVELS[0];
  const nextLevel = LEVELS[LEVELS.indexOf(currentLevel)+1];
  const pct = nextLevel ? Math.min(100, ((user?.xpPoints||0)-currentLevel.min)/(nextLevel.min-currentLevel.min)*100) : 100;
  return (
    <div className="mb-6">
      <div className="gradient-saffron rounded-3xl p-6 relative overflow-hidden shadow-2xl shadow-saffron-500/30">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full translate-y-8 -translate-x-8" />
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-wider">PayBridge Wallet</p>
              <p className="text-white font-bold text-xl truncate max-w-[200px]">{user?.name}</p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white">{currentLevel.emoji} {currentLevel.name}</div>
            </div>
          </div>
          <p className="text-white/60 text-xs mb-1">AVAILABLE BALANCE</p>
          <p className="text-white font-bold text-4xl font-display">₹{(user?.walletBalance||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div><p className="text-white/50 text-xs">XP</p><p className="text-white font-bold text-sm">{user?.xpPoints||0}</p></div>
            <div><p className="text-white/50 text-xs">Rewards</p><p className="text-white font-bold text-sm">🪙 {user?.rewardsPoints||0}</p></div>
            <div><p className="text-white/50 text-xs">Streak</p><p className="text-white font-bold text-sm">🔥 {user?.streakCount||0}d</p></div>
          </div>
          {nextLevel && (
            <div className="mt-3">
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <motion.div className="h-full bg-white rounded-full" initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:1}} />
              </div>
              <p className="text-white/40 text-xs mt-1">{nextLevel.min-(user?.xpPoints||0)} XP to {nextLevel.name}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ======= DAILY LIMIT BAR =======
function DailyLimitBar({ dailyLimit, dailySpent }) {
  if (!dailyLimit || dailyLimit <= 0) return null;
  const pct = Math.min(100,(dailySpent/dailyLimit)*100);
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className={`glass rounded-2xl p-4 border mb-4 ${pct>=100?'border-red-500/40 bg-red-500/5':pct>=80?'border-amber-500/40 bg-amber-500/5':'border-white/10'}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-white text-sm font-semibold">Daily Limit</span>
        <span className={`text-sm font-bold ${pct>=100?'text-red-400':pct>=80?'text-amber-400':'text-green-400'}`}>₹{dailySpent} / ₹{dailyLimit}</span>
      </div>
      <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div className={`h-full ${color} rounded-full`} initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.8}} />
      </div>
      {pct >= 100 && <p className="text-red-400 text-xs mt-2 font-semibold animate-pulse">🚫 Daily limit reached! Payments blocked.</p>}
      {pct >= 80 && pct < 100 && <p className="text-amber-400 text-xs mt-2 font-semibold">⚠️ Warning: Daily limit almost reached!</p>}
    </div>
  );
}

// ======= PAYMENT FLOW =======
function PaymentFlow({ user, onSuccess, voiceIntent, onVoiceIntentUsed }) {
  const [tab, setTab] = useState('upi');
  const [form, setForm] = useState({ upiId:'', merchant:'', amount:'', category:'others', mobile:'' });
  const [authModal, setAuthModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');

  // Auto-fill from voice intent (from AlwaysOnMic)
  useEffect(() => {
    if (voiceIntent) {
      setForm(p => ({ ...p, amount: voiceIntent.amount || '', upiId: voiceIntent.to || '', merchant: voiceIntent.to || '' }));
      toast.success(`🎤 Voice: ₹${voiceIntent.amount} to ${voiceIntent.to}`);
      if (onVoiceIntentUsed) onVoiceIntentUsed();
    }
  }, [voiceIntent]);

  const parseVoice = (text) => {
    const t = text.toLowerCase();
    const amtMatch = t.match(/(\d+)/); const amt = amtMatch?amtMatch[1]:'';
    const toMatch = t.match(/to\s+(\S+)/i); const to = toMatch?toMatch[1]:'';
    if ((t.includes('send')||t.includes('pay')) && amt) {
      setForm(p=>({...p, amount:amt, upiId:to, merchant:to}));
      toast.success(`Voice: ₹${amt} to ${to||'unknown'}`);
    } else if (t.includes('balance')) toast.success(`Balance: ₹${user?.walletBalance?.toFixed(2)}`);
    else if (t.includes('recharge')) toast.success('Navigate to Recharge tab');
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
    if (!SR) return toast.error('Voice not supported');
    if (recognitionRef.current) recognitionRef.current.stop();
    const r = new SR(); r.continuous = false; r.lang = 'en-IN';
    r.onstart = () => setListening(true);
    r.onresult = e => { const t = e.results[0][0].transcript; setVoiceText(t); parseVoice(t); };
    r.onend = () => setListening(false);
    r.onerror = () => { setListening(false); toast.error('Voice error'); };
    r.start(); recognitionRef.current = r;
  };

  const initPay = () => {
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Enter amount');
    if (tab === 'phone' && !form.mobile) return toast.error('Enter mobile number');
    if (tab !== 'phone' && !form.upiId && !form.merchant) return toast.error('Enter UPI ID or merchant');
    setAuthModal(true);
  };

  const confirmPay = async (method, cred) => {
    setLoading(true);
    try {
      if (tab === 'phone') {
        const { data } = await api.post('/payment/send-to-phone', {
          mobile: form.mobile, amount: Number(form.amount), authMethod: method,
          ...(method==='pin'?{pin:cred}:{vibrationPattern:cred})
        });
        toast.success(data.message);
        onSuccess({walletBalance:data.walletBalance});
      } else {
        const { data } = await api.post('/payment/pay', {
          amount: Number(form.amount), upiId: form.upiId, merchant: form.merchant||form.upiId,
          category: form.category, authMethod: method,
          ...(method === 'pin' ? { pin: cred } : method === 'vibration' ? { vibrationPattern: cred } : { webauthnResponse: cred })
        });
        toast.success('Payment successful! 🎉');
        onSuccess(data);
      }
      setAuthModal(false);
      setForm({upiId:'',merchant:'',amount:'',category:'others',mobile:''});
    } catch(err) {
      toast.error(err.response?.data?.message||'Payment failed');
      if (err.response?.data?.blocked) {
        if (err.response?.data?.appName) toast.error(`🚫 Restricted: ${err.response.data.appName}`);
      }
    } finally { setLoading(false); setAuthModal(false); }
  };

  const CATS = ['food','transport','shopping','education','others'];
  const TABS = [{key:'upi',label:'📱 UPI'},{key:'phone',label:'📞 Phone'},{key:'qr',label:'📷 QR'},{key:'voice',label:'🎤 Voice'}];

  return (
    <div>
      <div className="glass rounded-3xl border border-white/10 overflow-hidden">
        <div className="flex border-b border-white/10">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-semibold transition-all ${tab===t.key?'bg-saffron-500/10 text-saffron-500 border-b-2 border-saffron-500':'text-white/50 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {tab === 'upi' && (
            <div className="space-y-4">
              <input placeholder="UPI ID (e.g. rahul@ybl)" value={form.upiId} onChange={e=>setForm(p=>({...p,upiId:e.target.value}))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/50" />
              <input placeholder="Merchant name" value={form.merchant} onChange={e=>setForm(p=>({...p,merchant:e.target.value}))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/50" />
              <input type="number" placeholder="Amount (₹)" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/50" />
              <div className="flex gap-2 flex-wrap">
                {CATS.map(c => (
                  <button key={c} onClick={() => setForm(p=>({...p,category:c}))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border ${form.category===c?'border-saffron-500 text-saffron-500 bg-saffron-500/10':'border-white/10 text-white/50'}`}>{c}
                  </button>
                ))}
              </div>
              <button onClick={initPay} className="w-full gradient-saffron py-4 rounded-xl text-white font-bold text-lg hover:opacity-90 shadow-lg shadow-saffron-500/30">Pay Now →</button>
            </div>
          )}
          {tab === 'phone' && (
            <div className="space-y-4">
              <input placeholder="Recipient mobile number" value={form.mobile} onChange={e=>setForm(p=>({...p,mobile:e.target.value}))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/50" />
              <input type="number" placeholder="Amount (₹)" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/50" />
              <button onClick={initPay} className="w-full gradient-saffron py-4 rounded-xl text-white font-bold text-lg hover:opacity-90 shadow-lg shadow-saffron-500/30">Send →</button>
            </div>
          )}
          {tab === 'qr' && (
            <div className="space-y-4">
              <div className="flex gap-2 mb-3">
                <button onClick={() => setForm(p=>({...p,qrMode:'show'}))} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${(form.qrMode||'show')==='show'?'gradient-saffron text-white':'glass text-white/50 border border-white/10'}`}>Show My QR</button>
                <button onClick={() => setForm(p=>({...p,qrMode:'scan'}))} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${form.qrMode==='scan'?'gradient-saffron text-white':'glass text-white/50 border border-white/10'}`}>Scan & Pay</button>
              </div>
              {(form.qrMode||'show') === 'show' ? (
                <div className="text-center">
                  <div className="bg-white rounded-2xl p-4 inline-block mb-3">
                    <QRCodeSVG value={`upi://pay?pa=${user?.upiId||user?.email}&pn=${user?.name}&cu=INR`} size={180} level="H" />
                  </div>
                  <p className="text-white font-semibold text-sm">{user?.name}</p>
                  <p className="text-saffron-500 text-xs">{user?.upiId || user?.email}</p>
                  <p className="text-white/30 text-[10px] mt-2">Others can scan this to pay you</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-white/50 text-sm text-center">Enter the UPI ID from the scanned QR</p>
                  <input placeholder="UPI ID from QR" value={form.upiId} onChange={e=>setForm(p=>({...p,upiId:e.target.value,merchant:e.target.value}))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/50" />
                  <input type="number" placeholder="Amount (₹)" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/50" />
                  <button onClick={initPay} className="w-full gradient-saffron py-3 rounded-xl text-white font-bold">Pay via QR →</button>
                </div>
              )}
            </div>
          )}
          {tab === 'voice' && (
            <div className="text-center py-4">
              <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center cursor-pointer ${listening?'bg-red-500/20 border-4 border-red-500 animate-pulse':'gradient-saffron'} shadow-xl`} onClick={startVoice}>
                <span className="text-4xl">🎤</span>
              </div>
              <p className="text-white font-semibold mb-2">{listening?'Listening...':'Tap mic to speak'}</p>
              {voiceText && <p className="text-saffron-500 italic mb-4">"{voiceText}"</p>}
              <div className="text-white/40 text-xs space-y-1">
                <p>Try: "Send 100 rupees to Rahul"</p>
                <p>Or: "Check my balance"</p>
              </div>
              {form.amount && (
                <div className="mt-4 glass rounded-xl p-4 border border-saffron-500/20">
                  <p className="text-white text-sm">₹{form.amount} to {form.upiId||'unknown'}</p>
                  <button onClick={initPay} className="mt-3 w-full gradient-saffron py-2.5 rounded-xl text-white font-semibold text-sm">Confirm & Pay</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Request Money */}
      <RequestMoney />
      <AuthModal show={authModal} info={`₹${form.amount}`} user={user} onDone={confirmPay} onCancel={() => setAuthModal(false)} />
    </div>
  );
}

// ======= REQUEST MONEY =======
function RequestMoney() {
  const [show, setShow] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('other');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!amount) return toast.error('Enter amount');
    setLoading(true);
    try {
      await api.post('/parental/money-request', { amount: Number(amount), reason, note });
      toast.success('Request sent to parent!');
      setShow(false); setAmount(''); setNote('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="mt-6">
      <button onClick={() => setShow(s=>!s)} className="w-full glass rounded-2xl p-4 border border-white/10 hover:border-saffron-500/30 transition-all text-center">
        <span className="text-2xl">🙋</span>
        <p className="text-white font-semibold mt-1">Request Money from Parent</p>
      </button>
      <AnimatePresence>
        {show && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="mt-3 glass rounded-2xl p-5 border border-white/10 space-y-3">
            <input type="number" placeholder="Amount (₹)" value={amount} onChange={e=>setAmount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/50" />
            <select value={reason} onChange={e=>setReason(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-saffron-500/50">
              <option value="school_supplies">📚 School Supplies</option>
              <option value="food">🍔 Food</option>
              <option value="transport">🚌 Transport</option>
              <option value="emergency">🚨 Emergency</option>
              <option value="other">🏷️ Other</option>
            </select>
            <input placeholder="Short note (optional)" value={note} onChange={e=>setNote(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/50" />
            <button onClick={send} disabled={loading} className="w-full gradient-saffron py-3 rounded-xl text-white font-bold disabled:opacity-50">
              {loading ? 'Sending...' : 'Send Request'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ======= MOBILE RECHARGE =======
function RechargePanel({ user, onSuccess }) {
  const [operator, setOperator] = useState('');
  const [mobile, setMobile] = useState('');
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [authModal, setAuthModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchPlans = async (op) => {
    setOperator(op); setSelectedPlan(null);
    try { const { data } = await api.get(`/recharge/plans/${op}`); setPlans(data.plans); }
    catch { toast.error('Failed to fetch plans'); }
  };

  const confirmRecharge = async (method, cred) => {
    setLoading(true);
    try {
      const { data } = await api.post('/recharge/recharge', {
        operator, mobileNumber: mobile, planId: selectedPlan.id,
        authMethod: method, 
        ...(method === 'pin' ? { pin: cred } : method === 'vibration' ? { vibrationPattern: cred } : { webauthnResponse: cred })
      });
      toast.success(data.message);
      onSuccess({ walletBalance: data.walletBalance });
      setAuthModal(false); setSelectedPlan(null);
    } catch (err) { toast.error(err.response?.data?.message||'Failed'); }
    finally { setLoading(false); setAuthModal(false); }
  };

  const OPS = [{id:'jio',name:'Jio',color:'#0a3d94'},{id:'airtel',name:'Airtel',color:'#ed1c24'},{id:'vi',name:'Vi',color:'#e50067'},{id:'bsnl',name:'BSNL',color:'#003399'}];

  return (
    <div className="space-y-4">
      <h2 className="text-white font-bold text-xl">📱 Mobile Recharge</h2>
      <input placeholder="Mobile number" value={mobile} onChange={e=>setMobile(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/50" />
      <div className="grid grid-cols-4 gap-3">
        {OPS.map(op => (
          <button key={op.id} onClick={() => fetchPlans(op.id)}
            className={`p-3 rounded-xl border text-center transition-all ${operator===op.id?'border-saffron-500 bg-saffron-500/10':'border-white/10 glass hover:border-white/20'}`}>
            <p className="text-white font-bold text-sm">{op.name}</p>
          </button>
        ))}
      </div>
      {plans.length > 0 && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {plans.map(p => (
            <button key={p.id} onClick={() => setSelectedPlan(p)}
              className={`w-full p-4 rounded-xl border text-left transition-all ${selectedPlan?.id===p.id?'border-saffron-500 bg-saffron-500/10':'border-white/10 glass'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-white font-bold">₹{p.amount}</p>
                  <p className="text-white/50 text-xs">{p.data} · {p.validity} · {p.calls}</p>
                </div>
                {selectedPlan?.id===p.id && <span className="text-saffron-500 text-xl">✓</span>}
              </div>
            </button>
          ))}
        </div>
      )}
      {selectedPlan && mobile && (
        <button onClick={() => setAuthModal(true)} className="w-full gradient-saffron py-4 rounded-xl text-white font-bold text-lg shadow-lg shadow-saffron-500/30">
          Recharge ₹{selectedPlan.amount} →
        </button>
      )}
      <AuthModal show={authModal} info={`Recharge ₹${selectedPlan?.amount}`} user={user} onDone={confirmRecharge} onCancel={() => setAuthModal(false)} />
    </div>
  );
}

// ======= TRAVEL TICKETS =======
function TicketsPanel({ user, onSuccess }) {
  const [type, setType] = useState('bus');
  const [form, setForm] = useState({from:'',to:'',date:'',passengers:'1'});
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [authModal, setAuthModal] = useState(false);
  const [booked, setBooked] = useState(null);

  const search = async () => {
    if (!form.from||!form.to) return toast.error('Enter source and destination');
    try { const {data} = await api.get(`/tickets/search?type=${type}&from=${form.from}&to=${form.to}&date=${form.date}&passengers=${form.passengers}`); setResults(data.results); }
    catch { toast.error('Search failed'); }
  };

  const confirmBook = async (method, cred) => {
    try {
      const {data} = await api.post('/tickets/book', {
        type, from:form.from, to:form.to, date:form.date||new Date().toISOString().split('T')[0],
        passengers:Number(form.passengers), provider:selected.provider, amount:selected.totalPrice,
        authMethod:method, 
        ...(method === 'pin' ? { pin: cred } : method === 'vibration' ? { vibrationPattern: cred } : { webauthnResponse: cred })
      });
      toast.success('Ticket booked! 🎫');
      setBooked(data); onSuccess({walletBalance:data.walletBalance}); setAuthModal(false);
    } catch(err) { toast.error(err.response?.data?.message||'Booking failed'); setAuthModal(false); }
  };

  if (booked) return (
    <div className="glass rounded-3xl p-8 border border-green-500/30 text-center">
      <div className="text-6xl mb-4">🎫</div>
      <h2 className="text-white font-bold text-2xl mb-2">Booking Confirmed!</h2>
      <p className="text-saffron-500 font-mono text-xl mb-4">{booked.bookingId}</p>
      <div className="text-white/60 text-sm space-y-1">
        <p>{booked.ticket.from} → {booked.ticket.to}</p>
        <p>Seats: {booked.ticket.seatNumbers?.join(', ')}</p>
        <p>Amount: ₹{booked.ticket.amount}</p>
      </div>
      <button onClick={() => {setBooked(null);setResults([]);}} className="mt-6 px-6 py-2 glass rounded-xl text-white/70">Book Another</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-white font-bold text-xl">🎫 Travel Tickets</h2>
      <div className="flex gap-3">
        {['bus','train'].map(t => (
          <button key={t} onClick={() => {setType(t);setResults([]);}} className={`flex-1 py-3 rounded-xl font-semibold capitalize ${type===t?'gradient-saffron text-white':'glass text-white/50 border border-white/10'}`}>
            {t==='bus'?'🚌':'🚂'} {t}
          </button>
        ))}
      </div>
      <input placeholder="From (e.g. Mumbai)" value={form.from} onChange={e=>setForm(p=>({...p,from:e.target.value}))}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/50" />
      <input placeholder="To (e.g. Pune)" value={form.to} onChange={e=>setForm(p=>({...p,to:e.target.value}))}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/50" />
      <div className="grid grid-cols-2 gap-3">
        <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-saffron-500/50" />
        <input type="number" placeholder="Passengers" min="1" value={form.passengers} onChange={e=>setForm(p=>({...p,passengers:e.target.value}))}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/50" />
      </div>
      <button onClick={search} className="w-full gradient-saffron py-3 rounded-xl text-white font-bold">Search {type==='bus'?'🚌':'🚂'}</button>
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map(r => (
            <button key={r.id} onClick={() => setSelected(r)}
              className={`w-full p-4 rounded-xl border text-left ${selected?.id===r.id?'border-saffron-500 bg-saffron-500/10':'border-white/10 glass'}`}>
              <div className="flex justify-between">
                <div>
                  <p className="text-white font-bold">{r.provider}</p>
                  <p className="text-white/50 text-xs">{r.duration} · {r.availableSeats} seats</p>
                </div>
                <p className="text-saffron-500 font-bold">₹{r.totalPrice}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <button onClick={() => setAuthModal(true)} className="w-full gradient-saffron py-4 rounded-xl text-white font-bold text-lg shadow-lg shadow-saffron-500/30">
          Book ₹{selected.totalPrice} →
        </button>
      )}
      <AuthModal show={authModal} info={`Ticket ₹${selected?.totalPrice}`} user={user} onDone={confirmBook} onCancel={() => setAuthModal(false)} />
    </div>
  );
}

// ======= SIP GOALS =======
function GoalsPanel({ user, onBalanceChange }) {
  const [goals, setGoals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({title:'',targetItem:'',targetAmount:'',dailyContribution:'',goalType:'sip'});
  const [celebration, setCelebration] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetch = () => api.get('/goals').then(r => setGoals(r.data.goals)).catch(() => {});
  useEffect(() => { fetch(); }, []);

  const create = async () => {
    if (!form.title || !form.targetAmount) return toast.error('Fill required fields');
    setLoading(true);
    try {
      await api.post('/goals', { title: form.title, targetItem: form.targetItem, targetAmount: Number(form.targetAmount), dailyContribution: Number(form.dailyContribution)||0, goalType: form.goalType });
      toast.success('Goal created!');
      setShowForm(false); setForm({title:'',targetItem:'',targetAmount:'',dailyContribution:'',goalType:'sip'}); fetch();
    } catch (err) { toast.error(err.response?.data?.message||'Error'); }
    finally { setLoading(false); }
  };

  const contribute = async (goalId, amount) => {
    try {
      const {data} = await api.post(`/goals/${goalId}/contribute`, { amount: Number(amount) });
      onBalanceChange(data.walletBalance);
      if (data.celebration) { setCelebration(true); setTimeout(() => setCelebration(false), 4000); toast.success('🎉 Goal Complete!'); }
      else toast.success(`₹${amount} saved!`);
      fetch();
    } catch (err) { toast.error(err.response?.data?.message||'Error'); }
  };

  const togglePause = async (goalId) => {
    try {
      const { data } = await api.patch(`/goals/${goalId}/pause`);
      toast.success(data.message);
      fetch();
    } catch (err) { toast.error('Failed to update SIP status'); }
  };

  const [selectedGoalId, setSelectedGoalId] = useState(null); // For history view

  return (
    <div>
      {celebration && <Confetti recycle={false} numberOfPieces={400} />}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white font-bold text-xl">🎯 SIP Savings Goals</h2>
        <button onClick={() => setShowForm(s=>!s)} className="px-4 py-2 gradient-saffron rounded-xl text-white font-semibold text-sm">+ New Goal</button>
      </div>
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="glass rounded-2xl p-5 border border-white/10 mb-4 space-y-3">
            <input placeholder="Goal title (e.g. Cricket Bat 🏏)" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/50" />
            <input placeholder="Target item name" value={form.targetItem} onChange={e=>setForm(p=>({...p,targetItem:e.target.value}))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/50" />
            <input type="number" placeholder="Target amount (₹)" value={form.targetAmount} onChange={e=>setForm(p=>({...p,targetAmount:e.target.value}))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/50" />
            <input type="number" placeholder="Daily contribution (₹)" value={form.dailyContribution} onChange={e=>setForm(p=>({...p,dailyContribution:e.target.value}))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/50" />
            <button onClick={create} disabled={loading} className="w-full gradient-saffron py-3 rounded-xl text-white font-bold disabled:opacity-50">Create SIP Goal</button>
          </motion.div>
        )}
      </AnimatePresence>
      {goals.length === 0 ? (
        <div className="glass rounded-2xl p-10 border border-white/10 text-center"><p className="text-5xl mb-3">🎯</p><p className="text-white/40">No goals yet. Start saving!</p></div>
      ) : (
        <div className="space-y-4">
          {goals.map(g => {
            const pct = Math.min(100,(g.savedAmount/g.targetAmount)*100);
            const daysLeft = g.dailyContribution > 0 ? Math.ceil((g.targetAmount-g.savedAmount)/g.dailyContribution) : null;
            return (
              <motion.div key={g._id} layout className={`glass rounded-2xl p-5 border transition-all ${g.isPaused ? 'opacity-60 border-yellow-500/20' : 'border-white/10 hover:border-saffron-500/20'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-bold">{g.title}</h3>
                      {g.isPaused && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full font-bold">PAUSED</span>}
                    </div>
                    {g.targetItem && <p className="text-white/40 text-xs">🎁 {g.targetItem}</p>}
                    {daysLeft && !g.isCompleted && !g.isPaused && <p className="text-saffron-400 text-xs">📅 ~{daysLeft} days left</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { if(window.confirm('Stop this SIP and delete the goal?')) api.delete(`/goals/${g._id}`).then(load).catch(()=>{}); }} title="Stop & Delete SIP"
                      className="text-lg p-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all">
                      🗑️
                    </button>
                    {!g.isCompleted && (
                      <button onClick={() => togglePause(g._id)} title={g.isPaused ? 'Resume SIP' : 'Pause SIP'}
                        className={`text-lg p-1.5 rounded-lg border transition-all ${g.isPaused ? 'border-green-500/30 text-green-500 hover:bg-green-500/10' : 'border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10'}`}>
                        {g.isPaused ? '▶️' : '⏸'}
                      </button>
                    )}
                    {!g.isCompleted && g.dailyContribution > 0 && !g.isPaused && (
                      <button onClick={() => contribute(g._id, g.dailyContribution)} className="text-xs px-3 py-1.5 gradient-saffron rounded-lg text-white font-semibold">
                        + ₹{g.dailyContribution}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-saffron-500 font-bold">₹{g.savedAmount.toLocaleString('en-IN')}</span>
                  <span className="text-white/40">₹{g.targetAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-2">
                  <motion.div className={`h-full rounded-full ${g.isCompleted?'bg-green-500':'gradient-saffron'}`} initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:1}} />
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-white/40 text-[10px]">{pct.toFixed(0)}% complete {g.isCompleted?'🎉 Completed!':''}</p>
                  <div className="flex gap-3">
                     <button onClick={() => {
                       const amt = prompt('Enter amount to add:');
                       if (amt && !isNaN(amt)) contribute(g._id, amt);
                     }} className="text-[10px] text-saffron-500 hover:underline">Add Custom Amt</button>
                     <button onClick={() => setSelectedGoalId(selectedGoalId === g._id ? null : g._id)} className="text-[10px] text-white/30 hover:text-white">
                       {selectedGoalId === g._id ? 'Close History' : 'View History'}
                     </button>
                  </div>
                </div>

                <AnimatePresence>
                  {selectedGoalId === g._id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-4 pt-4 border-t border-white/5 space-y-2">
                       <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Contribution History</p>
                       <div className="max-h-32 overflow-y-auto space-y-1 pr-2 scrollbar-hide">
                         {g.contributionHistory?.length > 0 ? (
                           g.contributionHistory.map((ch, idx) => (
                             <div key={idx} className="flex justify-between text-[11px] text-white/60">
                               <span>{new Date(ch.date).toLocaleDateString()}</span>
                               <span className="font-bold text-green-400">+ ₹{ch.amount}</span>
                             </div>
                           ))
                         ) : <p className="text-[11px] text-white/20">No history yet</p>}
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ======= TRANSACTIONS =======
function TransactionHistory() {
  const [txns, setTxns] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/transactions/history?limit=30').then(r => {setTxns(r.data.transactions);setLoading(false);}).catch(()=>setLoading(false)); }, []);
  const emoji = {food:'🍔',transport:'🚌',shopping:'🛒',education:'📚',others:'💳',wallet_load:'💰',goal:'🎯',allowance:'🎁',recharge:'📱',transfer:'💸',rewards:'🪙',investment:'📈',bills:'📄'};
  if (loading) return <div className="text-center p-10"><div className="w-8 h-8 border-4 border-saffron-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>;
  return (
    <div className="glass rounded-3xl border border-white/10 overflow-hidden">
      <div className="p-5 border-b border-white/10 flex justify-between items-center">
        <h2 className="text-white font-bold text-lg">Transaction History</h2>
        <button onClick={() => { const m = new Date().toISOString().slice(0,7); window.open(`${api.defaults.baseURL}/export/statement?month=${m}&token=${localStorage.getItem('token')}`, '_blank'); }}
          className="text-xs px-3 py-1.5 gradient-saffron rounded-lg text-white font-semibold hover:opacity-90">📄 Download Statement</button>
      </div>
      {txns.length === 0 ? (
        <div className="p-8 text-center"><p className="text-5xl mb-3">💳</p><p className="text-white/40">No transactions yet</p></div>
      ) : (
        <div className="divide-y divide-white/5">
          {txns.map(t => (
            <motion.div key={t._id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} className="flex items-center gap-4 p-4 hover:bg-white/3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 ${t.type==='credit'?'bg-green-500/15':t.status==='blocked'?'bg-red-500/15':'bg-saffron-500/15'}`}>
                {t.status==='blocked'?'🚫':emoji[t.category]||'💳'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{t.merchant}</p>
                <p className="text-white/40 text-xs">{new Date(t.timestamp).toLocaleString('en-IN')} · {t.category}</p>
                {t.status==='blocked' && <p className="text-red-400 text-xs">{t.blockedReason}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`font-bold ${t.type==='credit'?'text-green-400':t.status==='blocked'?'text-red-400':'text-white'}`}>
                  {t.type==='credit'?'+':t.status==='blocked'?'':'-'}₹{t.amount.toLocaleString('en-IN')}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ======= INSIGHTS =======
function Insights() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/transactions/insights').then(r => setData(r.data)).catch(() => {}); }, []);
  if (!data) return <div className="text-center p-10"><div className="w-8 h-8 border-4 border-saffron-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>;
  const pieData = (data.categoryBreakdown||[]).map(c => ({name:c._id, value:c.total}));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-4 border border-white/10"><p className="text-white/50 text-xs mb-1">This Week</p><p className="text-white font-bold text-2xl">₹{data.thisWeek?.toLocaleString('en-IN')||'0'}</p></div>
        <div className="glass rounded-2xl p-4 border border-white/10"><p className="text-white/50 text-xs mb-1">Last Week</p><p className="text-white font-bold text-2xl">₹{data.lastWeek?.toLocaleString('en-IN')||'0'}</p></div>
      </div>
      {pieData.length > 0 && (
        <div className="glass rounded-2xl p-5 border border-white/10">
          <h3 className="text-white font-bold mb-4">Category Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
              {pieData.map((e,i) => <Cell key={i} fill={COLORS[e.name]||'#8b5cf6'} />)}
            </Pie><Tooltip contentStyle={{background:'#1a1f2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',color:'#fff'}} /></PieChart>
          </ResponsiveContainer>
        </div>
      )}
      {data.dailySpending?.length > 0 && (
        <div className="glass rounded-2xl p-5 border border-white/10">
          <h3 className="text-white font-bold mb-4">Daily Spending (7 Days)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.dailySpending}>
              <XAxis dataKey="_id" tick={{fill:'rgba(255,255,255,0.4)',fontSize:11}} tickLine={false} axisLine={false} />
              <YAxis tick={{fill:'rgba(255,255,255,0.4)',fontSize:11}} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{background:'#1a1f2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',color:'#fff'}} />
              <Bar dataKey="total" fill="#FF9933" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ======= PROFILE PANEL =======
function ProfilePanel({ user }) {
  const [profile, setProfile] = useState(user);
  const [activity, setActivity] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  const fetchProfile = () => {
    api.get('/users/profile').then(r => setProfile({ ...user, ...r.data.user })).catch(() => {});
    api.get('/users/login-activity').then(r => setActivity(r.data.activity || [])).catch(() => {});
  };

  useEffect(() => { fetchProfile(); }, []);

  const profileUrl = profile?.profilePhoto ? (profile.profilePhoto.startsWith('http') ? profile.profilePhoto : `${api.defaults.baseURL?.replace('/api','')}${profile.profilePhoto}`) : null;
  const currentLevel = LEVELS.slice().reverse().find(l => (profile?.xpPoints||0) >= l.min) || LEVELS[0];
  const nextLevel = LEVELS[LEVELS.indexOf(currentLevel)+1];
  const memberSince = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('photo', file);
    try {
      const { data } = await api.put('/users/profile-photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Photo updated!');
      setProfile(prev => ({ ...prev, profilePhoto: data.user.profilePhoto }));
    } catch (err) {
      toast.error('Upload failed');
    } finally { setUploading(false); }
  };

  const stats = [
    { label: 'Wallet Balance', value: `₹${(profile?.walletBalance||0).toLocaleString('en-IN', {minimumFractionDigits:2})}`, icon: '💰', color: 'text-saffron-500' },
    { label: 'XP Points', value: profile?.xpPoints || 0, icon: '⭐', color: 'text-yellow-400' },
    { label: 'Rewards', value: `🪙 ${profile?.rewardsPoints || 0}`, icon: '', color: 'text-amber-400' },
    { label: 'Day Streak', value: `🔥 ${profile?.streakCount || 0}`, icon: '', color: 'text-orange-500' },
  ];

  const details = [
    { label: 'Full Name', value: profile?.name || 'N/A' },
    { label: 'Email', value: profile?.email || 'N/A' },
    { label: 'Mobile', value: profile?.mobile || 'Not set' },
    { label: 'UPI ID', value: profile?.upiId || 'Not generated' },
    { label: 'Role', value: (profile?.role || 'student').charAt(0).toUpperCase() + (profile?.role || 'student').slice(1) },
    { label: 'Member Since', value: memberSince },
    { label: 'Account Status', value: profile?.freezeStatus ? '❄️ Frozen' : '✅ Active' },
    { label: 'Daily Limit', value: profile?.dailyLimit > 0 ? `₹${profile.dailyLimit}` : 'No limit set' },
  ];

  const security = [
    { label: 'Password', status: true, icon: '🔑' },
    { label: '6-Digit PIN', status: !!profile?.pinHash, icon: '🔢' },
    { label: 'Vibration Pattern', status: profile?.vibrationPattern?.length > 0, icon: '📳' },
    { label: 'Fingerprint', status: !!profile?.webAuthnCredentialId, icon: '🖐️' },
  ];

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="glass rounded-3xl p-6 border border-white/10 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-24 gradient-saffron opacity-20 rounded-t-3xl" />
        <div className="relative z-10">
          <div className="relative inline-block group">
            {profileUrl ? (
              <img src={profileUrl} alt="Profile" className="w-24 h-24 rounded-full mx-auto mb-3 object-cover border-4 border-saffron-500/50 shadow-lg shadow-saffron-500/20" />
            ) : (
              <div className="w-24 h-24 rounded-full mx-auto mb-3 bg-gradient-to-br from-saffron-500 to-amber-600 flex items-center justify-center text-4xl text-white shadow-lg">
                {profile?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <label className="absolute bottom-2 right-0 w-8 h-8 rounded-full gradient-saffron flex items-center justify-center cursor-pointer shadow-lg border-2 border-[#0a0e1a] hover:scale-110 transition-all opacity-0 group-hover:opacity-100">
              <span className="text-white text-xs">{uploading ? '⏳' : '📷'}</span>
              <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
          <h2 className="text-white font-bold text-xl">{profile?.name}</h2>
          <p className="text-white/40 text-sm">{profile?.email}</p>
          <div className="inline-flex items-center gap-1.5 mt-2 px-4 py-1.5 rounded-full text-sm font-bold bg-saffron-500/15 text-saffron-400 border border-saffron-500/20">
            {currentLevel.emoji} {currentLevel.name}
          </div>
          {nextLevel && (
            <div className="mt-3 max-w-xs mx-auto">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div className="h-full gradient-saffron rounded-full" initial={{width:0}} animate={{width:`${Math.min(100,((profile?.xpPoints||0)-currentLevel.min)/(nextLevel.min-currentLevel.min)*100)}%`}} transition={{duration:1}} />
              </div>
              <p className="text-white/30 text-[10px] mt-1">{nextLevel.min-(profile?.xpPoints||0)} XP to {nextLevel.name}</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(s => (
          <motion.div key={s.label} initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} className="glass rounded-2xl p-4 border border-white/10 text-center">
            <p className={`font-bold text-lg ${s.color}`}>{s.icon} {s.value}</p>
            <p className="text-white/40 text-xs mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Account Details */}
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="glass rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 bg-white/3">
          <h3 className="text-white font-bold text-sm">📋 Account Details</h3>
        </div>
        <div className="divide-y divide-white/5">
          {details.map(d => (
            <div key={d.label} className="px-5 py-3 flex justify-between items-center">
              <span className="text-white/50 text-sm">{d.label}</span>
              <span className="text-white font-medium text-sm text-right max-w-[180px] truncate">{d.value}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Security Status */}
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.2}} className="glass rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 bg-white/3">
          <h3 className="text-white font-bold text-sm">🔐 Security Status</h3>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          {security.map(s => (
            <div key={s.label} className={`rounded-xl p-3 text-center border ${s.status ? 'bg-green-500/5 border-green-500/20' : 'bg-white/3 border-white/10'}`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <p className="text-white text-xs font-medium">{s.label}</p>
              <p className={`text-[10px] font-bold mt-1 ${s.status ? 'text-green-400' : 'text-white/30'}`}>
                {s.status ? '✓ Active' : '✕ Not Set'}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Badges */}
      <BadgesSection />

      {/* Login Activity */}
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.4}} className="glass rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 bg-white/3 flex justify-between items-center">
          <h3 className="text-white font-bold text-sm">🕰️ Recent Login Activity</h3>
        </div>
        <div className="divide-y divide-white/5 max-h-48 overflow-y-auto scrollbar-hide">
          {activity.length === 0 ? (
            <p className="p-5 text-center text-white/30 text-xs">No activity logged.</p>
          ) : activity.map((a, i) => (
            <div key={i} className="px-5 py-3 flex justify-between items-center hover:bg-white/3">
              <div className="min-w-0">
                <p className="text-white text-xs font-medium truncate">{a.device?.split('(')[0] || 'Unknown Device'}</p>
                <p className="text-white/30 text-[10px]">{a.ip}</p>
              </div>
              <span className="text-white/40 text-[10px] text-right">{new Date(a.timestamp).toLocaleString('en-IN', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ======= BADGES SECTION =======
function BadgesSection() {
  const [badges, setBadges] = useState([]);
  const [stats, setStats] = useState({ earned: 0, total: 0 });
  useEffect(() => {
    api.get('/badges').then(r => {
      setBadges(r.data.badges || []);
      setStats({ earned: r.data.earned, total: r.data.total });
    }).catch(() => {});
  }, []);

  if (badges.length === 0) return null;

  return (
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.3}} className="glass rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-5 py-3 border-b border-white/10 bg-white/3 flex justify-between items-center">
        <h3 className="text-white font-bold text-sm">🏅 Badges & Achievements</h3>
        <span className="text-saffron-500 text-xs font-bold">{stats.earned}/{stats.total}</span>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">
        {badges.map(b => (
          <div key={b.key} className={`rounded-xl p-3 text-center border transition-all ${b.earned ? 'bg-saffron-500/5 border-saffron-500/20' : 'bg-white/3 border-white/10 opacity-40'}`}>
            <div className="text-2xl mb-1">{b.emoji}</div>
            <p className="text-white text-xs font-medium">{b.title}</p>
            <p className="text-white/30 text-[9px] mt-0.5">{b.desc || b.description}</p>
            {b.earned && <p className="text-green-400 text-[9px] mt-1 font-bold">✓ Earned</p>}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ======= MAIN DASHBOARD =======
export default function StudentDashboard() {
  const { t } = useTranslation();
  const { user, logout, updateUser } = useAuth();
  const { on, off } = useSocket();
  const navigate = useNavigate();
  const [localUser, setLocalUser] = useState(user);
  const [frozen, setFrozen] = useState(false);
  const [dailySpent, setDailySpent] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(0);
  const [showGesture, setShowGesture] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [voicePayIntent, setVoicePayIntent] = useState(null);
  const [celebration, setCelebration] = useState(null); // { type, title, subtitle, emoji }

  const VOICE_NAV_ITEMS = [
    { label: 'Home', path: '', aliases: ['home', 'dashboard', 'main'] },
    { label: 'Pay', path: 'pay', aliases: ['pay', 'payment', 'send money'] },
    { label: 'Recharge', path: 'recharge', aliases: ['recharge', 'mobile'] },
    { label: 'Tickets', path: 'tickets', aliases: ['tickets', 'travel', 'train', 'bus'] },
    { label: 'Goals', path: 'goals', aliases: ['goals', 'sip', 'savings', 'save'] },
    { label: 'History', path: 'history', aliases: ['history', 'transactions'] },
    { label: 'Insights', path: 'insights', aliases: ['insights', 'analytics', 'spending'] },
  ];

  useEffect(() => { setLocalUser(user); }, [user]);

  // Fetch daily spending & limits
  useEffect(() => {
    if (user?.role === 'divyang') {
      setShowGesture(true);
      setShowVoice(true);
      toast('♿ Assistive tools enabled automatically', { icon: '✨' });
    }
    api.get('/parental/controls').then(r => {
      setDailyLimit(r.data.controls?.dailyLimit || 0);
      setFrozen(r.data.controls?.freezeStatus || false);
    }).catch(() => {});
    api.get('/transactions/insights').then(r => {
      const today = r.data.dailySpending?.find(d => d._id === new Date().toISOString().split('T')[0]);
      setDailySpent(today?.total || 0);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleFrozen = () => { setFrozen(true); toast.error('⚠️ Wallet frozen by parent!'); };
    const handleUnfrozen = () => { setFrozen(false); toast.success('Wallet unfrozen!'); };
    const handleAllowance = (d) => { updateUser({walletBalance:d.walletBalance}); toast.success(`🎁 ₹${d.amount} received!`); };
    const handleLimitWarning = (d) => { toast(`⚠️ ${d.percentUsed}% of daily limit used!`, {icon:'🔶'}); };
    const handleMoneyReceived = (d) => { updateUser({walletBalance:d.walletBalance}); toast.success(`💰 ₹${d.amount} received from ${d.from}!`); };
    const handleRequestApproved = (d) => toast.success(`✅ Money request ₹${d.amount} approved!`);
    const handleRequestRejected = (d) => toast.error(`❌ Money request ₹${d.amount} rejected.`);
    on('wallet_frozen', handleFrozen); on('wallet_unfrozen', handleUnfrozen);
    on('allowance_received', handleAllowance); on('limit_warning', handleLimitWarning);
    on('money_received', handleMoneyReceived); on('request_approved', handleRequestApproved);
    on('request_rejected', handleRequestRejected);
    return () => { off('wallet_frozen',handleFrozen); off('wallet_unfrozen',handleUnfrozen); off('allowance_received',handleAllowance); off('limit_warning',handleLimitWarning); off('money_received',handleMoneyReceived); off('request_approved',handleRequestApproved); off('request_rejected',handleRequestRejected); };
  }, [on, off, updateUser]);

  const handleSuccess = (data) => {
    if (data.walletBalance !== undefined) {
      updateUser({ walletBalance: data.walletBalance, xpPoints: data.xpPoints, level: data.level, rewardsPoints: data.rewardsPoints });
      setLocalUser(prev => ({ ...prev, ...data }));
    }
  };

  const handleBalanceChange = (newBal) => {
    updateUser({ walletBalance: newBal });
    setLocalUser(prev => ({...prev, walletBalance: newBal}));
  };

  const profileUrl = localUser?.profilePhoto ? `${api.defaults.baseURL?.replace('/api','')}${localUser.profilePhoto}` : null;

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {frozen && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white text-center py-2.5 font-bold text-sm animate-pulse">
          🔒 Wallet frozen by parent. Contact them to unfreeze.
        </div>
      )}
      <div className="fixed top-0 left-0 right-0 z-40 border-b border-white/5 glass-dark">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 gradient-saffron rounded-xl flex items-center justify-center text-white font-bold text-sm">₹</div>
            <span className="font-display font-bold text-white">Pay<span className="text-gradient-saffron">Bridge</span></span>
          </div>
          <div className="flex items-center gap-3">
            {profileUrl ? (
              <img src={profileUrl} alt="Profile" className="w-8 h-8 rounded-full object-cover border-2 border-saffron-500/50" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-saffron-500/20 flex items-center justify-center text-sm">👋</div>
            )}
            <span className="text-white/50 text-sm">{localUser?.name?.split(' ')[0]}</span>
            <NotificationBell />
            <ThemeToggle />
            <AccessibilityPanel />
            <button onClick={() => {logout(); navigate('/');}} className="text-xs text-white/40 hover:text-white/60 px-2 py-1.5 glass rounded-lg border border-white/10">{t('logout')}</button>
            <button onClick={() => { setShowGesture(s => !s); if (showVoice) setShowVoice(false); }} className={`text-xs px-2 py-1.5 rounded-lg border transition-all ${showGesture ? 'border-saffron-500 text-saffron-500 bg-saffron-500/10' : 'text-white/40 hover:text-white/60 glass border-white/10'}`} title="Camera Gesture">
              ✋
            </button>
            <button onClick={() => { setShowVoice(s => !s); if (showGesture) setShowGesture(false); }} className={`text-xs px-2 py-1.5 rounded-lg border transition-all ${showVoice ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' : 'text-white/40 hover:text-white/60 glass border-white/10'}`} title="Voice Navigation">
              🎙️
            </button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 flex gap-1 pb-2 overflow-x-auto scrollbar-hide">
          {NAV.map(n => (
            <NavLink key={n.path} to={`/student/${n.path}`} end={n.path===''}
              className={({isActive}) => `flex-shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${isActive?'bg-saffron-500/15 text-saffron-400 border border-saffron-500/30':'text-white/50 hover:text-white'}`}>
              {n.icon} {t(n.label)}
            </NavLink>
          ))}
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 pt-36 pb-12">
        <Routes>
          <Route path="/" element={
            <div>
              <DailyLimitBar dailyLimit={dailyLimit} dailySpent={dailySpent} />
              <WalletCard user={localUser} />
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  {emoji:'💸',label:'pay',to:'/student/pay'},
                  {emoji:'📱',label:'recharge',to:'/student/recharge'},
                  {emoji:'🎫',label:'tickets',to:'/student/tickets'},
                  {emoji:'🎯',label:'goals',to:'/student/goals'}
                ].map(c => (
                  <NavLink key={c.label} to={c.to} className="glass rounded-2xl p-4 border border-white/10 hover:border-saffron-500/30 transition-all text-center">
                    <div className="text-3xl mb-1">{c.emoji}</div><p className="text-white/70 text-sm font-medium">{t(c.label)}</p>
                  </NavLink>
                ))}
              </div>
              <div className="space-y-4">
                <Academy />
                <BudgetPlanner />
                <SplitBill />
                <SpinWheel onReward={(xp) => { 
                  api.post('/wallet/add-xp', { xp }).catch(()=>{});
                  setCelebration({ type: 'reward', title: `Earned ${xp} XP!`, subtitle: 'Daily Spin Reward', emoji: '🎡' });
                }} />
              </div>
            </div>
          } />
          <Route path="pay" element={<PaymentFlow user={localUser} onSuccess={handleSuccess} voiceIntent={voicePayIntent} onVoiceIntentUsed={() => setVoicePayIntent(null)} />} />
          <Route path="recharge" element={<RechargePanel user={localUser} onSuccess={handleSuccess} />} />
          <Route path="tickets" element={<TicketsPanel user={localUser} onSuccess={handleSuccess} />} />
          <Route path="goals" element={<GoalsPanel user={localUser} onBalanceChange={handleBalanceChange} />} />
          <Route path="history" element={<TransactionHistory />} />
          <Route path="insights" element={<Insights />} />
          <Route path="profile" element={<ProfilePanel user={localUser} />} />
        </Routes>
      </div>
      <AnimatePresence>
        {showGesture && <HandGestureNav basePath="/student" onNavigate={(path) => navigate(path)} onClose={() => setShowGesture(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showVoice && <VoiceNav basePath="/student" navItems={VOICE_NAV_ITEMS} onNavigate={(path) => navigate(path)} onClose={() => setShowVoice(false)} />}
      </AnimatePresence>
      <AlwaysOnMic
        user={localUser}
        basePath="/student"
        navItems={VOICE_NAV_ITEMS}
        onNavigate={(path) => navigate(path)}
        onPaymentIntent={(intent) => setVoicePayIntent(intent)}
      />
      <BankChatbot />
      <SessionTimeout onTimeout={() => { logout(); navigate('/'); }} />
      <CelebrationOverlay
        show={!!celebration}
        {...celebration}
        onDone={() => setCelebration(null)}
      />
    </div>
  );
}
