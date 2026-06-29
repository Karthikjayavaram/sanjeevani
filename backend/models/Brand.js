const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: { type: String, required: true },
  variant: { type: String, required: true },
  image: { type: String, default: 'https://via.placeholder.com/150' },
  supplier: { type: String },
  storageLocation: { type: String },
  minStockAlert: { type: Number, default: 10 },
  currentStock: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  lockedBy: { type: String, default: null }
}, { timestamps: true });

// Create a compound index for fast search
brandSchema.index({ name: 'text', variant: 'text' });

module.exports = mongoose.model('Brand', brandSchema);
