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
  dbms: z.string(),
  status: z.enum(['Open', 'Closed', 'Fixed', 'Not a bug']),
});

function getPromptAndResponseFormat(issue, comments) {
  const prompt = `Analyze the following GitHub issue and determine if it is a bug found by SQLancer.

Classify the issue as one of the following:
- Open: Bug found by SQLancer but not yet fixed.
- Closed: Issue was closed without a fix.
- Fixed: Bug found by SQLancer and has been resolved.
- Not a bug: Issue was not a bug found by SQLancer (e.g., not SQLancer-related, intended behavior, etc.).

Title: ${issue.title}
Description: ${issue.body}
Labels: ${issue.labels.map(label => label.name).join(', ')}

Comments:
${comments.map(comment => comment.body).join('\n\n')}`

  return { prompt, responseFormat: zodResponseFormat(BugReport, 'bug_report') };
}

async function callOpenAIWithStructuredOutput(content, responseFormat) {
  const completion = await openai.beta.chat.completions.parse({
    model: 'gpt-4o',
    temperature: 0.2, // Reduce randomness
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

async function fetchGitHubIssues() {
  const response = await octokit.rest.search.issuesAndPullRequests({
    q: 'sqlancer is:issue',
    sort: 'created',
    order: 'desc',
    per_page: 30,
  });

  return await Promise.all(
    response.data.items.map(async issue => {
      const [owner, repo] = issue.repository_url.split('/').slice(-2);
      const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: issue.number,
      });

      const { prompt, responseFormat } = getPromptAndResponseFormat(issue, comments);
      const bugReport = await callOpenAIWithStructuredOutput(prompt, responseFormat);

      return {
        creator: issue.user.login,
        title: issue.title,
        description: issue.body,
        dbms: bugReport.dbms,
        status: bugReport.status,
        html_url: issue.html_url,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
      };
    })
  );
}

// Routes
app.get('/statuses', (req, res) => {
  res.json({ statuses: BugReport.shape.status.options });
});

app.get('/github_issues', async (req, res) => {
  try {
    const result = await db.pool.query('SELECT * FROM cs3213_issues ORDER BY created_at DESC');

    if (result.rowCount) {
      return res.json({ issues: result.rows });
    }

    const newIssues = await fetchGitHubIssues();
    const savedIssues = await db.saveIssuesUsingCopy(newIssues);

    res.json({ issues: savedIssues });
  } catch (error) {
    console.error('Error fetching issues from database:', error);
    res.status(500).json({ error: 'Failed to fetch issues from the database.' });
  }
});

// Return databases with open issues and the number of open issues
app.get('/dbms_summary_data', async (req, res) => {
  try {
    const result = await db.pool.query("SELECT dbms, COUNT(CASE WHEN status != 'Not a bug' THEN 1 END) AS total_count, COUNT(CASE WHEN status = 'Open' THEN 1 END) AS open_count, COUNT(CASE WHEN status = 'Fixed' THEN 1 END) AS fixed_count FROM cs3213_issues WHERE dbms NOT IN ('N/A', '') GROUP BY dbms;");

    if (result.rowCount) {
      return res.json(result.rows);
    }
  } catch (error) {
    console.error('Error fetching issues from database:', error);
    res.status(500).json({ error: 'Failed to fetch issues from the database.' });
  }
});

app.put('/issue/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { dbms, status } = req.body;

    const result = await db.pool.query(
      'UPDATE cs3213_issues SET dbms = $1, status = $2 WHERE id = $3',
      [dbms, status, id]
    );

    if (result.rowCount) {
      return res.status(204).send();
    }

    res.status(404).json({ error: 'Issue not found' });
  } catch (error) {
    console.error('Error updating issue:', error);
    res.status(500).json({ error: 'Failed to update issue' });
  }
});

// Delete an issue given its id
app.delete('/issue/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.pool.query('DELETE FROM cs3213_issues WHERE id = $1', [id]);

    if (result.rowCount) {
      return res.status(204).send();
    }

    res.status(404).json({ error: 'Issue not found' });
  } catch (error) {
    console.error('Error deleting issue:', error);
    res.status(500).json({ error: 'Failed to delete issue' });
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
