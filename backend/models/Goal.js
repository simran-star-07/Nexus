const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  targetItem: { type: String, default: '' },
  goalType: { type: String, enum: ['simple', 'sip'], default: 'simple' },
  targetAmount: { type: Number, required: true },
  savedAmount: { type: Number, default: 0 },
  dailyContribution: { type: Number, default: 0 },
  vaultBalance: { type: Number, default: 0 },
  daysToComplete: { type: Number, default: 0 },
  lastContributionDate: { type: String, default: '' },
  deadline: { type: Date },
  isCompleted: { type: Boolean, default: false },
  isPaused: { type: Boolean, default: false },
  contributionHistory: [{
    date: { type: Date, default: Date.now },
    amount: { type: Number, required: true }
  }],
  celebrationSeen: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Goal', goalSchema);
