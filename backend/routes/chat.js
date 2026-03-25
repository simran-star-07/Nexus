const router = require('express').Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');

// Bank-related keywords for context gating
const BANK_KEYWORDS = [
  'balance', 'wallet', 'money', 'payment', 'pay', 'send', 'transfer', 'transaction',
  'history', 'spent', 'spend', 'spending', 'recharge', 'bill', 'goal', 'sip', 'save',
  'savings', 'upi', 'pin', 'security', 'daily limit', 'freeze', 'frozen', 'allowance',
  'reward', 'xp', 'level', 'badge', 'streak', 'account', 'bank', 'deposit', 'withdraw',
  'top up', 'top-up', 'load', 'gold', 'silver', 'ticket', 'booking', 'refund', 'merchant',
  'category', 'budget', 'limit', 'parent', 'child', 'amount', 'rupee', 'rupees', '₹',
  'credit', 'debit', 'how much', 'total', 'today', 'week', 'month', 'recent',
  'help', 'what can', 'features', 'paybridge', 'hi', 'hello', 'hey',
  'profile', 'name', 'email', 'mobile', 'phone', 'number', 'my account', 'my details',
  'who am i', 'upi id', 'member', 'joined', 'role', 'status', 'active', 'info'
];

function isBankRelated(message) {
  const lower = message.toLowerCase();
  return BANK_KEYWORDS.some(kw => lower.includes(kw));
}

async function generateResponse(message, userId) {
  const lower = message.toLowerCase();
  const user = await User.findById(userId).select('name email mobile upiId walletBalance xpPoints rewardsPoints streakCount role createdAt freezeStatus dailyLimit');
  
  // Greetings
  if (['hi', 'hello', 'hey'].some(g => lower.startsWith(g))) {
    return `Hello ${user.name}! 👋 I'm your PayBridge banking assistant. Ask me about your balance, transactions, goals, or any account-related query. How can I help you today?`;
  }

  // Help / Features
  if (lower.includes('help') || lower.includes('what can') || lower.includes('feature')) {
    return `I can help you with:\n• 💰 Check your wallet balance\n• 👤 View your profile & account details\n• 📋 View recent transactions\n• 🎯 Check your savings goals\n• 📊 Spending insights\n• 🏆 XP, rewards & streak info\n• 🔐 Security & PIN queries\n\nJust ask me anything about your account!`;
  }

  // Profile / Account details
  if (lower.includes('profile') || lower.includes('my account') || lower.includes('my details') || lower.includes('who am i') || lower.includes('info') || lower.includes('my name')) {
    const joined = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', {year:'numeric',month:'long',day:'numeric'}) : 'N/A';
    return `👤 **Your Profile:**\n• **Name:** ${user.name}\n• **Email:** ${user.email}\n• **Mobile:** ${user.mobile || 'Not set'}\n• **UPI ID:** ${user.upiId || 'Not generated'}\n• **Role:** ${user.role.charAt(0).toUpperCase()+user.role.slice(1)}\n• **Member Since:** ${joined}\n• **Status:** ${user.freezeStatus ? '❄️ Frozen' : '✅ Active'}\n• **Daily Limit:** ${user.dailyLimit > 0 ? '₹'+user.dailyLimit : 'No limit'}`;
  }

  // Name
  if (lower.includes('name') && !lower.includes('profile')) {
    return `Your name on PayBridge is **${user.name}**.`;
  }

  // Email
  if (lower.includes('email')) {
    return `Your registered email is **${user.email}**.`;
  }

  // Mobile
  if (lower.includes('mobile') || lower.includes('phone') || lower.includes('number')) {
    return user.mobile ? `Your registered mobile number is **${user.mobile}**.` : 'You haven\'t set a mobile number yet. Update it in your profile settings.';
  }

  // UPI ID
  if (lower.includes('upi id') || lower.includes('upi')) {
    return user.upiId ? `Your UPI ID is **${user.upiId}**.` : 'You don\'t have a UPI ID yet. Complete your profile to get one.';
  }

  // Balance
  if (lower.includes('balance') || lower.includes('how much money') || lower.includes('wallet')) {
    return `💰 Your current wallet balance is **₹${user.walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}**.\n\n🪙 Rewards: ${user.rewardsPoints || 0} points\n⭐ XP: ${user.xpPoints || 0}\n🔥 Streak: ${user.streakCount || 0} days`;
  }

  // Recent transactions
  if (lower.includes('transaction') || lower.includes('history') || lower.includes('recent') || lower.includes('spent today')) {
    const limit = lower.includes('today') ? 10 : 5;
    const query = { userId };
    if (lower.includes('today')) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query.timestamp = { $gte: today };
    }
    const txns = await Transaction.find(query).sort({ timestamp: -1 }).limit(limit);
    if (txns.length === 0) return '📋 No transactions found for this period.';
    
    let totalSpent = 0;
    const lines = txns.map(t => {
      if (t.type === 'debit') totalSpent += t.amount;
      return `${t.type === 'credit' ? '🟢' : '🔴'} ₹${t.amount} — ${t.merchant} (${t.category})`;
    });
    return `📋 **Recent Transactions:**\n${lines.join('\n')}\n\n💸 Total debits shown: ₹${totalSpent.toLocaleString('en-IN')}`;
  }

  // Goals
  if (lower.includes('goal') || lower.includes('sip') || lower.includes('saving')) {
    const goals = await Goal.find({ userId }).sort({ createdAt: -1 }).limit(5);
    if (goals.length === 0) return '🎯 You haven\'t created any savings goals yet. Go to the Goals tab to get started!';
    
    const lines = goals.map(g => {
      const pct = Math.min(100, (g.savedAmount / g.targetAmount) * 100).toFixed(0);
      const status = g.isCompleted ? '✅' : g.isPaused ? '⏸️' : '🔄';
      return `${status} **${g.title}** — ₹${g.savedAmount}/${g.targetAmount} (${pct}%)`;
    });
    return `🎯 **Your Savings Goals:**\n${lines.join('\n')}`;
  }

  // Spending insights
  if (lower.includes('spend') || lower.includes('insight') || lower.includes('analytics') || lower.includes('budget')) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const txns = await Transaction.find({ userId, type: 'debit', timestamp: { $gte: weekAgo } });
    const total = txns.reduce((s, t) => s + t.amount, 0);
    const categories = {};
    txns.forEach(t => { categories[t.category] = (categories[t.category] || 0) + t.amount; });
    const catLines = Object.entries(categories).sort((a, b) => b[1] - a[1]).map(([c, v]) => `  • ${c}: ₹${v.toLocaleString('en-IN')}`);
    return `📊 **This Week's Spending:** ₹${total.toLocaleString('en-IN')}\n\n${catLines.length > 0 ? `**By Category:**\n${catLines.join('\n')}` : 'No spending this week!'}`;
  }

  // XP/Rewards
  if (lower.includes('xp') || lower.includes('level') || lower.includes('reward') || lower.includes('badge') || lower.includes('streak')) {
    return `🏆 **Your Stats:**\n⭐ XP: ${user.xpPoints || 0}\n🪙 Rewards: ${user.rewardsPoints || 0} points\n🔥 Streak: ${user.streakCount || 0} days\n\nKeep saving and transacting to earn more XP!`;
  }

  // Security
  if (lower.includes('pin') || lower.includes('security') || lower.includes('password') || lower.includes('vibration') || lower.includes('fingerprint')) {
    return '🔐 PayBridge uses **triple-layer security**:\n1. **6-digit PIN** for quick confirmations\n2. **Vibration Pattern** — your unique tap rhythm\n3. **Fingerprint (WebAuthn)** — biometric security\n\nTo reset your PIN or password, use the "Forgot" option on the login page.';
  }

  // Freeze
  if (lower.includes('freeze') || lower.includes('frozen') || lower.includes('block')) {
    return '❄️ Wallet freezing is managed by your parent/guardian. If your wallet is frozen, please contact them directly or submit a money request through the app.';
  }

  // Fallback for bank-related but unmatched
  return `I understand you're asking about "${message}". Here's what I can help with:\n• Say "balance" to check your wallet\n• Say "transactions" for recent activity\n• Say "goals" for savings progress\n• Say "spending" for weekly insights\n• Say "help" for all features`;
}

// POST /api/chat
router.post('/', auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ message: 'Message is required.' });

    // Context gate: reject non-bank messages
    if (!isBankRelated(message)) {
      return res.json({ 
        reply: '🚫 I\'m your **PayBridge banking assistant** and I can only help with account-related queries.\n\nTry asking me about:\n• Your wallet balance\n• Recent transactions\n• Savings goals\n• Spending insights\n• Account security',
        filtered: true
      });
    }

    const reply = await generateResponse(message, req.user._id);
    res.json({ reply, filtered: false });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ message: 'Chat service error.' });
  }
});

module.exports = router;
