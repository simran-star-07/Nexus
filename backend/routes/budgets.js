const router = require('express').Router();
const { auth } = require('../middleware/auth');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

const currentMonth = () => new Date().toISOString().slice(0, 7);

// GET /api/budgets — current month
router.get('/', auth, async (req, res) => {
  try {
    const month = req.query.month || currentMonth();
    const budgets = await Budget.find({ userId: req.user._id, month });
    
    // Calculate actual spending per category this month
    const startDate = new Date(month + '-01');
    const endDate = new Date(startDate); endDate.setMonth(endDate.getMonth() + 1);
    const txns = await Transaction.find({ userId: req.user._id, type: 'debit', timestamp: { $gte: startDate, $lt: endDate } });
    const spending = {};
    txns.forEach(t => { spending[t.category] = (spending[t.category] || 0) + t.amount; });

    const result = budgets.map(b => ({
      _id: b._id, category: b.category, limit: b.limit, month: b.month,
      spent: spending[b.category] || 0,
      pct: Math.min(100, Math.round(((spending[b.category] || 0) / b.limit) * 100))
    }));
    res.json({ budgets: result, month });
  } catch (err) { res.status(500).json({ message: 'Budget error.' }); }
});

// POST /api/budgets — create/update
router.post('/', auth, async (req, res) => {
  try {
    const { category, limit } = req.body;
    if (!category || !limit) return res.status(400).json({ message: 'Category and limit required.' });
    const month = currentMonth();
    const budget = await Budget.findOneAndUpdate(
      { userId: req.user._id, category, month },
      { limit, userId: req.user._id, category, month },
      { upsert: true, new: true }
    );
    res.json({ budget });
  } catch (err) { res.status(500).json({ message: 'Budget error.' }); }
});

// DELETE /api/budgets/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: 'Budget deleted.' });
  } catch (err) { res.status(500).json({ message: 'Budget error.' }); }
});

module.exports = router;
