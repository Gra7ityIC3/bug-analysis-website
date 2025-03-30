import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar, SnackbarContent,
  Tooltip
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

const API_BASE_URL = 'http://localhost:5000';

const getEndOfDay = (max) => {
  const date = new Date(max);
  date.setHours(23, 59, 59, 999);
  return date;
};

const dateFilterFn = (row, columnId, filterValue) => {
  const date = row.getValue(columnId);
  const [min, max] = filterValue;
  return (!min || date >= new Date(min)) && (!max || date <= getEndOfDay(max));
};

const DateCell = ({ cell }) => {
  const date = cell.getValue();
  return (
    <Tooltip title={format(date, 'MMM d, yyyy, h:mm a z')}>
      <span>{format(date, 'MMM d, yyyy')}</span>
    </Tooltip>
  );
};

function SqlancerJsonBugsPage() {
  const [issues, setIssues] = useState([]);
  const [statuses, setStatuses] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);

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

    const fetchIssues = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/sqlancer_json_bugs`, { signal });
        const issues = response.data.issues;
        setIssues(issues);
      } catch (error) {
        if (axios.isCancel(error)) {
          console.warn('Issue fetch request was aborted:', error.message);
        } else {
          console.error('Error fetching issues:', error);
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchIssues();

    return () => controller.abort();
  }, []);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        enableEditing: false,
        enableGrouping: false,
        filterFn: 'contains',
        size: 400,
      },
      {
        accessorKey: 'dbms',
        header: 'DBMS',
        enableEditing: false,
        filterVariant: 'multi-select',
        size: 150,
        sortingFn: (rowA, rowB, columnId) => {
          // If grouped, sort by group size in ascending order
          // As DBMS is a string, descending order wouldn't follow the default sort direction (↑)
          if (rowA.subRows.length && rowB.subRows.length) {
            return rowA.subRows.length - rowB.subRows.length;
          }
          // Otherwise, sort alphabetically in ascending order
          return rowA.getValue(columnId).localeCompare(rowB.getValue(columnId));
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        editVariant: 'select',
        editSelectOptions: statuses,
        filterVariant: 'multi-select',
        size: 150,
      },
      {
        accessorFn: (row) => new Date(row.created_at),
        id: 'created_at',
        header: 'Date Posted',
        enableEditing: false,
        enableGrouping: false,
        filterVariant: 'date-range',
        size: 150,
        filterFn: dateFilterFn,
        Cell: DateCell,
      },
      {
        accessorKey: 'oracle',
        header: 'Oracle',
        enableEditing: false,
        filterVariant: 'multi-select',
        size: 150,
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        enableEditing: false,
        filterVariant: 'multi-select',
        size: 150,
      },
    ],
    [statuses],
  );

  const handleSaveBugReport = async ({ table, values, row }) => {
    setIsSaving(true);

    try {
      const id = row.id;
      const { status } = values;

      await axios.put(`${API_BASE_URL}/sqlancer_json_bugs/${id}`, { status });

      setIssues(prevIssues =>
        prevIssues.map(issue => {
          if (issue.id === id) {
            issue.status = status;
          }
          return issue;
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
      await axios.delete(`${API_BASE_URL}/sqlancer_json_bugs`, { data: { ids: [id] } });

      setRowSelection(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      setIssues(prevIssues => prevIssues.filter(issue => issue.id !== id));

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
      await axios.delete(`${API_BASE_URL}/sqlancer_json_bugs`, { data: { ids } });

      setRowSelection(prev => {
        const next = { ...prev };
        ids.forEach(id => delete next[id]);
        return next;
      });

      const set = new Set(ids);
      setIssues(prevIssues => prevIssues.filter(issue => !set.has(issue.id)));

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
    data: issues,
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
          value: ['Open', 'Closed', 'Fixed'],
        },
      ],
    },
    getRowId: row => row.id,
    onEditingRowSave: handleSaveBugReport,
    onRowSelectionChange: setRowSelection,
    renderDetailPanel: ({ row }) => (
      <div style={{ padding: '1rem', background: '#f9f9f9' }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {row.original.test || 'No test provided.'}
        </ReactMarkdown>
      </div>
    ),
    renderRowActions: ({ row }) => (
      <Box sx={{ display: 'flex', gap: '1rem' }}>
        <Tooltip title="Edit issue">
          <IconButton onClick={() => table.setEditingRow(row)}>
            <EditIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete issue">
          <IconButton color="error" onClick={() => handleOpenDialog([row], 'single')}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="View bug report">
          <IconButton onClick={() => window.open(row.original.url_fixed || row.original.url_bugtracker, "_blank")}>
            <OpenInNewIcon />
          </IconButton>
        </Tooltip>
      </Box>
    ),
    renderToolbarInternalActions: ({ table }) => {
      const selectedRows = table.getSelectedRowModel().rows;

      return (
        <Box>
          <MRT_ToggleFiltersButton table={table}/>
          <Tooltip title="Delete issues">
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
      showProgressBars: isRefetching,
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
    <div className="p-2">
      <div className="flex justify-between mb-2">
        <h2 className="font-bold">Issues Found</h2>
      </div>
      <MaterialReactTable table={table} />

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
    </div>
  );
}

export default SqlancerJsonBugsPage;
