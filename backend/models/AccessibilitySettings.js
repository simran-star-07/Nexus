const mongoose = require('mongoose');

const accessibilitySettingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  voiceEnabled: { type: Boolean, default: true },
  highContrast: { type: Boolean, default: true },
  fontSize: { type: String, enum: ['normal', 'large', 'xl'], default: 'large' },
  vibrationSensitivity: { type: Number, default: 200 },
  audioFeedback: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AccessibilitySettings', accessibilitySettingsSchema);
