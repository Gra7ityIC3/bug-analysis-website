import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import InsertChartOutlinedOutlinedIcon from '@mui/icons-material/InsertChartOutlinedOutlined';
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined';
import ClearIcon from '@mui/icons-material/Clear';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Chip,
  Button,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { styled } from '@mui/material/styles';

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

const StyledChip = styled(Chip)(({ theme, selected }) => ({
  margin: '4px',
  transition: 'all 0.3s ease',
  backgroundColor: selected ? theme.palette.primary.main : '#e0e0e0',
  color: selected ? '#fff' : '#424242',
  '&:hover': {
    backgroundColor: selected ? theme.palette.primary.dark : '#d0d0d0',
    transform: 'scale(1.05)',
  },
}));

function SummaryPage() {
  const [dbmsSummaryData, setDbmsSummaryData] = useState([]);
  const [dbmsMonthlyData, setDbmsMonthlyData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table');
  const [selectedDBMS, setSelectedDBMS] = useState([]);
  const [fromMonth, setFromMonth] = useState(null);
  const [toMonth, setToMonth] = useState(null);

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

  const handleDBMSClick = (dbms) => {
    setSelectedDBMS(prev =>
      prev.includes(dbms) ? prev.filter(d => d !== dbms) : [...prev, dbms]
    );
  };

  const handleResetMonths = () => {
    setFromMonth(null);
    setToMonth(null);
  };

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
    if (!Object.keys(dbmsMonthlyData).length) return { months: [], series: [], maxValue: 0 };

    const allMonths = [...new Set(
      Object.values(dbmsMonthlyData)
        .flatMap(data => data.map(entry => entry.month))
        .sort()
    )];

    // Filter months based on fromMonth and toMonth
    const filteredMonths = allMonths.filter(month => {
      const monthDate = dayjs(month);
      const from = fromMonth ? dayjs(fromMonth).startOf('month') : null;
      const to = toMonth ? dayjs(toMonth).endOf('month') : null;
      return (!from || monthDate.isAfter(from) || monthDate.isSame(from, 'month')) &&
             (!to || monthDate.isBefore(to) || monthDate.isSame(to, 'month'));
    });

    const filteredData = selectedDBMS.length > 0
    ? Object.fromEntries(Object.entries(dbmsMonthlyData).filter(([dbms]) => selectedDBMS.includes(dbms)))
    : dbmsMonthlyData;

    const dbmsSeries = Object.keys(filteredData).map(dbms => ({
      label: dbms,
      data: filteredMonths.map(month => {
        const entry = filteredData[dbms].find(e => e.month === month);
        return entry ? entry.total_bugs : 0;
      }),
      curve: 'linear',
      showMark: true,
      markSize: 5,
      color: getColorForDBMS(dbms),
    }));

    const totalBugsData = filteredMonths.map(month => {
      return Object.values(filteredData).reduce((sum, data) => {
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
        lineStyle: { strokeWidth: 2, strokeDasharray: '5 5' },
      },
    ].filter(s => s.data.some(d => d > 0));

    const maxValue = Math.max(...series.flatMap(s => s.data));

    return { months: filteredMonths, series, maxValue };
  }, [dbmsMonthlyData, selectedDBMS, fromMonth, toMonth]);

  return (
    <Box sx={{pb: 3, px: 3, bgcolor: '#f0f4f8', minHeight: '100vh' }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <StyledCard>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5" fontWeight="bold" color="#1976d2">
                Database Summary Dashboard
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Table View"><IconButton onClick={() => setViewMode('table')} sx={{ color: viewMode === 'table' ? '#1976d2' : 'gray' }}><TableChartOutlinedIcon /></IconButton></Tooltip>
                <Tooltip title="Bar Chart"><IconButton onClick={() => setViewMode('bar')} sx={{ color: viewMode === 'bar' ? '#1976d2' : 'gray' }}><InsertChartOutlinedOutlinedIcon /></IconButton></Tooltip>
                <Tooltip title="Trend Analysis"><IconButton onClick={() => setViewMode('line')} sx={{ color: viewMode === 'line' ? '#1976d2' : 'gray' }}><TimelineOutlinedIcon /></IconButton></Tooltip>
              </Box>
            </CardContent>
          </StyledCard>
        </Grid>

        <Grid item xs={12}>
          {isLoading ? (
            <StyledCard><CardContent><Typography variant="body1" align="center" color="textSecondary">Loading...</Typography></CardContent></StyledCard>
          ) : (
            <StyledCard>
              <CardContent>
                {viewMode === 'table' && (
                  <>
                    <Typography variant="h6" gutterBottom color="#424242">Summary Table</Typography>
                    <MaterialReactTable table={table} />
                  </>
                )}
                {viewMode === 'bar' && (
                  <>
                    <Typography variant="h6" gutterBottom color="#424242">Issues by DBMS (Bar Chart)</Typography>
                    <BarChart dataset={dbmsSummaryData} series={addLabels([{ dataKey: 'open_count', stack: 'total' }, { dataKey: 'fixed_count', stack: 'total' }])} xAxis={[{ scaleType: 'band', dataKey: 'dbms' }]} slotProps={{ legend: { hidden: true } }} height={400} />
                  </>
                )}
                {viewMode === 'line' && (
                  <>
                    <Typography variant="h6" gutterBottom color="#424242">Trend Analysis (Line Chart)</Typography>
                    <Box sx={{ mb: 3 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}>
                          <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                              label="From Month"
                              views={['year', 'month']}
                              value={fromMonth}
                              onChange={setFromMonth}
                              maxDate={toMonth}
                              slotProps={{ textField: { size: 'small', fullWidth: true } }}
                            />
                          </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                              label="To Month"
                              views={['year', 'month']}
                              value={toMonth}
                              onChange={setToMonth}
                              minDate={fromMonth}
                              slotProps={{ textField: { size: 'small', fullWidth: true } }}
                            />
                          </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<ClearIcon />}
                            onClick={handleResetMonths}
                            fullWidth
                            sx={{ height: '40px' }}
                          >
                            Reset
                          </Button>
                        </Grid>
                      </Grid>
                      <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {Object.keys(dbmsMonthlyData).map(dbms => (
                          <StyledChip
                            key={dbms}
                            label={dbms}
                            selected={selectedDBMS.includes(dbms)}
                            onClick={() => handleDBMSClick(dbms)}
                            sx={{ backgroundColor: selectedDBMS.includes(dbms) ? getColorForDBMS(dbms) : undefined }}
                          />
                        ))}
                      </Box>
                    </Box>
                    <LineChart
                      xAxis={[{ 
                        scaleType: 'point', 
                        data: lineChartData.months, 
                        label: 'Month', 
                        valueFormatter: value => dayjs(value).format('MMM YYYY'), 
                        tickLabelStyle: { angle: 45, textAnchor: 'start', fontSize: 12 }, 
                        labelStyle: { fontSize: 14, transform: 'translateY(20px)' } 
                      }]}
                      yAxis={[{ 
                        label: 'Number of Bugs', 
                        max: Math.ceil(lineChartData.maxValue * 1.1), 
                        valueFormatter: value => value.toLocaleString() 
                      }]}
                      series={lineChartData.series}
                      height={550}
                      margin={{ top: 60, right: 140, bottom: 90, left: 70 }}
                      grid={{ horizontal: true }}
                      tooltip={{ 
                        trigger: 'item', 
                        formatter: ({ series, dataIndex }) => `${series.label}<br>${dayjs(lineChartData.months[dataIndex]).format('MMMM YYYY')}: ${series.data[dataIndex].toLocaleString()} bugs` 
                      }}
                      slotProps={{ legend: { position: { vertical: 'top', horizontal: 'right' }, padding: 0, labelStyle: { fontSize: 12 } } }}
                    />
                  </>
                )}
              </CardContent>
            </StyledCard>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

export default SummaryPage;
