const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Bill = require('../models/Bill');
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');

// Mock bill data
const MOCK_BILLS = {
  electricity: { provider: 'MSEDCL', minDue: 200, maxDue: 3500 },
  water: { provider: 'Municipal Water Board', minDue: 100, maxDue: 800 },
  gas: { provider: 'Indane Gas', minDue: 500, maxDue: 1200 },
  broadband: { provider: 'BSNL Broadband', minDue: 399, maxDue: 1499 },
  dth: { provider: 'Tata Play', minDue: 150, maxDue: 600 }
};

// GET /api/bills/due/:type/:consumerNo
router.get('/due/:type/:consumerNo', auth, (req, res) => {
  const { type, consumerNo } = req.params;
  const billInfo = MOCK_BILLS[type];
  if (!billInfo) return res.status(404).json({ message: 'Invalid bill type.' });
  // Generate consistent mock amount from consumer number
  const hash = consumerNo.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const due = billInfo.minDue + (hash % (billInfo.maxDue - billInfo.minDue));
  res.json({
    billType: type,
    provider: billInfo.provider,
    consumerNumber: consumerNo,
    dueAmount: due,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'unpaid'
  });
});

// POST /api/bills/pay
router.post('/pay', auth, async (req, res) => {
  try {
    const { billType, consumerNumber, amount, authMethod, pin, vibrationPattern } = req.body;
    if (!billType || !consumerNumber || !amount) return res.status(400).json({ message: 'All fields required.' });

    const user = await User.findById(req.user._id);

    // Auth
    if (authMethod === 'pin') {
      const match = await bcrypt.compare(String(pin), user.pinHash);
      if (!match) return res.status(401).json({ message: 'Incorrect PIN.' });
    } else if (authMethod === 'vibration') {
      if (!vibrationPattern || !vibrationPattern.length) return res.status(400).json({ message: 'Vibration pattern required.' });
      const stored = user.vibrationPattern;
      if (!stored || stored.length !== vibrationPattern.length) return res.status(401).json({ message: 'Vibration pattern mismatch.' });
      for (let i = 0; i < stored.length; i++) {
        if (Math.abs(stored[i] - vibrationPattern[i]) > 300) return res.status(401).json({ message: 'Vibration pattern mismatch.' });
      }
    } else if (authMethod === 'fingerprint') {
      if (!req.body.isFingerprint) return res.status(401).json({ message: 'Fingerprint auth failed.' });
    }

    if (user.walletBalance < amount) return res.status(400).json({ message: 'Insufficient balance.' });

    const newBal = user.walletBalance - Number(amount);
    await User.findByIdAndUpdate(user._id, { walletBalance: newBal });

    const bill = await Bill.create({
      userId: user._id, billType, consumerNumber, amount, status: 'paid', paidAt: new Date()
    });

    await Transaction.create({
      userId: user._id, type: 'debit', amount: Number(amount),
      merchant: `${billType.charAt(0).toUpperCase() + billType.slice(1)} Bill - ${consumerNumber}`,
      category: 'bills', status: 'approved', balanceAfter: newBal, authMethod
    });

    res.json({ message: `${billType} bill paid!`, bill, walletBalance: newBal });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// GET /api/bills/history
router.get('/history', auth, async (req, res) => {
  const bills = await Bill.find({ userId: req.user._id }).sort({ paidAt: -1 });
  res.json({ bills });
});

module.exports = router;
