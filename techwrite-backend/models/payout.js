const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['PayPal', 'Bank Transfer', 'Stripe'], default: 'PayPal' },
  accountDetails: { type: String, required: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'rejected'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Payout', payoutSchema);