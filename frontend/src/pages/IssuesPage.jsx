import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Tooltip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';

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

function IssuesPage() {
  const [issues, setIssues] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);

  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const [selectedRow, setSelectedRow] = useState(null);
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
        const getResponse = await axios.get(`${API_BASE_URL}/issues`, { signal });
        const issues = getResponse.data.issues;

        if (issues.length > 0) {
          setIssues(issues);
        } else {
          const postResponse = await axios.post(`${API_BASE_URL}/issues`, null, { signal });
          setIssues(postResponse.data.issues);
        }
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
        accessorFn: (row) => new Date(row.updated_at),
        id: 'updated_at',
        header: 'Last Updated',
        enableEditing: false,
        enableGrouping: false,
        filterVariant: 'date-range',
        size: 150,
        filterFn: dateFilterFn,
        Cell: DateCell,
      },
    ],
    [statuses],
  );

  const handleSaveBugReport = async ({ table, values, row }) => {
    const { id } = row.original;
    const { dbms, status } = values;

    await axios.put(`${API_BASE_URL}/issue/${id}`, { dbms, status });

    setIssues(prevIssues =>
      prevIssues.map(issue => {
        if (issue.id === id) {
          issue.dbms = dbms;
          issue.status = status;
        }
        return issue;
      })
    );

    table.setEditingRow(null); // Exit editing mode
  };

  const handleOpenDialog = (row) => {
    setSelectedRow(row);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedRow(null);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);

    const { id } = selectedRow.original;
    await axios.delete(`${API_BASE_URL}/issue/${id}`);

    setIssues(prevIssues => prevIssues.filter(issue => issue.id !== id));

    handleCloseDialog();
    setSnackbarMessage('Bug report deleted')
    setSnackbarOpen(true);
    setIsDeleting(false);
  };

  const handleRefreshIssues = async () => {
    setIsRefetching(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/issues/refresh`);
      const newIssues = response.data.issues;
      const newCount = newIssues.length;

      if (newCount > 0) {
        setIssues(prevIssues => [...newIssues, ...prevIssues]);
        setSnackbarMessage(`${newCount} new bug report${newCount === 1 ? '' : 's'} added`);
      } else {
        setSnackbarMessage('No new bug reports found')
      }
    } catch (error) {
      console.error('Error refreshing issues:', error);
      setSnackbarMessage('Failed to refresh issues');
    } finally {
      setIsRefetching(false);
      setSnackbarOpen(true);
    }
  };

  const table = useMaterialReactTable({
    columns,
    data: issues,
    enableEditing: true,
    enableFacetedValues: true,
    enableGrouping: true,
    enableRowActions: true,
    enableRowNumbers: true,
    editDisplayMode: 'row',
    globalFilterFn: 'contains',
    positionActionsColumn: 'last',
    initialState: {
      columnFilters: [
        {
          id: 'status',
          value: ['Open', 'Closed', 'Fixed'],
        },
      ],
    },
    onEditingRowSave: handleSaveBugReport,
    renderDetailPanel: ({ row }) => (
      <div style={{ padding: '1rem', background: '#f9f9f9' }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {row.original.description || 'No description provided.'}
        </ReactMarkdown>
      </div>
    ),
    renderRowActions: ({ row }) => (
      <Box sx={{ display: 'flex', gap: '1rem' }}>
        <Tooltip title="Edit">
          <IconButton onClick={() => table.setEditingRow(row)}>
            <EditIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton color="error" onClick={() => handleOpenDialog(row)}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="View issue">
          <IconButton onClick={() => window.open(row.original.html_url, "_blank")}>
            <OpenInNewIcon />
          </IconButton>
        </Tooltip>
      </Box>
    ),
    renderTopToolbarCustomActions: () => (
      <Tooltip arrow title="Refresh issues">
        <IconButton onClick={handleRefreshIssues} loading={isRefetching}>
          <RefreshIcon />
        </IconButton>
      </Tooltip>
    ),
    state: {
      isLoading,
      showProgressBars: isRefetching,
    },
  });

  const handleCloseSnackbar = (event, reason) => {
    // Don't close snackbar when the user clicks outside of it
    if (reason === 'clickaway') return;

    setSnackbarOpen(false);
  };

  return (
    <div className="p-2">
      <div className="flex justify-between mb-2">
        <h2 className="font-bold">Issues Found</h2>
      </div>
      <MaterialReactTable table={table} />

      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>Delete bug report?</DialogTitle>
        <DialogContent>This bug report will be permanently deleted.</DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isDeleting}>Cancel</Button>
          <Button onClick={handleConfirmDelete} loading={isDeleting}>OK</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        onClose={handleCloseSnackbar}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        message={snackbarMessage}
      />
    </div>
  );
}

export default IssuesPage;
