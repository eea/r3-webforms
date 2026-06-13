import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type GridColDef } from '@mui/x-data-grid';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

type SortableRowProps = {
  row: any;
  columns: GridColDef[];
  isReorderMode: boolean;
};

export default function SortableRow({ row, columns, isReorderMode }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? 'rgba(25, 118, 210, 0.08)' : undefined,
  };

  return (
    <tr ref={setNodeRef} style={style} {...attributes}>
      {isReorderMode && (
        <td
          style={{
            padding: '8px',
            borderBottom: '1px solid #e0e0e0',
            cursor: 'grab',
            width: '40px',
            textAlign: 'center',
          }}
          {...listeners}
        >
          <DragIndicatorIcon sx={{ color: 'action.active', fontSize: 20 }} />
        </td>
      )}
      {columns.map((col) => (
        <td
          key={col.field}
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid #e0e0e0',
            borderRight: '1px solid #e0e0e0',
            maxWidth: col.width || 150,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row[col.field] !== undefined && row[col.field] !== null
            ? typeof row[col.field] === 'object'
              ? JSON.stringify(row[col.field])
              : String(row[col.field])
            : ''}
        </td>
      ))}
    </tr>
  );
}
