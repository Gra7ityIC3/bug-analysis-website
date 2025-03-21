import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import InsertChartOutlinedOutlinedIcon from '@mui/icons-material/InsertChartOutlinedOutlined';
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined';
import { IconButton, Tooltip } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import dayjs from 'dayjs'

function SummaryPage() {
  const [dbmsSummaryData, setDbmsSummaryData] = useState([]);
  const [dbmsMonthlyData, setDbmsMonthlyData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table');
  const [selectedDBMS, setSelectedDBMS] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:5001/dbms_summary_data')
      .then(response => {
        const formattedData = response.data.map(item => ({
          ...item,
          fixed_count: Number(item.fixed_count) || 0,
          open_count: Number(item.open_count) || 0,
          total_count: Number(item.total_count) || 0,
        }));
        setDbmsSummaryData(formattedData);
      })
      .catch(error => console.error('Error fetching summary data:', error))
      .finally(() => setIsLoading(false));
  }, []);

  // Fetch monthly data
  useEffect(() => {
    axios.get('http://localhost:5001/dbms_monthly_data')
      .then(response => {
        setDbmsMonthlyData(response.data);
      })
      .catch(error => console.error('Error fetching monthly data:', error));
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

  const getColorForDBMS = (() => {
    const dbmsColors = new Map();
    const goldenRatioConjugate = 0.6180339887;
    let hue = 0;
  
    return (dbms) => {
      if (!dbmsColors.has(dbms)) {
        hue = (hue + goldenRatioConjugate) % 1;
        const color = `hsl(${Math.floor(hue * 360)}, 70%, 50%)`;
        dbmsColors.set(dbms, color);
      }
      return dbmsColors.get(dbms);
    };
  })();

  const lineChartData = useMemo(() => {
    if (!Object.keys(dbmsMonthlyData).length) return { 
      months: [], 
      series: [], 
      maxValue: 0 
    };

    const allMonths = Object.values(dbmsMonthlyData)
      .flatMap(data => data.map(entry => entry.month))
      .sort();
    const months = [...new Set(allMonths)];

    const filteredData = selectedDBMS 
      ? { [selectedDBMS]: dbmsMonthlyData[selectedDBMS] }
      : dbmsMonthlyData;

    
    const dbmsSeries = Object.keys(filteredData).map(dbms => ({
      label: dbms,
      data: months.map(month => {
        const entry = filteredData[dbms].find(e => e.month === month);
        return entry ? entry.total_bugs : 0;
      }),
      curve: 'linear',
      showMark: true,
      markSize: 5,
      color: getColorForDBMS(dbms),
    }));

    // Total Bugs series
    const totalBugsData = months.map(month => {
      return Object.values(filteredData)
        .reduce((sum, data) => {
          const entry = data.find(e => e.month === month);
          return sum + (entry ? entry.total_bugs : 0);
        }, 0);
    });

    const series = [
      ...dbmsSeries,
      {
        label: 'Total Bugs',
        data: totalBugsData,
        curve: 'linear',
        showMark: true,
        markSize: 5,
        color: '#000000', 
        lineStyle: { strokeWidth: 2, strokeDasharray: '5 5' }, // Dashed thicker line
      }
    ];

    const maxValue = Math.max(
      ...series.flatMap(s => s.data),
      10 
    );

    return { months, series, maxValue };
  }, [dbmsMonthlyData, selectedDBMS]);

  return (
    <div className="p-2">
      <div className="flex justify-between mb-4 items-center">
        <h2 className="font-bold text-lg">Summary Data By Database</h2>
        <div className="flex items-center gap-2">
          <Tooltip title="Table View">
            <IconButton onClick={() => setViewMode('table')}>
              <TableChartOutlinedIcon sx={{ color: viewMode === 'table' ? '#1976d2' : 'gray' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Bar Chart">
            <IconButton onClick={() => setViewMode('bar')}>
              <InsertChartOutlinedOutlinedIcon sx={{ color: viewMode === 'bar' ? '#1976d2' : 'gray' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Trend Analysis">
            <IconButton onClick={() => setViewMode('line')}>
              <TimelineOutlinedIcon sx={{ color: viewMode === 'line' ? '#1976d2' : 'gray' }} />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : viewMode === 'table' ? (
        <MaterialReactTable table={table} />
      ) : viewMode === 'bar' ? (
        <div className='bg-white p-4 rounded shadow'>
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
      ) : (
        <div className='bg-white p-4 rounded shadow'>
          <div className="flex justify-end mb-4">
            <select
              className="p-2 border rounded"
              value={selectedDBMS || ''}
              onChange={(e) => setSelectedDBMS(e.target.value || null)}
            >
              <option value="">All DBMS</option>
              {Object.keys(dbmsMonthlyData).map(dbms => (
                <option key={dbms} value={dbms}>{dbms}</option>
              ))}
            </select>
          </div>
          <LineChart
            xAxis={[{
              scaleType: 'point',
              data: lineChartData.months,
              label: 'Month',
              valueFormatter: (value) => dayjs(value).format('MMM YYYY'),
              tickLabelStyle: {
                angle: 45,
                textAnchor: 'start',
                fontSize: 12,
              },
              labelStyle: {
                fontSize: 14,
                transform: 'translateY(20px)', 
              },
            }]}
            yAxis={[{
              label: 'Number of Bugs',
              max: Math.ceil(lineChartData.maxValue * 1.1), 
              valueFormatter: (value) => value.toLocaleString(),
            }]}
            series={lineChartData.series}
            height={550}
            margin={{ top: 60, right: 140, bottom: 90, left: 70 }}
            grid={{ horizontal: true }}
            tooltip={{
              trigger: 'item',
              formatter: ({ series, dataIndex }) => {
                const month = lineChartData.months[dataIndex];
                const value = series.data[dataIndex];
                return `${series.label}<br>${dayjs(month).format('MMMM YYYY')}: ${value.toLocaleString()} bugs`;
              },
            }}
            slotProps={{
              legend: {
                position: { vertical: 'top', horizontal: 'right' },
                padding: 0,
                labelStyle: { fontSize: 12 },
              },
            }}
          />
        </div>
      )}
    </div>
  );
}

export default SummaryPage;
