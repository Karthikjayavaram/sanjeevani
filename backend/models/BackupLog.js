const mongoose = require('mongoose');

const BackupLogSchema = new mongoose.Schema({
  backupName: {
    type: String,
    required: true,
  },
  fileId: {
    type: String,
    required: true,
  },
  sizeBytes: {
    type: Number,
    required: true,
  },
  backupType: {
    type: String,
    enum: ['Auto', 'Manual'],
    required: true,
  },
  status: {
    type: String,
    enum: ['Success', 'Failed'],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('BackupLog', BackupLogSchema);
