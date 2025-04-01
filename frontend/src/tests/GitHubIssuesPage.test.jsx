// Test cases for GitHubIssuesPage.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import GitHubIssuesPage from '../pages/GitHubIssuesPage';

// Create a mock instance of axios
const mock = new MockAdapter(axios);

const mockDbms = ['MySQL', 'PostgreSQL', 'TiDB'];
const mockOracles = ['Oracle1', 'Oracle2'];
const mockStatuses = ['Open', 'Fixed', 'Closed', 'Not a bug'];

// Mock response for issues
const mockIssues = {
  "issues": [
    {
      id: '1',
      creator: 'Test creator 1',
      title: 'Test Issue 1',
      description: 'Test description',
      dbms: 'MySQL',
      status: 'Open',
      html_url: 'https://github.com/test/issue/1',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z',
    },
    {
      id: '2',
      creator: 'Test creator 2',
      title: 'Test Issue 2',
      description: 'Another test description',
      dbms: 'PostgreSQL',
      status: 'Closed',
      html_url: 'https://github.com/test/issue/2',
      created_at: '2025-01-03T00:00:00Z',
      updated_at: '2025-01-04T00:00:00Z',
    },
  ],
};

beforeEach(() => {
  // Mock data
  mock.onGet('http://localhost:5000/dbms').reply(200, { mockDbms });
  mock.onGet('http://localhost:5000/oracles').reply(200, { mockOracles });
  mock.onGet('http://localhost:5000/statuses').reply(200, mockStatuses);
  mock.onGet('http://localhost:5000/issues').reply(200, mockIssues);
});

afterEach(() => {
  mock.reset(); // Reset mock after each test
});

test('Test Issues Page', async () => {
  render(<GitHubIssuesPage />);

  // Wait for table to load
  await waitFor(() => {
    expect(screen.getByText('Test Issue 1')).toBeInTheDocument();
  });

  // Check if the data exists
  expect(screen.getByText('Test Issue 1')).toBeInTheDocument();
  expect(screen.getByText('MySQL')).toBeInTheDocument();
  expect(screen.getByText('Open')).toBeInTheDocument();

  expect(screen.getByText('Test Issue 2')).toBeInTheDocument();
  expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
  expect(screen.getByText('Closed')).toBeInTheDocument();
});

test('Test Expand All Description Button', async () => {
  render(<GitHubIssuesPage />);

  // Wait for table to load
  await waitFor(() => {
    expect(screen.getByText('Test Issue 1')).toBeInTheDocument();
  });

  // Find toggle button
  const expandAllButton = screen.getByRole('button', { name: /Expand all/i });
  expect(expandAllButton).toBeInTheDocument();

  // Expand description
  fireEvent.click(expandAllButton);

  // Check if the data exists
  expect(screen.getByText('Test Issue 1')).toBeInTheDocument();
  expect(screen.getByText('Test description')).toBeInTheDocument();
  expect(screen.getByText('MySQL')).toBeInTheDocument();
  expect(screen.getByText('Open')).toBeInTheDocument();

  expect(screen.getByText('Test Issue 2')).toBeInTheDocument();
  expect(screen.getByText('Another test description')).toBeInTheDocument();
  expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
  expect(screen.getByText('Closed')).toBeInTheDocument();
});

test('Test Edit Issue', async () => {
  mock.onPut('http://localhost:5000/issue/1').reply(200);

  render(<GitHubIssuesPage />);

  // Wait for table to load
  await waitFor(() => {
    expect(screen.getByText('Test Issue 1')).toBeInTheDocument();
  });

  // Find edit button
  const editButtons = screen.getAllByTestId('EditIcon');
  fireEvent.click(editButtons[0]);

  await waitFor(() => {
    // Verify edit mode is active
    expect(screen.getByTestId('CancelIcon')).toBeInTheDocument();
    expect(screen.getByTestId('SaveIcon')).toBeInTheDocument();
  });

  // Submit the changes
  const saveButton = screen.getByTestId('SaveIcon');
  fireEvent.click(saveButton);

  // Verify API call
  await waitFor(() => {
    expect(mock.history.put.length).toBe(1);
    expect(mock.history.put[0].url).toBe('http://localhost:5000/issue/1');
  });
});

test('Test Delete Issue 1', async () => {
  mock.onDelete('http://localhost:5000/issues').reply(200);
  render(<GitHubIssuesPage />);

  // Wait for table to load
  await waitFor(() => {
    expect(screen.getByText('Test Issue 1')).toBeInTheDocument();
  });

  // Find delete button for first row
  const deleteButtons = screen.getAllByTestId('DeleteIcon');
  fireEvent.click(deleteButtons[1]);

  // Wait for dialog to load
  await waitFor(() => {
    expect(screen.getByText('Delete bug report?')).toBeInTheDocument();
    expect(screen.getByText('This bug report will be permanently deleted.')).toBeInTheDocument();
  });

  // Click confirm button
  const confirmButton = screen.getByRole('button', { name: /ok/i });
  fireEvent.click(confirmButton);

  // Check if data in table is correct
  await waitFor(() => {
    expect(mock.history.delete.length).toBe(1);
    const deleteCall = mock.history.delete[0];
    expect(deleteCall.url).toBe('http://localhost:5000/issues');
    expect(JSON.parse(deleteCall.data)).toEqual({ ids: ['1'] });
    expect(screen.queryByText('Test Issue 1')).not.toBeInTheDocument();
  });
});

test('Test Delete All Issue', async () => {
  mock.onDelete('http://localhost:5000/issues').reply(200);
  render(<GitHubIssuesPage />);

  // Wait for table to load
  await waitFor(() => {
    expect(screen.getByText('Test Issue 1')).toBeInTheDocument();
  });

  // Select all issues
  const selectAllCheckbox = screen.getByRole('checkbox', {
    name: /toggle select all/i
  });

  // Verify initial state
  expect(selectAllCheckbox).not.toBeChecked();

  // Click the checkbox
  fireEvent.click(selectAllCheckbox);

  // Verify new state
  expect(selectAllCheckbox).toBeChecked();

  // Find delete button
  const deleteButtons = screen.getAllByTestId('DeleteIcon');
  fireEvent.click(deleteButtons[0]);

  // Wait for dialog to load
  await waitFor(() => {
    expect(screen.getByText('Delete 2 bug reports?')).toBeInTheDocument();
    expect(screen.getByText('2 bug reports will be permanently deleted.')).toBeInTheDocument();
  });

  // Click confirm button
  const confirmButton = screen.getByRole('button', { name: /ok/i });
  fireEvent.click(confirmButton);

  // Check if data in table is correct
  await waitFor(() => {
    expect(mock.history.delete.length).toBe(1);
    const deleteCall = mock.history.delete[0];
    expect(deleteCall.url).toBe('http://localhost:5000/issues');
    expect(JSON.parse(deleteCall.data)).toEqual({ ids: ['1', '2'] });
    expect(screen.queryByText('Test Issue 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Issue 2')).not.toBeInTheDocument();
  });
});

test('Test View HTML URL Issue 1', async () => {
  const originalOpen = window.open;
  window.open = vi.fn();

  render(<GitHubIssuesPage />);

  // Wait for table to load
  await waitFor(() => {
    expect(screen.getByText('Test Issue 1')).toBeInTheDocument();
  });

  // Find open in new button for first row
  const viewButtons = screen.getAllByTestId('OpenInNewIcon');
  fireEvent.click(viewButtons[0]);

  // Wait for view html url in new window
  await waitFor(() => {
    expect(window.open).toHaveBeenCalledWith(
      'https://github.com/test/issue/1',
      '_blank'
    );
  });

  window.open = originalOpen;
});

test('Test Refresh', async () => {
  const newIssues = [
    {
      id: '3',
      creator: 'Test creator 3',
      title: 'Test Issue 3',
      description: 'Test description',
      dbms: 'TiDB',
      oracle: "Oracle1",
      status: 'Open',
      html_url: 'https://github.com/test/issue/3',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z',
    }
  ];

  const updatedIssues = [
    {
      id: '2',
      creator: 'Updated creator 2',
      title: 'Updated Issue 2',
      description: 'Updated description',
      dbms: 'TiDB',
      oracle: "Oracle2",
      status: 'Open',
      html_url: 'https://github.com/test/issue/2',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z',
    }
  ];

  mock.onPost('http://localhost:5000/issues/refresh').reply(200, {
    newIssues,
    updatedIssues
  });

  render(<GitHubIssuesPage />);

  // Wait for table to load
  await waitFor(() => {
    expect(screen.getByText('Test Issue 1')).toBeInTheDocument();
  });

  // Find refresh button
  const refreshButton = screen.getByTestId('RefreshIcon');
  fireEvent.click(refreshButton);

  // Wait for refresh
  await waitFor(() => {
    expect(mock.history.post.length).toBe(1);
    expect(mock.history.post[0].url).toBe('http://localhost:5000/issues/refresh');
  });

  // Check if data in table is correct
  await waitFor(() => {
    expect(screen.getByText('Test Issue 3')).toBeInTheDocument();
    expect(screen.queryByText('Test Issue 2')).not.toBeInTheDocument();
    expect(screen.getByText('Updated Issue 2')).toBeInTheDocument();
  });
});