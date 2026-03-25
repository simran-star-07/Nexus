const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  mobile: { type: String, default: '', index: true },
  upiId: { type: String, default: '' },
  role: { type: String, enum: ['student', 'parent', 'divyang'], required: true },
  passwordHash: { type: String, required: true },
  pinHash: { type: String },
  vibrationPattern: [Number], // Timing array as requested
  webAuthnCredentialId: { type: String, default: null },
  webAuthnPublicKey: { type: Buffer, default: null },
  webAuthnCounter: { type: Number, default: 0 },
  webAuthnTransports: { type: [String], default: [] },
  currentWebAuthnChallenge: { type: String, default: null },
  language: { type: String, enum: ['hi', 'en'], default: 'en' },
  walletBalance: { type: Number, default: 0 },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  linkedChildren: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  profilePhoto: { type: String, default: '' },
  xpPoints: { type: Number, default: 0 },
  level: { type: String, default: 'Beginner Spender' },
  rewardsPoints: { type: Number, default: 0 },
  streakCount: { type: Number, default: 0 },
  lastActiveDate: { type: Date, default: null },
  dailyLimit: { type: Number, default: 0 },
  dailySpent: { type: Number, default: 0 },
  lastSpentDate: { type: String, default: '' },
  freezeStatus: { type: Boolean, default: false },
  caretakerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
