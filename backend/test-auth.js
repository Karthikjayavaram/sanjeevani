require('dotenv').config();
const { google } = require('googleapis');
let pk = process.env.GOOGLE_PRIVATE_KEY || '';
pk = pk.trim().replace(/^"/, '').replace(/",?$/, '').replace(/"$/, '');
pk = pk.replace(/\\n/g, '\n');

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: pk,
  scopes: ['https://www.googleapis.com/auth/drive']
});

auth.authorize(function (err, tokens) {
  if (err) {
    console.error('Auth failed:', err.message);
    return;
  }
  console.log('Auth success! Token:', tokens.access_token ? 'Yes' : 'No');
  
  const drive = google.drive({version: 'v3', auth});
  drive.files.list().then(res => {
    console.log('Files count:', res.data.files.length);
  }).catch(e => {
    console.error('List failed:', e.message);
  });
});
