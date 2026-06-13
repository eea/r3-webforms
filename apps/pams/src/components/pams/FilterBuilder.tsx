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
  Checkbox,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import { getFieldLabel } from '../../schema/pamViewConfig';
import { type FieldFilter } from './types';
import BlurTextField from './BlurTextField';

type FilterBuilderProps = {
  filters: FieldFilter[];
  onFiltersChange: (filters: FieldFilter[]) => void;
  tableNames: string[];
  getFieldsForTable: (tableName: string) => string[];
  defaultTable: string;
  matchCount?: number;
  showMatchCount?: boolean;
  showTableSelector?: boolean; // Hide table selector for single-table filtering
  title?: string;
  emptyMessage?: string;
  addButtonText?: string;
  noBorder?: boolean; // Remove the border styling
};

export default function FilterBuilder({
  filters,
  onFiltersChange,
  tableNames,
  getFieldsForTable,
  defaultTable,
  matchCount,
  showMatchCount = true,
  showTableSelector = true,
  title = 'Filters',
  emptyMessage = 'Add filters to narrow down records. Each filter can use fields from any table.',
  addButtonText = 'Add Filter',
  noBorder = false,
}: FilterBuilderProps) {
  const handleAddFilter = () => {
    const defaultFields = getFieldsForTable(defaultTable);
    onFiltersChange([...filters, {
      table: defaultTable,
      field: defaultFields[0] || '',
      operator: 'contains',
      value: '',
      matchCase: false,
    }]);
  };

  const handleRemoveFilter = (index: number) => {
    onFiltersChange(filters.filter((_, i) => i !== index));
  };

  const handleFilterChange = (index: number, key: keyof FieldFilter, value: string | boolean) => {
    onFiltersChange(filters.map((f, i) => {
      if (i !== index) return f;
      // If table changes, reset field to first field of new table
      if (key === 'table') {
        const newFields = getFieldsForTable(value as string);
        return { ...f, table: value as string, field: newFields[0] || '' };
      }
      return { ...f, [key]: value };
    }));
  };

  // Determine if we should show the table selector
  const shouldShowTableSelector = showTableSelector && tableNames.length > 1;

  return (
    <Box sx={noBorder ? {} : { border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: filters.length > 0 ? 2 : 0 }}>
        <Typography variant="subtitle2">
          {title} {filters.length > 0 && showMatchCount && matchCount !== undefined && `(${filters.length}) - ${matchCount} records match`}
          {filters.length > 0 && !showMatchCount && `(${filters.length})`}
        </Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={handleAddFilter}>
          {addButtonText}
        </Button>
      </Stack>
      {filters.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          {emptyMessage}
        </Typography>
      )}
      {filters.map((filter, idx) => {
        const filterTableFields = getFieldsForTable(filter.table);
        return (
          <Stack key={idx} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap">
            {/* Table selector - only shown when multiple tables available */}
            {shouldShowTableSelector && (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Table</InputLabel>
                <Select
                  value={filter.table}
                  label="Table"
                  onChange={(e) => handleFilterChange(idx, 'table', e.target.value)}
                >
                  {tableNames.map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {/* Field selector */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Field</InputLabel>
              <Select
                value={filter.field}
                label="Field"
                onChange={(e) => handleFilterChange(idx, 'field', e.target.value)}
              >
                {filterTableFields.map((f) => (
                  <MenuItem key={f} value={f}>{getFieldLabel(f)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {/* Operator selector */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Operator</InputLabel>
              <Select
                value={filter.operator}
                label="Operator"
                onChange={(e) => handleFilterChange(idx, 'operator', e.target.value)}
              >
                <MenuItem value="contains">Contains</MenuItem>
                <MenuItem value="equals">Equals</MenuItem>
                <MenuItem value="startsWith">Starts with</MenuItem>
                <MenuItem value="endsWith">Ends with</MenuItem>
                <MenuItem value="isEmpty">Is empty</MenuItem>
                <MenuItem value="isNotEmpty">Is not empty</MenuItem>
                <MenuItem value="greaterThan">Greater than</MenuItem>
                <MenuItem value="lessThan">Less than</MenuItem>
              </Select>
            </FormControl>
            {/* Value input */}
            {!['isEmpty', 'isNotEmpty'].includes(filter.operator) && (
              <BlurTextField
                size="small"
                placeholder="Value"
                value={filter.value}
                onChange={(value) => handleFilterChange(idx, 'value', value)}
                sx={{ flex: 1, minWidth: 100 }}
              />
            )}
            {/* Match case checkbox */}
            {!['isEmpty', 'isNotEmpty', 'greaterThan', 'lessThan'].includes(filter.operator) && (
              <Tooltip title="Match case">
                <Checkbox
                  size="small"
                  checked={filter.matchCase || false}
                  onChange={(e) => handleFilterChange(idx, 'matchCase', e.target.checked)}
                  sx={{ p: 0.5 }}
                />
              </Tooltip>
            )}
            <IconButton size="small" onClick={() => handleRemoveFilter(idx)}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Stack>
        );
      })}
    </Box>
  );
}
