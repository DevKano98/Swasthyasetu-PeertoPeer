// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Middleware to protect routes that require authentication.
 * Expects a valid JWT token in the Authorization header:
 *   Authorization: Bearer <token>
 *
 * If valid, attaches `req.user = { id: ... }` for downstream use.
 * If invalid or missing, returns 401 Unauthorized.
 */
const auth = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No valid token provided.' });
    }

    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return res.status(401).json({ error: 'Access denied. Token missing.' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'peer-chat-secret');
    
    // Attach user ID to request object
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = auth;