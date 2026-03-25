const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');

// Mock plans
const PLANS = {
  jio: [
    { id: 'jio1', name: 'Jio ₹149', amount: 149, data: '1GB/day', validity: '24 days', calls: 'Unlimited' },
    { id: 'jio2', name: 'Jio ₹239', amount: 239, data: '1.5GB/day', validity: '28 days', calls: 'Unlimited' },
    { id: 'jio3', name: 'Jio ₹299', amount: 299, data: '2GB/day', validity: '28 days', calls: 'Unlimited' },
    { id: 'jio4', name: 'Jio ₹599', amount: 599, data: '2GB/day', validity: '56 days', calls: 'Unlimited' },
    { id: 'jio5', name: 'Jio ₹999', amount: 999, data: '2.5GB/day', validity: '84 days', calls: 'Unlimited' },
  ],
  airtel: [
    { id: 'air1', name: 'Airtel ₹179', amount: 179, data: '1GB/day', validity: '28 days', calls: 'Unlimited' },
    { id: 'air2', name: 'Airtel ₹265', amount: 265, data: '1.5GB/day', validity: '28 days', calls: 'Unlimited' },
    { id: 'air3', name: 'Airtel ₹359', amount: 359, data: '2GB/day', validity: '28 days', calls: 'Unlimited' },
    { id: 'air4', name: 'Airtel ₹719', amount: 719, data: '2GB/day', validity: '56 days', calls: 'Unlimited' },
    { id: 'air5', name: 'Airtel ₹1199', amount: 1199, data: '2.5GB/day', validity: '84 days', calls: 'Unlimited' },
  ],
  vi: [
    { id: 'vi1', name: 'Vi ₹155', amount: 155, data: '1GB/day', validity: '24 days', calls: 'Unlimited' },
    { id: 'vi2', name: 'Vi ₹249', amount: 249, data: '1.5GB/day', validity: '28 days', calls: 'Unlimited' },
    { id: 'vi3', name: 'Vi ₹299', amount: 299, data: '2GB/day', validity: '28 days', calls: 'Unlimited' },
  ],
  bsnl: [
    { id: 'bsnl1', name: 'BSNL ₹107', amount: 107, data: '1GB/day', validity: '24 days', calls: 'Unlimited' },
    { id: 'bsnl2', name: 'BSNL ₹187', amount: 187, data: '1GB/day', validity: '28 days', calls: 'Unlimited' },
    { id: 'bsnl3', name: 'BSNL ₹397', amount: 397, data: '2GB/day', validity: '56 days', calls: 'Unlimited' },
  ]
};

// GET /api/recharge/plans/:operator
router.get('/plans/:operator', auth, (req, res) => {
  const op = req.params.operator.toLowerCase();
  const plans = PLANS[op];
  if (!plans) return res.status(404).json({ message: 'Operator not found.' });
  res.json({ plans });
});

// POST /api/recharge/recharge
router.post('/recharge', auth, async (req, res) => {
  try {
    const { operator, mobileNumber, planId, authMethod, pin, vibrationPattern } = req.body;
    if (!operator || !mobileNumber || !planId) return res.status(400).json({ message: 'All fields required.' });

    const plans = PLANS[operator.toLowerCase()];
    if (!plans) return res.status(404).json({ message: 'Invalid operator.' });
    const plan = plans.find(p => p.id === planId);
    if (!plan) return res.status(404).json({ message: 'Plan not found.' });

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
      // Mock for now
      if (!req.body.isFingerprint) return res.status(401).json({ message: 'Fingerprint auth failed.' });
    }

    if (user.walletBalance < plan.amount) return res.status(400).json({ message: 'Insufficient balance.' });

    const newBal = user.walletBalance - plan.amount;
    await User.findByIdAndUpdate(user._id, { walletBalance: newBal });

    const txn = await Transaction.create({
      userId: user._id, type: 'debit', amount: plan.amount,
      merchant: `${operator.toUpperCase()} Recharge - ${mobileNumber}`,
      category: 'recharge', status: 'approved', balanceAfter: newBal, authMethod
    });

    res.json({ message: `Recharge of ₹${plan.amount} successful for ${mobileNumber}!`, transaction: txn, walletBalance: newBal, plan });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

module.exports = router;
