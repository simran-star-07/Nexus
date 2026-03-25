const router = require('express').Router();
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');

// GET /api/transactions/history
router.get('/history', auth, async (req, res) => {
  try {
    const { limit = 20, skip = 0, category, status } = req.query;
    const filter = { userId: req.user._id };
    if (category) filter.category = category;
    if (status) filter.status = status;
    const transactions = await Transaction.find(filter).sort({ timestamp: -1 }).limit(Number(limit)).skip(Number(skip));
    const total = await Transaction.countDocuments(filter);
    res.json({ transactions, total });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/transactions/insights
router.get('/insights', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfWeek = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const startOfLastWeek = new Date(now - 14 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Category breakdown this month
    const categoryBreakdown = await Transaction.aggregate([
      { $match: { userId, type: 'debit', status: 'approved', timestamp: { $gte: startOfMonth } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    // This week vs last week spending
    const thisWeekTotal = await Transaction.aggregate([
      { $match: { userId, type: 'debit', status: 'approved', timestamp: { $gte: startOfWeek } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const lastWeekTotal = await Transaction.aggregate([
      { $match: { userId, type: 'debit', status: 'approved', timestamp: { $gte: startOfLastWeek, $lt: startOfWeek } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const thisWeek = thisWeekTotal[0]?.total || 0;
    const lastWeek = lastWeekTotal[0]?.total || 0;
    let weeklyInsight = '';
    if (lastWeek > 0) {
      const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
      if (pct > 0) weeklyInsight = `You spent ${pct}% more this week than last week.`;
      else if (pct < 0) weeklyInsight = `Great job! You spent ${Math.abs(pct)}% less this week than last week.`;
      else weeklyInsight = 'Same spending as last week.';
    }

    // Daily spending last 7 days
    const dailySpending = await Transaction.aggregate([
      { $match: { userId, type: 'debit', status: 'approved', timestamp: { $gte: startOfWeek } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, total: { $sum: '$amount' } } },
      { $sort: { _id: 1 } }
    ]);

    // Top merchant
    const topMerchant = await Transaction.aggregate([
      { $match: { userId, type: 'debit', status: 'approved', timestamp: { $gte: startOfMonth } } },
      { $group: { _id: '$merchant', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
      { $limit: 1 }
    ]);

    res.json({ categoryBreakdown, thisWeek, lastWeek, weeklyInsight, dailySpending, topMerchant: topMerchant[0] || null });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

module.exports = router;
