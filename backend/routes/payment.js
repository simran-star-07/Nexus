const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const ParentalControl = require('../models/ParentalControl');
const BlockedApp = require('../models/BlockedApp');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

function compareVibrationPatterns(stored, incoming, tolerance = 300) {
  if (!stored || !stored.length || !incoming || !incoming.length) return false;
  if (stored.length !== incoming.length) return false;
  // Compare timing arrays
  for (let i = 0; i < stored.length; i++) {
    if (Math.abs(stored[i] - incoming[i]) > tolerance) return false;
  }
  return true;
}

// ... existing helper functions ...

// POST /api/payment/pay
router.post('/pay', auth, async (req, res) => {
  try {
    const { amount, upiId, merchant, category, authMethod, pin, vibrationPattern, isVoiceCommand, isFingerprint } = req.body;
    const io = req.app.get('io');

    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount.' });
    if (!authMethod) return res.status(400).json({ message: 'authMethod (pin/vibration/fingerprint) required.' });

    const user = await User.findById(req.user._id);
    const pc = user.role === 'student' ? await ParentalControl.findOne({ childId: user._id }) : null;

    // Check freeze
    if (user.freezeStatus || (pc && pc.freezeStatus)) {
      await Transaction.create({ userId: user._id, type: 'debit', amount, merchant: merchant || upiId, category: category || 'others', status: 'blocked', blockedReason: 'Wallet frozen', balanceAfter: user.walletBalance, authMethod: 'none' });
      return res.status(403).json({ message: 'Wallet is frozen. Contact parent/caretaker.', blocked: true });
    }

    // Blocked app check
    const blockedApp = await BlockedApp.findOne({
      isActive: true,
      $or: [
        { upiId: upiId || '' },
        { appName: { $regex: new RegExp(merchant || '', 'i') } }
      ]
    });
    if (blockedApp) {
      const alertMsg = `Alert: Your child attempted to pay ₹${amount} to restricted app [${blockedApp.appName}] at ${new Date().toLocaleTimeString()}.`;
      await Transaction.create({ userId: user._id, type: 'debit', amount, merchant: merchant || upiId, category: category || 'others', status: 'blocked', blockedReason: `Restricted app: ${blockedApp.appName}`, balanceAfter: user.walletBalance, authMethod: 'none' });
      
      if (pc) {
        pc.notifications.push({ message: alertMsg, type: 'blocked', amount, merchant: blockedApp.appName });
        await pc.save();
        io?.to(`parent-${user._id}`)?.emit('blocked_app_alert', { childName: user.name, amount, appName: blockedApp.appName });
      }
      return res.status(403).json({ message: `Payment to ${blockedApp.appName} is blocked. Restricted category.`, blocked: true });
    }

    // Daily limit check
    if (pc && pc.dailyLimit > 0) {
      const dailySpent = await getDailySpent(user._id);
      if (dailySpent + Number(amount) > pc.dailyLimit) {
        await Transaction.create({ userId: user._id, type: 'debit', amount, merchant: merchant || upiId, category: category || 'others', status: 'blocked', blockedReason: 'Daily limit exceeded', balanceAfter: user.walletBalance });
        const limitMsg = `Alert: Your child reached 100% of their daily limit (₹${pc.dailyLimit}). Payment blocked.`;
        pc.notifications.push({ message: limitMsg, type: 'limit' });
        await pc.save();
        io?.to(`parent-${user._id}`)?.emit('daily_limit_reached', { childName: user.name, limit: pc.dailyLimit });
        return res.status(403).json({ message: 'Daily spending limit reached. Payment blocked.', blocked: true });
      }
      // 80% warning
      if ((dailySpent + Number(amount)) >= pc.dailyLimit * 0.8) {
        io?.to(`user-${user._id}`)?.emit('limit_warning', { used: Math.round(((dailySpent + amount) / pc.dailyLimit) * 100) });
      }
    }

    // Student Wallet Restriction: Student can only send to Parent or specific merchants (simplified)
    // "no user other than the linked parent can send money to a student account" - handled in P2P below

    // Auth verification
    if (authMethod === 'pin') {
      const pinMatch = await bcrypt.compare(String(pin), user.pinHash);
      if (!pinMatch) return res.status(401).json({ message: 'Incorrect PIN.' });
    } else if (authMethod === 'vibration') {
      if (!compareVibrationPatterns(user.vibrationPattern, vibrationPattern)) return res.status(401).json({ message: 'Vibration pattern mismatch.' });
    } else if (authMethod === 'fingerprint') {
      // In a real app, verify WebAuthn credential. For now, we trust the client-side WebAuthn result.
      if (!isFingerprint) return res.status(401).json({ message: 'Fingerprint authentication failed.' });
    }

    // Balance check
    if (user.walletBalance < amount) return res.status(400).json({ message: 'Insufficient balance.' });

    // Debit wallet
    const newBalance = user.walletBalance - Number(amount);
    await User.findByIdAndUpdate(user._id, { walletBalance: newBalance });

    const txn = await Transaction.create({
      userId: user._id, type: 'debit', amount: Number(amount),
      merchant: merchant || upiId || 'Merchant', category: category || 'others',
      upiId: upiId || '', status: 'approved', balanceAfter: newBalance, authMethod,
      isVoiceCommand: isVoiceCommand || false,
      isFingerprint: isFingerprint || false
    });

    // XP & Rewards
    const updatedUser = await User.findByIdAndUpdate(user._id, { $inc: { xpPoints: 10, rewardsPoints: 5 } }, { new: true });
    
    // Level up logic (simplified)
    const xp = updatedUser.xpPoints;
    let level = 'Beginner Spender';
    if (xp > 600) level = 'Finance Hero';
    else if (xp > 300) level = 'Money Master';
    else if (xp > 100) level = 'Smart Saver';
    await User.findByIdAndUpdate(user._id, { level });

    // Parental/Caretaker Notification
    if (pc) {
      pc.notifications.push({ message: `${user.name} paid ₹${amount} to ${merchant || upiId}.`, type: 'payment' });
      await pc.save();
      io?.to(`parent-${user._id}`)?.emit('payment_made', { childName: user.name, amount, merchant });
    }
    if (user.caretakerId) {
      io?.to(`user-${user.caretakerId}`)?.emit('payment_alert', { user: user.name, amount, merchant });
    }

    res.json({ message: 'Payment successful.', transaction: txn, walletBalance: newBalance, level });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// POST /api/payment/send-to-phone
router.post('/send-to-phone', auth, async (req, res) => {
  try {
    const { mobile, amount, authMethod, pin, vibrationPattern } = req.body;
    if (!mobile || !amount || amount <= 0) return res.status(400).json({ message: 'Mobile and amount required.' });

    const sender = await User.findById(req.user._id);
    const recipient = await User.findOne({ mobile });
    if (!recipient) return res.status(404).json({ message: 'No user found with this mobile number.' });

    // Student restriction: only parent can send to student
    if (recipient.role === 'student' && sender._id.toString() !== recipient.parentId?.toString()) {
      return res.status(403).json({ message: 'Transfers to student accounts are restricted to linked parents only.' });
    }

    // Auth
    if (authMethod === 'pin') {
      const pinMatch = await bcrypt.compare(String(pin), sender.pinHash);
      if (!pinMatch) return res.status(401).json({ message: 'Incorrect PIN.' });
    } else if (authMethod === 'vibration') {
      if (!compareVibrationPatterns(sender.vibrationPattern, vibrationPattern)) return res.status(401).json({ message: 'Vibration pattern mismatch.' });
    }

    if (sender.walletBalance < amount) return res.status(400).json({ message: 'Insufficient balance.' });

    const senderNewBal = sender.walletBalance - Number(amount);
    const recipientNewBal = recipient.walletBalance + Number(amount);
    await User.findByIdAndUpdate(sender._id, { walletBalance: senderNewBal });
    await User.findByIdAndUpdate(recipient._id, { walletBalance: recipientNewBal });

    await Transaction.create({ userId: sender._id, type: 'debit', amount, merchant: recipient.name, category: 'transfer', status: 'approved', balanceAfter: senderNewBal, authMethod });
    await Transaction.create({ userId: recipient._id, type: 'credit', amount, merchant: sender.name, category: 'transfer', status: 'approved', balanceAfter: recipientNewBal, authMethod: 'none' });

    req.app.get('io')?.to(`user-${recipient._id}`)?.emit('money_received', { from: sender.name, amount });

    res.json({ message: `₹${amount} sent to ${recipient.name}.`, walletBalance: senderNewBal });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// POST /api/payment/verify-pin
router.post('/verify-pin', auth, async (req, res) => {
  try {
    const { pin } = req.body;
    const user = await User.findById(req.user._id);
    const match = await bcrypt.compare(String(pin), user.pinHash);
    res.json({ valid: match });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/payment/redeem-rewards
router.post('/redeem-rewards', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.rewardsPoints < 100) return res.status(400).json({ message: 'Minimum 100 points to redeem.' });
    const creditAmount = Math.floor(user.rewardsPoints / 10);
    const newBalance = user.walletBalance + creditAmount;
    await User.findByIdAndUpdate(user._id, { walletBalance: newBalance, rewardsPoints: user.rewardsPoints % 10 });
    await Transaction.create({ userId: user._id, type: 'credit', amount: creditAmount, merchant: 'Rewards Redemption', category: 'rewards', status: 'approved', balanceAfter: newBalance, authMethod: 'none' });
    res.json({ message: `₹${creditAmount} credited from rewards!`, walletBalance: newBalance, rewardsPoints: user.rewardsPoints % 10 });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
