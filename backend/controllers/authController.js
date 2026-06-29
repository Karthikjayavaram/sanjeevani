const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailInput = email.toLowerCase().trim();
    
    console.log('Login attempt:', emailInput, password);
    console.log('Env variables:', process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);

    // First check hardcoded credentials from .env
    const adminEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.toLowerCase().trim() : '';
    if (adminEmail && emailInput === adminEmail && password === process.env.ADMIN_PASSWORD) {
      return res.json({
        _id: 'admin-env-id',
        name: 'Administrator',
        email: process.env.ADMIN_EMAIL,
        role: 'admin',
        token: generateToken('admin-env-id'),
      });
    }

    // Fallback to database lookup
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
