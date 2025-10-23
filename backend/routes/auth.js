const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/student');
require('dotenv').config();

const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, phq9, bdi2, gad7, dass21, feeling } = req.body;

    // Validate required non-score fields
    if (!username || !email || !password || !feeling) {
      return res.status(400).json({ error: 'Username, email, password and feeling are required' });
    }

    // Parse and validate score ranges
    const MAX = { phq9: 27, bdi2: 63, gad7: 21, dass21: 42 };
    const parsed = {
      phq9: Number(phq9),
      bdi2: Number(bdi2),
      gad7: Number(gad7),
      dass21: Number(dass21)
    };
    for (const key of Object.keys(MAX)) {
      const value = parsed[key];
      if (!Number.isInteger(value) || value < 0 || value > MAX[key]) {
        return res.status(400).json({ error: `${key.toUpperCase()} must be an integer between 0 and ${MAX[key]}` });
      }
    }

    // Check if user already exists
    const existingUser = await Student.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user
    const user = await Student.create({
      username,
      email,
      password_hash,
      phq9: parsed.phq9,
      bdi2: parsed.bdi2,
      gad7: parsed.gad7,
      dass21: parsed.dass21,
      feeling
    });

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'peer-chat-secret', {
      expiresIn: '1d'
    });

    res.status(201).json({ token, user: { ...user, password_hash: undefined } });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await Student.findByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'peer-chat-secret', {
      expiresIn: '1d'
    });

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

module.exports = router;