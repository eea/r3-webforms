import { useState, useEffect, useMemo } from 'react';
import {
  Paper,
  Collapse,
  Stack,
  Button,
} from '@mui/material';
import { type AdvancedFilters, type FieldFilter, isEditableField } from './types';
import FilterBuilder from './FilterBuilder';

type AdvancedFilterPanelProps = {
  open: boolean;
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  onClose: () => void;
  tableMap: Record<string, any[]>;
};

export default function AdvancedFilterPanel({
  open,
  filters,
  onFiltersChange,
  onClose,
  tableMap,
}: AdvancedFilterPanelProps) {
  // Get table names from tableMap (same as UnifiedFieldDialog)
  const tableNames = useMemo(() =>
    Object.keys(tableMap).filter(t => tableMap[t]?.length > 0),
    [tableMap]
  );

  // Get fields for a table (same logic as UnifiedFieldDialog)
  const getFieldsForTable = (tableName: string): string[] => {
    const records = tableMap[tableName] || [];
    if (records.length === 0) return [];
    const allFields = Object.keys(records[0]);
    return allFields.filter(f => isEditableField(f));
  };

  // Convert AdvancedFilters.textFilters to FieldFilter[] for FilterBuilder
  const convertToFieldFilters = (textFilters: AdvancedFilters['textFilters']): FieldFilter[] => {
    return textFilters.map(f => ({
      table: 'PaMs',
      field: f.field,
      operator: f.operator,
      value: f.value,
      matchCase: false,
    }));
  };

  // Convert FieldFilter[] back to AdvancedFilters.textFilters
  const convertFromFieldFilters = (fieldFilters: FieldFilter[]): AdvancedFilters['textFilters'] => {
    return fieldFilters.map(f => ({
      field: f.field,
      operator: f.operator as 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'isEmpty' | 'isNotEmpty',
      value: f.value,
    }));
  };

  const [localFilters, setLocalFilters] = useState<FieldFilter[]>(
    convertToFieldFilters(filters.textFilters)
  );

  // Sync with external filters when they change
  useEffect(() => {
    setLocalFilters(convertToFieldFilters(filters.textFilters));
  }, [filters]);

  const handleApply = () => {
    onFiltersChange({
      textFilters: convertFromFieldFilters(localFilters),
      dateFilters: [],
    });
    onClose();
  };

  const handleClear = () => {
    setLocalFilters([]);
    onFiltersChange({ textFilters: [], dateFilters: [] });
  };

  return (
    <Collapse in={open}>
      <Paper variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: 'grey.50' }}>
        <Stack spacing={2}>
          {/* Same FilterBuilder as Find and Update / Delete */}
          <FilterBuilder
            filters={localFilters}
            onFiltersChange={setLocalFilters}
            tableNames={tableNames}
            getFieldsForTable={getFieldsForTable}
            defaultTable="PaMs"
            showMatchCount={false}
            title="Filters"
            emptyMessage="Add filters to narrow down records. Each filter can use fields from any table."
            addButtonText="Add Filter"
          />

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" onClick={handleClear}>Clear All</Button>
            <Button size="small" variant="outlined" onClick={onClose}>Cancel</Button>
            <Button size="small" variant="contained" onClick={handleApply}>Apply Filters</Button>
          </Stack>
        </Stack>
      </Paper>
    </Collapse>
  );
}
