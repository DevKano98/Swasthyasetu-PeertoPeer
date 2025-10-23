import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Box,
  IconButton,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const DataView = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get('/api/user/all');
        if (Array.isArray(res.data)) {
          setUsers(res.data);
        } else if (Array.isArray(res.data?.users)) {
          setUsers(res.data.users);
        } else {
          // Fallback for dev without proxy
          const res2 = await axios.get('http://localhost:5000/api/user/all');
          if (Array.isArray(res2.data)) {
            setUsers(res2.data);
          } else if (Array.isArray(res2.data?.users)) {
            setUsers(res2.data.users);
          } else {
            throw new Error('Unexpected response format');
          }
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user? This action cannot be undone.')) return;
    setDeletingId(id);
    try {
      // Try proxied first
      await axios.delete(`/api/user/${id}`);
    } catch {
      // Fallback direct to backend in case proxy is not active
      await axios.delete(`http://localhost:5000/api/user/${id}`);
    } finally {
      setDeletingId(null);
    }
    // Optimistically remove from state
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Users (Demo View)</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        This page lists users with scores and feelings to demonstrate matching data.
      </Typography>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {!loading && !error && Array.isArray(users) && (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="right">PHQ-9</TableCell>
                  <TableCell align="right">BDI-II</TableCell>
                  <TableCell align="right">GAD-7</TableCell>
                  <TableCell align="right">DASS-21</TableCell>
                  <TableCell>Feeling</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>{u.id}</TableCell>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell align="right">{u.phq9}</TableCell>
                    <TableCell align="right">{u.bdi2}</TableCell>
                    <TableCell align="right">{u.gad7}</TableCell>
                    <TableCell align="right">{u.dass21}</TableCell>
                    <TableCell>{u.feeling}</TableCell>
                    <TableCell>{new Date(u.created_at).toLocaleString()}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Delete user">
                        <span>
                          <IconButton 
                            aria-label="delete" 
                            color="error" 
                            onClick={() => handleDelete(u.id)}
                            disabled={deletingId === u.id}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Container>
  );
};

export default DataView;


