import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { styled } from '@mui/material/styles';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Snackbar,
  SnackbarContent,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import {
  MaterialReactTable,
  MRT_ToggleFiltersButton,
  useMaterialReactTable
} from 'material-react-table';

const API_BASE_URL = 'http://localhost:5001';

const StyledCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  borderRadius: '12px',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
  },
}));

const getEndOfDay = (max) => {
  const date = new Date(max);
  date.setHours(23, 59, 59, 999);
  return date;
};

function SqlancerBugReportsPage() {
  const [bugReports, setBugReports] = useState([]);
  const [statuses, setStatuses] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isError, setIsError] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const [rowSelection, setRowSelection] = useState({});

  const [rowsToDelete, setRowsToDelete] = useState([]);
  const [deleteMode, setDeleteMode] = useState(null); // 'single' | 'multi'
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/statuses`)
      .then(response => setStatuses(response.data.statuses));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchBugReports = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/sqlancer-bug-reports`, { signal });
        setBugReports(response.data.bugReports);
      } catch (error) {
        if (axios.isCancel(error)) {
          console.warn('Bug report fetch request was aborted:', error.message);
        } else {
          console.error('Error fetching bug reports:', error);
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchBugReports();

    return () => controller.abort();
  }, []);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        filterFn: 'contains',
        enableEditing: false,
        enableGrouping: false,
        size: 400,
      },
      {
        accessorKey: 'dbms',
        header: 'DBMS',
        filterVariant: 'multi-select',
        enableEditing: false,
        size: 150,
        sortingFn: (rowA, rowB, columnId) => {
          // If grouped, sort by group size in ascending order.
          // As DBMS is a string, descending order wouldn't follow the default sort direction (↑).
          if (rowA.subRows.length && rowB.subRows.length) {
            return rowA.subRows.length - rowB.subRows.length;
          }
          // Otherwise, sort alphabetically in ascending order.
          return rowA.getValue(columnId).localeCompare(rowB.getValue(columnId));
        },
      },
      {
        accessorKey: 'oracle',
        header: 'Test Oracle',
        filterVariant: 'multi-select',
        enableEditing: false,
        size: 150,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        filterVariant: 'multi-select',
        editVariant: 'select',
        editSelectOptions: statuses,
        size: 150,
      },
      {
        accessorFn: (row) => new Date(row.created_at),
        id: 'created_at',
        header: 'Date Posted',
        filterVariant: 'date-range',
        enableEditing: false,
        enableGrouping: false,
        size: 150,
        filterFn: (row, columnId, filterValue) => {
          const date = row.getValue(columnId);
          const [min, max] = filterValue;
          return (!min || date >= new Date(min)) && (!max || date <= getEndOfDay(max));
        },
        Cell: ({ cell }) => (
          <span>{format(cell.getValue(), 'MMM d, yyyy')}</span>
        ),
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        filterVariant: 'multi-select',
        size: 150,
        Cell: ({ cell }) => {
          const severity = cell.getValue();
          return severity === 'Unknown' ? (
            <Tooltip title="Not specified in bug report">
              <span>{severity}</span>
            </Tooltip>
          ) : (
            <span>{severity}</span>
          );
        },
      },
    ],
    [statuses],
  );

  const handleSaveBugReport = async ({ table, values, row }) => {
    setIsSaving(true);

    try {
      const id = row.id;
      const { status, severity } = values;

      await axios.put(`${API_BASE_URL}/sqlancer-bug-reports/${id}`, { status, severity });

      setBugReports(prevBugReports =>
        prevBugReports.map(bugReport => {
          if (bugReport.id === id) {
            bugReport.status = status;
            bugReport.severity = severity;
          }
          return bugReport;
        })
      );

      table.setEditingRow(null); // Exit editing mode
    } catch (error) {
      console.error('Error updating bug report:', error);
      setIsError(true);
      setSnackbarMessage('Failed to update bug report');
      setSnackbarOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDialog = (rows, mode) => {
    setRowsToDelete(rows);
    setDeleteMode(mode);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);

    if (deleteMode === 'single') {
      await handleSingleDelete(rowsToDelete[0]);
    } else {
      await handleMultiDelete(rowsToDelete);
    }

    setIsDeleting(false);
    setSnackbarOpen(true);
  }

  const handleSingleDelete = async (row) => {
    try {
      const id = row.id;
      await axios.delete(`${API_BASE_URL}/sqlancer-bug-reports`, { data: { ids: [id] } });

      setRowSelection(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      setBugReports(prevBugReports => prevBugReports.filter(bugReport => bugReport.id !== id));

      setIsError(false);
      setSnackbarMessage('Bug report deleted');
      handleCloseDialog();
    } catch (error) {
      console.error('Error deleting bug report:', error);
      setIsError(true);
      setSnackbarMessage('Failed to delete bug report');
    }
  };

  const handleMultiDelete = async (rows) => {
    try {
      const ids = rows.map(row => row.id);
      await axios.delete(`${API_BASE_URL}/sqlancer-bug-reports`, { data: { ids } });

      setRowSelection(prev => {
        const next = { ...prev };
        ids.forEach(id => delete next[id]);
        return next;
      });

      const set = new Set(ids);
      setBugReports(prevBugReports => prevBugReports.filter(bugReport => !set.has(bugReport.id)));

      setIsError(false);
      setSnackbarMessage(`${label} deleted`);
      handleCloseDialog();
    } catch (error) {
      console.error(`Error deleting ${label}:`, error);
      setIsError(true);
      setSnackbarMessage(`Failed to delete ${label}`);
    }
  };

  const table = useMaterialReactTable({
    columns,
    data: bugReports,
    autoResetPageIndex: false,
    enableEditing: true,
    enableFacetedValues: true,
    enableGrouping: true,
    enableRowActions: true,
    enableRowNumbers: true,
    enableRowSelection: true,
    editDisplayMode: 'row',
    globalFilterFn: 'contains',
    positionActionsColumn: 'last',
    positionToolbarAlertBanner: 'bottom',
    initialState: {
      showGlobalFilter: true,
      columnFilters: [
        {
          id: 'status',
          value: ['Open', 'Fixed'],
        },
      ],
    },
    getRowId: row => row.id,
    onEditingRowSave: handleSaveBugReport,
    onRowSelectionChange: setRowSelection,
    renderDetailPanel: ({ row }) => (
      <div style={{ padding: '1rem', background: '#f9f9f9' }}>
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
          {row.original.test || 'No test provided.'}
        </pre>
      </div>
    ),
    renderRowActions: ({ row }) => (
      <Box sx={{ display: 'flex', gap: '1rem' }}>
        <Tooltip title="Edit bug report">
          <IconButton onClick={() => table.setEditingRow(row)}>
            <EditIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete bug report">
          <IconButton color="error" onClick={() => handleOpenDialog([row], 'single')}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Box>
    ),
    renderToolbarInternalActions: ({ table }) => {
      const selectedRows = table.getSelectedRowModel().rows;

      return (
        <Box>
          <MRT_ToggleFiltersButton table={table}/>
          <Tooltip title="Delete bug reports">
            <span>
              <IconButton
                disabled={selectedRows.length === 0}
                onClick={() => handleOpenDialog(selectedRows, 'multi')}
              >
                <DeleteIcon/>
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      );
    },
    state: {
      isLoading,
      isSaving,
      rowSelection,
    },
  });

  const handleCloseSnackbar = (event, reason) => {
    // Don't close snackbar when the user clicks outside of it
    if (reason === 'clickaway') return;

    setSnackbarOpen(false);
  };

  const count = rowsToDelete.length;
  const label = `${count} bug report${count === 1 ? '' : 's'}`;

  return (
    <Box sx={{ pb: 3, px: 3, backgroundColor: '#f0f4f8', minHeight: '100vh' }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <StyledCard>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" color="#1976d2">
                SQLancer Bug Reports Dashboard
              </Typography>
            </CardContent>
          </StyledCard>
        </Grid>

        {/* Table */}
        <Grid item xs={12}>
          <MaterialReactTable table={table} />
        </Grid>
      </Grid>

      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
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
          <Button onClick={handleCloseDialog} disabled={isDeleting}>Cancel</Button>
          <Button onClick={handleConfirmDelete} loading={isDeleting}>OK</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        onClose={handleCloseSnackbar}
        autoHideDuration={5000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {isError ? (
          <Alert severity="error" onClose={handleCloseSnackbar}>
            {snackbarMessage}
          </Alert>
        ) : (
          <SnackbarContent message={snackbarMessage} />
        )}
      </Snackbar>
    </Box>
  );
}

export default SqlancerBugReportsPage;
