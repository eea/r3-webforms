import { Box, Alert, Button, Card, CardContent, Chip, Tooltip, Typography } from '@mui/material';
import { DataGrid, useGridApiRef, type GridColDef, type GridCellParams } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import type { TableInfo } from './types';
import SortableTable from './SortableTable';

type TableDataPanelProps = {
  selectedTable: TableInfo;
  columns: GridColDef[];
  rows: any[];
  editedRows: Map<any, any>;
  isReorderMode: boolean;
  hasReordered: boolean;
  apiRef: ReturnType<typeof useGridApiRef>;
  onSave: () => void;
  onReset: () => void;
  onReorder: (newRows: any[]) => void;
  onToggleReorderMode: () => void;
  onProcessRowUpdate: (newRow: any, oldRow: any) => any;
  onProcessRowUpdateError: (error: any) => void;
};

export default function TableDataPanel({
  selectedTable,
  columns,
  rows,
  editedRows,
  isReorderMode,
  hasReordered,
  apiRef,
  onSave,
  onReset,
  onReorder,
  onToggleReorderMode,
  onProcessRowUpdate,
  onProcessRowUpdateError,
}: TableDataPanelProps) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, mr: 0 }}>
      <Card sx={{ height: 'calc(100vh - 263px)', width: 'calc(100% - 24px)' }}>
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{selectedTable.name}</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Tooltip title={isReorderMode ? 'Exit reorder mode' : 'Enable drag & drop reordering'}>
                <Button
                  size="small"
                  variant={isReorderMode ? 'contained' : 'outlined'}
                  color={isReorderMode ? 'secondary' : 'primary'}
                  startIcon={<SwapVertIcon />}
                  onClick={onToggleReorderMode}
                >
                  {isReorderMode ? 'Exit Reorder' : 'Reorder Rows'}
                </Button>
              </Tooltip>
              <Chip label={`${rows.length} rows`} size="small" color="primary" />
              <Chip label={`${columns.length} columns`} size="small" color="primary" />
              <Chip icon={<EditIcon sx={{ fontSize: '14px !important' }} />} label="Editable" size="small" variant="outlined" color="success" sx={{ fontSize: '0.7rem' }} />
            </Box>
          </Box>

          {/* Save / Reset alert */}
          {(editedRows.size > 0 || hasReordered) && (
            <Alert
              severity="info"
              sx={{ mb: 2 }}
              action={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={onSave}>
                    Save
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={onReset}>
                    Reset
                  </Button>
                </Box>
              }
            >
              {editedRows.size > 0 && `${editedRows.size} row(s) modified`}
              {editedRows.size > 0 && hasReordered && ' | '}
              {hasReordered && 'Row order changed'}
            </Alert>
          )}

          {/* Reorder mode warning */}
          {isReorderMode && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Drag rows using the handle on the left to reorder them. Click "Exit Reorder" when done.
            </Alert>
          )}

          {/* Table content */}
          <Box sx={{ flexGrow: 1, width: '100%', minHeight: 0 }}>
            {isReorderMode ? (
              <SortableTable rows={rows} columns={columns} onReorder={onReorder} isReorderMode={isReorderMode} />
            ) : (
              <DataGrid
                apiRef={apiRef}
                rows={rows}
                columns={columns}
                initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                pageSizeOptions={[10, 25, 50, 100]}
                checkboxSelection
                disableRowSelectionOnClick
                columnHeaderHeight={56}
                processRowUpdate={onProcessRowUpdate}
                onProcessRowUpdateError={onProcessRowUpdateError}
                getCellClassName={(params: GridCellParams) => params.isEditable ? 'cell-editable' : ''}
                onCellClick={(params, event) => {
                  if (params.isEditable && !event.ctrlKey && !event.metaKey && apiRef.current) {
                    try {
                      const cellMode = apiRef.current.getCellMode(params.id, params.field);
                      if (cellMode === 'view') {
                        apiRef.current.startCellEditMode({ id: params.id, field: params.field });
                      }
                    } catch (error) {
                      console.error('Error starting cell edit mode:', error);
                    }
                  }
                }}
                sx={{
                  height: '100%',
                  '& .MuiDataGrid-cell': { borderRight: '1px solid', borderColor: 'divider' },
                  '& .MuiDataGrid-columnHeaders': { backgroundColor: 'action.hover', borderBottom: '2px solid', borderColor: 'divider', fontWeight: 'bold' },
                  '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' },
                  '& .cell-editable': {
                    backgroundColor: 'rgba(46, 125, 50, 0.06)',
                    cursor: 'text',
                    '&:hover': { backgroundColor: 'rgba(46, 125, 50, 0.14)' },
                  },
                  '& .cell-editable.MuiDataGrid-cell--editing': {
                    backgroundColor: 'rgba(46, 125, 50, 0.12)',
                    boxShadow: 'inset 0 0 0 2px #2e7d32',
                  },
                }}
              />
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
