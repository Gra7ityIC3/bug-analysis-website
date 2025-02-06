require('dotenv').config();
const express = require('express');
const cors = require("cors");
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
// Enable CORS for all requests
app.use(cors());

// MongoDB connection
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/' //Add database name behind url;
mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error(err));

// Define Issue model
const IssueSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

const Issue = mongoose.model('Issue', IssueSchema);

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

app.get('/issues', async (req, res) => {
  try {
    const issues = await Issue.find();
    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/issue', async (req, res) => {
  try {
    const { title, description, date } = req.body;
    const newIssue = new Issue({ title, description, date });
    await newIssue.save();
    res.status(201).json(newIssue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/issue/:id', async (req, res) => {
  try {
    const deletedIssue = await Issue.findByIdAndDelete(req.params.id);
    res.json(deletedIssue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));