import { useMemo, useState, useCallback } from 'react';
import { Alert, Box, Button, Chip, Stack, Tab, Tabs, Typography } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef, GridCellParams } from '@mui/x-data-grid';
import DownloadIcon from '@mui/icons-material/Download';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import TableChartIcon from '@mui/icons-material/TableChart';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';

type TableInfo = {
  name: string;
  records: any[];
  index: number;
};

type DataflowPageProps = {
  columns: GridColDef[];
  rows: Array<Record<string, unknown>>;
  hasData: boolean;
  allTables: TableInfo[];
  selectedTableIndex: number;
  onTableSelect: (index: number) => void;
  onTableDataChange?: (tableName: string, updatedRecords: any[]) => void;
};

function DataflowPage({
  columns,
  rows,
  hasData,
  allTables,
  selectedTableIndex,
  onTableSelect,
  onTableDataChange,
}: DataflowPageProps) {
  const [editedRows, setEditedRows] = useState<Map<any, any>>(new Map());

  const stats = useMemo(() => {
    if (!hasData || rows.length === 0) return null;
    const columnTypes = columns.reduce((acc, col) => {
      const sampleValue = rows.find(row => row[col.field] != null)?.[col.field];
      let type = 'text';
      if (sampleValue !== undefined) {
        if (typeof sampleValue === 'number') type = 'number';
        else if (typeof sampleValue === 'boolean') type = 'boolean';
        else if (sampleValue instanceof Date) type = 'date';
        else if (typeof sampleValue === 'object') type = 'object';
      }
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { rowCount: rows.length, columnCount: columns.length, columnTypes };
  }, [columns, rows, hasData]);

  const processRowUpdate = useCallback((newRow: any, _oldRow: any) => {
    setEditedRows(prev => new Map(prev).set(newRow.id, newRow));
    return newRow;
  }, []);

  const handleSave = useCallback(() => {
    if (!onTableDataChange || allTables.length === 0) return;
    const selectedTable = allTables[selectedTableIndex] || allTables[0];
    const mergedRows = rows.map(row => editedRows.get((row as any).id) ?? row);
    onTableDataChange(selectedTable.name, mergedRows);
    setEditedRows(new Map());
  }, [onTableDataChange, allTables, selectedTableIndex, rows, editedRows]);

  const handleReset = useCallback(() => {
    setEditedRows(new Map());
  }, []);

  const handleExportCSV = () => {
    if (!hasData || rows.length === 0) return;
    const headers = columns.map(col => col.headerName || col.field).join(',');
    const csvRows = rows.map(row =>
      columns.map(col => {
        const value = row[col.field];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );
    const csv = [headers, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rn3_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          <AccountTreeOutlinedIcon /> Dataflow
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'left', width: '100%', mb: 2 }}>
          View exported dataset records in a data grid.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip icon={<TableChartIcon />} label={`${allTables.length} Table${allTables.length !== 1 ? 's' : ''}`} color="primary" variant="outlined" />
          <Chip label={`${allTables.reduce((sum, t) => sum + t.records.length, 0)} Total Records`} variant="outlined" />
        </Box>
      </Box>

      <Stack spacing={1} sx={{ px: { xs: 2, md: 3 }, pt: 1, pb: 2, alignItems: 'flex-start' }}>
        {hasData ? (
          <>
            {/* Table Selector Tabs + Export button */}
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', borderBottom: 1, borderColor: 'divider' }}>
              {allTables.length > 1 && (
                <Tabs
                  value={selectedTableIndex}
                  onChange={(_, newValue) => onTableSelect(newValue)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ flexGrow: 1 }}
                >
                  {allTables.map((table, index) => (
                    <Tab
                      key={index}
                      label={`${table.name} (${table.records.length} rows)`}
                      value={index}
                    />
                  ))}
                </Tabs>
              )}
              <Box sx={{ flexGrow: 1 }} />
              {stats && (
                <Button
                  startIcon={<DownloadIcon />}
                  onClick={handleExportCSV}
                  variant="outlined"
                  size="small"
                  sx={{ ml: 2, flexShrink: 0 }}
                >
                  Export to CSV
                </Button>
              )}
            </Box>

            {/* Save / Reset alert */}
            {editedRows.size > 0 && (
              <Alert
                severity="info"
                sx={{ width: '100%' }}
                action={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
                      Save
                    </Button>
                    <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={handleReset}>
                      Reset
                    </Button>
                  </Box>
                }
              >
                {editedRows.size} row{editedRows.size !== 1 ? 's' : ''} modified
              </Alert>
            )}

            {/* DataGrid */}
            <Box sx={{ height: 'calc(100vh - 220px)', width: '100%' }}>
              <DataGrid
                rows={rows}
                columns={columns}
                initialState={{
                  pagination: { paginationModel: { page: 0, pageSize: 25 } },
                }}
                pageSizeOptions={[10, 25, 50, 100]}
                checkboxSelection
                disableRowSelectionOnClick
                getCellClassName={(params: GridCellParams) => params.isEditable ? 'cell-editable' : ''}
                processRowUpdate={processRowUpdate}
                onProcessRowUpdateError={(error) => console.error('Row update error:', error)}
                slots={{ toolbar: GridToolbar }}
                slotProps={{
                  toolbar: {
                    showQuickFilter: true,
                    quickFilterProps: { debounceMs: 500 },
                  },
                }}
                sx={{
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'divider',
                  '& .MuiDataGrid-cell': { borderColor: 'divider' },
                  '& .MuiDataGrid-columnHeaders': { backgroundColor: 'grey.50', borderColor: 'divider' },
                  '& .MuiDataGrid-toolbarContainer': { padding: 2, borderBottom: '1px solid', borderColor: 'divider' },
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
            </Box>
          </>
        ) : (
          <Box
            sx={{
              p: 4,
              borderRadius: 2,
              border: '1px dashed',
              borderColor: 'divider',
              textAlign: 'center',
              width: '100%',
            }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No data to display. Please export a dataset first from the Export page.
            </Typography>
          </Box>
        )}
      </Stack>
    </>
  );
}

export default DataflowPage;
