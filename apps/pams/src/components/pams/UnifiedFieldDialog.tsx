import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Stack,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FindReplaceIcon from '@mui/icons-material/FindReplace';
import SearchIcon from '@mui/icons-material/Search';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ClearIcon from '@mui/icons-material/Clear';
import { getFieldLabel } from '../../schema/pamViewConfig';
import {
  type FieldFilter,
  type UnifiedDialogMode,
  isEditableField,
  getRecordId,
} from './types';
import BlurTextField from './BlurTextField';
import FilterBuilder from './FilterBuilder';
import MultiFieldValueAssignment, { type FieldValueWithTable } from './MultiFieldValueAssignment';

// Simple find/replace row type
type SimpleFindReplaceRow = {
  table: string;
  field: string;
  operator: string;
  findValue: string;
  replaceValue: string;
  matchCase: boolean; // Per-rule match case option
};

type FindReplaceMode = 'simple' | 'advanced';

type UnifiedFieldDialogProps = {
  open: boolean;
  onClose: () => void;
  mode: UnifiedDialogMode;
  tableMap: Record<string, any[]>;
  pamsRecords: any[];
  onEdit?: (tableName: string, recordIds: number[], field: string, value: string) => void;
  onCreate?: (tableName: string, count: number, fieldValues: FieldValueWithTable[], linkToPamId?: number, cloneFromPamId?: number) => void;
  onFindReplaceSimple?: (rows: SimpleFindReplaceRow[]) => void;
  onFindReplaceAdvanced?: (filters: FieldFilter[], fieldValues: FieldValueWithTable[]) => void;
  onFindOnly?: (filters: FieldFilter[]) => void; // Find only - creates filters without replacing
  onDelete?: (tableName: string, recordIds: number[]) => void;
  initialTable?: string;
  initialRecordId?: number;
  // For inline Find and Update - shows only simple mode with PAM context
  simpleOnly?: boolean;
  currentPam?: { id: number; title: string };
};

export type { SimpleFindReplaceRow };

export default function UnifiedFieldDialog({
  open,
  onClose,
  mode,
  tableMap,
  pamsRecords,
  onEdit,
  onCreate,
  onFindReplaceSimple,
  onFindReplaceAdvanced,
  onFindOnly,
  onDelete,
  initialTable,
  initialRecordId,
  simpleOnly = false,
  currentPam,
}: UnifiedFieldDialogProps) {
  const tableNames = Object.keys(tableMap).filter(t => tableMap[t]?.length > 0);

  // Common state
  const [selectedTable, setSelectedTable] = useState(initialTable || 'PaMs');
  const [selectedField, setSelectedField] = useState<string>('');
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [filters, setFilters] = useState<FieldFilter[]>([]);

  // Edit mode state
  const [editValue, setEditValue] = useState('');

  // Find/Replace mode state
  const [findReplaceMode, setFindReplaceMode] = useState<FindReplaceMode>('simple');
  // Simple mode: multiple find/replace rows
  const [simpleFindReplaceRows, setSimpleFindReplaceRows] = useState<SimpleFindReplaceRow[]>([]);
  // Advanced mode: field values to set on filtered records
  const [advancedFieldValues, setAdvancedFieldValues] = useState<FieldValueWithTable[]>([]);

  // Create mode state
  const [createCount, setCreateCount] = useState(1);
  const [fieldValues, setFieldValues] = useState<FieldValueWithTable[]>([]);
  const [linkToPamId, setLinkToPamId] = useState<number | ''>('');
  const [cloneFromPamId, setCloneFromPamId] = useState<number | ''>('');

  // Get all editable fields for selected table
  const tableFields = useMemo(() => {
    if (!selectedTable || !tableMap[selectedTable]?.length) return [];
    const firstRecord = tableMap[selectedTable][0];
    return Object.keys(firstRecord).filter(
      k => !['idRecordSchema', 'idTableSchema', '_stableId'].includes(k) && isEditableField(k)
    );
  }, [selectedTable, tableMap]);

  // Get records for selected table
  const records = tableMap[selectedTable] || [];

  // Check if table has FK to PaMs
  const hasPamsFk = useMemo(() => {
    if (!selectedTable || selectedTable === 'PaMs' || !records.length) return false;
    return 'Fk_PaMs' in records[0] || 'fk_pams' in records[0];
  }, [selectedTable, records]);

  // Get PAM relationship info for selected records
  const pamRelationshipInfo = useMemo(() => {
    if (!hasPamsFk || selectedRecordIds.size === 0) return null;
    const selectedRecords = records.filter(r => selectedRecordIds.has(getRecordId(r)));
    const pamCounts: Record<number, { pamId: number; pamTitle: string; count: number }> = {};
    selectedRecords.forEach(record => {
      const pamId = Number(record.Fk_PaMs ?? record.fk_pams ?? 0);
      if (pamId) {
        if (!pamCounts[pamId]) {
          const pam = pamsRecords.find(p => getRecordId(p) === pamId);
          pamCounts[pamId] = {
            pamId,
            pamTitle: pam?.Title || `PAM #${pamId}`,
            count: 0,
          };
        }
        pamCounts[pamId].count++;
      }
    });
    return Object.values(pamCounts);
  }, [hasPamsFk, selectedRecordIds, records, pamsRecords]);

  // Helper to check if a single record matches a filter condition
  const matchesFilterCondition = (value: string, operator: string, filterVal: string): boolean => {
    switch (operator) {
      case 'equals':
        return value.toLowerCase() === filterVal.toLowerCase();
      case 'contains':
        return value.toLowerCase().includes(filterVal.toLowerCase());
      case 'startsWith':
        return value.toLowerCase().startsWith(filterVal.toLowerCase());
      case 'endsWith':
        return value.toLowerCase().endsWith(filterVal.toLowerCase());
      case 'isEmpty':
        return value.trim() === '';
      case 'isNotEmpty':
        return value.trim() !== '';
      case 'greaterThan':
        return parseFloat(value) > parseFloat(filterVal);
      case 'lessThan':
        return parseFloat(value) < parseFloat(filterVal);
      default:
        return true;
    }
  };

  // Filter records based on filters (supports cross-table filtering via Fk_PaMs)
  const filteredRecords = useMemo(() => {
    if (filters.length === 0) return records;

    return records.filter(record => {
      const recordPamId = Number(record.Fk_PaMs ?? record.fk_pams ?? (selectedTable === 'PaMs' ? getRecordId(record) : 0));

      for (const filter of filters) {
        // Same table filter - direct comparison
        if (filter.table === selectedTable) {
          const value = String(record[filter.field] || '');
          if (!matchesFilterCondition(value, filter.operator, filter.value)) {
            return false;
          }
        }
        // Cross-table filter - use Fk_PaMs relationship
        else {
          const filterTableRecords = tableMap[filter.table] || [];

          // Find related records in the filter table
          let relatedRecords: any[];

          if (filter.table === 'PaMs') {
            // Filter is on PaMs table - find the PAM record linked to this record
            relatedRecords = filterTableRecords.filter(r => getRecordId(r) === recordPamId);
          } else if (selectedTable === 'PaMs') {
            // Selected table is PaMs - find records in filter table linked to this PAM
            const pamId = getRecordId(record);
            relatedRecords = filterTableRecords.filter(r => {
              const fkPam = Number(r.Fk_PaMs ?? r.fk_pams ?? 0);
              return fkPam === pamId;
            });
          } else {
            // Both are related tables - find records with same Fk_PaMs
            relatedRecords = filterTableRecords.filter(r => {
              const fkPam = Number(r.Fk_PaMs ?? r.fk_pams ?? 0);
              return fkPam === recordPamId;
            });
          }

          // Check if any related record matches the filter
          const anyMatch = relatedRecords.some(relatedRecord => {
            const value = String(relatedRecord[filter.field] || '');
            return matchesFilterCondition(value, filter.operator, filter.value);
          });

          if (!anyMatch) {
            return false;
          }
        }
      }
      return true;
    });
  }, [records, filters, selectedTable, tableMap]);

  // Get existing IDs for create mode
  const nextId = useMemo(() => {
    const existingIds = records.map(r => getRecordId(r)).filter(Boolean);
    return existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
  }, [records]);

  // Get current value for selected field (if single record selected)
  const currentValue = useMemo(() => {
    if (selectedRecordIds.size === 1 && selectedField) {
      const recordId = Array.from(selectedRecordIds)[0];
      const record = records.find(r => getRecordId(r) === recordId);
      return record ? String(record[selectedField] || '') : '';
    }
    return '';
  }, [selectedRecordIds, selectedField, records]);

  // Track previous table to detect changes
  const [prevTable, setPrevTable] = useState(selectedTable);

  // Reset when dialog opens or table changes
  useEffect(() => {
    if (open) {
      if (mode === 'create') {
        setSelectedTable(initialTable || 'PaMs');
      } else if (initialTable) {
        setSelectedTable(initialTable);
      }
      if (initialRecordId) setSelectedRecordIds(new Set([initialRecordId]));

      // Add one default row/filter by default based on mode
      const table = initialTable || selectedTable || 'PaMs';
      const defaultFields = getFieldsForTable(table);
      const defaultField = defaultFields[0] || '';

      if (mode === 'delete' && filters.length === 0) {
        // Add one default filter for delete mode
        setFilters([{
          table,
          field: defaultField,
          operator: 'contains',
          value: '',
          matchCase: false,
        }]);
      } else if (mode === 'findReplace') {
        // Add one default rule for simple mode
        if (simpleFindReplaceRows.length === 0) {
          setSimpleFindReplaceRows([{
            table,
            field: defaultField,
            operator: 'contains',
            findValue: '',
            replaceValue: '',
            matchCase: false,
          }]);
        }
        // Add one default filter and field value for advanced mode
        if (filters.length === 0) {
          setFilters([{
            table,
            field: defaultField,
            operator: 'contains',
            value: '',
            matchCase: false,
          }]);
        }
        if (advancedFieldValues.length === 0) {
          setAdvancedFieldValues([{
            table,
            field: defaultField,
            value: '',
          }]);
        }
      } else if (mode === 'create' && fieldValues.length === 0) {
        // Add one default field value for create mode
        setFieldValues([{
          table,
          field: defaultField,
          value: '',
        }]);
      }
    }
  }, [open, initialTable, initialRecordId, mode]);

  // Handle table change - reset all dependent state
  const handleTableChange = (newTable: string) => {
    if (newTable !== selectedTable) {
      // Reset all dependent state immediately before changing table
      setSelectedField('');
      setSelectedRecordIds(new Set());
      setSelectAll(false);
      setFilters([]);
      setFieldValues([]);
      setLinkToPamId('');
      // Now change the table
      setSelectedTable(newTable);
      setPrevTable(newTable);
    }
  };

  // Backup reset via useEffect in case handleTableChange doesn't cover all cases
  useEffect(() => {
    if (selectedTable !== prevTable) {
      setSelectedField('');
      setSelectedRecordIds(new Set());
      setSelectAll(false);
      setFilters([]);
      setFieldValues([]);
      setLinkToPamId('');
      setPrevTable(selectedTable);
    }
  }, [selectedTable, prevTable]);

  useEffect(() => {
    if (tableFields.length > 0 && !selectedField) {
      setSelectedField(tableFields[0]);
    }
  }, [tableFields, selectedField]);

  useEffect(() => {
    if (mode === 'edit' && selectedRecordIds.size === 1 && selectedField) {
      setEditValue(currentValue);
    }
  }, [mode, currentValue, selectedRecordIds.size, selectedField]);

  // Handlers
  const handleSelectAllToggle = () => {
    if (selectAll) {
      setSelectedRecordIds(new Set());
    } else {
      setSelectedRecordIds(new Set(filteredRecords.map(r => getRecordId(r))));
    }
    setSelectAll(!selectAll);
  };

  const handleRecordToggle = (recordId: number) => {
    const numericId = Number(recordId);
    setSelectedRecordIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(numericId)) {
        newSet.delete(numericId);
      } else {
        newSet.add(numericId);
      }
      return newSet;
    });
  };

  // Get fields for a specific table (used by FilterBuilder)
  const getFieldsForTable = (tableName: string): string[] => {
    if (!tableName || !tableMap[tableName]?.length) return [];
    const firstRecord = tableMap[tableName][0];
    return Object.keys(firstRecord).filter(
      k => !['idRecordSchema', 'idTableSchema', '_stableId'].includes(k)
    );
  };

  const getRecordLabel = (record: any) => {
    const recordId = getRecordId(record);
    let label = record.Title || record.Name || record.Description?.substring(0, 30) || '';
    if (hasPamsFk) {
      const pamId = Number(record.Fk_PaMs ?? record.fk_pams ?? 0);
      if (pamId) {
        const pam = pamsRecords.find(p => getRecordId(p) === pamId);
        const pamTitle = pam?.Title || `PAM #${pamId}`;
        label = label ? `${label} (→ ${pamTitle})` : `→ ${pamTitle}`;
      }
    }
    return label || `Record #${recordId}`;
  };

  const handleApply = () => {
    switch (mode) {
      case 'edit':
        if (onEdit && selectedField) {
          onEdit(selectedTable, Array.from(selectedRecordIds), selectedField, editValue);
        }
        break;
      case 'create':
        if (onCreate) {
          onCreate(selectedTable, createCount, fieldValues, linkToPamId || undefined, cloneFromPamId || undefined);
        }
        break;
      case 'findReplace':
        if (findReplaceMode === 'simple') {
          if (onFindReplaceSimple && simpleFindReplaceRows.length > 0) {
            onFindReplaceSimple(simpleFindReplaceRows);
          }
        } else {
          // Advanced mode
          if (onFindReplaceAdvanced && advancedFieldValues.length > 0) {
            onFindReplaceAdvanced(filters, advancedFieldValues);
          }
        }
        break;
      case 'delete':
        if (onDelete) {
          onDelete(selectedTable, Array.from(selectedRecordIds));
        }
        break;
    }
    handleClose();
  };

  const handleClose = () => {
    setEditValue('');
    setFindReplaceMode('simple');
    setSimpleFindReplaceRows([]);
    setAdvancedFieldValues([]);
    setCreateCount(1);
    setFieldValues([]);
    setLinkToPamId('');
    setCloneFromPamId('');
    setSelectedRecordIds(new Set());
    setSelectAll(false);
    setFilters([]);
    onClose();
  };

  // Handle clone from PAM selection
  const handleCloneFromPamChange = (pamId: number | '') => {
    setCloneFromPamId(pamId);
    // Keep UI lightweight: cloning is done in handler on apply; this grid is only optional overrides.
    setFieldValues([]);
  };

  const getDialogTitle = () => {
    switch (mode) {
      case 'create': return { icon: <AddIcon />, title: 'Create New Records' };
      case 'edit': return { icon: <EditIcon />, title: 'Edit Records' };
      case 'findReplace':
        if (currentPam) {
          return { icon: <FindReplaceIcon />, title: `Find and Update - PAM #${currentPam.id}: ${currentPam.title}` };
        }
        return { icon: <FindReplaceIcon />, title: 'Find and Update' };
      case 'delete': return { icon: <DeleteIcon />, title: 'Delete Records' };
    }
  };

  const { icon, title } = getDialogTitle();

  const canApply = useMemo(() => {
    switch (mode) {
      case 'edit':
        return selectedRecordIds.size > 0 && selectedField;
      case 'create':
        return createCount > 0;
      case 'findReplace':
        if (findReplaceMode === 'simple') {
          return simpleFindReplaceRows.length > 0 && simpleFindReplaceRows.every(r => r.field && r.replaceValue !== undefined);
        } else {
          // Advanced mode: need filters and field values
          return advancedFieldValues.length > 0;
        }
      case 'delete':
        return selectedRecordIds.size > 0;
    }
  }, [mode, selectedRecordIds.size, selectedField, createCount, findReplaceMode, simpleFindReplaceRows, advancedFieldValues.length]);

  const getActionText = () => {
    switch (mode) {
      case 'edit':
        return `Apply to ${selectedRecordIds.size} record${selectedRecordIds.size !== 1 ? 's' : ''}`;
      case 'create':
        return cloneFromPamId
          ? `Clone ${createCount} PAM${createCount !== 1 ? 's' : ''}`
          : `Create ${createCount} record${createCount !== 1 ? 's' : ''}`;
      case 'findReplace':
        if (findReplaceMode === 'simple') {
          return `Apply ${simpleFindReplaceRows.length} replacement${simpleFindReplaceRows.length !== 1 ? 's' : ''}`;
        } else {
          return `Apply to ${filteredRecords.length} record${filteredRecords.length !== 1 ? 's' : ''}`;
        }
      case 'delete':
        return `Delete ALL ${filteredRecords.length} record${filteredRecords.length !== 1 ? 's' : ''}`;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          {icon}
          <span>{title}</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Info Alert */}
          <Alert severity={mode === 'delete' ? 'warning' : 'info'}>
            {mode === 'create' && (cloneFromPamId
              ? `Will create ${createCount} clone(s) of PAM #${cloneFromPamId} in ${selectedTable}`
              : `Will create ${createCount} new record(s) in ${selectedTable}`)}
            {mode === 'edit' && `Will edit ${selectedRecordIds.size} record(s) in ${selectedTable}`}
            {mode === 'findReplace' && findReplaceMode === 'simple' && (
              simpleFindReplaceRows.length > 0
                ? `${simpleFindReplaceRows.length} rule(s) - use "Find Only" to filter or "Apply" to replace`
                : 'Add rules to find values. Replace is optional.'
            )}
            {mode === 'findReplace' && findReplaceMode === 'advanced' && (
              filters.length > 0
                ? `Will apply changes to ${filteredRecords.length} matching record(s)`
                : `Will apply changes to all records (add filters to narrow down)`
            )}
            {mode === 'delete' && (
              selectAll
                ? `Will delete ALL ${filteredRecords.length} record(s) from ${selectedTable}`
                : 'Check "Apply to ALL" to enable deletion'
            )}
          </Alert>

          {/* Step 1: Table Selection (only for edit mode - create, findReplace, and delete handle it differently) */}
          {mode === 'edit' && (
            <FormControl fullWidth>
              <InputLabel>1. Select Table</InputLabel>
              <Select
                value={selectedTable}
                label="1. Select Table"
                onChange={(e) => handleTableChange(e.target.value)}
              >
                {tableNames.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t} ({tableMap[t]?.length || 0} records)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Step 2: Field Selection (for edit mode only - findReplace has its own UI) */}
          {mode === 'edit' && (
            <FormControl fullWidth>
              <InputLabel>2. Select Field</InputLabel>
              <Select
                value={selectedField}
                label="2. Select Field"
                onChange={(e) => setSelectedField(e.target.value)}
              >
                {tableFields.map((f) => (
                  <MenuItem key={f} value={f}>{getFieldLabel(f)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Filters Section - Only for edit mode (delete has its own combined section) */}
          {mode === 'edit' && (
            <FilterBuilder
              filters={filters}
              onFiltersChange={setFilters}
              tableNames={tableNames}
              getFieldsForTable={getFieldsForTable}
              defaultTable={selectedTable}
              matchCount={filteredRecords.length}
              showMatchCount={true}
              title="Filters"
              emptyMessage="Add filters to narrow down records. Each filter can use fields from any table."
            />
          )}

          {/* Delete mode: Combined Filter + Select All */}
          {mode === 'delete' && (
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
              {/* Apply to All Checkbox - Prominent at top */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectAll}
                    onChange={() => {
                      if (selectAll) {
                        setSelectedRecordIds(new Set());
                      } else {
                        setSelectedRecordIds(new Set(filteredRecords.map(r => getRecordId(r))));
                      }
                      setSelectAll(!selectAll);
                    }}
                    color="error"
                  />
                }
                label={
                  <Typography variant="subtitle1" color={selectAll ? 'error' : 'text.primary'} fontWeight="medium">
                    Apply to ALL {filters.length > 0 ? 'filtered' : ''} records ({filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''})
                  </Typography>
                }
                sx={{ mb: 2 }}
              />

              {selectAll && filters.length === 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="medium">
                    ⚠️ WARNING: ALL {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''} in {selectedTable} will be deleted!
                  </Typography>
                  <Typography variant="body2">
                    Add filters below to narrow down which records to delete.
                  </Typography>
                </Alert>
              )}

              {selectAll && filters.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="medium">
                    {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''} matching filters will be deleted.
                  </Typography>
                </Alert>
              )}

              {!selectAll && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Use filters to select which records to delete, then check "Apply to ALL" above.
                  </Typography>
                </Alert>
              )}

              {/* Filters */}
              <FilterBuilder
                filters={filters}
                onFiltersChange={setFilters}
                tableNames={tableNames}
                getFieldsForTable={getFieldsForTable}
                defaultTable={selectedTable}
                matchCount={filteredRecords.length}
                showMatchCount={true}
                title="Filters"
                emptyMessage="Add filters to narrow down records. Each filter can use fields from any table."
              />
            </Box>
          )}

          {/* Record Selection - Only for edit mode (delete uses Apply to All above) */}
          {mode === 'edit' && selectedField && (
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2">
                  3. Select Records ({selectedRecordIds.size} of {filteredRecords.length} selected)
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectAll}
                      indeterminate={selectedRecordIds.size > 0 && selectedRecordIds.size < filteredRecords.length}
                      onChange={handleSelectAllToggle}
                      size="small"
                    />
                  }
                  label="Select All"
                />
              </Stack>
              <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                {filteredRecords.slice(0, 100).map((record) => {
                  const recordId = getRecordId(record);
                  return (
                    <FormControlLabel
                      key={recordId}
                      control={
                        <Checkbox
                          checked={selectedRecordIds.has(recordId)}
                          onChange={() => handleRecordToggle(recordId)}
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2" noWrap sx={{ maxWidth: 400 }}>
                          #{recordId} - {getRecordLabel(record)}
                        </Typography>
                      }
                      sx={{ display: 'block', ml: 0 }}
                    />
                  );
                })}
                {filteredRecords.length > 100 && (
                  <Typography variant="caption" color="text.secondary">
                    Showing first 100 records. Use "Select All" for all {filteredRecords.length} records.
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          {/* PAM Relationship Info */}
          {hasPamsFk && pamRelationshipInfo && pamRelationshipInfo.length > 0 && (
            <Alert severity="info" icon={<InfoOutlinedIcon />}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                These records belong to {pamRelationshipInfo.length} PAM(s):
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {pamRelationshipInfo.slice(0, 5).map(info => (
                  <li key={info.pamId}>
                    <Typography variant="body2">
                      <strong>{info.pamTitle}</strong>: {info.count} record{info.count > 1 ? 's' : ''}
                    </Typography>
                  </li>
                ))}
                {pamRelationshipInfo.length > 5 && (
                  <li>
                    <Typography variant="body2" color="text.secondary">
                      ...and {pamRelationshipInfo.length - 5} more PAM(s)
                    </Typography>
                  </li>
                )}
              </Box>
            </Alert>
          )}

          <Divider />

          {/* Mode-specific inputs */}

          {/* Edit mode */}
          {mode === 'edit' && selectedField && (
            <BlurTextField
              fullWidth
              label={`New value for "${getFieldLabel(selectedField)}"`}
              value={editValue}
              onChange={(value) => setEditValue(value)}
              multiline={selectedField.toLowerCase().includes('description') || selectedField.toLowerCase().includes('comment')}
              rows={selectedField.toLowerCase().includes('description') || selectedField.toLowerCase().includes('comment') ? 3 : 1}
              helperText={
                selectedRecordIds.size === 1
                  ? `Current value: "${currentValue || '(empty)'}"`
                  : `Will set this value for ${selectedRecordIds.size} record(s)`
              }
            />
          )}

          {/* Find/Replace mode */}
          {mode === 'findReplace' && (
            <>
              {/* Mode Toggle - hidden when simpleOnly */}
              {!simpleOnly && (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <ToggleButtonGroup
                    value={findReplaceMode}
                    exclusive
                    onChange={(_, newMode) => newMode && setFindReplaceMode(newMode)}
                    size="small"
                  >
                    <ToggleButton value="simple">Simple</ToggleButton>
                    <ToggleButton value="advanced">Advanced</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              )}

              {/* Simple Mode: Table → Field → Operator → Value → Replace With */}
              {(simpleOnly || findReplaceMode === 'simple') && (
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: simpleFindReplaceRows.length > 0 ? 2 : 0 }}>
                    <Typography variant="subtitle2">
                      Find and Update Rules {simpleFindReplaceRows.length > 0 && `(${simpleFindReplaceRows.length})`}
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        const defaultFields = getFieldsForTable(selectedTable);
                        setSimpleFindReplaceRows([...simpleFindReplaceRows, {
                          table: selectedTable,
                          field: defaultFields[0] || '',
                          operator: 'contains',
                          findValue: '',
                          replaceValue: '',
                          matchCase: false,
                        }]);
                      }}
                    >
                      Add Rule
                    </Button>
                  </Stack>

                  {simpleFindReplaceRows.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                      Add rules to find values. Use "Find Only" to filter the list, or fill "Replace with" to update values.
                    </Typography>
                  )}

                  {simpleFindReplaceRows.map((row, idx) => {
                    const rowTableFields = getFieldsForTable(row.table);
                    return (
                      <Stack key={idx} direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
                        {/* Table selector */}
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                          <InputLabel>Table</InputLabel>
                          <Select
                            value={row.table}
                            label="Table"
                            onChange={(e) => {
                              const newTable = e.target.value;
                              const newFields = getFieldsForTable(newTable);
                              setSimpleFindReplaceRows(simpleFindReplaceRows.map((r, i) =>
                                i === idx ? { ...r, table: newTable, field: newFields[0] || '' } : r
                              ));
                            }}
                          >
                            {tableNames.map((t) => (
                              <MenuItem key={t} value={t}>{t}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        {/* Field selector */}
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <InputLabel>Field</InputLabel>
                          <Select
                            value={row.field}
                            label="Field"
                            onChange={(e) => {
                              setSimpleFindReplaceRows(simpleFindReplaceRows.map((r, i) =>
                                i === idx ? { ...r, field: e.target.value } : r
                              ));
                            }}
                          >
                            {rowTableFields.map((f) => (
                              <MenuItem key={f} value={f}>{getFieldLabel(f)}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        {/* Operator selector */}
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                          <InputLabel>Match</InputLabel>
                          <Select
                            value={row.operator}
                            label="Match"
                            onChange={(e) => {
                              setSimpleFindReplaceRows(simpleFindReplaceRows.map((r, i) =>
                                i === idx ? { ...r, operator: e.target.value } : r
                              ));
                            }}
                          >
                            <MenuItem value="equals">equals</MenuItem>
                            <MenuItem value="contains">contains</MenuItem>
                            <MenuItem value="startsWith">starts with</MenuItem>
                            <MenuItem value="endsWith">ends with</MenuItem>
                            <MenuItem value="isEmpty">is empty</MenuItem>
                            <MenuItem value="isNotEmpty">is not empty</MenuItem>
                          </Select>
                        </FormControl>
                        {/* Find value */}
                        {!['isEmpty', 'isNotEmpty'].includes(row.operator) && (
                          <BlurTextField
                            size="small"
                            placeholder="Find..."
                            value={row.findValue}
                            onChange={(value) => {
                              setSimpleFindReplaceRows(simpleFindReplaceRows.map((r, i) =>
                                i === idx ? { ...r, findValue: value } : r
                              ));
                            }}
                            sx={{ minWidth: 100 }}
                          />
                        )}
                        {/* Arrow */}
                        <Chip label="→" size="small" sx={{ minWidth: 32 }} />
                        {/* Replace value (optional) */}
                        <BlurTextField
                          size="small"
                          placeholder="Replace with (optional)"
                          value={row.replaceValue}
                          onChange={(value) => {
                            setSimpleFindReplaceRows(simpleFindReplaceRows.map((r, i) =>
                              i === idx ? { ...r, replaceValue: value } : r
                            ));
                          }}
                          sx={{ flex: 1, minWidth: 100 }}
                        />
                        {/* Match case checkbox per row */}
                        {!['isEmpty', 'isNotEmpty'].includes(row.operator) && (
                          <Tooltip title="Match case">
                            <Checkbox
                              size="small"
                              checked={row.matchCase || false}
                              onChange={(e) => {
                                setSimpleFindReplaceRows(simpleFindReplaceRows.map((r, i) =>
                                  i === idx ? { ...r, matchCase: e.target.checked } : r
                                ));
                              }}
                              sx={{ p: 0.5 }}
                            />
                          </Tooltip>
                        )}
                        <IconButton size="small" onClick={() => {
                          setSimpleFindReplaceRows(simpleFindReplaceRows.filter((_, i) => i !== idx));
                        }}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    );
                  })}
                </Box>
              )}

              {/* Advanced Mode: FilterBuilder + MultiFieldValueAssignment */}
              {!simpleOnly && findReplaceMode === 'advanced' && (
                <>
                  <FilterBuilder
                    filters={filters}
                    onFiltersChange={setFilters}
                    tableNames={tableNames}
                    getFieldsForTable={getFieldsForTable}
                    defaultTable={selectedTable}
                    matchCount={filteredRecords.length}
                    showMatchCount={true}
                    title="Filters"
                    emptyMessage="Add filters to narrow down records. Each filter can use fields from any table."
                  />

                  <MultiFieldValueAssignment
                    values={advancedFieldValues}
                    onValuesChange={setAdvancedFieldValues}
                    tableNames={tableNames}
                    getFieldsForTable={getFieldsForTable}
                    defaultTable={selectedTable}
                    title="Field Values"
                    emptyMessage="Add fields to set initial values for new records. Each field can be from any table."
                    addButtonText="Add Field"
                  />
                </>
              )}
            </>
          )}

          {/* Create mode */}
          {mode === 'create' && (
            <>
              <BlurTextField
                fullWidth
                label="Number of records to create"
                type="number"
                value={String(createCount)}
                onChange={(value) => setCreateCount(Math.max(1, Math.min(100, parseInt(value) || 1)))}
                inputProps={{ min: 1, max: 100 }}
                helperText={`IDs will start from ${nextId}`}
              />

              {/* Clone from existing PAM option - only for PaMs table */}
              {selectedTable === 'PaMs' && (
                <FormControl fullWidth>
                  <InputLabel>Clone from existing PAM (optional)</InputLabel>
                  <Select
                    value={cloneFromPamId}
                    label="Clone from existing PAM (optional)"
                    onChange={(e) => {
                      const value = e.target.value as unknown as string;
                      handleCloneFromPamChange(value === '' ? '' : Number(value));
                    }}
                  >
                    <MenuItem value="">-- None (create blank) --</MenuItem>
                    {pamsRecords.map((pam) => (
                      <MenuItem key={getRecordId(pam)} value={getRecordId(pam)}>
                        #{getRecordId(pam)} - {pam.Title || 'Untitled'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {hasPamsFk && (
                <FormControl fullWidth>
                  <InputLabel>Link to PAM (optional)</InputLabel>
                  <Select
                    value={linkToPamId}
                    label="Link to PAM (optional)"
                    onChange={(e) => setLinkToPamId(e.target.value as number | '')}
                  >
                    <MenuItem value="">-- None --</MenuItem>
                    {pamsRecords.map((pam) => (
                      <MenuItem key={getRecordId(pam)} value={getRecordId(pam)}>
                        #{getRecordId(pam)} - {pam.Title || 'Untitled'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <Alert severity="info" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  {cloneFromPamId
                    ? `All values for PAM #${cloneFromPamId} (including related tables) will be cloned. You can optionally add override values below.`
                    : 'Set default values for new records (e.g., prefixes, status, type). These values will be applied to all created records.'}
                </Typography>
              </Alert>

              <MultiFieldValueAssignment
                values={fieldValues}
                onValuesChange={setFieldValues}
                tableNames={tableNames}
                getFieldsForTable={getFieldsForTable}
                defaultTable={selectedTable}
                title={cloneFromPamId ? 'Optional Override Values' : 'Default Field Values'}
                emptyMessage={cloneFromPamId
                  ? 'Cloned values are hidden. Add only fields you want to override.'
                  : 'Add default values (prefixes, status, etc.) to apply to all new records.'}
                addButtonText="Add Default Value"
              />

              {selectedTable === 'PaMs' && fieldValues.length === 0 && !cloneFromPamId && (
                <Alert severity="info" action={
                  <Button
                    size="small"
                    onClick={() => {
                      setFieldValues([
                        { table: 'PaMs', field: 'Title', value: 'New Policy' },
                        { table: 'PaMs', field: 'IsGroup', value: 'Single' },
                        { table: 'PaMs', field: 'StatusImplementation', value: 'Planned' },
                      ]);
                    }}
                  >
                    Use Template
                  </Button>
                }>
                  Use a template to quickly set common fields
                </Alert>
              )}
            </>
          )}

          {/* Delete mode - Final confirmation */}
          {mode === 'delete' && selectAll && (
            <Alert severity="error">
              <Typography variant="body2" fontWeight="medium">
                This action cannot be undone (until you reset).
              </Typography>
              <Typography variant="body2">
                Are you sure you want to delete {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''} from {selectedTable}?
              </Typography>
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {/* Find Only button - only in findReplace simple mode */}
        {mode === 'findReplace' && (simpleOnly || findReplaceMode === 'simple') && onFindOnly && (
          <Button
            variant="outlined"
            startIcon={<SearchIcon />}
            disabled={simpleFindReplaceRows.length === 0 || !simpleFindReplaceRows.some(r => r.findValue.trim())}
            onClick={() => {
              // Convert simple find rows to FieldFilter format
              const findFilters: FieldFilter[] = simpleFindReplaceRows
                .filter(row => row.findValue.trim()) // Only rows with find values
                .map(row => ({
                  table: row.table,
                  field: row.field,
                  operator: row.operator as FieldFilter['operator'],
                  value: row.findValue,
                  matchCase: row.matchCase,
                }));
              onFindOnly(findFilters);
              handleClose();
            }}
          >
            Find Only
          </Button>
        )}
        <Button
          variant="contained"
          color={mode === 'delete' ? 'error' : 'primary'}
          onClick={handleApply}
          startIcon={icon}
          disabled={!canApply}
        >
          {getActionText()}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
