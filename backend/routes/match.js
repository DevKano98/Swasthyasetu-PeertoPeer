const express = require('express');
const ChatQueue = require('../models/chatQueue');
const Student = require('../models/student');
const auth = require('../middleware/auth');

const router = express.Router();

// In-memory rendezvous store to coordinate room delivery to both peers
// Maps studentId -> { roomId, peerId }
const pendingMatches = new Map();

// Add to queue and attempt to find a match
router.post('/connect', auth, async (req, res) => {
  try {
    // If this user already has a pending room (their peer matched moments ago), return it
    if (pendingMatches.has(req.user.id)) {
      const matchInfo = pendingMatches.get(req.user.id);
      // Clear both sides to avoid reuse
      pendingMatches.delete(req.user.id);
      if (pendingMatches.get(matchInfo.peerId)?.peerId === req.user.id) {
        pendingMatches.delete(matchInfo.peerId);
      }
      return res.json({ matched: true, roomId: matchInfo.roomId, peerId: matchInfo.peerId });
    }

    const user = await Student.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove from queue if already in it
    await ChatQueue.removeFromQueue(req.user.id);

    // Add to queue
    await ChatQueue.addToQueue(req.user.id, {
      feeling: user.feeling,
      phq9: user.phq9,
      bdi2: user.bdi2,
      gad7: user.gad7,
      dass21: user.dass21
    });

    // Try to find a match
    const match = await ChatQueue.findMatch(req.user.id, {
      feeling: user.feeling,
      phq9: user.phq9,
      bdi2: user.bdi2,
      gad7: user.gad7,
      dass21: user.dass21
    });

    if (match) {
      // Remove both from queue
      await ChatQueue.removeById(match.id);
      await ChatQueue.removeFromQueue(req.user.id);

      // Generate a shared room ID
      const roomId = `room-${Math.random().toString(36).substr(2, 9)}`;

      // Store rendezvous for the peer so their next poll receives the same room
      pendingMatches.set(match.student_id, { roomId, peerId: req.user.id });
      pendingMatches.set(req.user.id, { roomId, peerId: match.student_id });

      // Return match details for current user immediately
      return res.json({ matched: true, roomId, peerId: match.student_id });
    } else {
      // No match found yet
      res.json({ matched: false });
    }
  } catch (error) {
    console.error('Match error:', error);
    res.status(500).json({ error: 'Server error during matching' });
  }
});

// Cancel queue search
router.delete('/queue', auth, async (req, res) => {
  try {
    await ChatQueue.removeFromQueue(req.user.id);
    return res.json({ cancelled: true });
  } catch (error) {
    console.error('Cancel queue error:', error);
    res.status(500).json({ error: 'Server error while cancelling search' });
  }
});

module.exports = router;