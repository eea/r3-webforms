import {
  Box,
  Typography,
  Stack,
  IconButton,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import { getFieldLabel } from '../../schema/pamViewConfig';
import { type FieldValueWithTable } from './types';
import BlurTextField from './BlurTextField';

// Re-export for convenience
export type { FieldValueWithTable };

type MultiFieldValueAssignmentProps = {
  values: FieldValueWithTable[];
  onValuesChange: (values: FieldValueWithTable[]) => void;
  tableNames: string[];
  getFieldsForTable: (tableName: string) => string[];
  defaultTable: string;
  title?: string;
  emptyMessage?: string;
  addButtonText?: string;
};

export default function MultiFieldValueAssignment({
  values,
  onValuesChange,
  tableNames,
  getFieldsForTable,
  defaultTable,
  title = 'Field Values',
  emptyMessage = 'Add fields to set initial values for new records.',
  addButtonText = 'Add Field',
}: MultiFieldValueAssignmentProps) {

  const handleAddValue = () => {
    const defaultFields = getFieldsForTable(defaultTable);
    onValuesChange([...values, {
      table: defaultTable,
      field: defaultFields[0] || '',
      value: ''
    }]);
  };

  const handleRemoveValue = (index: number) => {
    onValuesChange(values.filter((_, i) => i !== index));
  };

  const handleValueChange = (index: number, key: keyof FieldValueWithTable, newValue: string) => {
    onValuesChange(values.map((v, i) => {
      if (i !== index) return v;
      // If table changes, reset field to first field of new table
      if (key === 'table') {
        const newFields = getFieldsForTable(newValue);
        return { ...v, table: newValue, field: newFields[0] || '', value: '' };
      }
      return { ...v, [key]: newValue };
    }));
  };

  // Check if a field is already used in the same table (to prevent duplicates)
  const isFieldUsed = (table: string, field: string, currentIndex: number) => {
    return values.some((v, i) => i !== currentIndex && v.table === table && v.field === field);
  };

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
      {/* Header with title and add button */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: values.length > 0 ? 2 : 0 }}>
        <Typography variant="subtitle2">
          {title} {values.length > 0 && `(${values.length})`}
        </Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={handleAddValue}>
          {addButtonText}
        </Button>
      </Stack>

      {values.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          {emptyMessage}
        </Typography>
      )}

      {values.map((entry, idx) => {
        const tableFields = getFieldsForTable(entry.table);
        const isMultiline = entry.field.toLowerCase().includes('description') ||
                           entry.field.toLowerCase().includes('comment') ||
                           entry.field.toLowerCase().includes('explanation');

        return (
          <Stack key={idx} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            {/* Table selector */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Table</InputLabel>
              <Select
                value={entry.table}
                label="Table"
                onChange={(e) => handleValueChange(idx, 'table', e.target.value)}
              >
                {tableNames.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {/* Field selector */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Field</InputLabel>
              <Select
                value={entry.field}
                label="Field"
                onChange={(e) => handleValueChange(idx, 'field', e.target.value)}
              >
                {tableFields.map((f) => (
                  <MenuItem
                    key={f}
                    value={f}
                    disabled={isFieldUsed(entry.table, f, idx)}
                  >
                    {getFieldLabel(f)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {/* Equals operator */}
            <Chip label="=" size="small" sx={{ minWidth: 32 }} />
            {/* Value input */}
            <BlurTextField
              size="small"
              placeholder="Value"
              value={entry.value}
              onChange={(value) => handleValueChange(idx, 'value', value)}
              multiline={isMultiline}
              rows={isMultiline ? 2 : 1}
              sx={{ flex: 1, minWidth: 120 }}
            />
            <IconButton size="small" onClick={() => handleRemoveValue(idx)}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Stack>
        );
      })}
    </Box>
  );
}
