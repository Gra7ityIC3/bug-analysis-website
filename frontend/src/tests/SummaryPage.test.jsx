// Test cases for SummaryPage.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import SummaryPage from '../pages/SummaryPage';

// Create a mock instance of axios
const mock = new MockAdapter(axios);

// Mock response for dbms-summary-data
const mockSummaryData = [
  { dbms: 'MySQL', open_count: 100, fixed_count: 40, total_count: 140 },
  { dbms: 'PostgreSQL', open_count: 5, fixed_count: 15, total_count: 20 }
];

const mockMonthlyData = {
  MySQL: [
    { month: "2025-01", total_bugs: 5 },
    { month: "2025-02", total_bugs: 8 },
    { month: "2025-03", total_bugs: 3 }
  ],
  PostgreSQL: [
    { month: "2025-01", total_bugs: 2 },
    { month: "2025-02", total_bugs: 4 },
    { month: "2025-03", total_bugs: 7 }
  ]
};

beforeEach(() => {
  // Mock data
  mock.onGet('http://localhost:5000/dbms-summary-data').reply(200, mockSummaryData);
  mock.onGet('http://localhost:5000/dbms-monthly-data').reply(200, mockMonthlyData);
});

afterEach(() => {
  mock.reset(); // Reset mock after each test
});

test('Test Summary Table', async () => {
  render(<SummaryPage />);

  // Wait for table to load
  await waitFor(() => {
    expect(screen.getByText('MySQL')).toBeInTheDocument();
  });

  // Check if the data exists
  expect(screen.getByText('MySQL')).toBeInTheDocument();
  expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
  expect(screen.getByText('Open Issues')).toBeInTheDocument();
  expect(screen.getByText('Fixed Issues')).toBeInTheDocument();

  // Check if data in table is correct
  expect(screen.getByText('100')).toBeInTheDocument(); // MySQL open count
  expect(screen.getByText('40')).toBeInTheDocument(); // MySQL fixed count
  expect(screen.getByText('140')).toBeInTheDocument(); // MySQL total count
});

test('Test Bar Chart', async () => {
  render(<SummaryPage />);

  // Wait for initial page to load
  await waitFor(() => {
    expect(screen.getByText('Summary Table')).toBeInTheDocument();
  });

  // Find bar chart button
  const barChartButton = screen.getByRole('button', { name: /Bar Chart/i });
  expect(barChartButton).toBeInTheDocument();

  // Switch to bar chart
  fireEvent.click(barChartButton);

  // Render bar chart
  await waitFor(() => {
    expect(screen.getByText('Issues by DBMS (Bar Chart)')).toBeInTheDocument();
  });

  // Ensure that bar chart exists
  const barChart = screen.getByTestId('bar_chart');
  expect(barChart).toBeInTheDocument();

  // Check for mock data
  expect(screen.getByText('MySQL')).toBeInTheDocument();
  expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
});

test('Test Line Chart', async () => {
  render(<SummaryPage />);

  // Wait for initial page to load
  await waitFor(() => {
    expect(screen.getByText('Summary Table')).toBeInTheDocument();
  });

  // Find line chart button
  const lineChartButton = screen.getByRole('button', { name: /Trend Analysis/i });
  expect(lineChartButton).toBeInTheDocument();

  // Switch to line chart
  fireEvent.click(lineChartButton);

  // Render line chart
  await waitFor(() => {
    expect(screen.getByText('Trend Analysis (Line Chart)')).toBeInTheDocument();
  });

  // Ensure that line chart exists
  const lineChart = screen.getByTestId('line_chart');
  expect(lineChart).toBeInTheDocument();
  expect(screen.getByText('Month')).toBeInTheDocument();
  expect(screen.getByText('Number of Bugs')).toBeInTheDocument();

  // Check for mock data
  expect(screen.getAllByText('MySQL').length).toBeGreaterThan(0); // From filter and legend
  expect(screen.getAllByText('PostgreSQL').length).toBeGreaterThan(0);
  expect(screen.getByText('Jan 2025')).toBeInTheDocument();
  expect(screen.getByText('Feb 2025')).toBeInTheDocument();
  expect(screen.getByText('Mar 2025')).toBeInTheDocument();

  // Testing filters
  const postgresElements = screen.queryAllByText('PostgreSQL');
  const postgresButton = postgresElements.find(
    chip => chip.className.includes('MuiChip-label')
  );
  fireEvent.click(postgresButton);
  expect(screen.getAllByText('MySQL').length).toBe(1); // From filter only
});
