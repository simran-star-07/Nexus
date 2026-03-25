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
import { useLocation } from 'react-router-dom';
import HandGestureNav from '../../components/HandGestureNav';
import BankChatbot from '../../components/BankChatbot';
import VoiceNav from '../../components/VoiceNav';
import AlwaysOnMic from '../../components/AlwaysOnMic';

// Voice helper
const speak = (text) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-IN'; u.rate = 0.9; u.pitch = 1;
    window.speechSynthesis.speak(u);
  }
};

const NAV = [
  { path: '', label: '🏠 Home', aria: 'Home Dashboard' },
  { path: 'pay', label: '💸 Pay', aria: 'Make Payment' },
  { path: 'bills', label: '📄 Bills', aria: 'Bill Payments' },
  { path: 'recharge', label: '📱 Recharge', aria: 'Mobile Recharge' },
  { path: 'gold', label: '🥇 Gold', aria: 'Gold and Silver' },
  { path: 'tickets', label: '🎫 Tickets', aria: 'Travel Tickets' },
  { path: 'history', label: '📋 History', aria: 'Transaction History' },
];

// ======= AUTH MODAL =======
function AuthModal({ show, info, user, onDone, onCancel }) {
  const [step, setStep] = useState('choose');
  useEffect(() => { if (show) speak(`Please confirm ${info}. Choose PIN or vibration pattern.`); }, [show]);
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" role="dialog" aria-label="Authentication">
      <div className="bg-[#0a1628] rounded-3xl p-8 w-full max-w-md border-2 border-white/20">
        {step === 'choose' ? (
          <div className="text-center">
            <h3 className="text-white font-bold text-2xl mb-6" aria-live="polite">Confirm {info}</h3>
            <div className="space-y-4">
              <button onClick={() => { setStep('pin'); speak('Enter your 6 digit PIN'); }}
                className="w-full py-6 bg-[#FF9933] rounded-2xl text-white font-bold text-xl" aria-label="Enter PIN">
                🔢 Enter PIN
              </button>
                <button onClick={() => { setStep('vibration'); speak('Tap your vibration pattern'); }}
                className="w-full py-6 bg-white/10 border-2 border-white/30 rounded-2xl text-white font-bold text-xl" aria-label="Use Vibration Pattern">
                📳 Vibration Pattern
              </button>
              <button onClick={async () => {
                try {
                  speak('Authenticating with fingerprint');
                  const { data: options } = await api.post('/auth/webauthn/login-options', { email: user.email });
                  const attResp = await startAuthentication(options);
                  onDone('fingerprint', attResp);
                } catch (err) { speak('Fingerprint failed'); toast.error('Fingerprint failed'); }
              }}
                className="w-full py-6 bg-white/10 border-2 border-white/30 rounded-2xl text-white font-bold text-xl" aria-label="Use Fingerprint">
                ☝️ Fingerprint
              </button>
              <button onClick={() => { onCancel(); speak('Cancelled'); }}
                className="w-full py-4 text-white/50 text-lg" aria-label="Cancel">Cancel</button>
            </div>
          </div>
        ) : step === 'pin' ? (
          <PinPad onComplete={pin => { speak('PIN entered. Processing.'); onDone('pin', pin); }} onCancel={() => setStep('choose')} title="Enter 6-digit PIN" />
        ) : (
          <div>
            <h3 className="text-white font-bold text-2xl mb-6 text-center">Vibration Pattern</h3>
            <VibrationVerifier storedPattern={user?.vibrationPattern || []} onResult={match => {
              if (match) { speak('Pattern matched. Processing.'); onDone('vibration', user?.vibrationPattern || []); }
              else { speak('Pattern did not match. Try again.'); toast.error('Pattern mismatch!'); setStep('choose'); }
            }} />
            <button onClick={() => setStep('choose')} className="mt-4 text-white/50 text-lg w-full text-center">← Back</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ======= BIG BUTTON =======
function BigButton({ emoji, label, onClick, color = 'bg-white/10', ariaLabel }) {
  return (
    <button onClick={() => { speak(label); onClick?.(); }}
      className={`w-full py-6 ${color} rounded-2xl text-white font-bold text-xl border-2 border-white/20 hover:border-[#FF9933] transition-all flex items-center justify-center gap-4 min-h-[80px]`}
      aria-label={ariaLabel || label} role="button">
      <span className="text-3xl">{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

// ======= HOME =======
function HomeView({ user }) {
  useEffect(() => { speak(`Welcome ${user?.name}. Your balance is ${user?.walletBalance} rupees.`); }, []);
  return (
    <div className="space-y-6" role="main" aria-label="Dashboard Home">
      <div className="bg-[#0a1628] rounded-3xl p-8 border-2 border-[#FF9933]/40">
        <p className="text-white/60 text-lg mb-2" aria-label="Wallet label">WALLET BALANCE</p>
        <p className="text-white font-bold text-5xl" aria-live="polite">₹{(user?.walletBalance || 0).toLocaleString('en-IN')}</p>
        <p className="text-white/40 text-lg mt-3">🪙 Rewards: {user?.rewardsPoints || 0} points</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <NavLink to="/accessibility/pay" aria-label="Go to payments"><BigButton emoji="💸" label="Pay" /></NavLink>
        <NavLink to="/accessibility/bills" aria-label="Go to bills"><BigButton emoji="📄" label="Bills" /></NavLink>
        <NavLink to="/accessibility/recharge" aria-label="Go to recharge"><BigButton emoji="📱" label="Recharge" /></NavLink>
        <NavLink to="/accessibility/gold" aria-label="Go to gold"><BigButton emoji="🥇" label="Gold" /></NavLink>
      </div>
    </div>
  );
}

// ======= PAYMENT =======
function PayView({ user, onSuccess }) {
  const [upiId, setUpiId] = useState('');
  const [amount, setAmount] = useState('');
  const [authModal, setAuthModal] = useState(false);

  useEffect(() => { speak('Payment screen. Enter UPI ID and amount.'); }, []);

  const confirmPay = async (method, cred) => {
    try {
      const { data } = await api.post('/payment/pay', {
        amount: Number(amount), upiId, merchant: upiId, category: 'others', authMethod: method,
        ...(method === 'pin' ? { pin: cred } : method === 'vibration' ? { vibrationPattern: cred } : { webauthnResponse: cred })
      });
      speak(`Payment of ${amount} rupees successful.`);
      toast.success('Payment successful!');
      onSuccess(data);
      setAuthModal(false); setAmount(''); setUpiId('');
    } catch (err) {
      speak(err.response?.data?.message || 'Payment failed.');
      toast.error(err.response?.data?.message || 'Failed');
      setAuthModal(false);
    }
  };

  return (
    <div className="space-y-6" role="main" aria-label="Payment Screen">
      <h2 className="text-white font-bold text-3xl">💸 Make Payment</h2>
      <input placeholder="UPI ID" value={upiId} onChange={e => setUpiId(e.target.value)} aria-label="Enter UPI ID"
        className="w-full bg-white/5 border-2 border-white/20 rounded-2xl px-6 py-5 text-white text-xl placeholder-white/30 focus:outline-none focus:border-[#FF9933]" />
      <input type="number" placeholder="Amount (₹)" value={amount} onChange={e => setAmount(e.target.value)} aria-label="Enter amount"
        className="w-full bg-white/5 border-2 border-white/20 rounded-2xl px-6 py-5 text-white text-xl placeholder-white/30 focus:outline-none focus:border-[#FF9933]" />
      <div className="grid grid-cols-4 gap-3">
        {[100, 500, 1000, 2000].map(a => (
          <button key={a} onClick={() => { setAmount(String(a)); speak(`${a} rupees`); }}
            className="py-4 bg-white/10 rounded-xl text-white font-bold text-lg border border-white/20" aria-label={`Set amount to ${a} rupees`}>₹{a}</button>
        ))}
      </div>
      <button onClick={() => { if (!amount || !upiId) { speak('Enter UPI ID and amount'); return toast.error('Fill fields'); } speak(`Sending ${amount} rupees to ${upiId}. Please confirm.`); setAuthModal(true); }}
        className="w-full py-6 bg-[#FF9933] rounded-2xl text-white font-bold text-2xl" aria-label="Proceed to pay">
        Pay ₹{amount || '0'} →
      </button>
      <AuthModal show={authModal} info={`₹${amount} to ${upiId}`} user={user} onDone={confirmPay} onCancel={() => setAuthModal(false)} />
    </div>
  );
}

// ======= BILL PAYMENTS =======
function BillsView({ user, onSuccess }) {
  const [billType, setBillType] = useState('');
  const [consumerNo, setConsumerNo] = useState('');
  const [due, setDue] = useState(null);
  const [authModal, setAuthModal] = useState(false);

  useEffect(() => { speak('Bill payments. Select a bill type.'); }, []);

  const fetchDue = async (type) => {
    setBillType(type);
    if (!consumerNo) { speak('Enter your consumer number first.'); return toast.error('Enter consumer number'); }
    try {
      const { data } = await api.get(`/bills/due/${type}/${consumerNo}`);
      setDue(data);
      speak(`${type} bill for consumer ${consumerNo}. Due amount is ${data.dueAmount} rupees.`);
    } catch { speak('Failed to fetch bill.'); }
  };

  const payBill = async (method, cred) => {
    try {
      const { data } = await api.post('/bills/pay', {
        billType, consumerNumber: consumerNo, amount: due.dueAmount, authMethod: method,
        ...(method === 'pin' ? { pin: cred } : method === 'vibration' ? { vibrationPattern: cred } : { webauthnResponse: cred })
      });
      speak(`${billType} bill paid successfully. ${data.bill.amount} rupees.`);
      toast.success(data.message);
      onSuccess({ walletBalance: data.walletBalance });
      setAuthModal(false); setDue(null);
    } catch (err) { speak('Bill payment failed.'); toast.error(err.response?.data?.message || 'Failed'); setAuthModal(false); }
  };

  const BILLS = [
    { type: 'electricity', emoji: '⚡', label: 'Electricity' },
    { type: 'water', emoji: '💧', label: 'Water' },
    { type: 'gas', emoji: '🔥', label: 'Gas' },
    { type: 'broadband', emoji: '🌐', label: 'Broadband' },
    { type: 'dth', emoji: '📡', label: 'DTH' },
  ];

  return (
    <div className="space-y-6" role="main" aria-label="Bill Payments">
      <h2 className="text-white font-bold text-3xl">📄 Bill Payments</h2>
      <input placeholder="Consumer Number" value={consumerNo} onChange={e => setConsumerNo(e.target.value)} aria-label="Enter consumer number"
        className="w-full bg-white/5 border-2 border-white/20 rounded-2xl px-6 py-5 text-white text-xl placeholder-white/30 focus:outline-none focus:border-[#FF9933]" />
      <div className="space-y-3">
        {BILLS.map(b => (
          <button key={b.type} onClick={() => fetchDue(b.type)}
            className={`w-full py-5 rounded-2xl text-white font-bold text-xl border-2 flex items-center justify-center gap-4 min-h-[80px] ${billType === b.type ? 'border-[#FF9933] bg-[#FF9933]/10' : 'border-white/20 bg-white/5'}`}
            aria-label={`Pay ${b.label} bill`}>
            <span className="text-3xl">{b.emoji}</span><span>{b.label}</span>
          </button>
        ))}
      </div>
      {due && (
        <div className="bg-[#0a1628] rounded-2xl p-6 border-2 border-[#FF9933]/40">
          <p className="text-white/60 text-lg">{due.provider}</p>
          <p className="text-white font-bold text-4xl" aria-live="polite">₹{due.dueAmount}</p>
          <p className="text-white/40">Due: {due.dueDate}</p>
          <button onClick={() => { speak(`Confirm payment of ${due.dueAmount} rupees.`); setAuthModal(true); }}
            className="w-full mt-4 py-5 bg-[#FF9933] rounded-2xl text-white font-bold text-xl" aria-label="Pay bill now">
            Pay ₹{due.dueAmount} →
          </button>
        </div>
      )}
      <AuthModal show={authModal} info={`₹${due?.dueAmount} ${billType} bill`} user={user} onDone={payBill} onCancel={() => setAuthModal(false)} />
    </div>
  );
}

// ======= MOBILE RECHARGE =======
function RechargeView({ user, onSuccess }) {
  const [operator, setOperator] = useState('');
  const [mobile, setMobile] = useState('');
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [authModal, setAuthModal] = useState(false);

  useEffect(() => { speak('Mobile recharge. Enter your number and select operator.'); }, []);

  const fetchPlans = async (op) => {
    setOperator(op);
    try { const { data } = await api.get(`/recharge/plans/${op}`); setPlans(data.plans); speak(`${op} plans loaded. Select a plan.`); }
    catch { speak('Failed to load plans.'); }
  };

  const confirmRecharge = async (method, cred) => {
    try {
      const { data } = await api.post('/recharge/recharge', {
        operator, mobileNumber: mobile, planId: selectedPlan.id, authMethod: method,
        ...(method === 'pin' ? { pin: cred } : method === 'vibration' ? { vibrationPattern: cred } : { webauthnResponse: cred })
      });
      speak(`Recharge of ${selectedPlan.amount} rupees successful.`);
      toast.success(data.message); onSuccess({ walletBalance: data.walletBalance });
      setAuthModal(false); setSelectedPlan(null);
    } catch (err) { speak('Recharge failed.'); toast.error(err.response?.data?.message || 'Failed'); setAuthModal(false); }
  };

  return (
    <div className="space-y-6" role="main" aria-label="Mobile Recharge">
      <h2 className="text-white font-bold text-3xl">📱 Mobile Recharge</h2>
      <input placeholder="Mobile Number" value={mobile} onChange={e => setMobile(e.target.value)} aria-label="Enter mobile number"
        className="w-full bg-white/5 border-2 border-white/20 rounded-2xl px-6 py-5 text-white text-xl placeholder-white/30 focus:outline-none focus:border-[#FF9933]" />
      <div className="grid grid-cols-2 gap-4">
        {['jio', 'airtel', 'vi', 'bsnl'].map(op => (
          <button key={op} onClick={() => fetchPlans(op)}
            className={`py-5 rounded-2xl text-white font-bold text-xl border-2 uppercase ${operator === op ? 'border-[#FF9933] bg-[#FF9933]/10' : 'border-white/20 bg-white/5'}`}
            aria-label={`Select ${op}`}>{op}</button>
        ))}
      </div>
      {plans.length > 0 && (
        <div className="space-y-3 max-h-72 overflow-y-auto">
          {plans.map(p => (
            <button key={p.id} onClick={() => { setSelectedPlan(p); speak(`Selected plan. ${p.amount} rupees. ${p.data}. ${p.validity}.`); }}
              className={`w-full p-5 rounded-2xl border-2 text-left ${selectedPlan?.id === p.id ? 'border-[#FF9933] bg-[#FF9933]/10' : 'border-white/20 bg-white/5'}`}
              aria-label={`Plan ${p.amount} rupees, ${p.data}, ${p.validity}`}>
              <p className="text-white font-bold text-2xl">₹{p.amount}</p>
              <p className="text-white/60 text-lg">{p.data} · {p.validity}</p>
            </button>
          ))}
        </div>
      )}
      {selectedPlan && mobile && (
        <button onClick={() => { speak(`Confirm recharge of ${selectedPlan.amount} rupees.`); setAuthModal(true); }}
          className="w-full py-6 bg-[#FF9933] rounded-2xl text-white font-bold text-2xl" aria-label="Confirm recharge">
          Recharge ₹{selectedPlan.amount} →
        </button>
      )}
      <AuthModal show={authModal} info={`Recharge ₹${selectedPlan?.amount}`} user={user} onDone={confirmRecharge} onCancel={() => setAuthModal(false)} />
    </div>
  );
}

// ======= GOLD & SILVER =======
function GoldView({ user, onSuccess }) {
  const [prices, setPrices] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [metal, setMetal] = useState('gold');
  const [amount, setAmount] = useState('');
  const [authModal, setAuthModal] = useState(false);
  const [action, setAction] = useState('buy');
  const [sellId, setSellId] = useState('');

  useEffect(() => {
    speak('Gold and silver market. You can buy or sell digital gold and silver.');
    api.get('/gold/prices').then(r => setPrices(r.data)).catch(() => {});
    api.get('/gold/portfolio').then(r => setPortfolio(r.data.items || [])).catch(() => {});
  }, []);

  const confirmAction = async (method, cred) => {
    try {
      if (action === 'buy') {
        const { data } = await api.post('/gold/buy', {
          metal, amount: Number(amount), authMethod: method,
          ...(method === 'pin' ? { pin: cred } : method === 'vibration' ? { vibrationPattern: cred } : { webauthnResponse: cred })
        });
        speak(`Bought ${metal} worth ${amount} rupees.`);
        toast.success(data.message); onSuccess({ walletBalance: data.walletBalance });
      } else {
        const { data } = await api.post('/gold/sell', {
          portfolioId: sellId, authMethod: method,
          ...(method === 'pin' ? { pin: cred } : method === 'vibration' ? { vibrationPattern: cred } : { webauthnResponse: cred })
        });
        speak(`Sold. ${data.message}`);
        toast.success(data.message); onSuccess({ walletBalance: data.walletBalance });
      }
      setAuthModal(false); setAmount('');
      api.get('/gold/portfolio').then(r => setPortfolio(r.data.items || []));
    } catch (err) { speak('Transaction failed.'); toast.error(err.response?.data?.message || 'Failed'); setAuthModal(false); }
  };

  return (
    <div className="space-y-6" role="main" aria-label="Gold and Silver">
      <h2 className="text-white font-bold text-3xl">🥇 Gold & Silver</h2>
      {prices && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-yellow-500/10 rounded-2xl p-5 border-2 border-yellow-500/30 text-center">
            <p className="text-yellow-400 text-lg">Gold</p>
            <p className="text-white font-bold text-2xl">₹{prices.gold.pricePerGram}/g</p>
          </div>
          <div className="bg-gray-500/10 rounded-2xl p-5 border-2 border-gray-500/30 text-center">
            <p className="text-gray-400 text-lg">Silver</p>
            <p className="text-white font-bold text-2xl">₹{prices.silver.pricePerGram}/g</p>
          </div>
        </div>
      )}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => { setMetal('gold'); speak('Selected gold'); }}
            className={`py-5 rounded-2xl font-bold text-xl border-2 ${metal === 'gold' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400' : 'border-white/20 text-white'}`}>🥇 Gold</button>
          <button onClick={() => { setMetal('silver'); speak('Selected silver'); }}
            className={`py-5 rounded-2xl font-bold text-xl border-2 ${metal === 'silver' ? 'border-gray-400 bg-gray-500/10 text-gray-300' : 'border-white/20 text-white'}`}>🥈 Silver</button>
        </div>
        <input type="number" placeholder="Amount (₹ min 10)" value={amount} onChange={e => setAmount(e.target.value)} aria-label="Enter amount to buy"
          className="w-full bg-white/5 border-2 border-white/20 rounded-2xl px-6 py-5 text-white text-xl placeholder-white/30 focus:outline-none focus:border-[#FF9933]" />
        <button onClick={() => { if (!amount || Number(amount) < 10) { speak('Minimum 10 rupees'); return; } setAction('buy'); speak(`Buy ${metal} worth ${amount} rupees. Confirm.`); setAuthModal(true); }}
          className="w-full py-6 bg-[#FF9933] rounded-2xl text-white font-bold text-2xl" aria-label="Buy">Buy {metal} →</button>
      </div>
      {portfolio.length > 0 && (
        <div>
          <h3 className="text-white font-bold text-2xl mb-3">Your Portfolio</h3>
          {portfolio.map(item => (
            <div key={item._id} className="bg-white/5 rounded-2xl p-5 border-2 border-white/20 mb-3 flex justify-between items-center">
              <div>
                <p className="text-white font-bold text-xl capitalize">{item.metal}</p>
                <p className="text-white/60">{item.quantity.toFixed(4)}g · Value: ₹{item.currentValue}</p>
              </div>
              <button onClick={() => { setSellId(item._id); setAction('sell'); speak(`Sell ${item.metal} worth ${item.currentValue} rupees.`); setAuthModal(true); }}
                className="px-6 py-3 bg-red-500/20 text-red-400 rounded-xl font-bold border border-red-500/30" aria-label={`Sell ${item.metal}`}>Sell</button>
            </div>
          ))}
        </div>
      )}
      <AuthModal show={authModal} info={action === 'buy' ? `Buy ${metal} ₹${amount}` : 'Sell'} user={user} onDone={confirmAction} onCancel={() => setAuthModal(false)} />
    </div>
  );
}

// ======= TRAVEL TICKETS =======
function TicketsView({ user, onSuccess }) {
  const [type, setType] = useState('bus');
  const [form, setForm] = useState({ from: '', to: '', date: '', passengers: '1' });
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [authModal, setAuthModal] = useState(false);
  const [booked, setBooked] = useState(null);

  useEffect(() => { speak('Travel tickets. Search for bus or train tickets.'); }, []);

  const search = async () => {
    if (!form.from || !form.to) { speak('Enter source and destination'); return; }
    try {
      const { data } = await api.get(`/tickets/search?type=${type}&from=${form.from}&to=${form.to}&date=${form.date}&passengers=${form.passengers}`);
      setResults(data.results);
      speak(`Found ${data.results.length} options.`);
    } catch { speak('Search failed.'); }
  };

  const confirmBook = async (method, cred) => {
    try {
      const { data } = await api.post('/tickets/book', {
        type, from: form.from, to: form.to, date: form.date || new Date().toISOString().split('T')[0],
        passengers: Number(form.passengers), provider: selected.provider, amount: selected.totalPrice,
        authMethod: method, 
        ...(method === 'pin' ? { pin: cred } : method === 'vibration' ? { vibrationPattern: cred } : { webauthnResponse: cred })
      });
      speak(`Ticket booked. Booking ID is ${data.bookingId}.`);
      toast.success('Ticket booked!'); setBooked(data); onSuccess({ walletBalance: data.walletBalance }); setAuthModal(false);
    } catch (err) { speak('Booking failed.'); toast.error(err.response?.data?.message || 'Failed'); setAuthModal(false); }
  };

  if (booked) return (
    <div className="bg-[#0a1628] rounded-3xl p-8 border-2 border-green-500/40 text-center" role="status" aria-label="Booking confirmed">
      <div className="text-6xl mb-4">🎫</div>
      <h2 className="text-white font-bold text-3xl mb-2">Booking Confirmed!</h2>
      <p className="text-[#FF9933] font-mono text-2xl mb-4">{booked.bookingId}</p>
      <button onClick={() => { setBooked(null); setResults([]); speak('Book another ticket.'); }}
        className="py-4 px-8 bg-white/10 rounded-2xl text-white font-bold text-xl border-2 border-white/20">Book Another</button>
    </div>
  );

  return (
    <div className="space-y-6" role="main" aria-label="Travel Ticket Booking">
      <h2 className="text-white font-bold text-3xl">🎫 Travel Tickets</h2>
      <div className="grid grid-cols-2 gap-4">
        {['bus', 'train'].map(t => (
          <button key={t} onClick={() => { setType(t); speak(`${t} selected`); setResults([]); }}
            className={`py-5 rounded-2xl font-bold text-xl border-2 capitalize ${type === t ? 'border-[#FF9933] bg-[#FF9933]/10 text-white' : 'border-white/20 text-white/60'}`}
            aria-label={`Select ${t}`}>{t === 'bus' ? '🚌' : '🚂'} {t}</button>
        ))}
      </div>
      <input placeholder="From" value={form.from} onChange={e => setForm(p => ({ ...p, from: e.target.value }))} aria-label="From city"
        className="w-full bg-white/5 border-2 border-white/20 rounded-2xl px-6 py-5 text-white text-xl placeholder-white/30 focus:outline-none focus:border-[#FF9933]" />
      <input placeholder="To" value={form.to} onChange={e => setForm(p => ({ ...p, to: e.target.value }))} aria-label="To city"
        className="w-full bg-white/5 border-2 border-white/20 rounded-2xl px-6 py-5 text-white text-xl placeholder-white/30 focus:outline-none focus:border-[#FF9933]" />
      <button onClick={search} className="w-full py-6 bg-[#FF9933] rounded-2xl text-white font-bold text-2xl" aria-label="Search tickets">
        Search →
      </button>
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map(r => (
            <button key={r.id} onClick={() => { setSelected(r); speak(`${r.provider}. ${r.duration}. ${r.totalPrice} rupees.`); }}
              className={`w-full p-5 rounded-2xl border-2 text-left ${selected?.id === r.id ? 'border-[#FF9933] bg-[#FF9933]/10' : 'border-white/20 bg-white/5'}`}
              aria-label={`${r.provider}, ${r.totalPrice} rupees`}>
              <p className="text-white font-bold text-xl">{r.provider}</p>
              <p className="text-white/60 text-lg">{r.duration} · Seats: {r.availableSeats}</p>
              <p className="text-[#FF9933] font-bold text-2xl">₹{r.totalPrice}</p>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <button onClick={() => { speak(`Book ticket for ${selected.totalPrice} rupees. Confirm.`); setAuthModal(true); }}
          className="w-full py-6 bg-[#FF9933] rounded-2xl text-white font-bold text-2xl">Book ₹{selected.totalPrice} →</button>
      )}
      <AuthModal show={authModal} info={`Ticket ₹${selected?.totalPrice}`} user={user} onDone={confirmBook} onCancel={() => setAuthModal(false)} />
    </div>
  );
}

// ======= HISTORY =======
function HistoryView() {
  const [txns, setTxns] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { speak('Transaction history.'); api.get('/transactions/history?limit=20').then(r => { setTxns(r.data.transactions); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <div className="text-center p-10"><div className="w-12 h-12 border-4 border-[#FF9933] border-t-transparent rounded-full animate-spin mx-auto" /></div>;
  return (
    <div role="main" aria-label="Transaction History">
      <h2 className="text-white font-bold text-3xl mb-4">📋 History</h2>
      {txns.length === 0 ? <p className="text-white/40 text-xl text-center py-10">No transactions yet</p> : (
        <div className="space-y-3">
          {txns.map(t => (
            <div key={t._id} className={`bg-white/5 rounded-2xl p-5 border-2 ${t.type === 'credit' ? 'border-green-500/30' : t.status === 'blocked' ? 'border-red-500/30' : 'border-white/20'}`}
              aria-label={`${t.type} ${t.amount} rupees to ${t.merchant}`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-white font-bold text-xl">{t.merchant}</p>
                  <p className="text-white/40 text-lg">{new Date(t.timestamp).toLocaleDateString('en-IN')}</p>
                </div>
                <p className={`font-bold text-2xl ${t.type === 'credit' ? 'text-green-400' : 'text-white'}`}>
                  {t.type === 'credit' ? '+' : '-'}₹{t.amount}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ======= VOICE CONTROL =======
function VoiceControl({ user, onSuccess }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  const processCommand = async (text) => {
    const t = text.toLowerCase();
    speak(`You said: ${text}`);

    if (t.includes('balance') || t.includes('how much')) {
      speak(`Your balance is ${user?.walletBalance} rupees.`);
    } else if (t.includes('recharge')) {
      speak('Opening recharge page.');
    } else if ((t.includes('send') || t.includes('pay')) && t.match(/(\d+)/)) {
      const amt = t.match(/(\d+)/)[1];
      speak(`You want to pay ${amt} rupees. Go to the pay tab to complete.`);
    } else if (t.includes('history') || t.includes('transaction')) {
      speak('Opening transaction history.');
    } else {
      speak('Sorry, I did not understand. Try saying check my balance, or pay 100 rupees.');
    }
    setTranscript(text);
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { speak('Voice recognition not available in this browser.'); return; }
    if (recognitionRef.current) recognitionRef.current.stop();
    const r = new SR(); r.continuous = false; r.lang = 'en-IN';
    r.onstart = () => { setListening(true); speak('Listening. Speak your command.'); };
    r.onresult = e => processCommand(e.results[0][0].transcript);
    r.onend = () => setListening(false);
    r.onerror = () => { setListening(false); speak('Voice error. Try again.'); };
    r.start(); recognitionRef.current = r;
  };

  return (
    <button onClick={startVoice}
      className={`fixed bottom-6 right-6 w-16 h-16 rounded-full flex items-center justify-center z-50 shadow-2xl ${listening ? 'bg-red-500 animate-pulse' : 'bg-[#FF9933]'}`}
      aria-label="Voice command button">
      <span className="text-3xl">🎤</span>
    </button>
  );
}

// ======= MAIN DASHBOARD =======
export default function AccessibilityDashboard() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [localUser, setLocalUser] = useState(user);
  const [showGesture, setShowGesture] = useState(false);
  const [showVoice, setShowVoice] = useState(false);

  const VOICE_NAV_ITEMS = [
    { label: 'Home', path: '', aliases: ['home', 'dashboard'] },
    { label: 'Pay', path: 'pay', aliases: ['pay', 'payment'] },
    { label: 'Bills', path: 'bills', aliases: ['bills', 'electricity', 'water'] },
    { label: 'Recharge', path: 'recharge', aliases: ['recharge', 'mobile'] },
    { label: 'Gold', path: 'gold', aliases: ['gold', 'silver'] },
    { label: 'Tickets', path: 'tickets', aliases: ['tickets', 'travel'] },
    { label: 'History', path: 'history', aliases: ['history', 'transactions'] },
  ];

  useEffect(() => { setLocalUser(user); }, [user]);

  const handleSuccess = (data) => {
    if (data.walletBalance !== undefined) {
      updateUser({ walletBalance: data.walletBalance });
      setLocalUser(prev => ({ ...prev, walletBalance: data.walletBalance }));
    }
  };

  return (
    <div className="min-h-screen bg-[#050a18]" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* High contrast header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-[#0a1628] border-b-2 border-[#FF9933]/40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF9933] rounded-xl flex items-center justify-center text-white font-bold text-xl">₹</div>
            <span className="font-bold text-2xl text-white">PayBridge</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { speak('Logging out'); logout(); navigate('/'); }}
              className="px-3 py-2 bg-white/10 rounded-xl text-white font-bold text-base border-2 border-white/20" aria-label="Logout">
              Logout
            </button>
            <button onClick={() => { setShowGesture(s => !s); if (showVoice) setShowVoice(false); speak(showGesture ? 'Gesture off' : 'Gesture on'); }}
              className={`px-3 py-2 rounded-xl font-bold text-lg border-2 ${showGesture ? 'border-[#FF9933] bg-[#FF9933]/10 text-[#FF9933]' : 'bg-white/10 text-white border-white/20'}`} aria-label="Camera gesture">
              ✋
            </button>
            <button onClick={() => { setShowVoice(s => !s); if (showGesture) setShowGesture(false); speak(showVoice ? 'Voice navigation off' : 'Voice navigation on'); }}
              className={`px-3 py-2 rounded-xl font-bold text-lg border-2 ${showVoice ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'bg-white/10 text-white border-white/20'}`} aria-label="Voice navigation">
              🎙️
            </button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 flex gap-2 pb-3 overflow-x-auto scrollbar-hide">
          {NAV.map(n => (
            <NavLink key={n.path} to={`/accessibility/${n.path}`} end={n.path === ''}
              className={({ isActive }) => `flex-shrink-0 px-4 py-2 rounded-xl text-lg font-bold transition-all ${isActive ? 'bg-[#FF9933] text-white' : 'text-white/60 bg-white/5 border border-white/20'}`}
              aria-label={n.aria}>{n.label}</NavLink>
          ))}
        </div>
      </div>

      <motion.div 
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(e, info) => {
          const threshold = 100;
          const currentIndex = NAV.findIndex(n => location.pathname === `/accessibility/${n.path}` || (n.path==='' && location.pathname==='/accessibility'));
          if (info.offset.x > threshold && currentIndex > 0) {
            const next = NAV[currentIndex - 1];
            navigate(`/accessibility/${next.path}`);
            speak(`Swiped to ${next.label}`);
          } else if (info.offset.x < -threshold && currentIndex < NAV.length - 1) {
            const next = NAV[currentIndex + 1];
            navigate(`/accessibility/${next.path}`);
            speak(`Swiped to ${next.label}`);
          }
        }}
        className="max-w-2xl mx-auto px-4 pt-36 pb-24 touch-pan-y"
      >
        <Routes>
          <Route path="/" element={<HomeView user={localUser} />} />
          <Route path="pay" element={<PayView user={localUser} onSuccess={handleSuccess} />} />
          <Route path="bills" element={<BillsView user={localUser} onSuccess={handleSuccess} />} />
          <Route path="recharge" element={<RechargeView user={localUser} onSuccess={handleSuccess} />} />
          <Route path="gold" element={<GoldView user={localUser} onSuccess={handleSuccess} />} />
          <Route path="tickets" element={<TicketsView user={localUser} onSuccess={handleSuccess} />} />
          <Route path="history" element={<HistoryView />} />
        </Routes>
      </motion.div>

      <VoiceControl user={localUser} onSuccess={handleSuccess} />
      <AnimatePresence>
        {showGesture && <HandGestureNav basePath="/accessibility" onNavigate={(path) => navigate(path)} onClose={() => setShowGesture(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showVoice && <VoiceNav basePath="/accessibility" navItems={VOICE_NAV_ITEMS} onNavigate={(path) => navigate(path)} onClose={() => setShowVoice(false)} />}
      </AnimatePresence>
      <AlwaysOnMic
        user={localUser}
        basePath="/accessibility"
        navItems={VOICE_NAV_ITEMS}
        onNavigate={(path) => navigate(path)}
      />
      <BankChatbot />
    </div>
  );
}
