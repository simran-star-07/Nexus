import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

export default function BankChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: "👋 Hi! I'm your **PayBridge** banking assistant. Ask me about your balance, transactions, goals, or spending insights.\n\n🚫 I can only answer bank-related questions." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const send = async () => {
    const msg = input.trim();
    if (!msg) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const { data } = await api.post('/chat', { message: msg });
      setMessages(prev => [...prev, { role: 'bot', text: data.reply, filtered: data.filtered }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: '❌ Sorry, something went wrong. Please try again.' }]);
    }
    setLoading(false);
  };

  const quickActions = [
    { label: '💰 Balance', msg: 'What is my balance?' },
    { label: '👤 Profile', msg: 'Show my profile' },
    { label: '📋 Transactions', msg: 'Show recent transactions' },
    { label: '🎯 Goals', msg: 'Show my savings goals' },
    { label: '📊 Spending', msg: 'Show spending insights' },
  ];

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all ${open ? 'bg-red-500/80 rotate-45' : 'gradient-saffron shadow-saffron-500/40'}`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Bank Assistant"
      >
        <span className="text-2xl text-white">{open ? '✕' : '🤖'}</span>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-4 z-50 w-[340px] max-h-[500px] flex flex-col rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50"
            style={{ background: 'rgba(10, 14, 26, 0.95)', backdropFilter: 'blur(20px)' }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 bg-saffron-500/10 flex items-center gap-3">
              <div className="w-8 h-8 gradient-saffron rounded-full flex items-center justify-center text-sm">🤖</div>
              <div>
                <p className="text-white font-bold text-sm">PayBridge AI</p>
                <p className="text-saffron-500 text-[10px]">Bank queries only</p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-400 text-[10px]">Online</span>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[320px] scrollbar-hide">
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-saffron-500/20 text-white rounded-br-sm'
                      : m.filtered
                        ? 'bg-red-500/10 text-red-300 border border-red-500/20 rounded-bl-sm'
                        : 'bg-white/5 text-white/80 border border-white/5 rounded-bl-sm'
                  }`}>
                    {m.text.split('**').map((part, idx) => 
                      idx % 2 === 1 ? <strong key={idx} className="text-saffron-500">{part}</strong> : part
                    )}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                    <div className="w-2 h-2 bg-saffron-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-saffron-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                    <div className="w-2 h-2 bg-saffron-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="px-3 py-2 flex gap-1.5 overflow-x-auto scrollbar-hide border-t border-white/5">
              {quickActions.map(q => (
                <button key={q.label} onClick={() => { setInput(q.msg); setTimeout(send, 50); }}
                  className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium bg-white/5 text-white/50 hover:text-saffron-500 hover:bg-saffron-500/10 border border-white/10 transition-all">
                  {q.label}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/10 flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Ask about your account..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-saffron-500/50"
              />
              <button onClick={send} disabled={loading || !input.trim()}
                className="px-4 gradient-saffron rounded-xl text-white font-bold text-sm disabled:opacity-30 hover:opacity-90 transition-all">
                ↑
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
