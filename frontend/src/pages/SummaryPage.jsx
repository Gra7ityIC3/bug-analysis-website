import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import InsertChartOutlinedOutlinedIcon from '@mui/icons-material/InsertChartOutlinedOutlined';
import { IconButton } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';

function SummaryPage() {
  const [dbmsSummaryData, setDbmsSummaryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTable, setIsTable] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:5000/dbms_summary_data')
      .then(response => {
        console.log(response.data);
  
        const formattedData = response.data.map(item => ({
          ...item,
          fixed_count: Number(item.fixed_count) || 0,
          open_count: Number(item.open_count) || 0,
          total_count: Number(item.total_count) || 0,
        }));
  
        console.log("Formatted Data:", formattedData);
        setDbmsSummaryData(formattedData);
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
        size: 250,
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
        size: 200,
      },
      {
        accessorKey: 'total_count',
        header: 'All Found Issues',
        enableGrouping: false,
        filterFn: 'range',
        size: 200,
      },
      {
        accessorKey: 'fixed_count',
        header: 'Fixed Issues',
        enableGrouping: false,
        filterFn: 'range',
        size: 200,
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

  const translations = {
    open_count: 'Open Issues',
    fixed_count: 'Fixed Issues',
  };

  function addLabels(series) {
    return series.map((item) => ({
      ...item,
      label: translations[item.dataKey],
      valueFormatter: (v) => (v ? v.toLocaleString() : '0'),
    }));
  }

  return (
    <div className="p-2">
      <div className="flex justify-between mb-2">
        <h2 className="font-bold">Summary Data By Database</h2>
        <div className="flex gap-2 mr-2">
        <IconButton onClick={() => setIsTable(!isTable)}>
          {isTable ? (
            <InsertChartOutlinedOutlinedIcon sx={{ color: "white" }} />
          ) : (
            <TableChartOutlinedIcon sx={{ color: "white" }} />
          )}
        </IconButton>
        </div>
      </div>
      {isTable ? (
      <MaterialReactTable table={table} />
      ) : (
        <div className='bg-white'>
          <BarChart
            dataset={dbmsSummaryData}
            series={addLabels([
              { dataKey: 'open_count', stack: 'total' },
              { dataKey: 'fixed_count', stack: 'total' },
            ])}
            xAxis={[{ 
              scaleType: 'band', 
              dataKey: 'dbms',
            }]}
            slotProps={{ legend: { hidden: true } }}
            height={400}
          />
        </div>
      )}
    </div>
  );
}

export default SummaryPage;
