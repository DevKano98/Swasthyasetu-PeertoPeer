import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert
} from '@mui/material';

const Dashboard = ({ user: initialUser, onLogout }) => {
  const [user, setUser] = useState(initialUser);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    phq9: '',
    bdi2: '',
    gad7: '',
    dass21: '',
    feeling: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [searchTimeLeft, setSearchTimeLeft] = useState(0);
  const searchTimerRef = useRef(null);
  const pollingRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      fetchUserData();
    }
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      setFormData({
        phq9: response.data.phq9.toString(),
        bdi2: response.data.bdi2.toString(),
        gad7: response.data.gad7.toString(),
        dass21: response.data.dass21.toString(),
        feeling: response.data.feeling
      });
    } catch (err) {
      console.error('Failed to fetch user data:', err);
      onLogout();
      navigate('/login');
    }
  };

  const handleEditToggle = () => {
    if (editMode) {
      setFormData({
        phq9: user.phq9.toString(),
        bdi2: user.bdi2.toString(),
        gad7: user.gad7.toString(),
        dass21: user.dass21.toString(),
        feeling: user.feeling
      });
      setError('');
      setSuccess('');
    }
    setEditMode(!editMode);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    
    // Validate scores with exact maximums
    const MAX = { phq9: 27, bdi2: 63, gad7: 21, dass21: 42 };
    for (const key of Object.keys(MAX)) {
      const value = Number(formData[key]);
      if (!Number.isInteger(value) || value < 0 || value > MAX[key]) {
        setError(`${key.toUpperCase()} must be an integer between 0 and ${MAX[key]}`);
        return;
      }
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put('/api/user/profile', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUser(response.data);
      setSuccess('Profile updated successfully!');
      setEditMode(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleConnect = async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    setConnectError('');
    setSearchTimeLeft(60);

    const clearAll = () => {
      if (searchTimerRef.current) {
        clearInterval(searchTimerRef.current);
        searchTimerRef.current = null;
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };

    // Countdown timer (1 minute)
    searchTimerRef.current = setInterval(() => {
      setSearchTimeLeft(prev => {
        if (prev <= 1) {
          clearAll();
          setIsConnecting(false);
          setConnectError('No peer found within 1 minute. Please try again.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const attemptConnect = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post('/api/match/connect', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.matched) {
          clearAll();
          navigate(`/chat/${response.data.roomId}`);
        }
      } catch (err) {
        // Keep trying until timeout, but surface an error message once
        if (!connectError) {
          setConnectError(err.response?.data?.error || 'Failed to connect to peer');
        }
      }
    };

    // First immediate attempt
    attemptConnect();
    // Then poll every 3s until matched or timeout
    pollingRef.current = setInterval(attemptConnect, 3000);
  };

  // Cleanup timers when unmounting
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  if (!user) {
    return <Typography>Loading...</Typography>;
  }

  const feelings = ['stress', 'anxiety', 'depression', 'loneliness', 'overwhelm'];

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Welcome, {user.username}!
        </Typography>
        <Button variant="outlined" color="error" onClick={onLogout}>
          Logout
        </Button>
      </Box>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Your Mental Health Profile
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        {connectError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {connectError}
          </Alert>
        )}
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="PHQ-9 Score"
              value={editMode ? formData.phq9 : user.phq9}
              name="phq9"
              onChange={handleChange}
              disabled={!editMode}
              type="number"
              inputProps={{ min: 0, max: 27 }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="BDI-II Score"
              value={editMode ? formData.bdi2 : user.bdi2}
              name="bdi2"
              onChange={handleChange}
              disabled={!editMode}
              type="number"
              inputProps={{ min: 0, max: 63 }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="GAD-7 Score"
              value={editMode ? formData.gad7 : user.gad7}
              name="gad7"
              onChange={handleChange}
              disabled={!editMode}
              type="number"
              inputProps={{ min: 0, max: 21 }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="DASS-21 Score"
              value={editMode ? formData.dass21 : user.dass21}
              name="dass21"
              onChange={handleChange}
              disabled={!editMode}
              type="number"
              inputProps={{ min: 0, max: 42 }}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Current Feeling</InputLabel>
              <Select
                value={editMode ? formData.feeling : user.feeling}
                name="feeling"
                onChange={handleChange}
                disabled={!editMode}
                label="Current Feeling"
              >
                {feelings.map((feeling) => (
                  <MenuItem key={feeling} value={feeling}>
                    {feeling.charAt(0).toUpperCase() + feeling.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          {editMode ? (
            <>
              <Button variant="contained" onClick={handleSave}>
                Save Changes
              </Button>
              <Button variant="outlined" onClick={handleEditToggle}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="contained" onClick={handleEditToggle}>
              Edit Profile
            </Button>
          )}
        </Box>
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Connect with a Peer
        </Typography>
        <Typography sx={{ mb: 2 }}>
          You'll be matched with another student who has a similar feeling and mental health scores.
          Chat sessions last 20 minutes and are completely anonymous.
        </Typography>
        <Button 
          variant="contained" 
          size="large"
          onClick={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? `Searching for peer... ${searchTimeLeft}s` : 'Connect to Peer'}
        </Button>
        {isConnecting && (
          <Button 
            variant="outlined" 
            color="error" 
            size="large"
            sx={{ ml: 2 }}
            onClick={async () => {
              // stop timers
              if (searchTimerRef.current) clearInterval(searchTimerRef.current);
              if (pollingRef.current) clearInterval(pollingRef.current);
              searchTimerRef.current = null;
              pollingRef.current = null;
              setIsConnecting(false);
              setSearchTimeLeft(0);
              try {
                const token = localStorage.getItem('token');
                await axios.delete('/api/match/queue', {
                  headers: { Authorization: `Bearer ${token}` }
                });
              } catch {
                // ignore error on cancel
              }
            }}
          >
            Stop Search
          </Button>
        )}
      </Paper>
    </Container>
  );
};

export default Dashboard;