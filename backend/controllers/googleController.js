const { google } = require('googleapis');
const GoogleToken = require('../models/GoogleToken');
const googleAuthService = require('../services/googleAuthService');

exports.getAuthUrl = (req, res) => {
  try {
    const oauth2Client = googleAuthService.getOAuth2Client();
    
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Required to get a refresh token
      prompt: 'consent',      // Force consent to ensure we always get a refresh token
      scope: scopes
    });

    res.json({ url });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ message: 'Failed to generate auth URL', error: error.message });
  }
};

exports.oauthCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ message: 'Missing authorization code' });
    }

    const oauth2Client = googleAuthService.getOAuth2Client();
    
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      // Note: Google only sends a refresh token on the FIRST authorization.
      // That's why we included prompt: 'consent' in getAuthUrl.
      return res.status(400).json({ 
        message: 'No refresh token received. Please revoke access from your Google account and try again.' 
      });
    }

    // Check if the user actually granted the drive.file scope
    if (!tokens.scope || !tokens.scope.includes('https://www.googleapis.com/auth/drive.file')) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/backups?error=missing_scopes`);
    }

    oauth2Client.setCredentials(tokens);

    // Get user info (email)
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2'
    });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;

    if (!email) {
      return res.status(400).json({ message: 'Could not fetch user email' });
    }

    // Encrypt the refresh token
    const encryptedRefreshToken = googleAuthService.encrypt(tokens.refresh_token);

    // Only one account should be active per single-client application as requested.
    // We will upsert based on email, but also mark any other accounts as disconnected.
    await GoogleToken.updateMany({}, { status: 'Disconnected' });

    await GoogleToken.findOneAndUpdate(
      { email },
      {
        refreshToken: encryptedRefreshToken,
        status: 'Connected',
        connectedAt: Date.now()
      },
      { upsert: true, new: true }
    );

    // Redirect to frontend (we can't just send json because the user is visiting this via browser redirect)
    // Wait, the user didn't specify frontend redirect URL. Usually it's the dashboard /backups.
    // Let's redirect to the frontend domain.
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/backups?success=google_connected`);
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ message: 'OAuth callback failed', error: error.message });
  }
};

exports.getStatus = async (req, res) => {
  try {
    const tokenDoc = await GoogleToken.findOne({ status: 'Connected' }).sort({ connectedAt: -1 });
    
    if (!tokenDoc) {
      return res.json({
        status: 'Disconnected',
        email: null,
        folderId: null,
        isReachable: false
      });
    }

    let isReachable = false;
    try {
      const drive = await googleAuthService.getDriveClient();
      await drive.about.get({ fields: 'user' });
      isReachable = true;
    } catch (e) {
      isReachable = false;
    }

    res.json({
      status: 'Connected',
      email: tokenDoc.email,
      folderId: tokenDoc.folderId,
      isReachable
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ message: 'Failed to check status', error: error.message });
  }
};

exports.disconnect = async (req, res) => {
  try {
    await GoogleToken.updateMany({ status: 'Connected' }, { status: 'Disconnected' });
    res.json({ message: 'Successfully disconnected from Google Drive' });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ message: 'Failed to disconnect', error: error.message });
  }
};
