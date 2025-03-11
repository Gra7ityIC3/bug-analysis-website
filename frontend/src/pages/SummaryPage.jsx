import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';

function SummaryPage() {
  const [dbmsSummaryData, setDbmsSummaryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:5000/dbms_summary_data')
      .then(response => {
        console.log(response.data)
        setDbmsSummaryData(response.data)
      })
      .catch(error => console.error('Error fetching issues:', error))
      .finally(() => setIsLoading(false));
  }, []);

  const columns = useMemo(
    () => [
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
        accessorKey: 'open_count',
        header: 'Open Issues',
        enableGrouping: false,
        filterFn: 'range',
        size: 400,
      },
      {
        accessorKey: 'total_count',
        header: 'All Found Issues',
        enableGrouping: false,
        filterFn: 'range',
        size: 400,
      },
      {
        accessorKey: 'fixed_count',
        header: 'Fixed Issues',
        enableGrouping: false,
        filterFn: 'range',
        size: 400,
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data: dbmsSummaryData,
    enableFacetedValues: true,
    enableGrouping: true,
    enableRowNumbers: true,
    globalFilterFn: 'contains',
    initialState: {
      columnFilters: [
        {
          id: 'status',
          value: ['Open', 'Closed', 'Fixed'],
        },
      ],
    },
    state: {
      isLoading
    }
  });

  return (
    <div className="p-2">
      <div className="flex justify-between mb-2">
        <h2 className="font-bold">Summary Data By Database</h2>
      </div>
      <MaterialReactTable table={table} />
    </div>
  );
}

export default SummaryPage;
