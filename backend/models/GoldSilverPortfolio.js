const mongoose = require('mongoose');

const goldSilverPortfolioSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  metal: { type: String, enum: ['gold', 'silver'], required: true },
  quantity: { type: Number, required: true },
  buyPrice: { type: Number, required: true },
  currentValue: { type: Number, default: 0 },
  purchasedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GoldSilverPortfolio', goldSilverPortfolioSchema);
