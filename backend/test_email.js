require('dotenv').config({ path: '.env' });
const nodemailer = require('nodemailer');

async function testEmail() {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    console.log("Connecting as:", process.env.EMAIL_USER);
    // Remove spaces from password just to see if that helps
    const pass = process.env.EMAIL_PASS.replace(/\s+/g, '');
    console.log("Password length:", pass.length);

    // Let's test with the password without spaces
    const transporter2 = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: pass,
      },
    });

    const info = await transporter2.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'Test Email',
      text: 'This is a test email to verify credentials.',
    });
    console.log("Success:", info.messageId);
  } catch (err) {
    console.error("Error:", err);
  }
}

testEmail();
