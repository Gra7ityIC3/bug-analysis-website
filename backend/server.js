import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import * as db from './db.js';
import { Octokit } from '@octokit/rest';

import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const openai = new OpenAI();
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON
app.use(express.json());

// Enable CORS for all requests
app.use(cors());

db.initializeDatabase();

const BugReport = z.object({
  dbms: z.enum([
    'Citus', 'ClickHouse', 'CnosDB', 'CockroachDB', 'Databend', 'DataFusion',
    'Doris', 'DuckDB', 'H2', 'HSQLDB', 'MariaDB', 'Materialize', 'MySQL',
    'OceanBase', 'PostgreSQL', 'Presto', 'QuestDB', 'SQLite3', 'TiDB', 'YugabyteDB',
    'ArangoDB', 'Cosmos', 'MongoDB', 'StoneDB', // Previously supported DBMSs
    'N/A',
  ]),
  // Oracle values obtained from:
  // https://github.com/sqlancer/bugs/blob/7a1e9edcaa63b04408c96b12777141485da3c714/bugs.py#L38-L44
  oracle: z.enum([
    'PQS',
    'error',
    'crash',
    'NoREC',
    'hang',
    'TLP (aggregate)',
    'TLP (HAVING)',
    'TLP (WHERE)',
    'TLP (GROUP BY)',
    'TLP (DISTINCT)',
    'N/A',
  ]),
  status: z.enum(['Open', 'Fixed', 'Closed', 'Not a bug']),
});

function getPromptAndResponseFormat(issue, comments, owner, repo) {
  const prompt = `Your task is to analyze a GitHub issue to determine whether it is a bug found by SQLancer and extract the following fields:

DBMS: Identify the DBMS the issue is associated with based on the repository or issue details.
This should be one of the DBMSs supported by SQLancer, or "N/A" otherwise.

Oracle: If the issue is a bug found by SQLancer, identify the test oracle used to find the bug. Otherwise, it should be "N/A".

Status: Classify the issue into one of the following statuses:

- Not a bug: The issue is not a bug found by SQLancer (e.g., it is unrelated to SQLancer, expected behavior, or a feature request).
- Open: The issue is a bug found by SQLancer that has not yet been fixed.
- Fixed: The issue is a bug found by SQLancer that has been resolved.
- Closed: The issue is a bug found by SQLancer that was closed without being fixed.

Now, extract the appropriate values based on the following issue:

Repository: ${owner}/${repo}
State: ${issue.state}${issue.state_reason ? ` (${issue.state_reason})` : ''}
Title: ${issue.title}
Labels: ${issue.labels.map(label => label.name).join(', ')}

Description:
${issue.body}

Comments:
${comments.map(comment => comment.body).join('\n\n')}`

  return { prompt, responseFormat: zodResponseFormat(BugReport, 'bug_report') };
}

async function callOpenAIWithStructuredOutput(content, responseFormat) {
  const completion = await openai.beta.chat.completions.parse({
    model: 'gpt-4o-mini', // GPT-4o would exceed the TPM limit even at tier 3.
    temperature: 0.2, // Lower values make responses more focused and deterministic.
    messages: [
      {
        role: 'system',
        content: 'You are an AI assistant specialized in analyzing GitHub issues for bugs found by SQLancer.'
      },
      { role: 'user', content: content },
    ],
    response_format: responseFormat
  });

  return completion.choices[0].message.parsed;
}

async function fetchPaginatedGitHubIssues(query) {
  return await octokit.paginate(octokit.rest.search.issuesAndPullRequests, {
    q: query,
    sort: 'updated',
    order: 'desc',
    per_page: 100,
  });
}

async function fetchAllGitHubIssues() {
  const allIssues = [];
  let lastUpdatedAt = null;

  while (true) {
    let query = 'sqlancer is:issue';
    if (lastUpdatedAt) {
      query += ` updated:<${lastUpdatedAt}`;
    }

    const issues = await fetchPaginatedGitHubIssues(query);
    if (!issues.length) break;

    allIssues.push(...issues);
    lastUpdatedAt = issues[issues.length - 1].updated_at;
  }

  return allIssues;
}

async function fetchUpdatedGitHubIssues(latestUpdatedAt) {
  const query = `sqlancer is:issue updated:>${latestUpdatedAt}`;
  return await fetchPaginatedGitHubIssues(query);
}

async function classifyGitHubIssues(issues) {
  return await Promise.all(
    issues.map(async issue => {
      const [owner, repo] = issue.repository_url.split('/').slice(-2);
      const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: issue.number,
      });

      const { prompt, responseFormat } = getPromptAndResponseFormat(issue, comments, owner, repo);
      const bugReport = await callOpenAIWithStructuredOutput(prompt, responseFormat);

      return {
        creator: issue.user.login,
        title: issue.title,
        description: issue.body,
        dbms: bugReport.dbms,
        oracle: bugReport.oracle,
        status: bugReport.status,
        html_url: issue.html_url,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
      };
    })
  );
}

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

app.post('/issues', async (req, res) => {
  try {
    const allIssues = await fetchAllGitHubIssues();
    const classifiedIssues = await classifyGitHubIssues(allIssues);
    const savedIssues = await db.saveIssuesUsingCopy(classifiedIssues);

    res.json({ issues: savedIssues });
  } catch (error) {
    console.error('Error fetching issues from GitHub:', error);
    res.status(500).json({ error: 'Failed to fetch issues from GitHub.' });
  }
});

app.post('/issues/refresh', async (req, res) => {
  try {
    const latestUpdatedAt = await db.getMetadata('latest_updated_at');
    const issues = await fetchUpdatedGitHubIssues(latestUpdatedAt);
    const classifiedIssues = await classifyGitHubIssues(issues);

    const { newIssues, updatedIssues } =
      await db.processAndSaveIssues(classifiedIssues, latestUpdatedAt);

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
