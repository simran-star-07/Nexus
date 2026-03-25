const router = require('express').Router();
const { auth } = require('../middleware/auth');
const Badge = require('../models/Badge');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');

const BADGE_DEFS = [
  { key: 'first_payment', title: 'First Payment', emoji: '🎯', desc: 'Made your first payment', check: async (uid) => (await Transaction.countDocuments({ userId: uid, type: 'debit' })) >= 1 },
  { key: '10_payments', title: '10 Payments', emoji: '🔥', desc: 'Completed 10 payments', check: async (uid) => (await Transaction.countDocuments({ userId: uid, type: 'debit' })) >= 10 },
  { key: '50_payments', title: '50 Payments', emoji: '💎', desc: 'Completed 50 payments', check: async (uid) => (await Transaction.countDocuments({ userId: uid, type: 'debit' })) >= 50 },
  { key: '100_xp', title: 'XP Collector', emoji: '⭐', desc: 'Earned 100+ XP', check: async (uid) => { const u = await User.findById(uid); return (u?.xpPoints || 0) >= 100; } },
  { key: '500_xp', title: 'XP Master', emoji: '🌟', desc: 'Earned 500+ XP', check: async (uid) => { const u = await User.findById(uid); return (u?.xpPoints || 0) >= 500; } },
  { key: 'first_goal', title: 'Goal Setter', emoji: '🎯', desc: 'Created your first savings goal', check: async (uid) => (await Goal.countDocuments({ userId: uid })) >= 1 },
  { key: 'goal_complete', title: 'Goal Achieved', emoji: '🏆', desc: 'Completed a savings goal', check: async (uid) => (await Goal.countDocuments({ userId: uid, isCompleted: true })) >= 1 },
  { key: '7_streak', title: '7-Day Streak', emoji: '🔥', desc: '7 consecutive active days', check: async (uid) => { const u = await User.findById(uid); return (u?.streakCount || 0) >= 7; } },
  { key: '30_streak', title: 'Monthly Streak', emoji: '🌋', desc: '30 consecutive active days', check: async (uid) => { const u = await User.findById(uid); return (u?.streakCount || 0) >= 30; } },
  { key: 'saver_1000', title: 'Smart Saver', emoji: '💰', desc: 'Saved ₹1000+ in goals', check: async (uid) => { const goals = await Goal.find({ userId: uid }); return goals.reduce((s, g) => s + g.savedAmount, 0) >= 1000; } },
];

// GET /api/badges — returns earned + available
router.get('/', auth, async (req, res) => {
  try {
    // Check and award new badges
    for (const def of BADGE_DEFS) {
      const exists = await Badge.findOne({ userId: req.user._id, key: def.key });
      if (!exists && await def.check(req.user._id)) {
        await Badge.create({ userId: req.user._id, key: def.key, title: def.title, emoji: def.emoji, description: def.desc });
      }
    }
    const earned = await Badge.find({ userId: req.user._id }).sort({ earnedAt: -1 });
    const all = BADGE_DEFS.map(d => ({ ...d, earned: earned.some(e => e.key === d.key), earnedAt: earned.find(e => e.key === d.key)?.earnedAt }));
    delete all.forEach(a => delete a.check);
    res.json({ badges: all, earned: earned.length, total: BADGE_DEFS.length });
  } catch (err) {
    res.status(500).json({ message: 'Badge error.' });
  }
});

module.exports = router;
