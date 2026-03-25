import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';

const CATS = ['food', 'transport', 'shopping', 'education', 'recharge', 'bills', 'others'];

export default function BudgetPlanner() {
  const [budgets, setBudgets] = useState([]);
  const [newCat, setNewCat] = useState('food');
  const [newLimit, setNewLimit] = useState('');
  const [show, setShow] = useState(false);

  const load = () => api.get('/budgets').then(r => setBudgets(r.data.budgets || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newLimit || Number(newLimit) <= 0) return toast.error('Enter a valid limit');
    try {
      await api.post('/budgets', { category: newCat, limit: Number(newLimit) });
      toast.success(`Budget set for ${newCat}`);
      setNewLimit(''); setShow(false); load();
    } catch (err) { toast.error('Failed to set budget'); }
  };

  const del = async (id) => {
    await api.delete(`/budgets/${id}`).catch(() => {}); load();
  };

  return (
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="glass rounded-3xl border border-white/10 overflow-hidden">
      <div className="px-5 py-3 border-b border-white/10 flex justify-between items-center">
        <h3 className="text-white font-bold text-sm">📊 Budget Planner</h3>
        <button onClick={() => setShow(s=>!s)} className="text-xs text-saffron-500 hover:underline">{show ? 'Cancel' : '+ Add'}</button>
      </div>

      <AnimatePresence>
        {show && (
          <motion.div initial={{height:0}} animate={{height:'auto'}} exit={{height:0}} className="overflow-hidden">
            <div className="p-4 border-b border-white/5 space-y-3">
              <select value={newCat} onChange={e => setNewCat(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none capitalize">
                {CATS.map(c => <option key={c} value={c} className="bg-[#0a0e1a] capitalize">{c}</option>)}
              </select>
              <input type="number" placeholder="Monthly limit (₹)" value={newLimit} onChange={e => setNewLimit(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none" />
              <button onClick={add} className="w-full gradient-saffron py-2.5 rounded-xl text-white font-semibold text-sm">Set Budget</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 space-y-3">
        {budgets.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">No budgets set yet</p>
        ) : budgets.map(b => (
          <div key={b._id} className="bg-white/3 rounded-xl p-3 border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white text-sm font-medium capitalize">{b.category}</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${b.pct >= 90 ? 'text-red-400' : b.pct >= 70 ? 'text-amber-400' : 'text-green-400'}`}>
                  ₹{b.spent.toLocaleString('en-IN')} / ₹{b.limit.toLocaleString('en-IN')}
                </span>
                <button onClick={() => del(b._id)} className="text-white/20 hover:text-red-400 text-xs">✕</button>
              </div>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div initial={{width:0}} animate={{width:`${b.pct}%`}} transition={{duration:0.5}}
                className={`h-full rounded-full ${b.pct >= 90 ? 'bg-red-500' : b.pct >= 70 ? 'bg-amber-500' : 'bg-green-500'}`} />
            </div>
            {b.pct >= 90 && <p className="text-red-400 text-[10px] mt-1 animate-pulse">⚠️ Budget almost exceeded!</p>}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
