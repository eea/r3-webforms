import { useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Tooltip,
  IconButton,
  Button,
} from '@mui/material';
import BlurTextField from './BlurTextField';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import SaveIcon from '@mui/icons-material/Save';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getFieldLabel } from '../../schema/pamViewConfig';
import { formatValue, isEditableField } from './types';
import DataTable from './DataTable';

// Sortable table row component for drag-and-drop
function SortableTableRow({
  record,
  recordIndex,
  fields,
  tableName,
  isEditMode,
  isReorderMode,
  onFieldChange,
}: {
  record: any;
  recordIndex: number;
  fields: string[];
  tableName: string;
  isEditMode: boolean;
  isReorderMode: boolean;
  onFieldChange: (tableName: string, recordIndex: number, field: string, value: string) => void;
}) {
  // Use _stableId if available (set during reorder mode), otherwise fall back
  const rowId = record._stableId || record.id || record.Id || `row-${recordIndex}`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rowId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? 'rgba(25, 118, 210, 0.08)' : undefined,
  };

  return (
    <TableRow ref={setNodeRef} style={style} hover {...attributes}>
      {isReorderMode && (
        <TableCell sx={{ p: 0.5, width: 40, cursor: 'grab' }} {...listeners}>
          <DragIndicatorIcon fontSize="small" color="action" />
        </TableCell>
      )}
      {fields.map((field) => (
        <TableCell key={field} sx={{ p: 0.5 }}>
          {isEditMode && isEditableField(field) ? (
            <BlurTextField
              fullWidth
              size="small"
              value={record[field] ?? ''}
              onChange={(value) => onFieldChange(tableName, recordIndex, field, value)}
              sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem', p: 0.75 } }}
            />
          ) : (
            <Typography variant="body2" sx={{ px: 1 }}>
              {formatValue(record[field])}
            </Typography>
          )}
        </TableCell>
      ))}
    </TableRow>
  );
}

type EditableDataTableProps = {
  records: any[];
  tableName: string;
  title: string;
  isEditMode: boolean;
  onFieldChange: (tableName: string, recordIndex: number, field: string, value: string) => void;
  onReorder?: (tableName: string, newOrder: any[]) => void;
  onAddRecord?: (tableName: string) => void;
  onDeleteRecord?: (tableName: string, recordIndex: number) => void;
  defaultFields?: string[];
};

export default function EditableDataTable({
  records,
  tableName,
  title,
  isEditMode,
  onFieldChange,
  onReorder,
  onAddRecord,
  onDeleteRecord,
  defaultFields,
}: EditableDataTableProps) {
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [orderedRecords, setOrderedRecords] = useState<any[]>([]);

  // DnD sensors for table rows
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get all fields from records (excluding internal fields)
  const fields = records && records.length > 0
    ? Object.keys(records[0]).filter(
        (key) => !['id', 'idRecordSchema', 'idTableSchema', 'countryCode'].includes(key) && !key.startsWith('Fk_')
      )
    : defaultFields || [];

  if (!records || records.length === 0) {
    if (isEditMode && onAddRecord) {
      return (
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ flex: 1 }}>{title}</Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => onAddRecord(tableName)}
            >
              Add Record
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, fontStyle: 'italic' }}>
            No records. Click "Add Record" to create one.
          </Typography>
        </Box>
      );
    }
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        No data available
      </Typography>
    );
  }

  // Helper to get stable row ID
  const getRowId = (record: any, originalIndex: number) => {
    return record.id || record.Id || `${tableName}-row-${originalIndex}`;
  };

  const handleToggleReorder = () => {
    if (!isReorderMode) {
      // Assign stable IDs based on original positions
      const recordsWithIds = records.map((r, idx) => ({
        ...r,
        _stableId: getRowId(r, idx),
      }));
      setOrderedRecords(recordsWithIds);
    }
    setIsReorderMode(!isReorderMode);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = orderedRecords.findIndex((r) => r._stableId === active.id);
      const newIndex = orderedRecords.findIndex((r) => r._stableId === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(orderedRecords, oldIndex, newIndex);
        setOrderedRecords(newOrder);
      }
    }
  };

  const handleSaveOrder = () => {
    onReorder?.(tableName, orderedRecords);
    setIsReorderMode(false);
  };

  const handleCancelReorder = () => {
    setOrderedRecords([]);
    setIsReorderMode(false);
  };

  const displayRecords = isReorderMode ? orderedRecords : records;
  const rowIds = isReorderMode
    ? orderedRecords.map((r) => r._stableId)
    : records.map((r, idx) => getRowId(r, idx));

  // Read-only mode without reorder
  if (!isEditMode && !isReorderMode) {
    return (
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ flex: 1 }}>{title}</Typography>
          {records.length > 1 && (
            <Tooltip title="Reorder rows">
              <IconButton size="small" onClick={handleToggleReorder}>
                <SwapVertIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
        <DataTable records={records} title={title} />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" sx={{ flex: 1 }}>{title}</Typography>
        {isEditMode && onAddRecord && !isReorderMode && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => onAddRecord(tableName)}
          >
            Add
          </Button>
        )}
        {records.length > 1 && !isReorderMode && (
          <Tooltip title="Reorder rows">
            <IconButton size="small" onClick={handleToggleReorder}>
              <SwapVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {isReorderMode && (
          <>
            <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={handleSaveOrder}>
              Save
            </Button>
            <Button size="small" variant="outlined" onClick={handleCancelReorder}>
              Cancel
            </Button>
          </>
        )}
      </Stack>

      {isReorderMode ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
            <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.100' }}>
                    <TableCell sx={{ width: 40 }}></TableCell>
                    {fields.map((field) => (
                      <TableCell key={field} sx={{ fontWeight: 'bold' }}>
                        {getFieldLabel(field)}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayRecords.map((record, idx) => (
                    <SortableTableRow
                      key={record._stableId || record.id || record.Id || `row-${idx}`}
                      record={record}
                      recordIndex={idx}
                      fields={fields}
                      tableName={tableName}
                      isEditMode={isEditMode}
                      isReorderMode={isReorderMode}
                      onFieldChange={onFieldChange}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SortableContext>
        </DndContext>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.100' }}>
                {fields.map((field) => (
                  <TableCell key={field} sx={{ fontWeight: 'bold' }}>
                    {getFieldLabel(field)}
                  </TableCell>
                ))}
                {isEditMode && onDeleteRecord && (
                  <TableCell sx={{ fontWeight: 'bold', width: 60 }}>Actions</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((record, idx) => (
                <TableRow key={idx} hover>
                  {fields.map((field) => (
                    <TableCell key={field} sx={{ p: 0.5 }}>
                      {isEditableField(field) ? (
                        <BlurTextField
                          fullWidth
                          size="small"
                          value={record[field] ?? ''}
                          onChange={(value) => onFieldChange(tableName, idx, field, value)}
                          sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem', p: 0.75 } }}
                        />
                      ) : (
                        <Typography variant="body2" sx={{ px: 1 }}>
                          {formatValue(record[field])}
                        </Typography>
                      )}
                    </TableCell>
                  ))}
                  {isEditMode && onDeleteRecord && (
                    <TableCell sx={{ p: 0.5 }}>
                      <Tooltip title="Delete record">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onDeleteRecord(tableName, idx)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
