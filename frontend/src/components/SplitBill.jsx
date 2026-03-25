import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function SplitBill() {
  const [show, setShow] = useState(false);
  const [total, setTotal] = useState('');
  const [people, setPeople] = useState([{ name: '', upi: '' }]);
  const [result, setResult] = useState(null);

  const addPerson = () => setPeople(p => [...p, { name: '', upi: '' }]);
  const removePerson = (i) => setPeople(p => p.filter((_, idx) => idx !== i));
  const updatePerson = (i, field, val) => setPeople(p => p.map((person, idx) => idx === i ? { ...person, [field]: val } : person));

  const split = () => {
    if (!total || Number(total) <= 0) return toast.error('Enter total amount');
    const validPeople = people.filter(p => p.name);
    if (validPeople.length === 0) return toast.error('Add at least one person');
    const perPerson = (Number(total) / (validPeople.length + 1)).toFixed(2); // +1 for self
    setResult({ perPerson, total: Number(total), count: validPeople.length + 1, people: validPeople });
    toast.success(`₹${perPerson} each for ${validPeople.length + 1} people`);
  };

  return (
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="glass rounded-3xl border border-white/10 overflow-hidden">
      <div className="px-5 py-3 border-b border-white/10 flex justify-between items-center">
        <h3 className="text-white font-bold text-sm">🍕 Split Bill</h3>
        <button onClick={() => { setShow(s=>!s); setResult(null); }} className="text-xs text-saffron-500 hover:underline">{show ? 'Close' : 'Split Now'}</button>
      </div>

      <AnimatePresence>
        {show && (
          <motion.div initial={{height:0}} animate={{height:'auto'}} exit={{height:0}} className="overflow-hidden">
            <div className="p-4 space-y-3">
              <input type="number" placeholder="Total bill amount (₹)" value={total} onChange={e => setTotal(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-saffron-500/50" />

              <p className="text-white/40 text-xs font-semibold">Split with:</p>
              {people.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input placeholder={`Person ${i+1}`} value={p.name} onChange={e => updatePerson(i, 'name', e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none" />
                  <input placeholder="UPI ID" value={p.upi} onChange={e => updatePerson(i, 'upi', e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none" />
                  {people.length > 1 && (
                    <button onClick={() => removePerson(i)} className="text-red-400/50 hover:text-red-400 text-sm px-2">✕</button>
                  )}
                </div>
              ))}
              <button onClick={addPerson} className="text-saffron-500 text-xs hover:underline">+ Add person</button>

              <button onClick={split} className="w-full gradient-saffron py-3 rounded-xl text-white font-bold text-sm">Calculate Split</button>

              {result && (
                <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="bg-saffron-500/10 border border-saffron-500/20 rounded-xl p-4 text-center">
                  <p className="text-saffron-500 text-2xl font-bold mb-1">₹{result.perPerson}</p>
                  <p className="text-white/50 text-xs">per person ({result.count} people)</p>
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">You</span>
                      <span className="text-saffron-500 font-bold">₹{result.perPerson}</span>
                    </div>
                    {result.people.map((p, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-white/50">{p.name}</span>
                        <span className="text-white font-medium">₹{result.perPerson} {p.upi && `→ ${p.upi}`}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
