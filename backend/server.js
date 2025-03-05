import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import { Octokit } from '@octokit/rest';
import fs from 'fs/promises'

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

const { Pool } = pkg;

// PostgreSQL Database connection
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false,  // Required for Heroku
//   },
// });

// pool.connect()
//   .then(() => console.log('Connected to PostgreSQL database.'))
//   .catch(err => console.error('Error connecting to PostgreSQL:', err.message));

const BugReport = z.object({
  dbms: z.string(),
  status: z.enum(["Open", "Closed", "Fixed", "Not a bug"]),
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
Labels: ${issue.labels.map(label => label.name).join(", ")}

Comments:
${comments.map(comment => comment.body).join("\n\n")}`

  return { prompt, responseFormat: zodResponseFormat(BugReport, "bug_report") };
}

async function callOpenAIWithStructuredOutput(content, responseFormat) {
  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o",
    temperature: 0.2, // Reduce randomness
    messages: [
      {
        role: "system",
        content: "You are an AI assistant specialized in analyzing GitHub issues for bugs found by SQLancer."
      },
      { role: "user", content: content },
    ],
    response_format: responseFormat
  });

  return completion.choices[0].message.parsed;
}

async function fetchGitHubIssues() {
  const response = await octokit.rest.search.issuesAndPullRequests({
    q: "sqlancer is:issue",
    sort: "created",
    order: "desc",
    per_page: 20,
  });

  return await Promise.all(
    response.data.items.map(async issue => {
      const [owner, repo] = issue.repository_url.split("/").slice(-2);
      const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: issue.number,
      });

      const { prompt, responseFormat } = getPromptAndResponseFormat(issue, comments);
      const bugReport = await callOpenAIWithStructuredOutput(prompt, responseFormat);

      return {
        title: issue.title,
        description: issue.body,
        dbms: bugReport.dbms,
        status: bugReport.status,
        created_at: issue.created_at,
        link: issue.html_url,
      };
    })
  );
}

// Routes
app.get("/github_issues", async (req, res) => {
  try {
    // temporary file storage until cloud database is set up
    fs.readFile('issues.json', 'utf-8')
      .then(data => res.json({ issues: JSON.parse(data) }))
      .catch(async () => {
        const issues = await fetchGitHubIssues();
        await fs.writeFile('issues.json', JSON.stringify(issues, null, 2), 'utf-8');
        res.json({ issues });
      });
  } catch (error) {
    console.error("Error fetching GitHub API:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch issues from GitHub API" });
  }
});

// Get all issues
app.get('/issues', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM issues');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new issue
app.post('/issue', async (req, res) => {
  try {
    const { title, description, date } = req.body;
    const result = await pool.query(
      'INSERT INTO issues (title, description, date) VALUES ($1, $2, $3) RETURNING id',
      [title, description, date]
    );

    res.status(201).json({ id: result.rows[0].id, title, description, date });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an issue given its id
app.delete('/issue/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM issues WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json({ message: 'Issue deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
