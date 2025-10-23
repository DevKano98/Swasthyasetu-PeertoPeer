const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const matchRoutes = require('./routes/match');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.SOCKET_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((s) => s.trim());
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/match', matchRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Serve Vite build output
  app.use(express.static(path.join(__dirname, '../frontend/my-app/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/my-app/dist', 'index.html'));
  });
}

// Socket.IO connection handling
const activeChats = new Map(); // roomId -> { user1, user2, timer }

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Join a chat room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    
    // If this is the first user in the room, store it
    if (!activeChats.has(roomId)) {
      activeChats.set(roomId, { 
        users: [socket.id], 
        timer: null 
      });
    } else {
      // Second user joined - start the 20-minute timer
      const chat = activeChats.get(roomId);
      chat.users.push(socket.id);
      
      // Start 20-minute timer
      chat.timer = setTimeout(() => {
        io.to(roomId).emit('chat-ended', 'Session ended after 20 minutes');
        io.in(roomId).socketsLeave(roomId);
        activeChats.delete(roomId);
        console.log(`Chat room ${roomId} ended after 20 minutes`);
      }, 20 * 60 * 1000); // 20 minutes in milliseconds
    }
  });

  // Handle messages
  socket.on('send-message', ({ roomId, message }) => {
    // Broadcast to all other users in the room
    socket.to(roomId).emit('receive-message', {
      senderId: socket.id,
      message,
      timestamp: new Date().toISOString()
    });
  });

  // Handle typing indicators
  socket.on('typing', ({ roomId, isTyping }) => {
    socket.to(roomId).emit('user-typing', {
      userId: socket.id,
      isTyping
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Find which room this socket was in
    for (const [roomId, chat] of activeChats.entries()) {
      if (chat.users.includes(socket.id)) {
        // Notify other user
        socket.to(roomId).emit('peer-disconnected', 'Your peer has disconnected');
        
        // Clear the timer and remove the room
        if (chat.timer) {
          clearTimeout(chat.timer);
        }
        activeChats.delete(roomId);
        break;
      }
    }
  });
});

// Database initialization
const initDb = async () => {
  const db = require('./config/db');
  try {
    // Create students table
    await db.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        phq9 INT,
        bdi2 INT,
        gad7 INT,
        dass21 INT,
        feeling VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create chat_queue table
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_queue (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES students(id) ON DELETE CASCADE,
        feeling VARCHAR(50),
        phq9 INT,
        bdi2 INT,
        gad7 INT,
        dass21 INT,
        joined_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Database initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

// Start server
const PORT = process.env.PORT || 5000;
initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Socket.IO server running on port ${PORT}`);
  });
});