const mongoose = require('mongoose');

const loginActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ip: { type: String, default: 'unknown' },
  device: { type: String, default: 'unknown' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LoginActivity', loginActivitySchema);
