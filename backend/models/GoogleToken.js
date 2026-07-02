const mongoose = require('mongoose');

const googleTokenSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  folderId: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['Connected', 'Disconnected'],
    default: 'Connected'
  },
  provider: {
    type: String,
    default: 'google-drive'
  },
  connectedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('GoogleToken', googleTokenSchema);
