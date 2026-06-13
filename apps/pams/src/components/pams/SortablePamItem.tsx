import {
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Stack,
  Tooltip,
  Chip,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import DescriptionIcon from '@mui/icons-material/Description';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type SortablePamItemProps = {
  pam: any;
  isSelected: boolean;
  isReorderMode: boolean;
  isModified: boolean;
  isNew?: boolean;
  onClick: () => void;
};

export default function SortablePamItem({
  pam,
  isSelected,
  isReorderMode,
  isModified,
  isNew = false,
  onClick,
}: SortablePamItemProps) {
  const pamId = pam.Id || pam.id;
  const isGroup = pam.IsGroup === 'Group';

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pamId });

  // Determine background color based on state
  let backgroundColor = undefined;
  if (isDragging) {
    backgroundColor = 'rgba(25, 118, 210, 0.08)';
  } else if (isNew) {
    backgroundColor = 'rgba(76, 175, 80, 0.12)'; // Green tint for new
  } else if (isModified) {
    backgroundColor = 'rgba(255, 152, 0, 0.12)'; // Orange tint for modified
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor,
  };

  return (
    <ListItemButton
      ref={setNodeRef}
      style={style}
      selected={isSelected}
      onClick={onClick}
      sx={{
        borderLeft: isSelected
          ? '3px solid'
          : isNew
            ? '3px solid'
            : isModified
              ? '3px solid'
              : '3px solid transparent',
        borderColor: isSelected
          ? 'primary.main'
          : isNew
            ? 'success.main'
            : isModified
              ? 'warning.main'
              : 'transparent',
      }}
      {...attributes}
    >
      {isReorderMode && (
        <ListItemIcon sx={{ minWidth: 28, cursor: 'grab' }} {...listeners}>
          <DragIndicatorIcon fontSize="small" color="action" />
        </ListItemIcon>
      )}
      <ListItemIcon sx={{ minWidth: 36 }}>
        {isGroup ? (
          <Tooltip title="Group of PaMs">
            <GroupWorkIcon color="secondary" fontSize="small" />
          </Tooltip>
        ) : (
          <Tooltip title="Single PaM">
            <DescriptionIcon color="action" fontSize="small" />
          </Tooltip>
        )}
      </ListItemIcon>
      <ListItemText
        primary={
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="body2" noWrap sx={{ fontWeight: isSelected ? 'bold' : 'normal' }}>
              {pam.Title || `PaM ${pamId}`}
            </Typography>
            {isNew && (
              <Chip
                label="New"
                size="small"
                color="success"
                variant="outlined"
                sx={{ height: 18, fontSize: '0.65rem', ml: 0.5 }}
              />
            )}
            {isModified && !isNew && (
              <Chip
                label="Modified"
                size="small"
                color="warning"
                variant="outlined"
                sx={{ height: 18, fontSize: '0.65rem', ml: 0.5 }}
              />
            )}
          </Stack>
        }
        secondary={
          <Typography variant="caption" color="text.secondary">
            #{pamId} {isGroup ? '(Group)' : '(Single)'}
          </Typography>
        }
      />
    </ListItemButton>
  );
}
