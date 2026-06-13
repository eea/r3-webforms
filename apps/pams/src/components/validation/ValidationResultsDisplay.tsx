import {
  Alert,
  Box,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { ValidationRow, ValidationSummary } from './types';

const levelColor = (level: string): 'error' | 'warning' | 'info' | 'success' | 'default' => {
  switch (level?.toUpperCase()) {
    case 'BLOCKER': return 'error';
    case 'ERROR': return 'error';
    case 'WARNING': return 'warning';
    case 'INFO': return 'info';
    case 'CORRECT': return 'success';
    default: return 'default';
  }
};

type Props = {
  loading: boolean;
  progress: string;
  error: string | null;
  rows: ValidationRow[];
  summary: ValidationSummary | null;
  timestamp: string | null;
};

function ValidationResultsDisplay({ loading, progress, error, rows, summary, timestamp }: Props) {
  return (
    <>
      {loading && (
        <Box sx={{ width: '100%' }}>
          <LinearProgress sx={{ borderRadius: 1, mb: 1 }} />
          {progress && (
            <Typography variant="body2" color="text.secondary">{progress}</Typography>
          )}
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ py: 1, width: '100%' }}>
          <Typography variant="body2" component="div">
            <strong>Validation Error:</strong> {error}
          </Typography>
        </Alert>
      )}

      {summary && !loading && (
        <>
          <Alert severity="info" sx={{ py: 1, width: '100%' }}>
            <Typography variant="body2" component="div" sx={{ mb: 1 }}>
              <strong>Validation Results</strong> — fetched {new Date(timestamp!).toLocaleString()}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={`Total: ${summary.total}`} size="small" variant="outlined" />
              {summary.blocker > 0 && (
                <Chip label={`Blocker: ${summary.blocker}`} size="small" color="error" />
              )}
              {summary.error > 0 && (
                <Chip label={`Error: ${summary.error}`} size="small" color="error" variant="outlined" />
              )}
              {summary.warning > 0 && (
                <Chip label={`Warning: ${summary.warning}`} size="small" color="warning" />
              )}
              {summary.info > 0 && (
                <Chip label={`Info: ${summary.info}`} size="small" color="info" />
              )}
              {summary.correct > 0 && (
                <Chip label={`Correct: ${summary.correct}`} size="small" color="success" />
              )}
            </Stack>
          </Alert>

          {rows.length === 0 ? (
            <Alert severity="success" sx={{ py: 1, width: '100%' }}>
              No validation issues found.
            </Alert>
          ) : (
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ maxHeight: 500, overflow: 'auto' }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.100' }}>Level</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.100' }}>Scope</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.100' }}>Table</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.100' }}>PAM ID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.100' }}>Field</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.100' }}>Record ID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.100' }}>Value</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.100' }}>Message</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow
                      key={idx}
                      hover
                      sx={{
                        backgroundColor:
                          row.typeEntity === 'TABLE' ? 'action.hover' :
                          row.typeEntity === 'RECORD' ? 'transparent' :
                          'transparent',
                      }}
                    >
                      <TableCell>
                        <Chip label={row.level} size="small" color={levelColor(row.level)} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.typeEntity}
                          size="small"
                          variant="outlined"
                          color={
                            row.typeEntity === 'TABLE' ? 'secondary' :
                            row.typeEntity === 'RECORD' ? 'primary' :
                            'default'
                          }
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: row.typeEntity === 'TABLE' ? 'bold' : 'normal' }}>
                        {row.table}
                      </TableCell>
                      <TableCell>
                        {row.pamId ? `#${row.pamId}` : ''}
                      </TableCell>
                      <TableCell>
                        {row.typeEntity === 'FIELD' ? row.column : ''}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {row.typeEntity !== 'TABLE' ? row.recordId : ''}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.typeEntity === 'FIELD' ? row.fieldValue : ''}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 350 }}>{row.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </>
  );
}

export default ValidationResultsDisplay;
