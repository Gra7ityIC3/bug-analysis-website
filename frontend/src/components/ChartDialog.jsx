import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import dayjs from 'dayjs';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';

const MAX_DBMS_SELECTION = 5;

const MENU_ITEM_HEIGHT = 54;
const MENU_PADDING_TOP = 8;

const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: MENU_ITEM_HEIGHT * MAX_DBMS_SELECTION + MENU_PADDING_TOP,
    },
  },
};

const chartConfig = {
  dbms: {
    yAxisKey: 'dbms',
    series: [
      { dataKey: 'open_count', label: 'Open', stack: 'status' },
      { dataKey: 'fixed_count', label: 'Fixed', stack: 'status' },
      { dataKey: 'closed_count', label: 'Closed', stack: 'status' },
    ],
    marginLeft: 90,
  },
  oracle: {
    yAxisKey: 'oracle',
    series: [
      { dataKey: 'open_count', label: 'Open', stack: 'oracle' },
      { dataKey: 'fixed_count', label: 'Fixed', stack: 'oracle' },
      { dataKey: 'closed_count', label: 'Closed', stack: 'oracle' },
    ],
    marginLeft: 110,
  },
  status: {
    yAxisKey: 'status',
    series: [
      { dataKey: 'total_count', label: 'Total' },
    ],
    marginLeft: 70,
  },
};

export default function ChartDialog({ open, onClose, datasets }) {
  const [selectedField, setSelectedField] = useState('dbms');
  const [selectedDbmsList, setSelectedDbmsList] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const dates = useMemo(
    () => datasets.datePosted.map(item => dayjs(item.date)),
    [datasets.datePosted]
  );

  const dbmsList = useMemo(
    () => datasets.dbms.map(item => item.dbms),
    [datasets.dbms]
  );

  const filteredDataset = useMemo(() => {
    const dataset = datasets.datePosted;

    const start = dataset.findIndex(item => item.date >= startDate);
    const end = dataset.findLastIndex(item => item.date <= endDate);

    return dataset.slice(start, end + 1);
  }, [datasets.datePosted, startDate, endDate]);

  useEffect(() => {
    if (open) {
      setSelectedField('dbms');
      setSelectedDbmsList(dbmsList.slice(0, MAX_DBMS_SELECTION));
      setStartDate(dates[0]);
      setEndDate(dates.at(-1));
    }
  }, [open, dbmsList, dates]);

  const config = chartConfig[selectedField];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel id="chart-field-label">Field</InputLabel>
            <Select
              labelId="chart-field-label"
              value={selectedField}
              label="Field"
              onChange={(e) => setSelectedField(e.target.value)}
            >
              <MenuItem value="dbms">DBMS</MenuItem>
              <MenuItem value="oracle">Oracle</MenuItem>
              <MenuItem value="status">Status</MenuItem>
              <MenuItem value="datePosted">Date Posted</MenuItem>
            </Select>
          </FormControl>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Start date"
              openTo="month"
              views={['year', 'month']}
              value={startDate}
              onChange={setStartDate}
              minDate={dates[0]}
              maxDate={endDate}
              disabled={selectedField !== 'datePosted'}
            />

            <DatePicker
              label="End date"
              openTo="month"
              views={['year', 'month']}
              value={endDate}
              onChange={setEndDate}
              minDate={startDate}
              maxDate={dates.at(-1)}
              disabled={selectedField !== 'datePosted'}
            />
          </LocalizationProvider>

          <FormControl sx={{ minWidth: 250 }}>
            <InputLabel id="dbms-select-label">Select DBMS</InputLabel>
            <Select
              labelId="dbms-select-label"
              multiple
              value={selectedDbmsList}
              onChange={(e) => setSelectedDbmsList(e.target.value)}
              input={<OutlinedInput label="Select DBMS" />}
              renderValue={(selected) => `${selected.length} DBMS selected`}
              disabled={selectedField !== 'datePosted'}
              MenuProps={MenuProps}
            >
              {dbmsList.map((dbms) => {
                const isSelected = selectedDbmsList.includes(dbms);
                const disabled = !isSelected && selectedDbmsList.length === MAX_DBMS_SELECTION;

                return (
                  <MenuItem key={dbms} value={dbms} disabled={disabled}>
                    <Checkbox checked={isSelected} disabled={disabled}/>
                    <ListItemText
                      primary={dbms}
                      slotProps={{
                        primary: {
                          color: disabled ? 'text.disabled' : 'text.primary',
                        },
                      }}
                    />
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ width: '100%', height: 600, mt: 2 }}>
          {selectedField === 'datePosted' ? (
            <LineChart
              dataset={filteredDataset}
              xAxis={[
                {
                  dataKey: 'date',
                  scaleType: 'time',
                  valueFormatter: (date) => format(date, 'MMM yyyy'),
                  tickInterval: dates,
                }
              ]}
              yAxis={[{ tickMinStep: 1 }]}
              series={
                selectedDbmsList.map(dbms => ({
                  dataKey: dbms,
                  label: dbms,
                  showMark: false,
                }))
              }
              slotProps={{
                noDataOverlay: { message: 'Select at least 1 DBMS to display the chart.' },
              }}
            />
          ) : (
            <BarChart
              dataset={datasets[selectedField]}
              yAxis={[{ scaleType: 'band', dataKey: config.yAxisKey }]}
              xAxis={[{ scaleType: 'linear', tickMinStep: 1 }]}
              series={config.series}
              layout="horizontal"
              barLabel={selectedField === 'status' ? 'value' : undefined}
              margin={{ bottom: 20, left: config.marginLeft }}
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
