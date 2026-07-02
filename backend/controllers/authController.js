const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const emailService = require('../services/emailService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailInput = email.toLowerCase().trim();

    const user = await User.findOne({ email: emailInput });
    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailInput = email.toLowerCase().trim();
    const user = await User.findOne({ email: emailInput });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash the OTP before saving
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    user.resetPasswordOtp = hashedOtp;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    // VERY IMPORTANT: Log OTP so admin can see it in Render Logs if email is blocked!
    console.log(`\n=========================================`);
    console.log(`🔑 PASSWORD RESET OTP FOR ${user.email}: ${otp}`);
    console.log(`=========================================\n`);

    try {
      await emailService.sendEmail({
        to: user.email,
        subject: 'Password Reset OTP - Sanjeevani Veeresh',
        text: `Your password reset OTP is: ${otp}\n\nIt is valid for 15 minutes.`,
        html: `<p>Your password reset OTP is: <strong>${otp}</strong></p><p>It is valid for 15 minutes.</p>`,
      });
      res.json({ message: 'OTP sent successfully to your email' });
    } catch (emailError) {
      console.error('Failed to send email via Resend, but OTP was generated:', emailError.message);
      // Still return 200 so the frontend proceeds to the OTP screen!
      res.json({ 
        message: 'Failed to send email. Please check Render Server Logs to see your OTP!' 
      });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    const emailInput = email.toLowerCase().trim();
    const user = await User.findOne({ email: emailInput });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.resetPasswordOtp || !user.resetPasswordExpires) {
      return res.status(400).json({ error: 'No password reset requested' });
    }

    if (user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    const isMatch = await bcrypt.compare(otp, user.resetPasswordOtp);

    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
