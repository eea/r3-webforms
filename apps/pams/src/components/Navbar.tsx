import { useEffect, useState } from 'react'
import {
  Button, CircularProgress, Popover, Box, Typography,
  FormControl, InputLabel, Select, MenuItem, TextField,
  IconButton, InputAdornment,
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material'
import CircleIcon from '@mui/icons-material/Circle'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import { rn3Api } from '../services/rn3Api'
import { useAuth } from '../contexts/AuthContext'
import { clearValidationData } from './validation'
import './Navbar.css'

type ConnectionStatus = 'idle' | 'checking' | 'connected' | 'error'

const ENVIRONMENTS = [
  { label: 'Sandbox', value: '/api' },
  { label: 'Test / Pre-production', value: '/api-preprod' },
  { label: 'Production', value: '/api-prod' },
]

const STATUS_COLOR: Record<ConnectionStatus, string> = {
  idle: '#888888',
  checking: '#888888',
  connected: '#4caf50',
  error: '#f44336',
}

function Navbar() {
  const { setIsConnected } = useAuth()
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [environment, setEnvironment] = useState(
    () => localStorage.getItem('rn3_env') || import.meta.env.VITE_RN3_API_URL || ENVIRONMENTS[0].value
  )
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem('rn3_apikey') || ''
  )
  const [dataflowId, setDataflowId] = useState(
    () => localStorage.getItem('rn3_dataflowid') || ''
  )
  const [datasetId, setDatasetId] = useState(
    () => localStorage.getItem('rn3_datasetid') || ''
  )
  const [submitted, setSubmitted] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  const open = Boolean(anchorEl)

  // Auto-connect on mount if credentials are saved in localStorage
  useEffect(() => {
    const savedEnv = localStorage.getItem('rn3_env')
    const savedApiKey = localStorage.getItem('rn3_apikey')
    const savedDataflowId = localStorage.getItem('rn3_dataflowid')
    const savedDatasetId = localStorage.getItem('rn3_datasetid')

    if (savedEnv && savedApiKey && savedDataflowId && savedDatasetId) {
      rn3Api.configure(savedEnv, savedApiKey)
      setStatus('checking')
      rn3Api.checkConnection(savedDatasetId, savedDataflowId).then((ok) => {
        setStatus(ok ? 'connected' : 'error')
        setIsConnected(ok)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleButtonClick = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
    setSubmitted(false)
  }

  const handleDisconnect = () => {
    localStorage.removeItem('rn3_env')
    localStorage.removeItem('rn3_apikey')
    localStorage.removeItem('rn3_dataflowid')
    localStorage.removeItem('rn3_datasetid')
    localStorage.removeItem('rn3_etl_export_cache')
    localStorage.removeItem('rn3_etl_export_cache_timestamp')
    localStorage.removeItem('rn3_schema_field_names_cache')
    clearValidationData()
    setStatus('idle')
    setIsConnected(false)
    setApiKey('')
    setDatasetId('')
    handleClose()
  }

  const handleConnect = async () => {
    setSubmitted(true)
    if (!dataflowId || !apiKey || !datasetId) return
    localStorage.setItem('rn3_env', environment)
    localStorage.setItem('rn3_apikey', apiKey)
    localStorage.setItem('rn3_dataflowid', dataflowId)
    localStorage.setItem('rn3_datasetid', datasetId)
    rn3Api.configure(environment, apiKey)
    setStatus('checking')
    const ok = await rn3Api.checkConnection(datasetId, dataflowId)
    setStatus(ok ? 'connected' : 'error')
    setIsConnected(ok)
    if (ok) handleClose()
  }

  const statusLabel =
    status === 'idle' ? 'Connection' :
      status === 'checking' ? 'Connecting...' :
        status === 'connected' ? 'Connected' : 'Connection failed'

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <h2>Govreg AnnexI Webforms</h2>

        <Button
          variant="outlined"
          size="small"
          onClick={handleButtonClick}
          startIcon={
            status === 'checking'
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
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{ mt: 1 }}
        >
          <Box sx={{ p: 2.5, width: 320, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Connection Settings
            </Typography>

            <FormControl size="small" fullWidth>
              <InputLabel>Environment</InputLabel>
              <Select
                value={environment}
                label="Environment"
                onChange={(e: SelectChangeEvent) => setEnvironment(e.target.value)}
              >
                {ENVIRONMENTS.map(env => (
                  <MenuItem key={env.value} value={env.value}>{env.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="API Key"
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              size="small"
              fullWidth
              placeholder="Enter your API key"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowApiKey(prev => !prev)}
                      edge="end"
                    >
                      {showApiKey ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
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
              helperText={submitted && !dataflowId ? 'Dataflow ID is required' : ''}
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
              helperText={submitted && !datasetId ? 'Dataset ID is required' : ''}
            />

            {status === 'error' && (
              <Typography variant="caption" color="error">
                Connection failed. Check your settings and try again.
              </Typography>
            )}

            <Button
              variant="contained"
              onClick={handleConnect}
              disabled={status === 'checking' || !dataflowId || !apiKey || !datasetId}
              startIcon={status === 'checking' ? <CircularProgress size={14} color="inherit" /> : null}
              sx={{ textTransform: 'none' }}
            >
              {status === 'checking' ? 'Connecting...' : 'Connect'}
            </Button>

            {status === 'connected' && (
              <>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDisconnect}
                  sx={{ textTransform: 'none' }}
                >
                  Disconnect
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<DeleteSweepIcon />}
                  onClick={clearValidationData}
                  sx={{ textTransform: 'none' }}
                >
                  Clear Validation Data
                </Button>
              </>
            )}
          </Box>
        </Popover>
      </div>
    </nav>
  )
}

export default Navbar
