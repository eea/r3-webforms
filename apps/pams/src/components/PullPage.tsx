import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import { useAuth } from '../contexts/AuthContext';
import {
  type ValidationRow,
  type ValidationSummary,
  pullValidationData,
  computeSummary,
  VALIDATION_CLEARED_EVENT,
  ValidationResultsDisplay,
} from './validation';
import SmartProgressBar from './SmartProgressBar';

type PullPageProps = {
  loading: boolean;
  error: string | null;
  progress: number;
  progressMessage: string;
  jobStatus?: string;
  cacheTimestamp: string | null;
  datasetId: number;
  dataflowId: number;
  dataflowName?: string;
  environment?: string;
  onExport: () => void;
  onClearCache: () => void;
};

// ── Component ────────────────────────────────────────────────────────────────

function PullPage({
  loading,
  error,
  progress,
  progressMessage,
  jobStatus,
  cacheTimestamp,
  datasetId,
  dataflowId,
  dataflowName,
  environment = 'sandbox',
  onExport,
  onClearCache,
}: PullPageProps) {
  const { isConnected } = useAuth();

  // ── Validation state (100% independent) ──────────────────────────────────
  // Hydrate validation state from localStorage on mount
  const cachedVal = (() => {
    try {
      const raw = localStorage.getItem('rn3_validation_results');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { rows: ValidationRow[]; timestamp: string };
      if (parsed?.rows?.length) return parsed;
    } catch { /* ignore */ }
    return null;
  })();

  const [valLoading, setValLoading] = useState(false);
  const [valProgress, setValProgress] = useState('');
  const [valProgressPct, setValProgressPct] = useState(0);
  const [valError, setValError] = useState<string | null>(null);
  const [valRows, setValRows] = useState<ValidationRow[]>(cachedVal?.rows ?? []);
  const [valSummary, setValSummary] = useState<ValidationSummary | null>(cachedVal ? computeSummary(cachedVal.rows) : null);
  const [valTimestamp, setValTimestamp] = useState<string | null>(cachedVal?.timestamp ?? null);

  // Listen for validation data cleared from other components (e.g. ValidationWorkflow)
  const clearValState = useCallback(() => {
    setValRows([]);
    setValSummary(null);
    setValTimestamp(null);
    setValError(null);
    setValProgress('');
  }, []);

  useEffect(() => {
    window.addEventListener(VALIDATION_CLEARED_EVENT, clearValState);
    return () => window.removeEventListener(VALIDATION_CLEARED_EVENT, clearValState);
  }, [clearValState]);

  const handlePullValidation = async () => {
    setValLoading(true);
    setValError(null);
    setValRows([]);
    setValSummary(null);
    setValTimestamp(null);
    setValProgressPct(0);

    try {
      const allRows = await pullValidationData(datasetId, dataflowId, setValProgress, setValProgressPct);
      const timestamp = new Date().toISOString();
      setValRows(allRows);
      setValSummary(computeSummary(allRows));
      setValTimestamp(timestamp);
      setValProgress('');
    } catch (err: any) {
      setValError(err?.message ?? 'Failed to pull validation results');
      setValProgress('');
    } finally {
      setValLoading(false);
    }
  };

  return (
    <>
      <Box
        sx={{
          px: { xs: 2, md: 3 },
          pt: { xs: 2, md: 3 },
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          textAlign: 'left',
          width: '100%',
        }}
      >
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0 }}>
          <FileDownloadOutlinedIcon /> Pull
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'left', width: '100%' }}>
          Trigger dataset export and track progress.
        </Typography>
      </Box>

      <Stack spacing={3} sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 }, alignItems: 'stretch' }}>
        {isConnected && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip
              label={`Environment: ${environment}`}
              size="small"
              color={environment === 'production' ? 'error' : 'info'}
              variant="outlined"
            />
            <Chip
              label={`Dataflow: ${dataflowId}${dataflowName ? ` - ${dataflowName}` : ''}`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`Dataset: ${datasetId}`}
              size="small"
              variant="outlined"
            />
          </Box>
        )}

        {/* Pull JSON Section */}
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Pull JSON
          </Typography>
        </Box>

        {cacheTimestamp && (
          <Alert severity="info" sx={{ py: 1, width: '100%' }}>
            <Typography variant="body2" component="div">
              <strong>Cached data available</strong> from {new Date(cacheTimestamp).toLocaleString()}
            </Typography>
            <Button
              size="small"
              onClick={() => {
                onClearCache();
                setValRows([]);
                setValSummary(null);
                setValTimestamp(null);
                setValError(null);
                setValProgress('');
              }}
              sx={{ mt: 1 }}
              variant="outlined"
            >
              Clear Cache & Re-export
            </Button>
          </Alert>
        )}

        <Box>
          <Button
            variant="contained"
            onClick={onExport}
            disabled={loading || !isConnected}
            startIcon={<FileDownloadOutlinedIcon />}
          >
            Pull Dataset ({datasetId})
          </Button>
        </Box>

        {loading && (
          <Box sx={{ width: '100%' }}>
            <SmartProgressBar
              active
              stepKey="export-full"
              label="Pull Dataset"
              message={progressMessage}
              jobStatus={jobStatus}
            />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ py: 1, width: '100%' }}>
            <Typography variant="body2" component="div">
              <strong>Error:</strong> {error}
            </Typography>
          </Alert>
        )}

        {!loading && !error && progress === 100 && (
          <Alert severity="success" sx={{ py: 1, width: '100%' }}>
            Data exported successfully!
          </Alert>
        )}

        {/* ── Pull for Validation (independent section) ─────────────────────── */}
        <Divider sx={{ width: '100%' }} />

        <Box>
          <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <VerifiedOutlinedIcon /> Pull for Validation
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Fetch validation results from ReportNet. This data is independent from the application dataset.
          </Typography>

          <Button
            variant="contained"
            color="secondary"
            onClick={handlePullValidation}
            disabled={valLoading || !isConnected}
            startIcon={<VerifiedOutlinedIcon />}
          >
            {valLoading ? 'Fetching...' : 'Pull for Validation'}
          </Button>
        </Box>

        {valLoading && (
          <Box sx={{ width: '100%' }}>
            <SmartProgressBar
              active
              stepKey="pull-validation"
              externalProgress={valProgressPct > 0 ? valProgressPct : undefined}
              label="Pull Validation Data"
              message={valProgress}
              color="secondary"
            />
          </Box>
        )}

        <ValidationResultsDisplay
          loading={valLoading}
          progress={valProgress}
          error={valError}
          rows={valRows}
          summary={valSummary}
          timestamp={valTimestamp}
        />
      </Stack>
    </>
  );
}

export default PullPage;
