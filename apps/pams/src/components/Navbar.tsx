import { useState } from 'react';
import {
  Button, CircularProgress, Popover, Box, Typography,
  TextField, IconButton, InputAdornment,
} from '@mui/material';
import CircleIcon from '@mui/icons-material/Circle';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../contexts/AuthContext';
import { clearValidationData } from './validation';
import './Navbar.css';

const STATUS_COLOR = {
  idle: '#888888',
  connecting: '#888888',
  connected: '#4caf50',
  error: '#f44336',
};

function Navbar() {
  const { user, isConnected, dataflowId: savedDataflowId, datasetId: savedDatasetId, login, logout } = useAuth();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [dataflowId, setDataflowId] = useState(savedDataflowId);
  const [datasetId, setDatasetId] = useState(savedDatasetId);
  const [showPassword, setShowPassword] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const open = Boolean(anchorEl);
  const status = connecting ? 'connecting' : isConnected ? 'connected' : 'idle';

  const handleConnect = async () => {
    setSubmitted(true);
    if (!username || !password || !dataflowId || !datasetId) return;
    setConnecting(true);
    setLoginError(null);
    try {
      await login(username, password, dataflowId, datasetId);
      setAnchorEl(null);
      setSubmitted(false);
      setPassword('');
    } catch (err: any) {
      setLoginError(err.message ?? 'Login failed');
    } finally {
      setConnecting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    clearValidationData();
    setAnchorEl(null);
  };

  const statusLabel =
    status === 'connecting' ? 'Connecting…' :
    isConnected ? `Connected (${user?.username})` : 'Connection';

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <h2>Govreg AnnexI Webforms</h2>

        <Button
          variant="outlined"
          size="small"
          onClick={e => setAnchorEl(e.currentTarget)}
          startIcon={
            status === 'connecting'
              ? <CircularProgress size={12} color="inherit" />
              : <CircleIcon sx={{ fontSize: 12, color: STATUS_COLOR[status] }} />
          }
          sx={{
            color: '#ffffff',
            borderColor: 'rgba(255,255,255,0.4)',
            textTransform: 'none',
            whiteSpace: 'nowrap',
            '&:hover': { borderColor: '#ffffff' },
          }}
        >
          {statusLabel}
        </Button>

        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{ mt: 1 }}
        >
          <Box sx={{ p: 2.5, width: 300, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {isConnected ? (
              <>
                <Typography variant="subtitle1" fontWeight={600}>
                  Connected as {user?.username}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Dataflow {savedDataflowId} / Dataset {savedDatasetId}
                </Typography>
                <Button variant="outlined" color="error" onClick={handleLogout} sx={{ textTransform: 'none' }}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Typography variant="subtitle1" fontWeight={600}>
                  Sign in to Reportnet3
                </Typography>

                <TextField
                  label="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  size="small"
                  fullWidth
                  required
                  error={submitted && !username}
                  onKeyDown={e => e.key === 'Enter' && handleConnect()}
                />

                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  size="small"
                  fullWidth
                  required
                  error={submitted && !password}
                  onKeyDown={e => e.key === 'Enter' && handleConnect()}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowPassword(p => !p)} edge="end">
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  label="Dataflow ID"
                  type="number"
                  value={dataflowId}
                  onChange={e => setDataflowId(e.target.value)}
                  size="small"
                  fullWidth
                  required
                  error={submitted && !dataflowId}
                />

                <TextField
                  label="Dataset ID"
                  type="number"
                  value={datasetId}
                  onChange={e => setDatasetId(e.target.value)}
                  size="small"
                  fullWidth
                  required
                  error={submitted && !datasetId}
                />

                {loginError && (
                  <Typography variant="caption" color="error">{loginError}</Typography>
                )}

                <Button
                  variant="contained"
                  onClick={handleConnect}
                  disabled={connecting}
                  startIcon={connecting ? <CircularProgress size={14} color="inherit" /> : null}
                  sx={{ textTransform: 'none' }}
                >
                  {connecting ? 'Signing in…' : 'Sign in'}
                </Button>
              </>
            )}
          </Box>
        </Popover>
      </div>
    </nav>
  );
}

export default Navbar;
