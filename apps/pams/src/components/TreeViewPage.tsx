import { useState, useMemo } from 'react';
import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import { useGridApiRef } from '@mui/x-data-grid';
import FolderIcon from '@mui/icons-material/Folder';
import TableChartIcon from '@mui/icons-material/ListAltSharp';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import {
  GRANDCHILD_RELATIONSHIPS,
  analyzeTableStructure,
  getColumnInfo,
  buildColumnsAndRows,
  TreePanel,
  TableDataPanel,
  type TreeViewPageProps,
  type TableInfo,
} from './treeview';

export default function TreeViewPage({ allTables, hasData, onTableDataChange }: TreeViewPageProps) {
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [editedRows, setEditedRows] = useState<Map<any, any>>(new Map());
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [rowOrder, setRowOrder] = useState<any[]>([]);
  const [hasReordered, setHasReordered] = useState(false);
  const apiRef = useGridApiRef();

  const structure = useMemo(
    () => analyzeTableStructure(allTables, GRANDCHILD_RELATIONSHIPS),
    [allTables]
  );

  const { columns, rows: baseRows } = useMemo(
    () => buildColumnsAndRows(selectedTable),
    [selectedTable]
  );

  const rows = rowOrder.length > 0 ? rowOrder : baseRows;

  const handleTableClick = (table: TableInfo, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedTable(table);
    setEditedRows(new Map());
    setIsReorderMode(false);
    setRowOrder([]);
    setHasReordered(false);
  };

  const processRowUpdate = (newRow: any, oldRow: any) => {
    const updated = new Map(editedRows);
    updated.set(newRow.id, newRow);
    setEditedRows(updated);
    console.log('Row updated:', { oldRow, newRow });
    return newRow;
  };

  const handleProcessRowUpdateError = (error: any) => {
    console.error('Error updating row:', error);
  };

  const handleRowReorder = (newRows: any[]) => {
    setRowOrder(newRows);
    setHasReordered(true);
  };

  const handleToggleReorderMode = () => {
    if (!isReorderMode && rowOrder.length === 0) setRowOrder([...baseRows]);
    setIsReorderMode(prev => !prev);
  };

  const handleSave = () => {
    if (!selectedTable) return;
    let merged = [...rows];
    if (editedRows.size > 0) {
      merged = merged.map(row => {
        const edited = editedRows.get(row.id);
        return edited ? { ...row, ...edited } : row;
      });
    }
    onTableDataChange?.(selectedTable.name, merged);
    setEditedRows(new Map());
    setHasReordered(false);
    console.log(`Saved ${editedRows.size} edited row(s)${hasReordered ? ' + reorder' : ''} for ${selectedTable.name}`);
  };

  const handleReset = () => {
    setEditedRows(new Map());
    setRowOrder([]);
    setHasReordered(false);
    setIsReorderMode(false);
    const current = selectedTable;
    setSelectedTable(null);
    setTimeout(() => setSelectedTable(current), 0);
  };

  if (!hasData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)', p: 3 }}>
        <Card sx={{ maxWidth: 500 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>No Data Available</Typography>
            <Typography variant="body2" color="text.secondary">
              Please export data first to view the table tree structure.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (!structure) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">No table structure found.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 0, height: 'calc(100vh - 64px)', overflowY: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3, px: 3, pt: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0 }}>
          <AccountTreeIcon /> Dataflow Tree View
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Hierarchical view of tables and their relationships. Click on a table to view its content.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip icon={<TableChartIcon />} label={`${allTables.length} Table${allTables.length !== 1 ? 's' : ''}`} color="primary" variant="outlined" />
          <Chip label={`${allTables.reduce((sum, t) => sum + t.records.length, 0)} Total Records`} variant="outlined" />
          {selectedTable && (
            <Chip label={`Selected: ${selectedTable.name}`} color="success" variant="filled" onDelete={() => setSelectedTable(null)} />
          )}
        </Box>
      </Box>

      {/* Main layout */}
      <Box sx={{ pl: 3, pr: 3, display: 'flex', gap: 3, alignItems: 'stretch', flexDirection: { xs: 'column', md: 'row' }, width: '100%' }}>
        <TreePanel structure={structure} selectedTable={selectedTable} onTableClick={handleTableClick} />

        {selectedTable && (
          <TableDataPanel
            selectedTable={selectedTable}
            columns={columns}
            rows={rows}
            editedRows={editedRows}
            isReorderMode={isReorderMode}
            hasReordered={hasReordered}
            apiRef={apiRef}
            onSave={handleSave}
            onReset={handleReset}
            onReorder={handleRowReorder}
            onToggleReorderMode={handleToggleReorderMode}
            onProcessRowUpdate={processRowUpdate}
            onProcessRowUpdateError={handleProcessRowUpdateError}
          />
        )}
      </Box>

      {/* Summary section (shown when no table is selected) */}
      {!selectedTable && (
        <Card sx={{ mt: 3, mx: 3, mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Structure Summary</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2">
                <strong>Parent Table:</strong> {structure.parent.name} ({structure.parent.records.length} records, {getColumnInfo(structure.parent.records).length} columns)
              </Typography>
              {structure.children.length > 0 && (
                <Typography variant="body2"><strong>Child Tables:</strong> {structure.children.length}</Typography>
              )}
              {structure.children.map((childData, idx) => (
                <Box key={idx}>
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    • {childData.table.name}: {childData.table.records.length} records, {getColumnInfo(childData.table.records).length} columns
                    {childData.grandchildren.length > 0 && ` (${childData.grandchildren.length} subtable${childData.grandchildren.length > 1 ? 's' : ''})`}
                  </Typography>
                  {childData.grandchildren.map((grandchild, gIdx) => (
                    <Typography key={gIdx} variant="body2" sx={{ ml: 4, color: 'text.secondary', fontSize: '0.85rem' }}>
                      └─ {grandchild.name}: {grandchild.records.length} records, {getColumnInfo(grandchild.records).length} columns
                    </Typography>
                  ))}
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
