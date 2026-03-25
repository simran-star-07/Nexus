const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  billType: { type: String, enum: ['electricity', 'water', 'gas', 'broadband', 'dth'], required: true },
  consumerNumber: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['paid', 'pending', 'failed'], default: 'pending' },
  paidAt: { type: Date, default: null }
});

module.exports = mongoose.model('Bill', billSchema);
