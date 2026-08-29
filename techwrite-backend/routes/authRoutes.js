const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { auth } = require('../middleware/auth'); 

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'techwrite_secret', { expiresIn: '30d' });
};

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ ok: false, error: 'User already exists' });

    const user = await User.create({ name, email, password, role: role || 'author' });
    res.status(201).json({
      ok: true,
      session: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      if (role && user.role !== role) {
        return res.status(401).json({ ok: false, error: `Unauthorized role attempt for ${role}` });
      }
      return res.json({
        ok: true,
        session: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          token: generateToken(user._id)
        }
      });
    }
    res.status(401).json({ ok: false, error: 'Invalid email or password' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/profile', auth,  async (req, res) => {
  res.json({ ok: true, user: req.user });
});



// Placeholder route
router.get('/', (req, res) => {
  res.send('Auth route working');
});

module.exports = router;