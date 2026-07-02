const { google } = require('googleapis');
const crypto = require('crypto');
const GoogleToken = require('../models/GoogleToken');

const ENCRYPTION_KEY = process.env.JWT_SECRET ? crypto.scryptSync(process.env.JWT_SECRET, 'salt', 32) : crypto.randomBytes(32);
const IV_LENGTH = 16;

function encrypt(text) {
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  let textParts = text.split(':');
  let iv = Buffer.from(textParts.shift(), 'hex');
  let encryptedText = Buffer.from(textParts.join(':'), 'hex');
  let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

const getDriveClient = async () => {
  const tokenDoc = await GoogleToken.findOne({ status: 'Connected' }).sort({ connectedAt: -1 });
  if (!tokenDoc) {
    throw new Error('Google Drive account is not connected');
  }

  const refreshToken = decrypt(tokenDoc.refreshToken);
  
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
};

const getOrCreateFolder = async (drive) => {
  const tokenDoc = await GoogleToken.findOne({ status: 'Connected' }).sort({ connectedAt: -1 });
  if (!tokenDoc) throw new Error('Not connected');

  // If we already saved the folderId, verify it exists and isn't trashed
  if (tokenDoc.folderId) {
    try {
      const res = await drive.files.get({
        fileId: tokenDoc.folderId,
        fields: 'id, trashed'
      });
      if (res.data && !res.data.trashed) {
        return tokenDoc.folderId;
      }
    } catch (err) {
      console.warn('Previously saved folder not found or inaccessible, creating new one...');
    }
  }

  // Search by name just in case
  const folderName = 'Billing Backup';
  const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  
  const searchRes = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (searchRes.data.files.length > 0) {
    const folderId = searchRes.data.files[0].id;
    tokenDoc.folderId = folderId;
    await tokenDoc.save();
    return folderId;
  }

  // Create the folder
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };

  const folderRes = await drive.files.create({
    resource: fileMetadata,
    fields: 'id'
  });

  const newFolderId = folderRes.data.id;
  tokenDoc.folderId = newFolderId;
  await tokenDoc.save();

  return newFolderId;
};

module.exports = {
  encrypt,
  decrypt,
  getOAuth2Client,
  getDriveClient,
  getOrCreateFolder
};
