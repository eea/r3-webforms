import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import FolderZipOutlinedIcon from '@mui/icons-material/FolderZipOutlined';
import { useAuth } from '../contexts/AuthContext';
import { useSignalR } from '../contexts/SignalRContext';
import { useWorkflowProgress } from '../hooks/useWorkflowProgress';
import { clearDataset } from '../db';
import { flattenRecord, recordsToCsv } from './pushUtils';
import JSZip from 'jszip';
import type { TableEntry } from './pushUtils';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

type PushPageProps = {
  allTables?: TableEntry[];
  hasData?: boolean;
  hasLock?: boolean;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function PushPage({ allTables = [], hasData = false, hasLock = false }: PushPageProps) {
  const { dataflowId, datasetId } = useAuth();
  const { connection } = useSignalR();
  const push = useWorkflowProgress('push');

  const [zipLoading, setZipLoading] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);

  // ── Download ZIP locally (no network, keeps lock) ─────────────────────────
  const handleDownloadZip = async () => {
    setZipLoading(true);
    setZipError(null);
    try {
      const zip = new JSZip();
      for (const table of allTables) {
        if (!table.records.length) continue;
        const flat = table.records.map(flattenRecord);
        const csv = recordsToCsv(flat, table.fieldNames);
        zip.file(`${table.name}.csv`, csv);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, 'data_export.zip');
    } catch (err: any) {
      setZipError(err?.message ?? 'Failed to build ZIP');
    } finally {
      setZipLoading(false);
    }
  };

  // ── Push via BFF ──────────────────────────────────────────────────────────
  const handlePush = async () => {
    if (!connection?.connectionId) {
      return;
    }
    push.reset();

    // Flatten records into { tableName → flatRecords[] }
    const tables: Record<string, Record<string, unknown>[]> = {};
    for (const table of allTables) {
      if (table.records.length) {
        tables[table.name] = table.records.map(flattenRecord);
      }
    }

    await fetch(`${API}/api/${dataflowId}/${datasetId}/push`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionId: connection.connectionId, tables }),
    });
    // Progress + result delivered via SignalR
  };

  // On push success, clear IndexedDB (lock was released by BFF)
  const datasetKey = `${dataflowId}:${datasetId}`;
  if (push.status === 'done') {
    clearDataset(datasetKey);
  }

  return (
    <>
      <Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 }, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0 }}>
          <FileUploadOutlinedIcon /> Push
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Push data back to ReportNet.
        </Typography>
      </Box>

      <Stack spacing={3} sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 }, alignItems: 'flex-start' }}>

        {!hasData && (
          <Alert severity="info">No data loaded. Pull first to load a dataset.</Alert>
        )}

        {hasData && !hasLock && (
          <Alert severity="warning">
            You do not hold the lock for this dataset. Pull with the lock to enable push.
          </Alert>
        )}

        {/* ── Download ZIP (local, always available when data is loaded) ── */}
        {hasData && (
          <Box sx={{ width: '100%' }}>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
              Download ZIP
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Build and download a pipe-delimited ZIP of CSVs from the current dataset (no upload).
            </Typography>
            <Button
              variant="outlined"
              onClick={handleDownloadZip}
              disabled={zipLoading}
              startIcon={<FolderZipOutlinedIcon />}
            >
              {zipLoading ? 'Building…' : 'Download ZIP'}
            </Button>
            {zipError && <Alert severity="error" sx={{ mt: 1 }}>{zipError}</Alert>}
          </Box>
        )}

        {/* ── Push via BFF ── */}
        {hasData && hasLock && (
          <Box sx={{ width: '100%' }}>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
              Push to ReportNet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload the current dataset to ReportNet. This will release your lock on success.
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <Button
                variant="contained"
                onClick={handlePush}
                disabled={push.status === 'running' || !connection?.connectionId}
                startIcon={<FileUploadOutlinedIcon />}
              >
                {push.status === 'running' ? 'Pushing…' : 'Push to RN3'}
              </Button>
              {push.status === 'running' && (
                <Chip label={`${push.percent}%`} size="small" />
              )}
            </Stack>

            {push.status === 'running' && (
              <Box sx={{ width: '100%', mb: 1 }}>
                <LinearProgress variant="determinate" value={push.percent} />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {push.message}
                </Typography>
              </Box>
            )}

            {push.status === 'done' && (
              <Alert severity="success">Push complete. Lock released.</Alert>
            )}

            {push.status === 'error' && (
              <Alert severity="error" sx={{ mt: 1 }}>{push.error}</Alert>
            )}
          </Box>
        )}

      </Stack>
    </>
  );
}

export default PushPage;
