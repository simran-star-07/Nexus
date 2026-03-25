const router = require('express').Router();
const bcrypt = require('bcryptjs');
const ParentalControl = require('../models/ParentalControl');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const Goal = require('../models/Goal');
const { auth, roleGuard } = require('../middleware/auth');

// Resolve child — parent can specify childId or use linked child
const resolveChild = async (req, res, next) => {
  if (req.user.role === 'parent') {
    req.childId = req.body.childId || req.query.childId || req.user.linkedChildren?.[0];
  } else {
    req.childId = req.user._id;
  }
  if (!req.childId) return res.status(400).json({ message: 'No child linked.' });
  next();
};

// GET /api/parental/controls
router.get('/controls', auth, resolveChild, async (req, res) => {
  try {
    let pc = await ParentalControl.findOne({ childId: req.childId });
    if (!pc) pc = await ParentalControl.create({ childId: req.childId });
    res.json({ controls: pc });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// GET /api/parental/all-children — master control panel
router.get('/all-children', auth, roleGuard('parent'), async (req, res) => {
  try {
    const parent = await User.findById(req.user._id);
    const childIds = parent.linkedChildren || [];
    const children = await User.find({ _id: { $in: childIds } }).select('-passwordHash -pinHash -vibrationPattern');
    
    const childData = [];
    for (const child of children) {
      const pc = await ParentalControl.findOne({ childId: child._id });
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todaySpending = await Transaction.aggregate([
        { $match: { userId: child._id, type: 'debit', status: 'approved', timestamp: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const goals = await Goal.find({ userId: child._id, isCompleted: false });
      const pendingRequests = pc?.moneyRequests?.filter(r => r.status === 'pending') || [];
      childData.push({
        child: child.toObject(),
        todaySpending: todaySpending[0]?.total || 0,
        dailyLimit: pc?.dailyLimit || 0,
        freezeStatus: pc?.freezeStatus || false,
        activeGoals: goals.length,
        pendingRequests: pendingRequests.length,
        unreadNotifs: (pc?.notifications || []).filter(n => !n.read).length
      });
    }
    res.json({ children: childData });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// POST /api/parental/add-money — parent adds money to child wallet
router.post('/add-money', auth, roleGuard('parent'), async (req, res) => {
  try {
    const { childId, amount, pin } = req.body;
    if (!childId || !amount || amount <= 0) return res.status(400).json({ message: 'Child ID and amount required.' });

    const parent = await User.findById(req.user._id);
    if (pin) {
      const match = await bcrypt.compare(String(pin), parent.pinHash);
      if (!match) return res.status(401).json({ message: 'Incorrect PIN.' });
    }

    const child = await User.findById(childId);
    if (!child || child.role !== 'student') return res.status(404).json({ message: 'Student not found.' });
    if (!parent.linkedChildren?.map(String).includes(String(childId))) {
      return res.status(403).json({ message: 'This child is not linked to you.' });
    }

    const newBal = child.walletBalance + Number(amount);
    await User.findByIdAndUpdate(childId, { walletBalance: newBal });

    await Transaction.create({ userId: childId, type: 'credit', amount: Number(amount), merchant: `From Parent (${parent.name})`, category: 'wallet_load', status: 'approved', balanceAfter: newBal, authMethod: 'pin' });

    const io = req.app.get('io');
    io?.to(`user-${childId}`)?.emit('money_received', { from: parent.name, amount, walletBalance: newBal });
    await Notification.create({ userId: childId, type: 'payment', message: `₹${amount} added by ${parent.name}.` });

    res.json({ message: `₹${amount} added to ${child.name}'s wallet.`, childBalance: newBal });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// POST /api/parental/money-request — student requests money
router.post('/money-request', auth, async (req, res) => {
  try {
    const { amount, reason, note } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Amount required.' });

    const student = await User.findById(req.user._id);
    if (!student.parentId) return res.status(400).json({ message: 'No parent linked.' });

    const pc = await ParentalControl.findOne({ childId: student._id });
    if (!pc) return res.status(404).json({ message: 'No parental control found.' });

    // ONLY push to moneyRequests, NOT notifications (Alerts)
    pc.moneyRequests.push({ amount, reason: reason || 'other', note: note || '' });
    await pc.save();

    req.app.get('io')?.to(`parent-${student.parentId.toString()}`)?.emit('money_request', { 
      childId: student._id, 
      childName: student.name, 
      amount, 
      reason, 
      note 
    });

    res.json({ message: 'Money request sent successfully to the Requests Section.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

const PDFDocument = require('pdfkit');
// GET /api/parental/export-history
router.get('/export-history', auth, roleGuard('parent'), async (req, res) => {
  try {
    const { childId } = req.query;
    const child = await User.findById(childId);
    if (!child) return res.status(404).send('Child not found');

    const txns = await Transaction.find({ userId: childId }).sort({ timestamp: -1 });

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=PayBridge_History_${child.name}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('PayBridge Transaction Statement', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Account Holder: ${child.name}`);
    doc.text(`UPI ID: ${child.upiId}`);
    doc.text(`Current Balance: ₹${child.walletBalance}`);
    doc.moveDown();
    doc.text('------------------------------------------------------------');
    doc.moveDown();

    txns.forEach((t, i) => {
      doc.fontSize(10).text(`${i + 1}. ${new Date(t.timestamp).toLocaleString()} | ${t.merchant} | ₹${t.amount} [${t.type.toUpperCase()}]`);
      doc.text(`Category: ${t.category} | Method: ${t.authMethod} | Status: ${t.status}`);
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (err) {
    res.status(500).send('Error generating PDF');
  }
});

// GET /api/parental/money-requests
router.get('/money-requests', auth, resolveChild, async (req, res) => {
  try {
    const pc = await ParentalControl.findOne({ childId: req.childId });
    res.json({ requests: pc?.moneyRequests?.slice().reverse() || [] });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/parental/money-request/:index/approve
router.post('/money-request/:index/approve', auth, roleGuard('parent'), async (req, res) => {
  try {
    const { childId, parentNote } = req.body;
    const idx = Number(req.params.index);
    const pc = await ParentalControl.findOne({ childId });
    if (!pc || !pc.moneyRequests[idx]) return res.status(404).json({ message: 'Request not found.' });

    const request = pc.moneyRequests[idx];
    if (request.status !== 'pending') return res.status(400).json({ message: 'Already processed.' });

    request.status = 'approved';
    request.parentNote = parentNote || '';
    await pc.save();

    // Credit child wallet
    const child = await User.findById(childId);
    const newBal = child.walletBalance + request.amount;
    await User.findByIdAndUpdate(childId, { walletBalance: newBal });
    await Transaction.create({ userId: childId, type: 'credit', amount: request.amount, merchant: 'Money Request Approved', category: 'wallet_load', status: 'approved', balanceAfter: newBal, authMethod: 'none' });

    await Notification.create({ userId: childId, type: 'money_request', message: `Your request for ₹${request.amount} was approved!` });
    req.app.get('io')?.to(`user-${childId}`)?.emit('request_approved', { amount: request.amount });

    res.json({ message: 'Request approved.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/parental/money-request/:index/reject
router.post('/money-request/:index/reject', auth, roleGuard('parent'), async (req, res) => {
  try {
    const { childId, parentNote } = req.body;
    const idx = Number(req.params.index);
    const pc = await ParentalControl.findOne({ childId });
    if (!pc || !pc.moneyRequests[idx]) return res.status(404).json({ message: 'Request not found.' });

    pc.moneyRequests[idx].status = 'rejected';
    pc.moneyRequests[idx].parentNote = parentNote || '';
    await pc.save();

    await Notification.create({ userId: childId, type: 'money_request', message: `Your request for ₹${pc.moneyRequests[idx].amount} was rejected.` });
    req.app.get('io')?.to(`user-${childId}`)?.emit('request_rejected', { amount: pc.moneyRequests[idx].amount });

    res.json({ message: 'Request rejected.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/parental/set-daily-limit
router.post('/set-daily-limit', auth, roleGuard('parent'), async (req, res) => {
  try {
    const { childId, dailyLimit } = req.body;
    await ParentalControl.findOneAndUpdate({ childId }, { dailyLimit }, { upsert: true });
    req.app.get('io')?.to(`user-${childId}`)?.emit('limits_updated', { dailyLimit });
    res.json({ message: `Daily limit set to ₹${dailyLimit}.` });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PUT /api/parental/limits
router.put('/limits', auth, roleGuard('parent'), resolveChild, async (req, res) => {
  try {
    const { limits } = req.body;
    const pc = await ParentalControl.findOneAndUpdate({ childId: req.childId }, { limits }, { new: true, upsert: true });
    req.app.get('io')?.to(`user-${req.childId}`)?.emit('limits_updated', { limits });
    res.json({ controls: pc });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// POST /api/parental/freeze & unfreeze
router.post('/freeze', auth, roleGuard('parent'), async (req, res) => {
  try {
    const { childId } = req.body;
    await ParentalControl.findOneAndUpdate({ childId }, { freezeStatus: true }, { upsert: true });
    req.app.get('io')?.to(`user-${childId}`)?.emit('wallet_frozen', {});
    await Notification.create({ userId: childId, type: 'freeze', message: 'Your wallet has been frozen by your parent.' });
    res.json({ freezeStatus: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

router.post('/unfreeze', auth, roleGuard('parent'), async (req, res) => {
  try {
    const { childId } = req.body;
    await ParentalControl.findOneAndUpdate({ childId }, { freezeStatus: false }, { upsert: true });
    req.app.get('io')?.to(`user-${childId}`)?.emit('wallet_unfrozen', {});
    res.json({ freezeStatus: false });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/parental/auto-pay
router.post('/auto-pay', auth, roleGuard('parent'), async (req, res) => {
  try {
    const { childId, amount, frequency, dayOfWeek, dayOfMonth, startDate, endDate } = req.body;
    if (!childId || !amount || !frequency) return res.status(400).json({ message: 'Required fields missing.' });

    const pc = await ParentalControl.findOne({ childId });
    if (!pc) return res.status(404).json({ message: 'No parental control found.' });

    pc.autoPaySchedules.push({ amount, frequency, dayOfWeek, dayOfMonth, startDate: new Date(startDate), endDate: endDate ? new Date(endDate) : null, isActive: true });
    await pc.save();

    res.json({ message: 'Auto-pay schedule created.', schedules: pc.autoPaySchedules });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// DELETE /api/parental/auto-pay/:index
router.delete('/auto-pay/:index', auth, roleGuard('parent'), async (req, res) => {
  try {
    const { childId } = req.body;
    const pc = await ParentalControl.findOne({ childId });
    if (!pc) return res.status(404).json({ message: 'Not found.' });
    pc.autoPaySchedules.splice(Number(req.params.index), 1);
    await pc.save();
    res.json({ schedules: pc.autoPaySchedules });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// Whitelist routes
router.get('/whitelist', auth, resolveChild, async (req, res) => {
  const pc = await ParentalControl.findOne({ childId: req.childId });
  res.json({ whitelist: pc?.whitelist || [], whitelistEnabled: pc?.whitelistEnabled || false });
});

router.post('/whitelist', auth, roleGuard('parent'), resolveChild, async (req, res) => {
  const { merchantName, upiId } = req.body;
  const pc = await ParentalControl.findOneAndUpdate({ childId: req.childId }, { $push: { whitelist: { merchantName, upiId } } }, { new: true, upsert: true });
  res.json({ whitelist: pc.whitelist });
});

router.delete('/whitelist/:index', auth, roleGuard('parent'), resolveChild, async (req, res) => {
  const pc = await ParentalControl.findOne({ childId: req.childId });
  if (!pc) return res.status(404).json({ message: 'Not found.' });
  pc.whitelist.splice(Number(req.params.index), 1);
  await pc.save();
  res.json({ whitelist: pc.whitelist });
});

router.put('/whitelist-toggle', auth, roleGuard('parent'), resolveChild, async (req, res) => {
  const pc = await ParentalControl.findOneAndUpdate({ childId: req.childId }, { whitelistEnabled: req.body.enabled }, { new: true });
  res.json({ whitelistEnabled: pc.whitelistEnabled });
});

// GET /api/parental/audit-log
router.get('/audit-log', auth, roleGuard('parent'), async (req, res) => {
  try {
    const { childId, limit = 50, skip = 0, category, startDate, endDate } = req.query;
    const filter = { userId: childId || req.user.linkedChildren?.[0] };
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    const txns = await Transaction.find(filter).sort({ timestamp: -1 }).limit(Number(limit)).skip(Number(skip));
    const total = await Transaction.countDocuments(filter);
    res.json({ transactions: txns, total });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// GET /api/parental/notifications
router.get('/notifications', auth, resolveChild, async (req, res) => {
  const pc = await ParentalControl.findOne({ childId: req.childId });
  res.json({ notifications: (pc?.notifications || []).slice().reverse() });
});

router.put('/notifications/mark-read', auth, resolveChild, async (req, res) => {
  await ParentalControl.findOneAndUpdate({ childId: req.childId }, { $set: { 'notifications.$[].read': true } });
  res.json({ message: 'Marked as read.' });
});

// PUT /api/parental/allowance
router.put('/allowance', auth, roleGuard('parent'), resolveChild, async (req, res) => {
  const { enabled, amount, dayOfWeek } = req.body;
  const pc = await ParentalControl.findOneAndUpdate({ childId: req.childId }, { allowanceSchedule: { enabled, amount, dayOfWeek, lastSent: null } }, { new: true, upsert: true });
  res.json({ allowanceSchedule: pc.allowanceSchedule });
});

// GET /api/parental/child-info
router.get('/child-info', auth, async (req, res) => {
  try {
    const childId = req.query.childId || (req.user.role === 'parent' ? req.user.linkedChildren?.[0] : req.user._id);
    const child = await User.findById(childId).select('-passwordHash -pinHash -vibrationPattern');
    if (!child) return res.status(404).json({ message: 'Child not found.' });
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todaySpending = await Transaction.aggregate([
      { $match: { userId: child._id, type: 'debit', status: 'approved', timestamp: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const categoryBreakdown = await Transaction.aggregate([
      { $match: { userId: child._id, type: 'debit', status: 'approved', timestamp: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } }
    ]);
    res.json({ child, todaySpending: todaySpending[0]?.total || 0, categoryBreakdown });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

module.exports = router;
