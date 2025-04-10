import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button
} from '@mui/material';

export default function DeleteConfirmationDialog({
 open,
 onClose,
 deleteMode,
 label,
 isDeleting,
 handleConfirmDelete,
}) {
  return (
    <Dialog open={open}>
      {deleteMode === 'single' ? (
        <>
          <DialogTitle>Delete bug report?</DialogTitle>
          <DialogContent>This bug report will be permanently deleted.</DialogContent>
        </>
      ) : (
        <>
          <DialogTitle>Delete {label}?</DialogTitle>
          <DialogContent>{label} will be permanently deleted.</DialogContent>
        </>
      )}
      <DialogActions>
        <Button onClick={onClose} disabled={isDeleting}>Cancel</Button>
        <Button onClick={handleConfirmDelete} loading={isDeleting}>Delete</Button>
      </DialogActions>
    </Dialog>
  );
}
