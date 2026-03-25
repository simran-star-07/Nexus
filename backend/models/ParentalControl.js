const mongoose = require('mongoose');

const parentalControlSchema = new mongoose.Schema({
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  childId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dailyLimit: { type: Number, default: 0 },
  limits: {
    food: { daily: { type: Number, default: 0 }, weekly: { type: Number, default: 0 }, monthly: { type: Number, default: 0 } },
    transport: { daily: { type: Number, default: 0 }, weekly: { type: Number, default: 0 }, monthly: { type: Number, default: 0 } },
    shopping: { daily: { type: Number, default: 0 }, weekly: { type: Number, default: 0 }, monthly: { type: Number, default: 0 } },
    education: { daily: { type: Number, default: 0 }, weekly: { type: Number, default: 0 }, monthly: { type: Number, default: 0 } },
    others: { daily: { type: Number, default: 0 }, weekly: { type: Number, default: 0 }, monthly: { type: Number, default: 0 } }
  },
  whitelist: [{ merchantName: String, upiId: String }],
  whitelistEnabled: { type: Boolean, default: false },
  blockedCategories: [String],
  freezeStatus: { type: Boolean, default: false },
  notifications: [{
    message: String,
    type: { type: String, enum: ['payment', 'blocked', 'limit_warning', 'allowance', 'money_request', 'restricted_app', 'sip', 'freeze'] },
    amount: Number,
    merchant: String,
    timestamp: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
  }],
  moneyRequests: [{
    amount: Number,
    reason: { type: String, enum: ['school_supplies', 'food', 'transport', 'emergency', 'other'], default: 'other' },
    note: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    parentNote: String,
    createdAt: { type: Date, default: Date.now }
  }],
  allowanceSchedule: {
    enabled: { type: Boolean, default: false },
    amount: { type: Number, default: 0 },
    dayOfWeek: { type: Number, default: 1 },
    lastSent: { type: Date, default: null }
  },
  autoPaySchedules: [{
    amount: Number,
    frequency: { type: String, enum: ['weekly', 'monthly'] },
    dayOfWeek: Number,
    dayOfMonth: Number,
    startDate: Date,
    endDate: Date,
    isActive: { type: Boolean, default: true },
    lastExecuted: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ParentalControl', parentalControlSchema);
