import { useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VerifiedIcon from '@mui/icons-material/Verified';
import { useAuth } from '../contexts/AuthContext';
import { useSignalR } from '../contexts/SignalRContext';
import { useWorkflowProgress } from '../hooks/useWorkflowProgress';
import { saveValidationResults } from '../db';
import { ValidationResultsDisplay, computeSummary } from './validation';
import type { ValidationRow } from './validation';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

type Props = {
  open: boolean;
  onClose: () => void;
};

function ValidationWorkflow({ open, onClose }: Props) {
  const { dataflowId, datasetId } = useAuth();
  const { connection } = useSignalR();
  const val = useWorkflowProgress('validation');

  const isRunning = val.status === 'running';
  const datasetKey = `${dataflowId}:${datasetId}`;

  // Parse validation results from WorkflowComplete payload
  const rawResults = val.status === 'done' ? (val.result as Record<string, unknown> | null) : null;

  // Flatten raw results into ValidationRows for the existing display component
  const valRows: ValidationRow[] = rawResults
    ? Object.entries(rawResults).flatMap(([tableName, tableData]) =>
        parseTableValidations(tableName, tableData)
      )
    : [];
  const valSummary = valRows.length ? computeSummary(valRows) : null;

  // Persist to IndexedDB on completion
  useEffect(() => {
    if (val.status === 'done' && rawResults) {
      saveValidationResults(datasetKey, rawResults as Record<string, unknown>);
    }
  }, [val.status, rawResults, datasetKey]);

  // Reset on open
  useEffect(() => {
    if (open) val.reset();
  }, [open]);

  const handleRun = async () => {
    if (!connection?.connectionId) return;
    val.reset();
    await fetch(`${API}/api/${dataflowId}/${datasetId}/validate`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionId: connection.connectionId }),
    });
  };

  const handleClose = () => {
    if (!isRunning) onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 6 }}>
        <VerifiedIcon color="primary" fontSize="small" />
        Validate Dataset {datasetId}
        <IconButton
          aria-label="close"
          onClick={handleClose}
          disabled={isRunning}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ py: 1 }}>

          {/* Progress bar */}
          {isRunning && (
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="caption" fontWeight={600}>{val.message}</Typography>
                <Typography variant="caption" color="text.secondary">{val.percent}%</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={val.percent} sx={{ borderRadius: 1, height: 8 }} />
            </Box>
          )}

          {val.status === 'done' && (
            <LinearProgress variant="determinate" value={100} color="success" sx={{ borderRadius: 1, height: 8 }} />
          )}

          <Divider />

          {/* Idle state */}
          {val.status === 'idle' && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Triggers a validation job on Reportnet3 and retrieves the results.
              </Typography>
              <Button
                variant="contained"
                onClick={handleRun}
                disabled={!connection?.connectionId}
                startIcon={<VerifiedIcon />}
              >
                Run Validation
              </Button>
            </Box>
          )}

          {/* Running */}
          {isRunning && (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={16} />
              <Typography variant="body2">{val.message}</Typography>
            </Stack>
          )}

          {/* Error */}
          {val.status === 'error' && (
            <Box>
              <Typography color="error" variant="body2" sx={{ mb: 2 }}>{val.error}</Typography>
              <Button variant="outlined" onClick={handleRun}>Retry</Button>
            </Box>
          )}

          {/* Results */}
          {val.status === 'done' && valSummary && (
            <ValidationResultsDisplay
              loading={false}
              progress=""
              error={null}
              rows={valRows}
              summary={valSummary}
              timestamp={new Date().toISOString()}
            />
          )}

          {val.status === 'done' && !valSummary && (
            <Typography variant="body2" color="text.secondary">
              Validation complete — no errors found.
            </Typography>
          )}

        </Stack>
      </DialogContent>
    </Dialog>
  );
}

// ── Helper: flatten RN3 TableValueDataset response into ValidationRows ────────

function parseTableValidations(tableName: string, tableData: unknown): ValidationRow[] {
  const rows: ValidationRow[] = [];
  if (!tableData || typeof tableData !== 'object') return rows;
  const records = (tableData as any).records ?? [];
  for (const record of records) {
    for (const v of record.validations ?? []) {
      rows.push({
        table: tableName,
        recordId: record.recordId ?? '',
        column: v.idRule ?? '',
        fieldValue: '',
        level: v.levelError ?? '',
        message: v.message ?? '',
        typeEntity: v.shortCode ?? '',
        validationId: v.idValidation ?? '',
      });
    }
  }
  return rows;
}

export default ValidationWorkflow;
