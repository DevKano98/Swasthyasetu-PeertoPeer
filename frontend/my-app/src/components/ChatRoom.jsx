import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  LinearProgress
} from '@mui/material';

const ChatRoom = ({ onLogout }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20 * 60); // 20 minutes in seconds
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io();
    
    // Join the room
    socketRef.current.emit('join-room', roomId);
    
    // Listen for messages
    socketRef.current.on('receive-message', (messageData) => {
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        text: messageData.message, 
        own: false,
        timestamp: messageData.timestamp
      }]);
    });
    
    // Listen for typing indicators
    socketRef.current.on('user-typing', (data) => {
      setPeerTyping(data.isTyping);
    });
    
    // Listen for chat ending
    socketRef.current.on('chat-ended', (reason) => {
      setError(reason);
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    });
    
    // Listen for peer disconnection
    socketRef.current.on('peer-disconnected', (reason) => {
      setError(reason);
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    });
    
    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId, navigate]);
  
  // Timer effect
  useEffect(() => {
    if (timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setError('Session ended after 20 minutes');
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, navigate]);
  
  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSend = () => {
    if (input.trim() === '') return;
    
    // Send message via socket
    socketRef.current.emit('send-message', {
      roomId,
      message: input.trim()
    });
    
    // Add to local messages
    setMessages(prev => [...prev, { 
      id: Date.now(), 
      text: input.trim(), 
      own: true,
      timestamp: new Date().toISOString()
    }]);
    
    setInput('');
    setIsTyping(false);
    
    // Stop typing indicator
    socketRef.current.emit('typing', { roomId, isTyping: false });
  };
  
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);
    
    // Send typing indicator
    if (value.trim() !== '') {
      if (!isTyping) {
        setIsTyping(true);
        socketRef.current.emit('typing', { roomId, isTyping: true });
      }
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing indicator after 1 second of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socketRef.current.emit('typing', { roomId, isTyping: false });
      }, 1000);
    } else {
      setIsTyping(false);
      socketRef.current.emit('typing', { roomId, isTyping: false });
    }
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">
            Peer Support Chat
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Time left: {formatTime(timeLeft)}
          </Typography>
        </Box>
        
        <LinearProgress 
          variant="determinate" 
          value={(timeLeft / (20 * 60)) * 100} 
          sx={{ mb: 2 }}
        />
        
        {error && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ 
          height: 400, 
          border: '1px solid #e0e0e0', 
          borderRadius: 1, 
          p: 2, 
          overflowY: 'auto',
          mb: 2,
          backgroundColor: '#f9f9f9'
        }}>
          <List>
            {messages.length === 0 ? (
              <ListItem>
                <ListItemText 
                  primary="Waiting for messages..." 
                  secondary="Your chat with a peer will appear here" 
                />
              </ListItem>
            ) : (
              messages.map((msg) => (
                <React.Fragment key={msg.id}>
                  <ListItem 
                    sx={{ 
                      justifyContent: msg.own ? 'flex-end' : 'flex-start',
                      mb: 1
                    }}
                  >
                    <Box 
                      sx={{ 
                        p: 1.5, 
                        borderRadius: 2, 
                        backgroundColor: msg.own ? '#e3f2fd' : '#f1f8e9',
                        maxWidth: '70%'
                      }}
                    >
                      <ListItemText 
                        primary={msg.text}
                        secondary={new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        primaryTypographyProps={{ 
                          style: { 
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }
                        }}
                      />
                    </Box>
                  </ListItem>
                  <div ref={messagesEndRef} />
                </React.Fragment>
              ))
            )}
            {peerTyping && (
              <ListItem sx={{ justifyContent: 'flex-start' }}>
                <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#f1f8e9', maxWidth: '70%' }}>
                  <ListItemText primary="Peer is typing..." />
                </Box>
              </ListItem>
            )}
          </List>
        </Box>
        
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={4}
          value={input}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          variant="outlined"
          sx={{ mb: 1 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            onClick={handleSend}
            disabled={input.trim() === ''}
          >
            Send
          </Button>
        </Box>
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button 
          variant="outlined" 
          color="error" 
          onClick={() => navigate('/dashboard')}
        >
          End Chat Early
        </Button>
      </Box>
    </Container>
  );
};

export default ChatRoom;