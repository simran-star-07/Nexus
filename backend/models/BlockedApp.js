const mongoose = require('mongoose');

const blockedAppSchema = new mongoose.Schema({
  upiId: { type: String, default: '' },
  appName: { type: String, required: true },
  category: { type: String, enum: ['gambling', 'betting', 'adult', 'suspicious'], required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BlockedApp', blockedAppSchema);
