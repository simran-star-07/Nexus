const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['payment', 'blocked', 'limit_warning', 'allowance', 'money_request', 'sip', 'freeze', 'restricted_app', 'recharge', 'ticket', 'bill', 'gold', 'caretaker', 'general'], default: 'general' },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
