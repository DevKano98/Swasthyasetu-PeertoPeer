const express = require('express');
const Student = require('../models/student');
const auth = require('../middleware/auth');

const router = express.Router();

// Demo: list all users (non-sensitive fields only)
router.get('/all', async (req, res) => {
  try {
    const users = await Student.findAll();
    res.json(users);
  } catch (error) {
    console.error('Users list fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await Student.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user scores and feeling
router.put('/profile', auth, async (req, res) => {
  try {
    const { phq9, bdi2, gad7, dass21, feeling } = req.body;

    if (!feeling) {
      return res.status(400).json({ error: 'Feeling is required' });
    }

    // Validate score ranges with allowed zeros
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

    const updatedUser = await Student.updateScores(req.user.id, {
      phq9: parsed.phq9,
      bdi2: parsed.bdi2,
      gad7: parsed.gad7,
      dass21: parsed.dass21,
      feeling
    });

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a user by id (demo/admin). WARNING: Unprotected for demo purposes.
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const deleted = await Student.deleteById(id);
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ deleted: true, id });
  } catch (error) {
    console.error('User delete error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;