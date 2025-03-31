import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { styled, keyframes} from '@mui/material/styles';
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
  Refresh as RefreshIcon
} from '@mui/icons-material';
import {
  MaterialReactTable,
  MRT_ToggleFiltersButton,
  useMaterialReactTable
} from 'material-react-table';

const API_BASE_URL = 'http://localhost:5000';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const StyledCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, #ffffff 0%, #eef2f6 100%)',
  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.08)',
  borderRadius: '16px',
  border: '1px solid rgba(0, 0, 0, 0.05)',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  animation: `${fadeIn} 0.5s ease-out`,
  '&:hover': {
    transform: 'translateY(-6px)',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12)',
  },
}));

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

const getRefreshSnackbarMessage = (newCount, updatedCount) => {
  const messages = [];

  if (newCount > 0) {
    messages.push(`${newCount} new bug report${newCount === 1 ? '' : 's'} added`);
  }
  if (updatedCount > 0) {
    messages.push(`${updatedCount} bug report${updatedCount === 1 ? '' : 's'} updated`);
  }

  return messages.join(', ') || 'No new or updated bug reports found';
};

function GitHubIssuesPage() {
  const [issues, setIssues] = useState([]);
  const [dbmsList, setDbmsList] = useState([]);
  const [oracles, setOracles] = useState([]);
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
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchIssues = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/issues`, { signal });
        const issues = response.data.issues;

        if (issues.length > 0) {
          setIssues(issues);
        } else {
          const response = await axios.post(`${API_BASE_URL}/issues`, null, { signal });
          setIssues(response.data.issues);
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

  useEffect(() => {
    axios.get(`${API_BASE_URL}/dbms`)
      .then(response => setDbmsList(response.data.dbms));
  }, []);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/oracles`)
      .then(response => setOracles(response.data.oracles));
  }, []);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/statuses`)
      .then(response => setStatuses(response.data.statuses));
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
        editVariant: 'select',
        editSelectOptions: dbmsList,
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
        editVariant: 'select',
        editSelectOptions: oracles,
        size: 150,
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
    [dbmsList, oracles, statuses],
  );

  const handleSaveBugReport = async ({ table, values, row }) => {
    setIsSaving(true);

    try {
      const id = row.id;
      const { dbms, oracle, status } = values;

      await axios.put(`${API_BASE_URL}/issue/${id}`, { dbms, oracle, status });

      setIssues(prevIssues =>
        prevIssues.map(issue => {
          if (issue.id === id) {
            issue.dbms = dbms;
            issue.oracle = oracle;
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
  };

  const handleSingleDelete = async (row) => {
    try {
      const id = row.id;
      await axios.delete(`${API_BASE_URL}/issues`, { data: { ids: [id] } });

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
      await axios.delete(`${API_BASE_URL}/issues`, { data: { ids } });

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

  const handleRefreshIssues = async () => {
    setIsRefetching(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/issues/refresh`);
      const { newIssues, updatedIssues } = response.data;

      const newCount = newIssues.length;
      const updatedCount = updatedIssues.length;

      if (newCount > 0 || updatedCount > 0) {
        setIssues(prevIssues => {
          const map = new Map(updatedIssues.map(issue => [issue.id, issue]));
          return [...newIssues, ...prevIssues.map(issue => map.get(issue.id) ?? issue)]
        });
      }

      setIsError(false);
      setSnackbarMessage(getRefreshSnackbarMessage(newCount, updatedCount));
    } catch (error) {
      console.error('Error refreshing issues:', error);
      setIsError(true);
      setSnackbarMessage('Failed to refresh issues');
    } finally {
      setIsRefetching(false);
      setSnackbarOpen(true);
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
          {row.original.description || 'No description provided.'}
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
        <Tooltip title="View issue on GitHub">
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
    <Box sx={{ pb: 3, px: 3, backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <StyledCard>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
              <Typography
                variant="h4"
                fontWeight="700"
                sx={{ color: '#1e88e5', letterSpacing: '-0.5px' }}
              >
                GitHub Issues Dashboard
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

export default GitHubIssuesPage;
