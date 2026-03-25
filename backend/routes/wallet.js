const router = require('express').Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');

// GET /api/wallet/balance
router.get('/balance', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('walletBalance name');
    res.json({ walletBalance: user.walletBalance });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/wallet/load  - self load money (Only for Divyang and Parent)
router.post('/load', auth, async (req, res) => {
  try {
    const { amount, source } = req.body; // source: 'bank', 'card', etc.
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount.' });
    
    const user = await User.findById(req.user._id);
    
    // Requirement: Only parent can add money to student wallet.
    if (user.role === 'student') {
      return res.status(403).json({ message: 'Transfers to this account are only permitted from the linked parent account.' });
    }

    const newBalance = user.walletBalance + Number(amount);
    await User.findByIdAndUpdate(req.user._id, { walletBalance: newBalance });

    const txn = await Transaction.create({
      userId: req.user._id,
      type: 'credit',
      amount: Number(amount),
      merchant: `Self Top-up (${source || 'Bank'})`,
      category: 'wallet_load',
      status: 'approved',
      balanceAfter: newBalance,
      authMethod: 'none'
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { xpPoints: 10 } });
    res.json({ message: 'Wallet loaded successfully.', walletBalance: newBalance, transaction: txn });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// POST /api/wallet/parent-load - Parent loading child's wallet
router.post('/parent-load', auth, async (req, res) => {
  try {
    const { childId, amount } = req.body;
    if (req.user.role !== 'parent') return res.status(403).json({ message: 'Only parents can use this.' });
    
    const child = await User.findById(childId);
    if (!child || String(child.parentId) !== String(req.user._id)) {
      return res.status(404).json({ message: 'Linked child not found.' });
    }

    const parent = await User.findById(req.user._id);
    if (parent.walletBalance < amount) return res.status(400).json({ message: 'Insufficient parent balance.' });

    // Deduct from parent, add to child
    await User.findByIdAndUpdate(req.user._id, { $inc: { walletBalance: -Number(amount) } });
    const newChildBalance = child.walletBalance + Number(amount);
    await User.findByIdAndUpdate(childId, { walletBalance: newChildBalance });

    // Transaction for parent
    await Transaction.create({
      userId: req.user._id,
      type: 'debit',
      amount: Number(amount),
      merchant: `Allowance to ${child.name}`,
      category: 'allowance',
      status: 'approved',
      balanceAfter: parent.walletBalance - amount
    });

    // Transaction for child
    await Transaction.create({
      userId: childId,
      type: 'credit',
      amount: Number(amount),
      merchant: `Allowance from Parent`,
      category: 'allowance',
      status: 'approved',
      balanceAfter: newChildBalance
    });

    res.json({ message: 'Money sent to child.', childBalance: newChildBalance });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
