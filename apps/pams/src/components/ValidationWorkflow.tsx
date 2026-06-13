import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import VerifiedIcon from '@mui/icons-material/Verified';
import { rn3Api } from '../services/rn3Api';
import {
  type ValidationRow,
  type ValidationSummary,
  pullValidationData,
  computeSummary,
  clearValidationData,
  ValidationResultsDisplay,
} from './validation';
import SmartProgressBar, { getStepEstimate } from './SmartProgressBar';
import { type TableEntry, buildZip, uploadAndPoll } from './pushUtils';

type WorkflowStep =
  | 'idle'
  | 'pushing-data'
  | 'generating-token'
  | 'adding-job'
  | 'polling'
  | 'pulling-results'
  | 'done'
  | 'error';

type Props = {
  open: boolean;
  onClose: () => void;
  datasetId: number;
  dataflowId: number;
  allTables: TableEntry[];
};

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 120;

const STEPS = [
  { key: 'pushing-data', label: 'Push Data to RN3' },
  { key: 'generating-token', label: 'Generate Token' },
  { key: 'adding-job', label: 'Submit Validation Job' },
  { key: 'polling', label: 'Wait for Completion' },
  { key: 'pulling-results', label: 'Pull Validation Results' },
] as const;

// Map step key to its index (0-4)
const STEP_INDEX: Record<string, number> = {};
STEPS.forEach((s, i) => { STEP_INDEX[s.key] = i; });

function StepProgressRow({
  label,
  status,
  message,
  stepKey,
  jobStatus,
}: {
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  message?: string;
  stepKey?: string;
  jobStatus?: string;
}) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        {status === 'pending' && <HourglassEmptyIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
        {status === 'running' && <CircularProgress size={14} />}
        {status === 'done' && <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />}
        {status === 'error' && <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />}
        <Typography
          variant="body2"
          sx={{
            fontWeight: status === 'running' ? 600 : 400,
            color: status === 'pending' ? 'text.disabled' : 'text.primary',
          }}
        >
          {label}
        </Typography>
      </Stack>
      {status === 'running' && (
        <SmartProgressBar
          active
          stepKey={stepKey}
          message={message}
          jobStatus={jobStatus}
        />
      )}
    </Box>
  );
}

function ValidationWorkflow({ open, onClose, datasetId, dataflowId, allTables }: Props) {
  const [step, setStep] = useState<WorkflowStep>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | undefined>(undefined);

  // Global progress derived from step estimates and elapsed time
  const [globalProgress, setGlobalProgress] = useState(0);

  // Step start times and completion flags
  const [stepStarts, setStepStarts] = useState<(number | null)[]>([null, null, null, null, null]);
  const [stepDone, setStepDone] = useState<boolean[]>([false, false, false, false, false]);

  // Estimated durations per step (from historical timing data)
  const [stepEstimates] = useState<number[]>(() =>
    STEPS.map(s => getStepEstimate(s.key))
  );

  // Validation results (from pullValidationData in step 5)
  const [valRows, setValRows] = useState<ValidationRow[]>([]);
  const [valSummary, setValSummary] = useState<ValidationSummary | null>(null);
  const [valTimestamp, setValTimestamp] = useState<string | null>(null);

  const isRunning = ['pushing-data', 'generating-token', 'adding-job', 'polling', 'pulling-results'].includes(step);

  // Compute global progress from step estimates + elapsed time
  const calcGlobal = useCallback(() => {
    const totalEstimate = stepEstimates.reduce((a, b) => a + b, 0);
    if (totalEstimate <= 0) return 0;

    let completedMs = 0;
    const now = Date.now();

    for (let i = 0; i < 5; i++) {
      if (stepDone[i]) {
        completedMs += stepEstimates[i];
      } else if (stepStarts[i]) {
        const elapsed = now - stepStarts[i]!;
        // Cap at 95% of the step's estimate (don't overshoot before done)
        completedMs += Math.min(elapsed, stepEstimates[i] * 0.95);
      }
    }

    return Math.min(99, Math.round((completedMs / totalEstimate) * 100));
  }, [stepEstimates, stepDone, stepStarts]);

  // Interval to update global progress while running
  const globalIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      globalIntervalRef.current = setInterval(() => {
        setGlobalProgress(calcGlobal());
      }, 500);
    } else {
      if (globalIntervalRef.current) {
        clearInterval(globalIntervalRef.current);
        globalIntervalRef.current = null;
      }
    }
    return () => {
      if (globalIntervalRef.current) {
        clearInterval(globalIntervalRef.current);
        globalIntervalRef.current = null;
      }
    };
  }, [isRunning, calcGlobal]);

  const markStepStart = (stepIdx: number) => {
    setStepStarts(prev => {
      const next = [...prev];
      next[stepIdx] = Date.now();
      return next;
    });
  };

  const markStepDone = (stepIdx: number) => {
    setStepDone(prev => {
      const next = [...prev];
      next[stepIdx] = true;
      return next;
    });
  };

  const reset = () => {
    setStep('idle');
    setStatusMessage('');
    setError(null);
    setJobStatus(undefined);
    setStepStarts([null, null, null, null, null]);
    setStepDone([false, false, false, false, false]);
    setGlobalProgress(0);
    setValRows([]);
    setValSummary(null);
    setValTimestamp(null);
  };

  const handleClose = () => {
    if (!isRunning) {
      reset();
      onClose();
    }
  };

  const runValidation = useCallback(async () => {
    reset();
    clearValidationData();

    console.log(`[Validation] Starting workflow — datasetId=${datasetId}, dataflowId=${dataflowId}`);

    try {
      // ── Step 1: Push data to RN3 ──────────────────────────────────────────
      setStep('pushing-data');
      markStepStart(0);
      setStatusMessage('Building ZIP and pushing data to RN3...');

      const apiKey = localStorage.getItem('rn3_push_apikey') || '';
      if (!apiKey) {
        throw new Error('Push API Key is not configured. Set it in the Push page first.');
      }

      const zipBlob = await buildZip(allTables, (p) => {
        setStatusMessage(`Building CSV: ${p.tableName} (${p.tableIndex}/${p.totalTables})`);
      });
      const zipFile = new File([zipBlob], 'data_export.zip', { type: 'application/zip' });

      const pushResult = await uploadAndPoll(zipFile, datasetId, dataflowId, apiKey, setStatusMessage);

      if (pushResult.jobStatus !== 'FINISHED' && pushResult.jobStatus !== 'ACCEPTED') {
        throw new Error(`Push job ended with status: ${pushResult.jobStatus}`);
      }
      markStepDone(0);

      // ── Step 2: Generate Bearer token ─────────────────────────────────────
      setStep('generating-token');
      markStepStart(1);
      setStatusMessage('Generating authentication token...');

      const username = import.meta.env.VITE_RN3_CUSTODIAN_USERNAME;
      const password = import.meta.env.VITE_RN3_CUSTODIAN_PASSWORD;

      if (!username || !password) {
        throw new Error('VITE_RN3_CUSTODIAN_USERNAME or VITE_RN3_CUSTODIAN_PASSWORD is not set in .env');
      }

      const tokenData = await rn3Api.post<any>(
        '/user/generateToken',
        new URLSearchParams({ username, password }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const accessToken: string | undefined =
        typeof tokenData === 'string'
          ? tokenData
          : tokenData?.accessToken ?? undefined;

      if (!accessToken) {
        throw new Error(`Could not extract access token. Response: ${JSON.stringify(tokenData)}`);
      }

      rn3Api.setAccessToken(accessToken);
      markStepDone(1);

      // ── Step 3: Submit validation job ─────────────────────────────────────
      setStep('adding-job');
      markStepStart(2);
      setStatusMessage(`Submitting validation job for dataset ${datasetId}...`);

      await rn3Api.put<any>(`/orchestrator/jobs/addValidationJob/${datasetId}`, undefined);
      rn3Api.clearAccessToken();
      markStepDone(2);

      // ── Step 4: Poll jobs list until FINISHED ─────────────────────────────
      setStep('polling');
      markStepStart(3);
      let finished = false;
      let attempts = 0;

      while (attempts < MAX_POLL_ATTEMPTS && !finished) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        attempts++;
        setStatusMessage(`Waiting for job to complete... (${attempts}/${MAX_POLL_ATTEMPTS})`);

        const jobsData = await rn3Api.get<{ jobsList?: any[] }>(
          '/orchestrator/jobs/?pageNum=0&pageSize=30&asc=0&sortedColumn=dateAdded'
        );

        const validationJob = jobsData.jobsList?.find(
          (j: any) =>
            Number(j.datasetId) === datasetId && j.jobType === 'VALIDATION'
        );

        if (validationJob) {
          const status: string = validationJob.jobStatus;
          setJobStatus(status);
          setStatusMessage(`Polling (${attempts}/${MAX_POLL_ATTEMPTS})`);

          if (status === 'FINISHED') {
            finished = true;
          } else if (
            ['FAILED', 'ERROR', 'CANCELED', 'REFUSED', 'CANCELED_BY_ADMIN'].includes(status)
          ) {
            throw new Error(`Validation job ended with status: ${status}`);
          }
        }
      }

      if (!finished) {
        throw new Error('Validation job did not finish within the expected time');
      }

      markStepDone(3);

      // ── Step 5: Pull detailed validation results ──────────────────────────
      setStep('pulling-results');
      markStepStart(4);
      setStatusMessage('Pulling detailed validation results...');

      const allRows = await pullValidationData(
        datasetId,
        dataflowId,
        setStatusMessage,
        () => {},
      );
      const timestamp = new Date().toISOString();
      setValRows(allRows);
      setValSummary(computeSummary(allRows));
      setValTimestamp(timestamp);
      markStepDone(4);

      setGlobalProgress(100);
      setStep('done');
      setStatusMessage('');
    } catch (err: any) {
      rn3Api.clearAccessToken();
      setError(err?.message ?? 'Validation workflow failed');
      setStep('error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetId, dataflowId, allTables]);

  const getStepStatus = (stepIdx: number): 'pending' | 'running' | 'done' | 'error' => {
    const currentIdx = STEP_INDEX[step] ?? -1;
    if (step === 'error' && currentIdx === stepIdx) return 'error';
    if (step === 'done') return 'done';
    if (stepIdx < currentIdx) return 'done';
    if (stepIdx === currentIdx) return 'running';
    return 'pending';
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
          {/* Global progress bar */}
          {isRunning && (
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="caption" fontWeight={600}>Overall Progress</Typography>
                <Typography variant="caption" color="text.secondary">{globalProgress}%</Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={globalProgress}
                sx={{ borderRadius: 1, height: 8 }}
              />
            </Box>
          )}

          {step === 'done' && (
            <Box>
              <LinearProgress variant="determinate" value={100} color="success" sx={{ borderRadius: 1, height: 8 }} />
            </Box>
          )}

          <Divider />

          {/* Per-step progress */}
          {step === 'idle' ? (
            <Typography variant="body2" color="text.secondary">
              This will <strong>push</strong> your current data to RN3, trigger a <strong>validation</strong> job on
              dataset <strong>{datasetId}</strong> (dataflow <strong>{dataflowId}</strong>),
              wait for completion, then <strong>pull</strong> the detailed results.
            </Typography>
          ) : (
            <Box>
              {STEPS.map((s, idx) => (
                <StepProgressRow
                  key={s.key}
                  label={`Step ${idx + 1}: ${s.label}`}
                  status={getStepStatus(idx)}
                  message={getStepStatus(idx) === 'running' ? statusMessage : undefined}
                  stepKey={s.key}
                  jobStatus={getStepStatus(idx) === 'running' ? jobStatus : undefined}
                />
              ))}
            </Box>
          )}

          {/* Done — show results */}
          {step === 'done' && (
            <>
              <Divider />
              <ValidationResultsDisplay
                loading={false}
                progress=""
                error={null}
                rows={valRows}
                summary={valSummary}
                timestamp={valTimestamp}
              />
            </>
          )}

          {/* Error */}
          {step === 'error' && (
            <>
              <Divider />
              <ValidationResultsDisplay
                loading={false}
                progress=""
                error={error}
                rows={[]}
                summary={null}
                timestamp={null}
              />
            </>
          )}

          {/* Actions */}
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            {step === 'idle' && (
              <>
                <Button variant="outlined" onClick={handleClose}>
                  Cancel
                </Button>
                <Button variant="contained" onClick={runValidation} startIcon={<VerifiedIcon />}>
                  Start Validation
                </Button>
              </>
            )}

            {isRunning && (
              <Button variant="outlined" disabled startIcon={<CircularProgress size={14} />}>
                Running… {globalProgress}%
              </Button>
            )}

            {(step === 'done' || step === 'error') && (
              <>
                <Button variant="outlined" onClick={reset}>
                  Run Again
                </Button>
                <Button variant="contained" onClick={handleClose}>
                  Close
                </Button>
              </>
            )}
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

export default ValidationWorkflow;
