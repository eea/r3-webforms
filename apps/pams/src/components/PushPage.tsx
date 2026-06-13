import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useRef, useState } from 'react';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import FolderZipOutlinedIcon from '@mui/icons-material/FolderZipOutlined';
import SmartProgressBar from './SmartProgressBar';
import {
  type TableEntry,
  type BuildProgress,
  buildZip,
  uploadAndPoll,
} from './pushUtils';

type PushPageProps = {
  allTables?: TableEntry[];
  hasData?: boolean;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ──────────────────────────────────────────────────────────────

function PushPage({ allTables = [], hasData = false }: PushPageProps) {

  // ── Push API key ──────────────────────────────────────────────────────────
  const [pushApiKey, setPushApiKey] = useState(() => localStorage.getItem('rn3_push_apikey') || '');

  // ── Generate from current data ────────────────────────────────────────────
  const [genLoading, setGenLoading] = useState(false);
  const [genStatusMessage, setGenStatusMessage] = useState('');
  const [genResult, setGenResult] = useState<{ jobId?: number | string; jobStatus: string } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [buildProgress, setBuildProgress] = useState<BuildProgress | null>(null);
  const [buildLog, setBuildLog] = useState<BuildProgress[]>([]);

  const handleDownloadZip = async () => {
    setGenLoading(true);
    setGenError(null);
    setBuildProgress(null);
    setBuildLog([]);
    setGenStatusMessage('Fetching schema…');
    try {
      const blob = await buildZip(allTables, (p) => {
        setBuildProgress(p);
        setBuildLog(prev => [...prev, p]);
        setGenStatusMessage(`${p.tableIndex}/${p.totalTables} — ${p.tableName} (${p.columnCount} cols, ${p.recordCount} records)`);
      });
      setGenStatusMessage('ZIP ready.');
      downloadBlob(blob, 'data_export.zip');
    } catch (err: any) {
      setGenError(err?.message ?? 'Failed to generate ZIP');
    } finally {
      setGenLoading(false);
      setGenStatusMessage('');
      setBuildProgress(null);
    }
  };

  const handleGenerateAndImport = async () => {
    const datasetId = Number(localStorage.getItem('rn3_datasetid'));
    const dataflowId = Number(localStorage.getItem('rn3_dataflowid'));

    if (!datasetId || !dataflowId) {
      setGenError('Dataset ID or Dataflow ID not set. Please connect first using the Connection button.');
      return;
    }

    setGenLoading(true);
    setGenResult(null);
    setGenError(null);
    setBuildProgress(null);
    setBuildLog([]);
    setGenStatusMessage('Fetching schema…');

    try {
      const zipBlob = await buildZip(allTables, (p) => {
        setBuildProgress(p);
        setGenStatusMessage(`Building: ${p.tableIndex}/${p.totalTables} — ${p.tableName} (${p.columnCount} cols, ${p.recordCount} records)`);
      });
      const zipFile = new File([zipBlob], 'data_export.zip', { type: 'application/x-zip-compressed' });
      const result = await uploadAndPoll(zipFile, datasetId, dataflowId, pushApiKey, setGenStatusMessage);
      setGenResult(result);
    } catch (err: any) {
      setGenError(err?.message ?? 'Generate & Import failed');
    } finally {
      setGenLoading(false);
      setGenStatusMessage('');
    }
  };

  // ── Token generation ──────────────────────────────────────────────────────
  const [tokenLoading, setTokenLoading] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  const handleGenerateToken = async () => {
    setTokenLoading(true);
    setTokenError(null);
    setGeneratedToken(null);
    try {
      const username = import.meta.env.VITE_RN3_CUSTODIAN_USERNAME;
      const password = import.meta.env.VITE_RN3_CUSTODIAN_PASSWORD;
      const result = await rn3Api.post<string>(
        '/user/generateToken',
        new URLSearchParams({ username, password }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      const token = typeof result === 'string' ? result : (result as any)?.accessToken ?? JSON.stringify(result);
      setGeneratedToken(token);
    } catch (err: any) {
      setTokenError(err?.message ?? 'Failed to generate token');
    } finally {
      setTokenLoading(false);
    }
  };

  const handleCopyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    }
  };

  // ── Section collapse state ────────────────────────────────────────────────
  const [manualImportOpen, setManualImportOpen] = useState(false);
  const [apiTokenOpen, setApiTokenOpen] = useState(false);

  // ── Manual import file ────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importStatusMessage, setImportStatusMessage] = useState('');
  const [importResult, setImportResult] = useState<{ jobId?: number | string; jobStatus: string } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setImportResult(null);
    setImportError(null);
    setImportStatusMessage('');
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    const datasetId = Number(localStorage.getItem('rn3_datasetid'));
    const dataflowId = Number(localStorage.getItem('rn3_dataflowid'));

    if (!datasetId || !dataflowId) {
      setImportError('Dataset ID or Dataflow ID not set. Please connect first using the Connection button.');
      return;
    }

    setImportLoading(true);
    setImportResult(null);
    setImportError(null);

    try {
      const result = await uploadAndPoll(selectedFile, datasetId, dataflowId, pushApiKey, setImportStatusMessage);
      setImportResult(result);
    } catch (err: any) {
      setImportError(err?.message ?? 'Import request failed');
    } finally {
      setImportLoading(false);
      setImportStatusMessage('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const jobAlert = (result: { jobId?: number | string; jobStatus: string } | null) =>
    result ? (
      <Alert
        severity={result.jobStatus === 'FINISHED' || result.jobStatus === 'ACCEPTED' ? 'success' : 'warning'}
        sx={{ mt: 2 }}
      >
        <Typography variant="body2" fontWeight="bold" gutterBottom>
          {result.jobStatus === 'FINISHED' ? 'Import completed' : `Import job: ${result.jobStatus}`}
        </Typography>
        {result.jobId !== undefined && (
          <Typography variant="body2">Job ID: <strong>{result.jobId}</strong></Typography>
        )}
      </Alert>
    ) : null;

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
          <FileUploadOutlinedIcon /> Push
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'left', width: '100%' }}>
          Push data to ReportNet.
        </Typography>
      </Box>

      <Stack spacing={3} sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 }, alignItems: 'flex-start' }}>

        {/* ── API key for push ── */}
        <Box sx={{ width: '100%' }}>
          <TextField
            label="API Key"
            value={pushApiKey}
            onChange={e => {
              const val = e.target.value;
              setPushApiKey(val);
              localStorage.setItem('rn3_push_apikey', val);
            }}
            size="small"
            fullWidth
            placeholder="Paste your API key here"
            InputProps={{
              startAdornment: <InputAdornment position="start">ApiKey</InputAdornment>,
            }}
          />
        </Box>

        <Divider sx={{ width: '100%' }} />

        {/* ── Generate & push from current data ── */}
        <Box sx={{ width: '100%' }}>
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            Push Current Data
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Generate a ZIP from the currently loaded (and edited) dataset and upload it directly to ReportNet.
          </Typography>

          {hasData ? (
            <>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleDownloadZip}
                  disabled={genLoading}
                  startIcon={<FolderZipOutlinedIcon />}
                >
                  Download ZIP
                </Button>
                <Button
                  variant="contained"
                  onClick={handleGenerateAndImport}
                  disabled={genLoading}
                  startIcon={genLoading ? undefined : <FileUploadOutlinedIcon />}
                >
                  {genLoading
                    ? (genStatusMessage.startsWith('Waiting') || genStatusMessage.startsWith('Job') ? 'Polling…' : 'Generating…')
                    : 'Generate ZIP & Push'}
                </Button>
              </Stack>

              {genLoading && (
                <Box sx={{ mt: 1 }}>
                  <SmartProgressBar
                    active
                    stepKey={genStatusMessage.startsWith('Waiting') || genStatusMessage.startsWith('Job') || genStatusMessage.startsWith('Uploading') || genStatusMessage.startsWith('Generating auth') ? 'push-upload-poll' : 'push-build-zip'}
                    externalProgress={buildProgress ? Math.round((buildProgress.tableIndex / buildProgress.totalTables) * 100) : undefined}
                    meta={{ tableCount: allTables.length, environment: import.meta.env.VITE_RN3_API_URL || '' }}
                    label="Push Dataset"
                    message={genStatusMessage}
                  />
                </Box>
              )}

              {/* Build log — table-by-table list */}
              {buildLog.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                    {buildLog.length === buildLog[buildLog.length - 1]?.totalTables
                      ? `ZIP built — ${buildLog.length} tables`
                      : `Building… ${buildLog.length}/${buildLog[0]?.totalTables ?? '?'} tables`}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {buildLog.map((p) => (
                      <Chip
                        key={p.tableName}
                        label={`${p.tableIndex}. ${p.tableName} (${p.columnCount} cols, ${p.recordCount} rec)`}
                        size="small"
                        variant="outlined"
                        color={p.recordCount > 0 ? 'success' : 'warning'}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {genError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <Typography variant="body2"><strong>Error:</strong> {genError}</Typography>
                </Alert>
              )}

              {!genLoading && jobAlert(genResult)}
            </>
          ) : (
            <Alert severity="info">
              No data loaded yet. Use the <strong>Pull</strong> page to load data from ReportNet first.
            </Alert>
          )}
        </Box>

        <Divider sx={{ width: '100%' }} />

        {/* ── Manual import file ── */}
        <Box sx={{ width: '100%' }}>
          <Box
            onClick={() => setManualImportOpen(o => !o)}
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
          >
            <Typography variant="subtitle1" fontWeight="medium">Manual Import File</Typography>
            {manualImportOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </Box>
          <Collapse in={manualImportOpen}>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
              Upload a ZIP file manually to <code>/dataset/v2/importFileData</code> using your API key.
            </Typography>

            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Button
                variant="outlined"
                startIcon={<FolderZipOutlinedIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={importLoading}
              >
                Select ZIP file
              </Button>

              {selectedFile && (
                <Chip
                  label={`${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`}
                  size="small"
                  variant="outlined"
                  onDelete={() => {
                    setSelectedFile(null);
                    setImportResult(null);
                    setImportError(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                />
              )}

              <Button
                variant="contained"
                onClick={handleImport}
                disabled={!selectedFile || importLoading}
                startIcon={importLoading ? undefined : <FileUploadOutlinedIcon />}
              >
                {importLoading
                  ? (importStatusMessage.startsWith('Waiting') || importStatusMessage.startsWith('Job') ? 'Polling…' : 'Uploading…')
                  : selectedFile ? 'Push' : 'Import'}
              </Button>
            </Stack>

            {importLoading && (
              <Box sx={{ mt: 2 }}>
                <SmartProgressBar
                  active
                  stepKey="push-import"
                  meta={{ fileSizeKb: selectedFile ? Math.round(selectedFile.size / 1024) : 0, environment: import.meta.env.VITE_RN3_API_URL || '' }}
                  label="Import File"
                  message={importStatusMessage}
                />
              </Box>
            )}

            {importError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="body2"><strong>Import Error:</strong> {importError}</Typography>
              </Alert>
            )}

            {jobAlert(importResult)}
          </Collapse>
        </Box>

        <Divider sx={{ width: '100%' }} />

        {/* ── Generate API token ── */}
        <Box sx={{ width: '100%' }}>
          <Box
            onClick={() => setApiTokenOpen(o => !o)}
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
          >
            <Typography variant="subtitle1" fontWeight="medium">API Token</Typography>
            {apiTokenOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </Box>
          <Collapse in={apiTokenOpen}>
            <Box sx={{ mt: 1.5 }}>
              <Button
                variant="outlined"
                onClick={handleGenerateToken}
                disabled={tokenLoading}
              >
                {tokenLoading ? 'Generating Token…' : 'Generate API Token'}
              </Button>

              {tokenError && (
                <Alert severity="error" sx={{ mt: 2, py: 1 }}>
                  <Typography variant="body2" component="div">
                    <strong>Token Error:</strong> {tokenError}
                  </Typography>
                </Alert>
              )}

              {generatedToken && (
                <Alert severity="success" sx={{ mt: 2, py: 1 }}>
                  <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                    <strong>Generated Token:</strong>
                  </Typography>
                  <Box
                    component="code"
                    sx={{
                      display: 'block',
                      wordBreak: 'break-all',
                      fontSize: '0.75rem',
                      bgcolor: 'action.hover',
                      p: 1,
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    {generatedToken}
                  </Box>
                  <Button size="small" variant="outlined" onClick={handleCopyToken}>
                    {tokenCopied ? 'Copied!' : 'Copy Token'}
                  </Button>
                </Alert>
              )}
            </Box>
          </Collapse>
        </Box>
      </Stack>
    </>
  );
}

export default PushPage;
