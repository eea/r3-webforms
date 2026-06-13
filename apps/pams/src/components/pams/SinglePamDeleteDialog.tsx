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

type SinglePamDeleteDialogProps = {
  open: boolean;
  pamToDelete: { id: number; title: string } | null;
  onClose: () => void;
  onConfirm: () => void;
};

export default function SinglePamDeleteDialog({
  open,
  pamToDelete,
  onClose,
  onConfirm,
}: SinglePamDeleteDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <DeleteIcon color="error" />
        Delete PAM
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          This action cannot be undone (until you reset).
        </Alert>
        {pamToDelete && (
          <Typography>
            Are you sure you want to delete <strong>PAM #{pamToDelete.id}: {pamToDelete.title}</strong>?
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={onConfirm}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
