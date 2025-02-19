import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { IconButton, Tooltip } from '@mui/material';
import { OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';

function IssuesPage() {
  const [issues, setIssues] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/github_issues')
      .then(response => setIssues(response.data.issues))
      .catch(error => console.error('Error fetching issues:', error));
  }, []);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        size: 400,
      },
      {
        accessorKey: 'dbms',
        header: 'DBMS',
        size: 150,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 150,
      },
      {
        accessorKey: 'created_at',
        header: 'Date Posted',
        size: 150,
        Cell: ({ cell }) => {
          const date = new Date(cell.getValue());
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
    enableRowNumbers: true,
    rowNumberDisplayMode: 'original',
    displayColumnDefOptions: {
      'mrt-row-numbers': {
        Header: 'ID', // header: 'ID' doesn't work
      },
    },
    enableExpandAll: false,
    renderDetailPanel: ({ row }) => (
      <div style={{ padding: '1rem', background: '#f9f9f9' }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {row.original.description || 'No description provided.'}
        </ReactMarkdown>
      </div>
    ),
    muiExpandButtonProps: ({ row, table }) => ({
      onClick: () => table.setExpanded({ [row.id]: !row.getIsExpanded() }), // set only this row to be expanded
    }),
    enableRowActions: true,
    positionActionsColumn: 'last',
    renderRowActions: ({ row }) => (
      <Tooltip title="View issue">
        <IconButton onClick={() => window.open(row.original.link, "_blank")}>
          <OpenInNewIcon />
        </IconButton>
      </Tooltip>
    ),
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
