import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Box, IconButton, Snackbar, Tooltip } from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';
import { useConfirm } from 'material-ui-confirm';

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
  const [statuses, setStatuses] = useState([]);
  const [issues, setIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Controls snackbar visibility after deleting a bug report
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Handles confirmation dialogs before deleting a bug report
  const confirm = useConfirm();

  useEffect(() => {
    axios.get('http://localhost:5000/statuses')
      .then(response => setStatuses(response.data.statuses));
  }, []);

  useEffect(() => {
    axios.get('http://localhost:5000/github_issues')
      .then(response => setIssues(response.data.issues))
      .catch(error => console.error('Error fetching issues:', error))
      .finally(() => setIsLoading(false));
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

    await axios.put(`http://localhost:5000/issue/${id}`, { dbms, status });

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

  const handleDeleteBugReport = async (row) => {
    const { id } = row.original;

    const { confirmed } = await confirm({
      title: 'Delete bug report?',
      description: 'This bug report will be permanently deleted.',
    });

    if (confirmed) {
      await axios.delete(`http://localhost:5000/issue/${id}`);
      setIssues(prevIssues => prevIssues.filter(issue => issue.id !== id));
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
          <IconButton color="error" onClick={() => handleDeleteBugReport(row)}>
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
    state: {
      isLoading,
    },
  });

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return; // Prevent closing if clicked outside
    setSnackbarOpen(false);
  };

  return (
    <div className="p-2">
      <div className="flex justify-between mb-2">
        <h2 className="font-bold">Issues Found</h2>
      </div>
      <MaterialReactTable table={table} />

      <Snackbar
        open={snackbarOpen}
        onClose={handleCloseSnackbar}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        message="Bug report deleted"
      />
    </div>
  );
}

export default IssuesPage;
