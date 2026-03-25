const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const GoldSilverPortfolio = require('../models/GoldSilverPortfolio');
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');

// Mock prices (per gram gold, per gram silver)
const PRICES = {
  gold: { pricePerGram: 6200, unit: 'gram' },
  silver: { pricePerGram: 78, unit: 'gram' }
};

// GET /api/gold/prices
router.get('/prices', auth, (req, res) => {
  // Add slight variation for realism
  const goldVar = (Math.random() - 0.5) * 100;
  const silverVar = (Math.random() - 0.5) * 5;
  res.json({
    gold: { pricePerGram: Math.round(PRICES.gold.pricePerGram + goldVar), unit: 'gram' },
    silver: { pricePerGram: Math.round(PRICES.silver.pricePerGram + silverVar), unit: 'gram' }
  });
});

// POST /api/gold/buy
router.post('/buy', auth, async (req, res) => {
  try {
    const { metal, amount, authMethod, pin, vibrationPattern } = req.body;
    if (!metal || !amount || amount < 10) return res.status(400).json({ message: 'Minimum purchase is ₹10.' });
    if (!['gold', 'silver'].includes(metal)) return res.status(400).json({ message: 'Invalid metal.' });

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

    const pricePerGram = PRICES[metal].pricePerGram;
    const quantity = Number(amount) / pricePerGram;
    const newBal = user.walletBalance - Number(amount);

    await User.findByIdAndUpdate(user._id, { walletBalance: newBal });

    const portfolio = await GoldSilverPortfolio.create({
      userId: user._id, metal, quantity, buyPrice: pricePerGram, currentValue: Number(amount)
    });

    await Transaction.create({
      userId: user._id, type: 'debit', amount: Number(amount),
      merchant: `Buy ${metal.charAt(0).toUpperCase() + metal.slice(1)}`,
      category: 'investment', status: 'approved', balanceAfter: newBal, authMethod
    });

    res.json({ message: `${metal.charAt(0).toUpperCase() + metal.slice(1)} purchased!`, portfolio, walletBalance: newBal, quantity: quantity.toFixed(4) });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// POST /api/gold/sell
router.post('/sell', auth, async (req, res) => {
  try {
    const { portfolioId, authMethod, pin } = req.body;
    if (!portfolioId) return res.status(400).json({ message: 'Portfolio ID required.' });

    const user = await User.findById(req.user._id);
    const item = await GoldSilverPortfolio.findOne({ _id: portfolioId, userId: user._id });
    if (!item) return res.status(404).json({ message: 'Portfolio item not found.' });

    if (authMethod === 'pin') {
      const match = await bcrypt.compare(String(pin), user.pinHash);
      if (!match) return res.status(401).json({ message: 'Incorrect PIN.' });
    }

    const currentPrice = PRICES[item.metal].pricePerGram;
    const sellValue = Math.round(item.quantity * currentPrice);
    const newBal = user.walletBalance + sellValue;

    await User.findByIdAndUpdate(user._id, { walletBalance: newBal });
    await GoldSilverPortfolio.findByIdAndDelete(portfolioId);

    await Transaction.create({
      userId: user._id, type: 'credit', amount: sellValue,
      merchant: `Sell ${item.metal.charAt(0).toUpperCase() + item.metal.slice(1)}`,
      category: 'investment', status: 'approved', balanceAfter: newBal, authMethod
    });

    res.json({ message: `Sold for ₹${sellValue}!`, walletBalance: newBal });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// GET /api/gold/portfolio
router.get('/portfolio', auth, async (req, res) => {
  const items = await GoldSilverPortfolio.find({ userId: req.user._id }).sort({ purchasedAt: -1 });
  // Compute current values
  const withValues = items.map(item => ({
    ...item.toObject(),
    currentValue: Math.round(item.quantity * PRICES[item.metal].pricePerGram)
  }));
  const totalGold = withValues.filter(i => i.metal === 'gold').reduce((s, i) => s + i.currentValue, 0);
  const totalSilver = withValues.filter(i => i.metal === 'silver').reduce((s, i) => s + i.currentValue, 0);
  res.json({ items: withValues, totalGold, totalSilver, prices: PRICES });
});

module.exports = router;
