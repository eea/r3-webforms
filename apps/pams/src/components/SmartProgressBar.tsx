import { useState, useEffect, useRef } from 'react';
import { Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import { getAllTimingStats, getWorkflowEstimate, getWorkflowTimingDetail, recordWorkflowTiming } from '../services/rn3Api';

/**
 * Lookup the average duration for an endpoint pattern from stored timing stats.
 * Falls back to `defaultMs` if no data is available.
 */
export function getEstimatedMs(method: string, urlPattern: string, defaultMs: number): number {
  const stats = getAllTimingStats();
  const key = `${method.toUpperCase()} ${urlPattern.split('?')[0].replace(/\/\d+/g, '/{id}')}`;
  return stats[key]?.avgMs ?? defaultMs;
}

/** Default estimates based on summing individual endpoint averages (used as fallback). */
function getEndpointBasedDefault(stepKey: string): number {
  switch (stepKey) {
    case 'generating-token':
      return getEstimatedMs('POST', '/user/generateToken', 2000);
    case 'adding-job':
      return getEstimatedMs('PUT', '/orchestrator/jobs/addValidationJob/{id}', 3000);
    case 'polling':
      return getEstimatedMs('GET', '/orchestrator/jobs/', 120000);
    case 'pulling-results':
      return (
        getEstimatedMs('GET', '/dataschema/v1/datasetId/{id}', 3000) +
        getEstimatedMs('GET', '/dataschema/v1/getSimpleSchema/dataset/{id}', 2000) +
        getEstimatedMs('GET', '/dataset/TableValueDataset/{id}', 5000) * 10
      );
    case 'export-trigger':
      return getEstimatedMs('GET', '/dataset/v3/etlExport/{id}', 5000);
    case 'export-poll':
      return 30000;
    case 'export-download':
      return getEstimatedMs('GET', '/dataset/{id}', 10000);
    case 'pull-validation':
      return (
        getEstimatedMs('POST', '/user/generateToken', 2000) +
        getEstimatedMs('GET', '/dataschema/v1/datasetId/{id}', 3000) +
        getEstimatedMs('GET', '/dataschema/v1/getSimpleSchema/dataset/{id}', 2000) +
        getEstimatedMs('GET', '/dataset/TableValueDataset/{id}', 5000) * 10
      );
    case 'push-build-zip':
      return (
        getEstimatedMs('GET', '/dataschema/v1/getSimpleSchema/dataset/{id}', 3000) +
        20000
      );
    case 'push-upload-poll':
      return (
        getEstimatedMs('POST', '/dataset/v2/importFileData/{id}', 10000) +
        getEstimatedMs('POST', '/user/generateToken', 2000) +
        30000
      );
    case 'push-import':
      return (
        getEstimatedMs('POST', '/dataset/v2/importFileData/{id}', 10000) +
        getEstimatedMs('POST', '/user/generateToken', 2000) +
        30000
      );
    default:
      return 10000;
  }
}

/**
 * Get estimated total duration for a named workflow step.
 * Primary source: workflow-level timing (recorded after each complete run).
 * Fallback: sum of individual endpoint averages + hardcoded defaults.
 */
export function getStepEstimate(stepKey: string, meta?: Record<string, any>): number {
  const endpointDefault = getEndpointBasedDefault(stepKey);
  return getWorkflowEstimate(stepKey, endpointDefault, meta);
}

export type SmartProgressBarProps = {
  /** Whether the operation is currently running */
  active: boolean;
  /** Key to look up estimated duration AND auto-record timing on completion */
  stepKey?: string;
  /** Override estimated duration in ms (takes precedence over stepKey) */
  estimatedMs?: number;
  /** External progress override (0-100). When provided, uses this instead of time-based estimate. */
  externalProgress?: number;
  /** Metadata stored with timing recording and used for contextual estimation */
  meta?: Record<string, any>;
  /** Label to show */
  label?: string;
  /** Status message */
  message?: string;
  /** Job status (e.g. QUEUED, IN_PROGRESS, FINISHED) — shown as a colored chip */
  jobStatus?: string;
  /** Color for the bar */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  /** Height of the bar */
  height?: number;
  /**
   * Set to false to skip auto-recording timing when the operation completes.
   * Default: true — when `active` goes from true→false with a stepKey, the
   * elapsed time is automatically persisted for future estimates.
   */
  autoRecord?: boolean;
};

const formatTime = (sec: number) => {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
};

/**
 * Self-contained progress bar that:
 * 1. Estimates completion based on historical workflow timing data
 * 2. Shows elapsed, average, last run, and remaining time
 * 3. Automatically records timing when the operation completes
 *
 * Usage: just drop it in — no manual startTime or recordWorkflowTiming needed.
 *
 * ```tsx
 * <SmartProgressBar
 *   active={loading}
 *   stepKey="push-build-zip"
 *   meta={{ tableCount: 32, environment: 'sandbox' }}
 *   label="Push Dataset"
 *   message={statusMessage}
 * />
 * ```
 */
// Module-level map: survives unmount/remount so elapsed time persists across page navigation
const activeStarts = new Map<string, number>();

export default function SmartProgressBar({
  active,
  stepKey,
  estimatedMs: estimatedMsOverride,
  externalProgress,
  meta,
  label,
  message,
  jobStatus,
  color = 'primary',
  height = 6,
  autoRecord = true,
}: SmartProgressBarProps) {
  // Resolve the start time: reuse existing if this stepKey is already running
  const resolveStart = (): number => {
    if (stepKey && activeStarts.has(stepKey)) return activeStarts.get(stepKey)!;
    return Date.now();
  };

  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasActiveRef = useRef(false);
  const metaRef = useRef(meta);

  // Keep meta ref up to date (meta may change during a run, e.g. tableCount becomes known)
  metaRef.current = meta;

  // Read timing data once (not on every tick)
  const estimatedMs = Math.max(estimatedMsOverride ?? (stepKey ? getStepEstimate(stepKey, meta) : 10000), 2000);
  const detail = stepKey ? getWorkflowTimingDetail(stepKey) : null;

  // Keep stepKey in a ref so the cleanup function always uses the latest value
  const stepKeyRef = useRef(stepKey);
  stepKeyRef.current = stepKey;
  const autoRecordRef = useRef(autoRecord);
  autoRecordRef.current = autoRecord;

  useEffect(() => {
    if (active) {
      // Check if this is a NEW operation (component remounted after finishing)
      // vs. a RESUME (user navigated away and back while still running).
      // If wasActiveRef is false, this is a new start — clear any stale map entry.
      if (!wasActiveRef.current && stepKeyRef.current) {
        activeStarts.delete(stepKeyRef.current);
      }
      const start = resolveStart();
      startTimeRef.current = start;
      if (stepKeyRef.current) activeStarts.set(stepKeyRef.current, start);
      setElapsed(Date.now() - start);
      wasActiveRef.current = true;
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - startTimeRef.current);
      }, 500);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Auto-record timing when active transitions true → false
      if (wasActiveRef.current && autoRecordRef.current && stepKeyRef.current && startTimeRef.current > 0) {
        const duration = Date.now() - startTimeRef.current;
        if (duration >= 1000) {
          recordWorkflowTiming(stepKeyRef.current, duration, metaRef.current ?? {});
        }
      }
      // Always clean up the map entry when the operation ends
      if (stepKeyRef.current) activeStarts.delete(stepKeyRef.current);
      wasActiveRef.current = false;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // On unmount: record if the operation was active (parent removed the component
      // because loading finished). The >= 1000ms guard filters Strict Mode ghosts.
      if (wasActiveRef.current && autoRecordRef.current && stepKeyRef.current && startTimeRef.current > 0) {
        const duration = Date.now() - startTimeRef.current;
        if (duration >= 1000) {
          recordWorkflowTiming(stepKeyRef.current, duration, metaRef.current ?? {});
        }
        // Don't delete from activeStarts here — if user just navigated away,
        // the operation is still running and we want to resume elapsed on return.
        // The map entry is cleaned up on the NEXT mount when wasActiveRef is false.
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;

  // Progress: time-based or external override
  const progress = externalProgress !== undefined
    ? externalProgress
    : Math.min(95, Math.round((elapsed / estimatedMs) * 100));

  const elapsedSec = Math.round(elapsed / 1000);
  const estimatedTotalSec = Math.round(estimatedMs / 1000);
  const remainingSec = Math.max(0, estimatedTotalSec - elapsedSec);
  const overdue = elapsed > estimatedMs;

  const avgSec = detail ? Math.round(detail.avgMs / 1000) : null;
  const lastSec = detail ? Math.round(detail.lastMs / 1000) : null;

  return (
    <Box sx={{ width: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
        {label && (
          <Typography variant="caption" fontWeight={600}>
            {label}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          {formatTime(elapsedSec)} elapsed
          {!overdue && remainingSec > 0 && <> &mdash; ~{formatTime(remainingSec)} left</>}
          {overdue && <> &mdash; taking longer than expected</>}
        </Typography>
      </Stack>
      {detail && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          avg: {formatTime(avgSec!)} ({detail.count} run{detail.count > 1 ? 's' : ''})
          {' · '}last: {formatTime(lastSec!)}
        </Typography>
      )}
      {(message || jobStatus) && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          {message && (
            <Typography variant="caption" color="text.secondary">
              {message}
            </Typography>
          )}
          {jobStatus && (
            <Chip
              label={jobStatus}
              size="small"
              color={
                jobStatus === 'IN_PROGRESS' ? 'info'
                  : jobStatus === 'QUEUED' ? 'warning'
                  : jobStatus === 'FINISHED' ? 'success'
                  : ['FAILED', 'ERROR', 'CANCELED', 'REFUSED', 'CANCELED_BY_ADMIN'].includes(jobStatus) ? 'error'
                  : 'default'
              }
              variant={['IN_PROGRESS', 'FINISHED'].includes(jobStatus) ? 'filled' : 'outlined'}
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          )}
        </Stack>
      )}
      <Stack direction="row" spacing={1} alignItems="center">
        <LinearProgress
          variant={progress > 0 ? 'determinate' : 'indeterminate'}
          value={progress}
          color={color}
          sx={{ flex: 1, borderRadius: 1, height }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 32, textAlign: 'right' }}>
          {progress}%
        </Typography>
      </Stack>
    </Box>
  );
}
