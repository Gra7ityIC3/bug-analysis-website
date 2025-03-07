import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { IconButton, Tooltip } from '@mui/material';
import { OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';

const getEndOfDay = (max) => {
  const date = new Date(max);
  date.setHours(23, 59, 59, 999);
  return date;
}

function IssuesPage() {
  const [issues, setIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:5000/github_issues')
      .then(response => setIssues(response.data.issues))
      .catch(error => console.error('Error fetching issues:', error))
      .finally(() => setIsLoading(false));
  }, []);

  const columns = useMemo(
    () => [
      {
        accessorFn: (row, index) => index + 1,
        id: 'id',
        header: 'ID',
        enableColumnActions: false,
        enableColumnFilter: false,
        enableGrouping: false,
        size: 50,
      },
      {
        accessorKey: 'title',
        header: 'Title',
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
        enableGrouping: false,
        filterVariant: 'multi-select',
        size: 150,
      },
      {
        accessorFn: (row) => new Date(row.created_at),
        id: 'created_at',
        header: 'Date Posted',
        enableGrouping: false,
        filterVariant: 'date-range',
        size: 150,
        filterFn: (row, columnId, filterValue) => {
          const date = row.getValue(columnId);
          const [min, max] = filterValue;
          return (!min || date >= new Date(min)) && (!max || date <= getEndOfDay(max));
        },
        Cell: ({ cell }) => {
          const date = cell.getValue();
          return (
            <Tooltip title={format(date, 'MMM d, yyyy, h:mm a z')}>
              <span>{format(date, 'MMM d, yyyy')}</span>
            </Tooltip>
          );
        },
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data: issues,
    enableFacetedValues: true,
    enableGrouping: true,
    enableRowActions: true,
    globalFilterFn: 'contains',
    positionActionsColumn: 'last',
    renderDetailPanel: ({ row }) => (
      <div style={{ padding: '1rem', background: '#f9f9f9' }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {row.original.description || 'No description provided.'}
        </ReactMarkdown>
      </div>
    ),
    renderRowActions: ({ row }) => (
      <Tooltip title="View issue">
        <IconButton onClick={() => window.open(row.original.link, "_blank")}>
          <OpenInNewIcon />
        </IconButton>
      </Tooltip>
    ),
    state: {
      isLoading
    }
  });

  return (
    <div className="p-2">
      <div className="flex justify-between mb-2">
        <h2 className="font-bold">Issues Found</h2>
      </div>
      <MaterialReactTable table={table} />
    </div>
  );
}

export default IssuesPage;
