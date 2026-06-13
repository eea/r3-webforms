import { useState, useMemo } from 'react';
import {
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { getRecordId } from './types';
import BlurTextField from './BlurTextField';
import MultiFieldValueAssignment, { type FieldValueWithTable } from './MultiFieldValueAssignment';

type CreateRecordDialogProps = {
  open: boolean;
  onClose: () => void;
  tableMap: Record<string, any[]>;
  pamsRecords: any[];
  onCreate: (tableName: string, count: number, fieldValues: FieldValueWithTable[], linkToPamId?: number) => void;
  initialTable?: string;
};

export default function CreateRecordDialog({
  open,
  onClose,
  tableMap,
  pamsRecords,
  onCreate,
  initialTable,
}: CreateRecordDialogProps) {
  const tableNames = Object.keys(tableMap).filter(t => tableMap[t]?.length >= 0);

  const [createCount, setCreateCount] = useState(1);
  const [fieldValues, setFieldValues] = useState<FieldValueWithTable[]>([]);
  const [linkToPamId, setLinkToPamId] = useState<number | ''>('');

  // Get selected table from field values (first one) or default
  const selectedTable = useMemo(() => {
    if (fieldValues.length > 0) return fieldValues[0].table;
    return initialTable || 'PaMs';
  }, [fieldValues, initialTable]);

  // Get records for selected table
  const records = tableMap[selectedTable] || [];

  // Check if table has FK to PaMs
  const hasPamsFk = useMemo(() => {
    if (!selectedTable || selectedTable === 'PaMs' || !records.length) return false;
    return 'Fk_PaMs' in records[0] || 'fk_pams' in records[0];
  }, [selectedTable, records]);

  // Get next available ID
  const nextId = useMemo(() => {
    const existingIds = records.map(r => getRecordId(r)).filter(Boolean);
    return existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
  }, [records]);

  // Get fields for a specific table
  const getFieldsForTable = (tableName: string): string[] => {
    if (!tableName || !tableMap[tableName]?.length) return [];
    const firstRecord = tableMap[tableName][0];
    return Object.keys(firstRecord).filter(
      k => !['idRecordSchema', 'idTableSchema', '_stableId', 'Id', 'id', 'Fk_PaMs', 'fk_pams'].includes(k)
    );
  };

  const handleApply = () => {
    onCreate(selectedTable, createCount, fieldValues, linkToPamId || undefined);
    handleClose();
  };

  const handleClose = () => {
    setCreateCount(1);
    setFieldValues([]);
    setLinkToPamId('');
    onClose();
  };

  const canApply = createCount > 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <AddIcon />
          <span>Create New Records</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info">
            Will create {createCount} new record(s) in {selectedTable}
          </Alert>

          <BlurTextField
            fullWidth
            label="Number of records to create"
            type="number"
            value={String(createCount)}
            onChange={(value) => setCreateCount(Math.max(1, Math.min(100, parseInt(value) || 1)))}
            inputProps={{ min: 1, max: 100 }}
            helperText={`IDs will start from ${nextId}`}
          />

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

          <MultiFieldValueAssignment
            values={fieldValues}
            onValuesChange={setFieldValues}
            tableNames={tableNames}
            getFieldsForTable={getFieldsForTable}
            defaultTable={initialTable || 'PaMs'}
            title="Field Values"
            emptyMessage="Add fields to set initial values for new records."
            addButtonText="Add Field"
          />

          {selectedTable === 'PaMs' && fieldValues.length === 0 && (
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
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleApply}
          startIcon={<AddIcon />}
          disabled={!canApply}
        >
          Create {createCount} record{createCount !== 1 ? 's' : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
