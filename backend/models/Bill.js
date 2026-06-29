const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  billNumber: { type: String, required: true, unique: true },
  millName: { type: String, required: true },
  partyName: { type: String, required: true },
  date: { type: Date, default: Date.now },
  totalQuantity: { type: Number, default: 0 },
  items: [{
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
    quantity: { type: Number, required: true }
  }],
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

billSchema.index({ billNumber: 'text', millName: 'text', partyName: 'text' });

module.exports = mongoose.model('Bill', billSchema);
