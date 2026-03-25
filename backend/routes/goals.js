const router = require('express').Router();
const Goal = require('../models/Goal');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');

// GET /api/goals
router.get('/', auth, async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ goals });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/goals
router.post('/', auth, async (req, res) => {
  try {
    const { title, targetItem, targetAmount, goalType, dailyContribution, deadline } = req.body;
    if (!title || !targetAmount) return res.status(400).json({ message: 'Title and target amount are required.' });
    
    // Calculate projected completion if SIP
    let daysToComplete = 0;
    if (goalType === 'sip' && dailyContribution > 0) {
      daysToComplete = Math.ceil(targetAmount / dailyContribution);
    }

    const goal = await Goal.create({ 
      userId: req.user._id, 
      title, 
      targetItem,
      targetAmount, 
      goalType: goalType || 'simple',
      dailyContribution: dailyContribution || 0,
      daysToComplete,
      deadline 
    });
    res.status(201).json({ goal });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// POST /api/goals/:id/contribute
router.post('/:id/contribute', auth, async (req, res) => {
  try {
    const { amount, authMethod } = req.body; // authMethod: 'pin', 'vibration', 'fingerprint'
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount.' });
    
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
    if (!goal) return res.status(404).json({ message: 'Goal not found.' });
    if (goal.isCompleted) return res.status(400).json({ message: 'Goal already completed.' });

    const user = await User.findById(req.user._id);
    if (user.walletBalance < amount) return res.status(400).json({ message: 'Insufficient balance in wallet.' });

    // Update Wallet & Goal
    const newWalletBalance = user.walletBalance - Number(amount);
    await User.findByIdAndUpdate(req.user._id, { walletBalance: newWalletBalance });

    const isSIP = goal.goalType === 'sip';
    const updateData = {
      $inc: { savedAmount: Number(amount) },
      $push: { contributionHistory: { amount: Number(amount), date: new Date() } },
      lastContributionDate: new Date().toDateString()
    };
    
    if (isSIP) {
      updateData.$inc.vaultBalance = Number(amount);
    }

    const updatedGoal = await Goal.findByIdAndUpdate(goal._id, updateData, { new: true });
    
    // Check if completed
    if (updatedGoal.savedAmount >= updatedGoal.targetAmount) {
      await Goal.findByIdAndUpdate(goal._id, { isCompleted: true });
    }

    await Transaction.create({ 
      userId: req.user._id, 
      type: 'debit', 
      amount: Number(amount), 
      merchant: `Savings: ${goal.title}`, 
      category: 'goal', 
      status: 'approved', 
      balanceAfter: newWalletBalance, 
      authMethod: authMethod || 'none' 
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { xpPoints: 25 } });

    res.json({ 
      message: 'Contribution successful.',
      savedAmount: updatedGoal.savedAmount, 
      vaultBalance: updatedGoal.vaultBalance,
      isCompleted: updatedGoal.savedAmount >= updatedGoal.targetAmount, 
      walletBalance: newWalletBalance 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// DELETE /api/goals/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: 'Goal deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH /api/goals/:id/pause
router.patch('/:id/pause', auth, async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
    if (!goal) return res.status(404).json({ message: 'Goal not found.' });
    
    goal.isPaused = !goal.isPaused;
    await goal.save();
    
    res.json({ message: `SIP ${goal.isPaused ? 'paused' : 'resumed'}.`, isPaused: goal.isPaused });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH /api/goals/:id/celebration-seen
router.patch('/:id/celebration-seen', auth, async (req, res) => {
  try {
    await Goal.findByIdAndUpdate(req.params.id, { celebrationSeen: true });
    res.json({ message: 'ok' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
