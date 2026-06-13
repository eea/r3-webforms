import { useMemo, useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Paper,
  Typography,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import NatureIcon from '@mui/icons-material/Nature';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import FolderIcon from '@mui/icons-material/Folder';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import DescriptionIcon from '@mui/icons-material/Description';
import BarChartIcon from '@mui/icons-material/BarChart';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import { tabColors } from '../../schema/pamViewConfig';
import BlurTextField from './BlurTextField';
import {
  GHGExAnteSection,
  RESExAnteSection,
  EEExAnteSection,
  CostBenefitSection,
  KeyCharacteristicsSection,
  StatisticsSection,
} from './sections';
import { type ValidationRow, VALIDATION_CLEARED_EVENT, VALIDATION_UPDATED_EVENT } from '../validation';
import type { FieldValidationMap } from './FieldValueGrid';

const getTabIcon = (field: string): React.ReactElement => {
  switch (field) {
    case 'Table_1':
      return <InfoOutlinedIcon fontSize="small" />;
    case 'GHG_ExAnte':
    case 'GHG_CostBen':
      return <NatureIcon fontSize="small" />;
    case 'RES_ExAnte':
    case 'RES_CostBen':
      return <WbSunnyIcon fontSize="small" />;
    case 'EE_ExAnte':
    case 'EE_CostBen':
      return <FlashOnIcon fontSize="small" />;
    default:
      return <FolderIcon fontSize="small" />;
  }
};

const getTabColor = (field: string) => tabColors[field] || '#1976d2';

type PamDetailsPanelProps = {
  selectedPam: any;
  relatedData: Record<string, any[]>;
  workingPams: any[];
  modifiedPamIds: Set<number>;
  originalPamIds: Set<number>;
  isEditMode: boolean;
  editedPam: any;
  editedRelatedData: Record<string, any[]>;
  activeTab: number;
  onTabChange: (tab: number) => void;
  tabDefs: { field: string; header: string }[];
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onFieldChange: (field: string, value: string) => void;
  onRelatedFieldChange: (tableName: string, index: number, field: string, value: string) => void;
  onAddRecord: (tableName: string) => void;
  onDeleteRecord: (tableName: string, index: number) => void;
  onOpenFindReplace: (tableName?: string, simpleOnly?: boolean, currentPam?: { id: number; title: string }) => void;
  onDeletePam: (pam: { id: number; title: string }) => void;
};

/**
 * Build per-table field validation maps for the current PAM.
 * Matches validation rows to this PAM using the pamId field
 * (extracted from Fk_PaMs / Id during validation parsing).
 */
function useFieldValidations(
  selectedPam: any,
  relatedData: Record<string, any[]>,
  _valVersion: number,
): Record<string, FieldValidationMap> {
  return useMemo(() => {
    const stored = readValidationResults();
    if (!stored?.rows.length) return {};

    const pamId = Number(selectedPam?.Id ?? selectedPam?.id ?? 0);
    if (!pamId) return {};

    const result: Record<string, FieldValidationMap> = {};

    for (const row of stored.rows) {
      // Match by pamId on the validation row
      if (row.pamId !== pamId) continue;

      if (row.typeEntity === 'FIELD' && row.column) {
        const table = row.table;
        if (!result[table]) result[table] = {};
        if (!result[table][row.column]) result[table][row.column] = [];
        result[table][row.column].push(row);
      }
      if (row.typeEntity === 'RECORD') {
        const table = row.table;
        if (!result[table]) result[table] = {};
        if (!result[table]['__record__']) result[table]['__record__'] = [];
        result[table]['__record__'].push(row);
      }
    }

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPam, relatedData, _valVersion]);
}

function PamDetailsPanel({
  selectedPam,
  relatedData,
  workingPams,
  modifiedPamIds,
  originalPamIds,
  isEditMode,
  editedPam,
  editedRelatedData,
  activeTab,
  onTabChange,
  tabDefs,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onFieldChange,
  onRelatedFieldChange,
  onAddRecord,
  onDeleteRecord,
  onOpenFindReplace,
  onDeletePam,
}: PamDetailsPanelProps) {
  // Re-evaluate validation data when cleared or updated
  const [valVersion, setValVersion] = useState(0);
  useEffect(() => {
    const onClear = () => setValVersion((v) => v + 1);
    window.addEventListener(VALIDATION_CLEARED_EVENT, onClear);
    window.addEventListener(VALIDATION_UPDATED_EVENT, onClear);
    return () => {
      window.removeEventListener(VALIDATION_CLEARED_EVENT, onClear);
      window.removeEventListener(VALIDATION_UPDATED_EVENT, onClear);
    };
  }, []);

  const fieldValidations = useFieldValidations(selectedPam, relatedData, valVersion);

  // Count all validation issues for this PAM (for the alert banner)
  const pamValidationCounts = useMemo(() => {
    const stored = readValidationResults();
    if (!stored?.rows.length) return null;

    const pamId = Number(selectedPam?.Id ?? selectedPam?.id ?? 0);
    if (!pamId) return null;

    const pamTableNames = new Set<string>(Object.keys(relatedData));
    pamTableNames.add('PaMs');

    let errors = 0;
    let warnings = 0;
    let total = 0;
    for (const row of stored.rows) {
      const match = row.typeEntity === 'TABLE' ? pamTableNames.has(row.table) : row.pamId === pamId;
      if (!match) continue;
      total++;
      const level = row.level?.toUpperCase();
      if (level === 'ERROR' || level === 'BLOCKER') errors++;
      else if (level === 'WARNING') warnings++;
    }
    if (total === 0) return null;
    return { total, errors, warnings };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPam, relatedData, valVersion]);

  // Find the index of the Validations tab (last tab)
  const validationsTabIndex = tabDefs.length + 1; // +1 for Statistics tab (index tabDefs.length), Validations is tabDefs.length + 1

  if (!selectedPam) {
    return (
      <Typography color="text.secondary">
        Select a PaM from the list to view details
      </Typography>
    );
  }

  // Use editedPam when available, otherwise fall back to selectedPam for initial render
  const displayPam = editedPam || selectedPam;

  // Validations for PaMs table header fields
  const pamsValidations = fieldValidations['PaMs'];

  return (
    <>
      {/* Validation alert banner — always at the very top */}
      {pamValidationCounts && (
        <Alert
          severity={pamValidationCounts.errors > 0 ? 'error' : 'warning'}
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => onTabChange(validationsTabIndex)}>
              View Details
            </Button>
          }
        >
          <strong>PAM #{selectedPam.Id || selectedPam.id}</strong> has{' '}
          {pamValidationCounts.errors > 0 && <>{pamValidationCounts.errors} error(s)</>}
          {pamValidationCounts.errors > 0 && pamValidationCounts.warnings > 0 && ' and '}
          {pamValidationCounts.warnings > 0 && <>{pamValidationCounts.warnings} warning(s)</>}
          {pamValidationCounts.errors === 0 && pamValidationCounts.warnings === 0 && <>{pamValidationCounts.total} issue(s)</>}
        </Alert>
      )}

      {/* PAM Info Header Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <Chip label={`#${selectedPam.Id || selectedPam.id}`} color="primary" size="small" />
            <Chip
              icon={selectedPam.IsGroup === 'Group' ? <GroupWorkIcon /> : <DescriptionIcon />}
              label={selectedPam.IsGroup || 'Single'}
              variant="outlined"
              size="small"
            />
            {selectedPam.NECP_PamId && (
              <Chip label={`NECP: ${selectedPam.NECP_PamId}`} variant="outlined" size="small" />
            )}
          </Stack>
          <Stack spacing={2}>
            {isEditMode ? (
              <>
                <BlurTextField
                  fullWidth
                  label="PAM ID"
                  value={displayPam.Id !== undefined ? String(displayPam.Id) : ''}
                  onChange={(value) => onFieldChange('Id', value)}
                  size="small"
                  validations={pamsValidations?.['Id']}
                  fieldId="PaMs.Id"
                />
                <BlurTextField
                  fullWidth
                  label="Title"
                  value={displayPam.Title || ''}
                  onChange={(value) => onFieldChange('Title', value)}
                  size="small"
                  validations={pamsValidations?.['Title']}
                  fieldId="PaMs.Title"
                />
                <BlurTextField
                  fullWidth
                  label="Title (National Language)"
                  value={displayPam.TitleNational || ''}
                  onChange={(value) => onFieldChange('TitleNational', value)}
                  size="small"
                  validations={pamsValidations?.['TitleNational']}
                  fieldId="PaMs.TitleNational"
                />
                <BlurTextField
                  fullWidth
                  label="NECP PaM ID"
                  value={displayPam.NECP_PamId || ''}
                  onChange={(value) => onFieldChange('NECP_PamId', value)}
                  size="small"
                  validations={pamsValidations?.['NECP_PamId']}
                  fieldId="PaMs.NECP_PamId"
                />
                <BlurTextField
                  fullWidth
                  label="Short Description"
                  value={displayPam.ShortDescription || ''}
                  onChange={(value) => onFieldChange('ShortDescription', value)}
                  multiline
                  rows={3}
                  size="small"
                  validations={pamsValidations?.['ShortDescription']}
                  fieldId="PaMs.ShortDescription"
                />
              </>
            ) : (
              <>
                {[
                  { label: 'PAM ID', field: 'Id', value: displayPam.Id !== undefined ? String(displayPam.Id) : '' },
                  { label: 'Title', field: 'Title', value: displayPam.Title || '' },
                  { label: 'Title (National Language)', field: 'TitleNational', value: displayPam.TitleNational || '' },
                  { label: 'NECP PaM ID', field: 'NECP_PamId', value: displayPam.NECP_PamId || '' },
                  { label: 'Short Description', field: 'ShortDescription', value: displayPam.ShortDescription || '' },
                ].map(({ label, field, value }) => {
                  const vals = pamsValidations?.[field];
                  const hasVal = vals && vals.length > 0;
                  const topLevel = hasVal ? vals[0].level : '';
                  const borderColor = hasVal
                    ? topLevel?.toUpperCase() === 'ERROR' || topLevel?.toUpperCase() === 'BLOCKER' ? '#d32f2f'
                    : topLevel?.toUpperCase() === 'WARNING' ? '#ed6c02'
                    : '#0288d1'
                    : '';
                  return (
                    <Box
                      key={field}
                      data-field-id={`PaMs.${field}`}
                      sx={{
                        p: 1.5,
                        backgroundColor: hasVal ? `${borderColor}08` : 'grey.50',
                        borderRadius: 1,
                        border: hasVal ? `2px solid ${borderColor}` : 'none',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" display="block">
                        {label}
                      </Typography>
                      <Typography variant="body2">{value || '-'}</Typography>
                      {hasVal && (
                        <Typography variant="caption" sx={{ color: borderColor, mt: 0.5, display: 'block' }}>
                          {vals.map((v: any) => v.message).join('; ')}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </>
            )}
            {selectedPam.IsGroup === 'Group' && selectedPam.ListOfSinglePams && (
              <Box sx={{ p: 1.5, backgroundColor: 'secondary.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Policies/Measures covered:
                </Typography>
                <Typography variant="body2">{selectedPam.ListOfSinglePams}</Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => onTabChange(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabDefs.map((tab) => (
            <Tab
              key={tab.field}
              label={tab.header}
              icon={getTabIcon(tab.field)}
              iconPosition="start"
              sx={{
                minHeight: 48,
                textTransform: 'none',
                '&.Mui-selected': { color: getTabColor(tab.field) },
              }}
            />
          ))}
          <Tab
            label="Statistics"
            icon={<BarChartIcon />}
            iconPosition="start"
            sx={{ minHeight: 48, textTransform: 'none', '&.Mui-selected': { color: '#e91e63' } }}
          />
          <Tab
            label="Validations"
            icon={<VerifiedOutlinedIcon />}
            iconPosition="start"
            sx={{ minHeight: 48, textTransform: 'none', '&.Mui-selected': { color: '#9c27b0' } }}
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ py: 2 }}>
        {activeTab === 0 && (
          <KeyCharacteristicsSection
            data={relatedData['Table_1']?.[0]}
            relatedData={relatedData}
            isEditMode={isEditMode}
            editedData={editedRelatedData['Table_1']?.[0]}
            editedRelatedData={editedRelatedData}
            onFieldChange={onRelatedFieldChange}
            onRelatedFieldChange={onRelatedFieldChange}
            onAddRecord={onAddRecord}
            onDeleteRecord={onDeleteRecord}
            fieldValidations={fieldValidations['Table_1']}
          />
        )}
        {activeTab === 1 && (
          <GHGExAnteSection
            data={relatedData['GHG_ExAnte']?.[0]}
            relatedData={relatedData}
            isEditMode={isEditMode}
            editedData={editedRelatedData['GHG_ExAnte']?.[0]}
            editedRelatedData={editedRelatedData}
            onFieldChange={onRelatedFieldChange}
            onRelatedFieldChange={onRelatedFieldChange}
            onAddRecord={onAddRecord}
            onDeleteRecord={onDeleteRecord}
            fieldValidations={fieldValidations['GHG_ExAnte']}
          />
        )}
        {activeTab === 2 && (
          <CostBenefitSection
            data={relatedData['GHG_CostBen']?.[0]}
            relatedData={relatedData}
            type="GHG"
            isEditMode={isEditMode}
            editedData={editedRelatedData['GHG_CostBen']?.[0]}
            editedRelatedData={editedRelatedData}
            onFieldChange={onRelatedFieldChange}
            onRelatedFieldChange={onRelatedFieldChange}
            onAddRecord={onAddRecord}
            onDeleteRecord={onDeleteRecord}
            fieldValidations={fieldValidations['GHG_CostBen']}
          />
        )}
        {activeTab === 3 && (
          <RESExAnteSection
            data={relatedData['RES_ExAnte']?.[0]}
            relatedData={relatedData}
            isEditMode={isEditMode}
            editedData={editedRelatedData['RES_ExAnte']?.[0]}
            editedRelatedData={editedRelatedData}
            onFieldChange={onRelatedFieldChange}
            onRelatedFieldChange={onRelatedFieldChange}
            onAddRecord={onAddRecord}
            onDeleteRecord={onDeleteRecord}
            fieldValidations={fieldValidations['RES_ExAnte']}
          />
        )}
        {activeTab === 4 && (
          <CostBenefitSection
            data={relatedData['RES_CostBen']?.[0]}
            relatedData={relatedData}
            type="RES"
            isEditMode={isEditMode}
            editedData={editedRelatedData['RES_CostBen']?.[0]}
            editedRelatedData={editedRelatedData}
            onFieldChange={onRelatedFieldChange}
            onRelatedFieldChange={onRelatedFieldChange}
            onAddRecord={onAddRecord}
            onDeleteRecord={onDeleteRecord}
            fieldValidations={fieldValidations['RES_CostBen']}
          />
        )}
        {activeTab === 5 && (
          <EEExAnteSection
            data={relatedData['EE_ExAnte']?.[0]}
            relatedData={relatedData}
            isEditMode={isEditMode}
            editedData={editedRelatedData['EE_ExAnte']?.[0]}
            editedRelatedData={editedRelatedData}
            onFieldChange={onRelatedFieldChange}
            onRelatedFieldChange={onRelatedFieldChange}
            onAddRecord={onAddRecord}
            onDeleteRecord={onDeleteRecord}
            fieldValidations={fieldValidations['EE_ExAnte']}
          />
        )}
        {activeTab === 6 && (
          <CostBenefitSection
            data={relatedData['EE_CostBen']?.[0]}
            relatedData={relatedData}
            type="EE"
            isEditMode={isEditMode}
            editedData={editedRelatedData['EE_CostBen']?.[0]}
            editedRelatedData={editedRelatedData}
            onFieldChange={onRelatedFieldChange}
            onRelatedFieldChange={onRelatedFieldChange}
            onAddRecord={onAddRecord}
            onDeleteRecord={onDeleteRecord}
            fieldValidations={fieldValidations['EE_CostBen']}
          />
        )}
        {activeTab === 7 && (
          <StatisticsSection
            pamsRecords={workingPams}
            modifiedPamIds={modifiedPamIds}
            originalPamIds={originalPamIds}
          />
        )}
        {activeTab === 8 && (
          <PamValidationsSection
            selectedPam={selectedPam}
            relatedData={relatedData}
          />
        )}
      </Box>
    </>
  );
}

// ── Validation helpers ────────────────────────────────────────────────────────

const valLevelColor = (level: string): 'error' | 'warning' | 'info' | 'success' | 'default' => {
  switch (level?.toUpperCase()) {
    case 'BLOCKER': return 'error';
    case 'ERROR': return 'error';
    case 'WARNING': return 'warning';
    case 'INFO': return 'info';
    case 'CORRECT': return 'success';
    default: return 'default';
  }
};

function readValidationResults(): { rows: ValidationRow[]; timestamp: string } | null {
  try {
    const raw = localStorage.getItem('rn3_validation_results');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── Validations section for a single PAM ─────────────────────────────────────

function PamValidationsSection({
  selectedPam,
  relatedData,
}: {
  selectedPam: any;
  relatedData: Record<string, any[]>;
}) {
  const [valVersion, setValVersion] = useState(0);
  useEffect(() => {
    const onClear = () => setValVersion((v) => v + 1);
    window.addEventListener(VALIDATION_CLEARED_EVENT, onClear);
    window.addEventListener(VALIDATION_UPDATED_EVENT, onClear);
    return () => {
      window.removeEventListener(VALIDATION_CLEARED_EVENT, onClear);
      window.removeEventListener(VALIDATION_UPDATED_EVENT, onClear);
    };
  }, []);

  const pamValidations = useMemo(() => {
    const stored = readValidationResults();
    if (!stored || !stored.rows.length) return { rows: [], timestamp: null as string | null };

    const pamId = Number(selectedPam?.Id ?? selectedPam?.id ?? 0);
    if (!pamId) return { rows: [], timestamp: stored.timestamp };

    // Match by pamId (extracted from Fk_PaMs / Id during parsing)
    // TABLE-level validations shown for all PAMs in that table
    const pamTableNames = new Set<string>(Object.keys(relatedData));
    pamTableNames.add('PaMs');

    const filtered = stored.rows.filter((row) => {
      if (row.typeEntity === 'TABLE') return pamTableNames.has(row.table);
      return row.pamId === pamId;
    });

    return { rows: filtered, timestamp: stored.timestamp };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPam, relatedData, valVersion]);

  if (!pamValidations.timestamp) {
    return (
      <Alert severity="info">
        No validation data available. Use <strong>Pull for Validation</strong> in the Pull page to fetch results.
      </Alert>
    );
  }

  if (pamValidations.rows.length === 0) {
    return (
      <Stack spacing={2}>
        <Typography variant="caption" color="text.secondary">
          Validation data from {new Date(pamValidations.timestamp).toLocaleString()}
        </Typography>
        <Alert severity="success">
          No validation issues for this PAM.
        </Alert>
      </Stack>
    );
  }

  // Summary counts
  const counts = { blocker: 0, error: 0, warning: 0, info: 0, correct: 0 };
  for (const r of pamValidations.rows) {
    const key = r.level.toLowerCase() as keyof typeof counts;
    if (key in counts) counts[key]++;
  }

  return (
    <Stack spacing={2}>
      <Typography variant="caption" color="text.secondary">
        Validation data from {new Date(pamValidations.timestamp).toLocaleString()}
      </Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip label={`Total: ${pamValidations.rows.length}`} size="small" variant="outlined" />
        {counts.blocker > 0 && <Chip label={`Blocker: ${counts.blocker}`} size="small" color="error" />}
        {counts.error > 0 && <Chip label={`Error: ${counts.error}`} size="small" color="error" variant="outlined" />}
        {counts.warning > 0 && <Chip label={`Warning: ${counts.warning}`} size="small" color="warning" />}
        {counts.info > 0 && <Chip label={`Info: ${counts.info}`} size="small" color="info" />}
        {counts.correct > 0 && <Chip label={`Correct: ${counts.correct}`} size="small" color="success" />}
      </Stack>

      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.100' }}>Level</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.100' }}>Scope</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.100' }}>Table</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.100' }}>Field</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.100' }}>Value</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.100' }}>Message</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pamValidations.rows.map((row, idx) => (
              <TableRow key={idx} hover>
                <TableCell>
                  <Chip label={row.level} size="small" color={valLevelColor(row.level)} />
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
                <TableCell>{row.typeEntity === 'FIELD' ? row.column : ''}</TableCell>
                <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.typeEntity === 'FIELD' ? row.fieldValue : ''}
                </TableCell>
                <TableCell sx={{ maxWidth: 350 }}>{row.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

export default PamDetailsPanel;
