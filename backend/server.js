import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import * as db from './db.js';
import { BugReport } from './schemas/bug-report-schema.js';
import { fetchUpdatedGitHubIssues } from './services/github-issues.js';
import { classifyGitHubIssues } from './services/classify-github-issues.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON
app.use(express.json());

// Enable CORS for all requests
app.use(cors());

db.initializeDatabase();

// Routes
app.get('/dbms', (req, res) => {
  res.json({ dbms: BugReport.shape.dbms.options });
});

app.get('/oracles', (req, res) => {
  res.json({ oracles: BugReport.shape.oracle.options });
});

app.get('/statuses', (req, res) => {
  res.json({ statuses: BugReport.shape.status.options });
});

app.get('/issues', async (req, res) => {
  try {
    const issues = await db.getAllGitHubIssues();
    res.json({ issues });
  } catch (error) {
    console.error('Error fetching GitHub issues from database:', error);
    res.status(500).json({ error: 'Failed to fetch GitHub issues from the database.' });
  }
});

app.post('/issues/refresh', async (req, res) => {
  try {
    const latestUpdatedAt = await db.getMetadata('latest_updated_at');
    let issues = await fetchUpdatedGitHubIssues(latestUpdatedAt);
    issues = await classifyGitHubIssues(issues);

    const { newIssues, updatedIssues } =
      await db.processAndSaveGitHubIssues(issues, latestUpdatedAt);

    res.json({ newIssues, updatedIssues });
  } catch (error) {
    console.error('Error fetching recently updated issues from GitHub:', error);
    res.status(500).json({ error: 'Failed to fetch recently updated issues from GitHub.' });
  }
});

app.put('/issue/:id', async (req, res) => {
  try {
    const rowCount = await db.updateGitHubIssue(req.params.id, req.body);

    if (rowCount) {
      return res.sendStatus(204);
    }

    res.status(404).json({ error: 'Issue not found' });
  } catch (error) {
    console.error('Error updating issue:', error);
    res.status(500).json({ error: 'Failed to update issue' });
  }
});

app.delete('/issues', async (req, res) => {
  try {
    const rowCount = await db.deleteGitHubIssues(req.body.ids);

    if (rowCount) {
      return res.sendStatus(204);
    }

    res.status(404).json({ error: 'Issue(s) not found' });
  } catch (error) {
    console.error('Error deleting issues:', error);
    res.status(500).json({ error: 'Failed to delete issues' });
  }
});

app.get('/sqlancer-bug-reports', async (req, res) => {
  try {
    const bugReports = await db.getSqlancerBugReports();
    res.json({ bugReports });
  } catch (error) {
    console.error('Error fetching SQLancer bug reports from database:', error);
    res.status(500).json({ error: 'Failed to fetch SQLancer bug reports from the database.' });
  }
});

app.put('/sqlancer-bug-reports/:id', async (req, res) => {
  try {
    const rowCount = await db.updateSqlancerBugReport(req.params.id, req.body);

    if (rowCount) {
      return res.sendStatus(204);
    }

    res.status(404).json({ error: 'Bug report not found' });
  } catch (error) {
    console.error('Error updating bug report:', error);
    res.status(500).json({ error: 'Failed to update bug report' });
  }
});

app.delete('/sqlancer-bug-reports', async (req, res) => {
  try {
    const rowCount = await db.deleteSqlancerBugReports(req.body.ids);

    if (rowCount) {
      return res.sendStatus(204);
    }

    res.status(404).json({ error: 'Bug report(s) not found' });
  } catch (error) {
    console.error('Error deleting bug reports:', error);
    res.status(500).json({ error: 'Failed to delete bug reports' });
  }
});

// Return databases with open issues and the number of open issues
app.get('/dbms-summary-data', async (req, res) => {
  try {
    const summaryData = await db.getDbmsSummaryData();
    res.json(summaryData);
  } catch (error) {
    console.error('Error fetching DBMS summary data:', error);
    res.status(500).json({ error: 'Failed to fetch DBMS summary data.' });
  }
});

app.get('/dbms-monthly-data', async (req, res) => {
  try {
    // Get the earliest and latest months to fill in gaps
    const { startMonth, endMonth } = await db.getDbmsMonthRange();

    // Get the bug counts
    const monthlyCounts = await db.getDbmsMonthlyCounts();

    // Generate all months between start and end
    const months = [];
    let currentMonth = new Date(startMonth);
    while (currentMonth <= endMonth) {
      months.push(new Date(currentMonth));
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    // Organize data by DBMS
    const dbmsSet = new Set(monthlyCounts.map(({ dbms }) => dbms));

    // Initialize each DBMS with total bugs for all months set to 0
    const monthlyData = {};
    dbmsSet.forEach(dbms => {
      monthlyData[dbms] = months.map(month => ({
        month: month.toISOString().slice(0, 7),
        total_bugs: 0
      }));
    });

    // Fill in actual bug counts
    monthlyCounts.forEach(({ dbms, month, total_bugs }) => {
      const monthStr = month.toISOString().slice(0, 7);
      const dbmsData = monthlyData[dbms];
      const monthEntry = dbmsData.find(entry => entry.month === monthStr);
      if (monthEntry) {
        monthEntry.total_bugs = parseInt(total_bugs);
      }
    });

    res.json(monthlyData);
  } catch (error) {
    console.error('Error fetching DBMS monthly data:', error);
    res.status(500).json({ error: 'Failed to fetch DBMS monthly data.' });
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
