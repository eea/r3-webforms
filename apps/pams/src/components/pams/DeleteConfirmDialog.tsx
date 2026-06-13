import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

type DeleteConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  onConfirm: () => void;
};

export default function DeleteConfirmDialog({
  open,
  onClose,
  selectedCount,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Confirm Delete</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          This action cannot be undone!
        </Alert>
        <Typography>
          Are you sure you want to delete {selectedCount} PAM{selectedCount > 1 ? 's' : ''}?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="error" onClick={onConfirm} startIcon={<DeleteIcon />}>
          Delete {selectedCount} PAM{selectedCount > 1 ? 's' : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
