import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import PinPad from '../../components/PinPad';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const NAV = [
  { path: '', label: '🏠 Overview' },
  { path: 'children', label: '👧 Children' },
  { path: 'requests', label: '📩 Requests' },
  { path: 'notifications', label: '🔔 Alerts' },
  { path: 'settings', label: '⚙️ Settings' },
];

// ======= CHILD CARD =======
function ChildCard({ child, onRefresh }) {
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [amount, setAmount] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const addMoney = async (pin) => {
    setLoading(true);
    try {
      const { data } = await api.post('/parental/add-money', { childId: child.child._id, amount: Number(amount), pin });
      toast.success(data.message);
      setShowAddMoney(false); setShowPin(false); setAmount('');
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); setShowPin(false); }
  };

  const toggleFreeze = async () => {
    try {
      if (child.freezeStatus) {
        await api.post('/parental/unfreeze', { childId: child.child._id });
        toast.success('Wallet unfrozen');
      } else {
        await api.post('/parental/freeze', { childId: child.child._id });
        toast.success('Wallet frozen');
      }
      onRefresh();
    } catch (err) { toast.error('Failed'); }
  };

  const limitPct = child.dailyLimit > 0 ? Math.min(100, (child.todaySpending / child.dailyLimit) * 100) : 0;

  return (
    <div className="glass rounded-2xl p-5 border border-white/10 mb-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-white font-bold text-lg">{child.child.name}</h3>
          <p className="text-white/40 text-xs">{child.child.email}</p>
        </div>
        <button onClick={toggleFreeze}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${child.freezeStatus ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
          {child.freezeStatus ? '🔒 Frozen' : '🔓 Active'}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-white/50 text-xs">Balance</p>
          <p className="text-white font-bold">₹{child.child.walletBalance.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-white/50 text-xs">Today Spent</p>
          <p className="text-saffron-500 font-bold">₹{child.todaySpending}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-white/50 text-xs">Goals</p>
          <p className="text-white font-bold">{child.activeGoals} active</p>
        </div>
      </div>
      {child.dailyLimit > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white/50">Daily Limit</span>
            <span className={`font-bold ${limitPct >= 100 ? 'text-red-400' : limitPct >= 80 ? 'text-amber-400' : 'text-green-400'}`}>
              ₹{child.todaySpending} / ₹{child.dailyLimit}
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${limitPct >= 100 ? 'bg-red-500' : limitPct >= 80 ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${limitPct}%` }} />
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => setShowAddMoney(s => !s)} className="flex-1 gradient-saffron py-2.5 rounded-xl text-white font-semibold text-sm">
          + Add Money
        </button>
        <button onClick={async () => {
          try {
            const { data } = await api.get(`/parental/statement/${child.child._id}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${child.child.name}_Statement.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
          } catch { toast.error('Failed to download PDF'); }
        }} className="px-4 glass rounded-xl text-white/70 border border-white/10 hover:border-saffron-500/30">
          📄 PDF
        </button>
      </div>
      <AnimatePresence>
        {showAddMoney && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-3">
            <input type="number" placeholder="Amount (₹)" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/50" />
            {[100, 500, 1000, 2000].map(a => (
              <button key={a} onClick={() => setAmount(String(a))} className="mr-2 px-4 py-1.5 glass rounded-lg text-white/70 text-sm border border-white/10">₹{a}</button>
            ))}
            <button onClick={() => { if (!amount) return toast.error('Enter amount'); setShowPin(true); }}
              className="w-full gradient-saffron py-2.5 rounded-xl text-white font-bold text-sm mt-2">Confirm with PIN</button>
          </motion.div>
        )}
      </AnimatePresence>
      {showPin && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl p-6 w-full max-w-sm border border-white/10">
            <PinPad onComplete={addMoney} onCancel={() => setShowPin(false)} title="Enter your PIN" />
          </div>
        </div>
      )}
    </div>
  );
}

// ======= MONEY REQUESTS =======
function MoneyRequests({ childrenData, onRefresh }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const allReqs = [];
      for (const c of childrenData) {
        try {
          const { data } = await api.get(`/parental/money-requests?childId=${c.child._id}`);
          (data.requests || []).forEach((r) => allReqs.push({ ...r, childName: c.child.name, childId: c.child._id }));
        } catch { }
      }
      setRequests(allReqs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setLoading(false);
    };
    if (childrenData.length > 0) fetchAll();
    else setLoading(false);
  }, [childrenData]);

  const handleAction = async (req, action) => {
    try {
      await api.post(`/parental/money-request/${req._id}/${action}`, { childId: req.childId });
      toast.success(`Request ${action}d!`);
      onRefresh();
      setRequests(prev => prev.map(r => r._id === req._id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r));
    } catch (err) { toast.error('Failed'); }
  };

  if (loading) return <div className="text-center p-10"><div className="w-8 h-8 border-4 border-saffron-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div>
      <h2 className="text-white font-bold text-xl mb-4">📩 Money Requests</h2>
      {requests.length === 0 ? (
        <div className="glass rounded-2xl p-10 border border-white/10 text-center">
          <p className="text-5xl mb-3">📩</p><p className="text-white/40">No money requests yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r, i) => (
            <div key={i} className={`glass rounded-2xl p-4 border ${r.status === 'pending' ? 'border-saffron-500/30' : 'border-white/10'}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-white font-bold">{r.childName}</p>
                  <p className="text-saffron-500 font-bold">₹{r.amount}</p>
                  <p className="text-white/40 text-xs capitalize">📋 {r.reason?.replace('_', ' ')}</p>
                  {r.note && <p className="text-white/30 text-xs italic">"{r.note}"</p>}
                </div>
                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${r.status === 'approved' ? 'bg-green-500/20 text-green-400' : r.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-saffron-500/20 text-saffron-400'}`}>
                  {r.status}
                </span>
              </div>
              {r.status === 'pending' && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleAction(r, 'approve')} className="flex-1 py-2 bg-green-500/20 text-green-400 rounded-xl font-semibold text-sm border border-green-500/30">✓ Approve</button>
                  <button onClick={() => handleAction(r, 'reject')} className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-xl font-semibold text-sm border border-red-500/30">✕ Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ======= NOTIFICATIONS =======
function NotificationsPanel({ childrenData }) {
  const [notifs, setNotifs] = useState([]);
  useEffect(() => {
    const fetchAll = async () => {
      const all = [];
      for (const c of childrenData) {
        try {
          const { data } = await api.get(`/parental/notifications?childId=${c.child._id}`);
          (data.notifications || []).forEach(n => all.push({ ...n, childName: c.child.name }));
        } catch { }
      }
      // Also fetch global notifications
      try { const { data } = await api.get('/notifications'); (data.notifications || []).forEach(n => all.push(n)); } catch { }
      setNotifs(all.sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt)).slice(0, 50));
    };
    fetchAll();
  }, [childrenData]);

  const typeEmoji = { payment: '💸', blocked: '🚫', limit_warning: '⚠️', allowance: '🎁', money_request: '🙋', restricted_app: '🔴', sip: '🎯', freeze: '🔒' };

  return (
    <div>
      <h2 className="text-white font-bold text-xl mb-4">🔔 Notifications</h2>
      {notifs.length === 0 ? (
        <div className="glass rounded-2xl p-10 border border-white/10 text-center"><p className="text-5xl mb-3">🔔</p><p className="text-white/40">No notifications</p></div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n, i) => (
            <div key={i} className={`glass rounded-xl p-3 border ${n.read === false ? 'border-saffron-500/30 bg-saffron-500/5' : 'border-white/10'}`}>
              <div className="flex items-start gap-3">
                <span className="text-xl">{typeEmoji[n.type] || '📌'}</span>
                <div className="flex-1">
                  <p className="text-white text-sm">{n.message}</p>
                  <p className="text-white/30 text-xs">{new Date(n.timestamp || n.createdAt).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ======= SETTINGS (Daily Limit, Auto-Pay, Link Child) =======
function SettingsPanel({ childrenData, onRefresh }) {
  const [selectedChild, setSelectedChild] = useState('');
  const [dailyLimit, setDailyLimit] = useState('');
  const [linkMobile, setLinkMobile] = useState('');
  const [autoPayForm, setAutoPayForm] = useState({ amount: '', frequency: 'weekly', dayOfWeek: '1', dayOfMonth: '1' });
  const [loading, setLoading] = useState(false);

  const setLimit = async () => {
    if (!selectedChild || !dailyLimit) return toast.error('Select child and enter limit');
    try {
      await api.post('/parental/set-daily-limit', { childId: selectedChild, dailyLimit: Number(dailyLimit) });
      toast.success('Daily limit set!'); onRefresh();
    } catch { toast.error('Failed'); }
  };

  const linkChild = async () => {
    if (!linkMobile) return toast.error('Enter child mobile');
    try {
      const { data } = await api.post('/auth/link-child', { childMobile: linkMobile });
      toast.success(data.message); setLinkMobile(''); onRefresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const createAutoPay = async () => {
    if (!selectedChild || !autoPayForm.amount) return toast.error('Fill all fields');
    try {
      await api.post('/parental/auto-pay', {
        childId: selectedChild, amount: Number(autoPayForm.amount),
        frequency: autoPayForm.frequency,
        dayOfWeek: Number(autoPayForm.dayOfWeek),
        dayOfMonth: Number(autoPayForm.dayOfMonth),
        startDate: new Date().toISOString()
      });
      toast.success('Auto-pay created!');
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-white font-bold text-xl">⚙️ Parent Settings</h2>

      {/* Link Child */}
      <div className="glass rounded-2xl p-5 border border-white/10">
        <h3 className="text-white font-bold mb-3">🔗 Link Child Account</h3>
        <div className="flex gap-3">
          <input placeholder="Child's mobile number" value={linkMobile} onChange={e => setLinkMobile(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/50" />
          <button onClick={linkChild} className="px-6 gradient-saffron rounded-xl text-white font-semibold">Link</button>
        </div>
      </div>

      {/* Daily Limit */}
      <div className="glass rounded-2xl p-5 border border-white/10">
        <h3 className="text-white font-bold mb-3">📊 Set Daily Limit</h3>
        <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-3 focus:outline-none">
          <option value="">Select child</option>
          {childrenData.map(c => <option key={c.child._id} value={c.child._id}>{c.child.name}</option>)}
        </select>
        <div className="flex gap-3">
          <input type="number" placeholder="Daily limit (₹)" value={dailyLimit} onChange={e => setDailyLimit(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none" />
          <button onClick={setLimit} className="px-6 gradient-saffron rounded-xl text-white font-semibold">Set</button>
        </div>
      </div>

      {/* Auto-Pay */}
      <div className="glass rounded-2xl p-5 border border-white/10">
        <h3 className="text-white font-bold mb-3">🔄 Auto-Pay (Standing Instruction)</h3>
        <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-3 focus:outline-none">
          <option value="">Select child</option>
          {childrenData.map(c => <option key={c.child._id} value={c.child._id}>{c.child.name}</option>)}
        </select>
        <input type="number" placeholder="Amount (₹)" value={autoPayForm.amount} onChange={e => setAutoPayForm(p => ({ ...p, amount: e.target.value }))}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 mb-3 focus:outline-none" />
        <select value={autoPayForm.frequency} onChange={e => setAutoPayForm(p => ({ ...p, frequency: e.target.value }))}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-3 focus:outline-none">
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        {autoPayForm.frequency === 'weekly' && (
          <select value={autoPayForm.dayOfWeek} onChange={e => setAutoPayForm(p => ({ ...p, dayOfWeek: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-3 focus:outline-none">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        )}
        {autoPayForm.frequency === 'monthly' && (
          <select value={autoPayForm.dayOfMonth} onChange={e => setAutoPayForm(p => ({ ...p, dayOfMonth: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-3 focus:outline-none">
            {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
        )}
        <button onClick={createAutoPay} className="w-full gradient-saffron py-3 rounded-xl text-white font-bold">Create Auto-Pay</button>
      </div>
    </div>
  );
}

// ======= MAIN PARENT DASHBOARD =======
export default function ParentDashboard() {
  const { user, logout } = useAuth();
  const { on, off } = useSocket();
  const navigate = useNavigate();
  const [childrenData, setChildrenData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchChildren = async () => {
    try {
      const { data } = await api.get('/parental/all-children');
      setChildrenData(data.children || []);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchChildren(); }, []);

  useEffect(() => {
    const handlePayment = (d) => { toast(`💸 ${d.childName || 'Child'} paid ₹${d.amount} to ${d.merchant}`, { icon: '💸' }); fetchChildren(); };
    const handleBlocked = (d) => { toast.error(`🚫 Payment blocked: ${d.reason}`); fetchChildren(); };
    const handleRestricted = (d) => { toast.error(`🔴 ${d.childName} tried restricted app: ${d.appName}`); fetchChildren(); };
    const handleRequest = (d) => { toast(`🙋 ${d.childName} requests ₹${d.amount}`, { icon: '📩' }); fetchChildren(); };
    on('payment_made', handlePayment); on('payment_blocked', handleBlocked);
    on('restricted_app_attempt', handleRestricted); on('money_request', handleRequest);
    return () => { off('payment_made', handlePayment); off('payment_blocked', handleBlocked); off('restricted_app_attempt', handleRestricted); off('money_request', handleRequest); };
  }, [on, off]);

  const profileUrl = user?.profilePhoto ? `${api.defaults.baseURL?.replace('/api', '')}${user.profilePhoto}` : null;

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <div className="fixed top-0 left-0 right-0 z-40 border-b border-white/5 glass-dark">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 gradient-saffron rounded-xl flex items-center justify-center text-white font-bold text-sm">₹</div>
            <span className="font-display font-bold text-white">Pay<span className="text-gradient-saffron">Bridge</span></span>
            <span className="text-xs text-white/30 px-2 py-0.5 bg-white/5 rounded-lg">Parent</span>
          </div>
          <div className="flex items-center gap-3">
            {profileUrl ? <img src={profileUrl} className="w-8 h-8 rounded-full object-cover border-2 border-saffron-500/50" /> :
              <div className="w-8 h-8 rounded-full bg-saffron-500/20 flex items-center justify-center text-sm">👨‍👩‍👧</div>}
            <span className="text-white/50 text-sm">{user?.name?.split(' ')[0]}</span>
            <button onClick={() => { logout(); navigate('/'); }} className="text-xs text-white/40 hover:text-white/60 px-3 py-1.5 glass rounded-lg border border-white/10">Logout</button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 flex gap-1 pb-2 overflow-x-auto scrollbar-hide">
          {NAV.map(n => (
            <NavLink key={n.path} to={`/parent/${n.path}`} end={n.path === ''}
              className={({ isActive }) => `flex-shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-saffron-500/15 text-saffron-400 border border-saffron-500/30' : 'text-white/50 hover:text-white'}`}>
              {n.label}
            </NavLink>
          ))}
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 pt-32 pb-12">
        {loading ? (
          <div className="text-center p-10"><div className="w-12 h-12 border-4 border-saffron-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : (
          <Routes>
            <Route path="/" element={
              <div>
                <h2 className="text-white font-bold text-2xl mb-4">Master Control Panel</h2>
                {childrenData.length === 0 ? (
                  <div className="glass rounded-2xl p-10 border border-white/10 text-center">
                    <p className="text-5xl mb-3">👧</p>
                    <p className="text-white/40 mb-4">No children linked yet</p>
                    <NavLink to="/parent/settings" className="px-6 py-3 gradient-saffron rounded-xl text-white font-semibold inline-block">Link a Child</NavLink>
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="glass rounded-2xl p-4 border border-white/10 text-center">
                        <p className="text-white/50 text-xs">Total Children</p>
                        <p className="text-white font-bold text-2xl">{childrenData.length}</p>
                      </div>
                      <div className="glass rounded-2xl p-4 border border-white/10 text-center">
                        <p className="text-white/50 text-xs">Today's Total Spending</p>
                        <p className="text-saffron-500 font-bold text-2xl">₹{childrenData.reduce((s, c) => s + c.todaySpending, 0)}</p>
                      </div>
                    </div>
                    {childrenData.map(c => <ChildCard key={c.child._id} child={c} onRefresh={fetchChildren} />)}
                  </div>
                )}
              </div>
            } />
            <Route path="children" element={
              <div>
                <h2 className="text-white font-bold text-xl mb-4">👧 Linked Children</h2>
                {childrenData.map(c => <ChildCard key={c.child._id} child={c} onRefresh={fetchChildren} />)}
              </div>
            } />
            <Route path="requests" element={<MoneyRequests childrenData={childrenData} onRefresh={fetchChildren} />} />
            <Route path="notifications" element={<NotificationsPanel childrenData={childrenData} />} />
            <Route path="settings" element={<SettingsPanel childrenData={childrenData} onRefresh={fetchChildren} />} />
          </Routes>
        )}
      </div>
    </div>
  );
}
