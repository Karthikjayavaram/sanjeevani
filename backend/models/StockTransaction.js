const mongoose = require('mongoose');

const stockTransactionSchema = new mongoose.Schema({
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  type: { type: String, enum: ['IN', 'OUT'], required: true },
  quantity: { type: Number, required: true },
  previousStock: { type: Number, required: true },
  currentStock: { type: Number, required: true },
  referenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' }, // null if IN
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('StockTransaction', stockTransactionSchema);
