const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  key: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  emoji: { type: String, default: '🏅' },
  earnedAt: { type: Date, default: Date.now }
});

badgeSchema.index({ userId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Badge', badgeSchema);
