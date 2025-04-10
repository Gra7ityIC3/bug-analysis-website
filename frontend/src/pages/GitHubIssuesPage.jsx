import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { styled } from '@mui/material/styles';
import {
  Alert,
  Box,
  Card,
  CardContent,
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
  Refresh as RefreshIcon,
  InsertChart as InsertChartIcon
} from '@mui/icons-material';
import {
  MaterialReactTable,
  MRT_ToggleFiltersButton,
  useMaterialReactTable
} from 'material-react-table';
import ChartDialog from '../components/ChartDialog.jsx';
import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog.jsx';

const API_BASE_URL = 'http://localhost:5000';

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

const parseCounts = (item) => {
  for (const [key, value] of Object.entries(item).slice(1)) {
    item[key] = parseInt(value);
  }
  return item;
};

const fillMonthlyDbmsCounts = (monthlyCounts, dbmsDataset) => {
  const result = {};

  let currentMonth = new Date(monthlyCounts[0].date);
  const endMonth = new Date(monthlyCounts.at(-1).date);

  while (currentMonth <= endMonth) {
    const month = currentMonth.toISOString().slice(0, 7); // 'YYYY-MM'
    result[month] = { date: new Date(currentMonth) };

    for (const { dbms } of dbmsDataset) {
      result[month][dbms] = 0;
    }

    currentMonth.setMonth(currentMonth.getMonth() + 1);
  }

  for (const { date, dbms, total_count } of monthlyCounts) {
    const month = date.slice(0, 7); // date is already an ISO string
    result[month][dbms] = parseInt(total_count);
  }

  return Object.values(result);
};

function GitHubIssuesPage() {
  // Data sources
  const [issues, setIssues] = useState([]);
  const [dbmsList, setDbmsList] = useState([]);
  const [oracles, setOracles] = useState([]);
  const [statuses, setStatuses] = useState([]);

  // Loading indicators
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isChartLoading, setIsChartLoading] = useState(false);

  // Feedback snackbar
  const [isError, setIsError] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const [rowSelection, setRowSelection] = useState({});

  // Delete confirmation dialog
  const [rowsToDelete, setRowsToDelete] = useState([]);
  const [deleteMode, setDeleteMode] = useState(null); // 'single' | 'multi'
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Chart dialog
  const [chartDialogOpen, setChartDialogOpen] = useState(false);

  // Chart datasets
  const [dbmsDataset, setDbmsDataset] = useState([]);
  const [oracleDataset, setOracleDataset] = useState([]);
  const [statusDataset, setStatusDataset] = useState([]);
  const [datePostedDataset, setDatePostedDataset] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchIssues = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/issues`, { signal });
        setIssues(response.data.issues);
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
        filterFn: dateFilterFn,
        Cell: DateCell,
      },
      {
        accessorFn: (row) => new Date(row.updated_at),
        id: 'updated_at',
        header: 'Last Updated',
        filterVariant: 'date-range',
        enableEditing: false,
        enableGrouping: false,
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

  const handleOpenDeleteDialog = (rows, mode) => {
    setRowsToDelete(rows);
    setDeleteMode(mode);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
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
      handleCloseDeleteDialog();
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
      handleCloseDeleteDialog();
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

  const handleOpenChartDialog = async (rows) => {
    setIsChartLoading(true);

    try {
      const ids = rows.map(row => row.id);

      const [
        { data: dbmsSummary },
        { data: oracleSummary },
        { data: statusSummary },
        { data: monthlyCounts },
      ] = await Promise.all([
        axios.post(`${API_BASE_URL}/dbms-summary-data`, { ids }),
        axios.post(`${API_BASE_URL}/oracle-summary-data`, { ids }),
        axios.post(`${API_BASE_URL}/status-summary-data`, { ids }),
        axios.post(`${API_BASE_URL}/dbms-monthly-data`, { ids }),
      ]);

      const dbmsDataset = dbmsSummary.map(parseCounts);
      const oracleDataset = oracleSummary.map(parseCounts);
      const statusDataset = statusSummary.map(parseCounts);
      const datePostedDataset = fillMonthlyDbmsCounts(monthlyCounts, dbmsDataset);

      setDbmsDataset(dbmsDataset);
      setOracleDataset(oracleDataset);
      setStatusDataset(statusDataset);
      setDatePostedDataset(datePostedDataset);

      setChartDialogOpen(true);
    } catch (error) {
      console.error('Error fetching chart data', error);
      setIsError(true);
      setSnackbarMessage('Failed to generate charts');
      setSnackbarOpen(true);
    } finally {
      setIsChartLoading(false);
    }
  };

  const handleCloseChartDialog = () => {
    setChartDialogOpen(false);
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
          value: ['Open', 'Fixed', 'Closed'],
        },
      ],
    },
    getRowId: row => row.id,
    onEditingRowSave: handleSaveBugReport,
    onRowSelectionChange: setRowSelection,
    renderDetailPanel: ({ row }) => (
      <div style={{ padding: '1rem', background: '#f9f9f9' }}>
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
          {row.original.description || 'No description provided.'}
        </pre>
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
          <IconButton color="error" onClick={() => handleOpenDeleteDialog([row], 'single')}>
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
          <Tooltip title="Generate charts">
            <span>
              <IconButton
                disabled={selectedRows.length === 0}
                onClick={() => handleOpenChartDialog(selectedRows)}
                loading={isChartLoading}
              >
                <InsertChartIcon/>
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Delete issues">
            <span>
              <IconButton
                disabled={selectedRows.length === 0}
                onClick={() => handleOpenDeleteDialog(selectedRows, 'multi')}
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
    <Box sx={{ pb: 3, px: 3, backgroundColor: '#f0f4f8', minHeight: '100vh' }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <StyledCard>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" color="#1976d2">
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

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        deleteMode={deleteMode}
        label={label}
        isDeleting={isDeleting}
        handleConfirmDelete={handleConfirmDelete}
      />

      <ChartDialog
        open={chartDialogOpen}
        onClose={handleCloseChartDialog}
        datasets={{
          dbms: dbmsDataset,
          oracle: oracleDataset,
          status: statusDataset,
          datePosted: datePostedDataset,
        }}
      />

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
