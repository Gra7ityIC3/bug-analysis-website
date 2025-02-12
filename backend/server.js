require('dotenv').config();
const express = require('express');
const cors = require("cors");
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON
app.use(bodyParser.json());
// app.use(express.json());
// Enable CORS for all requests
app.use(cors());

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
    return;
  }
  console.log('Connected to MySQL database.');
});

// Routes
app.get("/github_issues", async (req, res) => {
  const { datetime } = req.query; // Expected format: "2025-02-01T00:00:00Z"

  if (!datetime) {
    return res.status(400).json({ error: "Missing datetime parameter" });
  }

  // GitHub API base URL
  const GITHUB_SEARCH_URL = "https://api.github.com/search/issues?q=SQLancer&sort=created&order=desc";

  try {
    //const response = await 
    axios.get(GITHUB_SEARCH_URL)
    .then((response) => {
        // Extract relevant issue data
        const issues = response.data.items
        .filter(issue => new Date(issue.created_at) > new Date(datetime)) // Filter by datetime
        .map(issue => ({
            title: issue.title,
            link: issue.html_url,
            created_at: issue.created_at,
            closed_at: issue.closed_at,
            state: issue.state,
            body: issue.body
        }));

        res.json({ issues: issues });
    })
  } catch (error) {
    console.error("Error fetching GitHub API:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch issues from GitHub API" });
  }
});

// Get all issues
app.get('/issues', async (req, res) => {
  try {
    const [issues] = await db.query('SELECT * FROM issues');
    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new issue
app.post('/issue', async (req, res) => {
  try {
    const { title, description, date } = req.body;
    const [result] = await db.query(
      'INSERT INTO issues (title, description, date) VALUES (?, ?, ?)',
      [title, description, date]
    );

    res.status(201).json({ id: result.insertId, title, description, date });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an issue given its id
app.delete('/issue/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM issues WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json({ message: 'Issue deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));