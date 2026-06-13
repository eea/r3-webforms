import { Box, Tooltip } from '@mui/material';
import { type GridColDef } from '@mui/x-data-grid';
import SwapVertIcon from '@mui/icons-material/SwapVert';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableRow from './SortableRow';

type SortableTableProps = {
  rows: any[];
  columns: GridColDef[];
  onReorder: (newRows: any[]) => void;
  isReorderMode: boolean;
};

export default function SortableTable({ rows, columns, onReorder, isReorderMode }: SortableTableProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = rows.findIndex((row) => row.id === active.id);
      const newIndex = rows.findIndex((row) => row.id === over.id);
      onReorder(arrayMove(rows, oldIndex, newIndex));
    }
  };

  const rowIds = rows.map((row) => row.id);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
        <Box
          sx={{
            overflow: 'auto',
            height: '100%',
            '& table': { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
            '& th': {
              padding: '12px 12px',
              borderBottom: '2px solid #e0e0e0',
              borderRight: '1px solid #e0e0e0',
              backgroundColor: '#f5f5f5',
              fontWeight: 'bold',
              textAlign: 'left',
              position: 'sticky',
              top: 0,
              zIndex: 1,
            },
          }}
        >
          <table>
            <thead>
              <tr>
                {isReorderMode && (
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <Tooltip title="Drag to reorder">
                      <SwapVertIcon sx={{ fontSize: 18 }} />
                    </Tooltip>
                  </th>
                )}
                {columns.map((col) => (
                  <th key={col.field} style={{ minWidth: col.width || 150 }}>
                    {col.headerName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <SortableRow key={row.id} row={row} columns={columns} isReorderMode={isReorderMode} />
              ))}
            </tbody>
          </table>
        </Box>
      </SortableContext>
    </DndContext>
  );
}
