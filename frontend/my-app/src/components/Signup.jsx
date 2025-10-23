import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Link,
  Alert,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';

const Signup = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    phq9: '',
    bdi2: '',
    gad7: '',
    dass21: '',
    feeling: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const feelings = ['stress', 'anxiety', 'depression', 'loneliness', 'overwhelm'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate all fields
    for (const key in formData) {
      if (!formData[key]) {
        setError('All fields are required');
        setLoading(false);
        return;
      }
    }

    // Validate score ranges (exact maximums)
    const MAX = { phq9: 27, bdi2: 63, gad7: 21, dass21: 42 };
    for (const key of Object.keys(MAX)) {
      const value = Number(formData[key]);
      if (!Number.isInteger(value) || value < 0 || value > MAX[key]) {
        setError(`${key.toUpperCase()} must be an integer between 0 and ${MAX[key]}`);
        setLoading(false);
        return;
      }
    }

    try {
      const response = await axios.post('/api/auth/signup', {
        ...formData,
        phq9: parseInt(formData.phq9),
        bdi2: parseInt(formData.bdi2),
        gad7: parseInt(formData.gad7),
        dass21: parseInt(formData.dass21)
      });

      onLogin(response.data.user, response.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: 3,
          border: '1px solid #e0e0e0',
          borderRadius: 2,
          boxShadow: 3
        }}
      >
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          Peer Support Chat - Sign Up
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus
            value={formData.username}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
          />
          
          <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
            Mental Health Scores (PHQ-9 ≤ 27, BDI-II ≤ 63, GAD-7 ≤ 21, DASS-21 ≤ 42)
          </Typography>
          
          <TextField
            margin="normal"
            required
            fullWidth
            id="phq9"
            label="PHQ-9 Score"
            name="phq9"
            type="number"
            inputProps={{ min: 0, max: 27 }}
            value={formData.phq9}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="bdi2"
            label="BDI-II Score"
            name="bdi2"
            type="number"
            inputProps={{ min: 0, max: 63 }}
            value={formData.bdi2}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="gad7"
            label="GAD-7 Score"
            name="gad7"
            type="number"
            inputProps={{ min: 0, max: 21 }}
            value={formData.gad7}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="dass21"
            label="DASS-21 Score"
            name="dass21"
            type="number"
            inputProps={{ min: 0, max: 42 }}
            value={formData.dass21}
            onChange={handleChange}
          />
          
          <FormControl fullWidth margin="normal" required>
            <InputLabel id="feeling-label">Current Feeling</InputLabel>
            <Select
              labelId="feeling-label"
              id="feeling"
              name="feeling"
              value={formData.feeling}
              label="Current Feeling"
              onChange={handleChange}
            >
              {feelings.map((feeling) => (
                <MenuItem key={feeling} value={feeling}>
                  {feeling.charAt(0).toUpperCase() + feeling.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </Button>
          <Link href="/login" variant="body2">
            {"Already have an account? Login"}
          </Link>
        </Box>
      </Box>
    </Container>
  );
};

export default Signup;