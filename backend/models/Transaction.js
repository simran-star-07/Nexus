const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true },
  merchant: { type: String, default: 'Unknown' },
  category: { type: String, enum: ['food', 'transport', 'shopping', 'education', 'others', 'wallet_load', 'goal', 'allowance', 'recharge', 'ticket', 'gold', 'silver', 'bill'], default: 'others' },
  upiId: { type: String, default: '' },
  status: { type: String, enum: ['approved', 'blocked', 'pending'], default: 'approved' },
  blockedReason: { type: String, default: '' },
  balanceAfter: { type: Number, required: true },
  authMethod: { type: String, enum: ['pin', 'vibration', 'fingerprint', 'none'], default: 'none' },
  isVoiceCommand: { type: Boolean, default: false },
  isFingerprint: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
