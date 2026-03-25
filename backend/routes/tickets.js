const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');

// Mock routes
const MOCK_ROUTES = {
  bus: [
    { provider: 'RedBus Express', duration: '4h 30m', seats: 32, pricePerSeat: 350 },
    { provider: 'MSRTC Shivneri', duration: '5h 00m', seats: 18, pricePerSeat: 280 },
    { provider: 'VRL Travels', duration: '4h 00m', seats: 24, pricePerSeat: 420 },
    { provider: 'Orange Tours', duration: '3h 45m', seats: 12, pricePerSeat: 500 },
  ],
  train: [
    { provider: 'Rajdhani Express', duration: '6h 30m', seats: 120, pricePerSeat: 850 },
    { provider: 'Shatabdi Express', duration: '5h 15m', seats: 90, pricePerSeat: 680 },
    { provider: 'Duronto Express', duration: '7h 00m', seats: 200, pricePerSeat: 550 },
    { provider: 'Jan Shatabdi', duration: '6h 00m', seats: 150, pricePerSeat: 380 },
  ]
};

// GET /api/tickets/search
router.get('/search', auth, (req, res) => {
  const { type, from, to, date, passengers } = req.query;
  if (!type || !from || !to) return res.status(400).json({ message: 'Type, from, and to are required.' });

  const routes = MOCK_ROUTES[type] || [];
  const pax = Number(passengers) || 1;
  const results = routes.map((r, i) => ({
    id: `${type}-${i}`,
    ...r,
    availableSeats: Math.max(0, r.seats - Math.floor(Math.random() * 20)),
    totalPrice: r.pricePerSeat * pax,
    from, to,
    date: date || new Date().toISOString().split('T')[0],
    passengers: pax
  }));
  res.json({ results });
});

// POST /api/tickets/book
router.post('/book', auth, async (req, res) => {
  try {
    const { type, from, to, date, passengers, provider, amount, authMethod, pin, vibrationPattern } = req.body;
    if (!type || !from || !to || !amount) return res.status(400).json({ message: 'Missing fields.' });

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

    const pax = Number(passengers) || 1;
    const bookingId = 'PB-' + uuidv4().split('-')[0].toUpperCase();
    const seatNumbers = Array.from({ length: pax }, (_, i) => `S${Math.floor(Math.random() * 50) + 1}`);
    const newBal = user.walletBalance - Number(amount);

    await User.findByIdAndUpdate(user._id, { walletBalance: newBal });

    const ticket = await Ticket.create({
      userId: user._id, type, from, to, date: new Date(date),
      passengers: pax, amount, bookingId, provider: provider || '',
      seatNumbers, status: 'confirmed'
    });

    await Transaction.create({
      userId: user._id, type: 'debit', amount, merchant: `${type.toUpperCase()} Ticket - ${from} to ${to}`,
      category: 'transport', status: 'approved', balanceAfter: newBal, authMethod
    });

    res.json({ message: 'Ticket booked!', ticket, walletBalance: newBal, bookingId });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// GET /api/tickets/my-tickets
router.get('/my-tickets', auth, async (req, res) => {
  const tickets = await Ticket.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json({ tickets });
});

module.exports = router;
