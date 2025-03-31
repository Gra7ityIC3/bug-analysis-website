/**
 * Loads bug reports from the `bugs.json` file in the sqlancer/bugs GitHub repository.
 * The file was last updated on 25 Jan 2024 and has not been updated since.
 * Therefore, no refresh logic is needed for now.
 *
 * @see https://github.com/sqlancer/bugs/blob/master/bugs.json
 */
import { Octokit } from '@octokit/rest';
import { parse } from 'date-fns';
import { insertIssuesUsingCopy, SQLANCER_BUG_REPORTS_TABLE } from './db.js';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Retrieve data from sqlancer/bugs.json and store them into the database
export const parseInitialData = async (client) => {
  const currentRows = await client.query(`SELECT * FROM ${SQLANCER_BUG_REPORTS_TABLE}`);

  if (currentRows.rowCount) {
    console.log(`Data already exists in ${SQLANCER_BUG_REPORTS_TABLE}. Skipping fetch from GitHub.`);
    return;
  }

  try {
    // Fetch the raw JSON file from GitHub
    const response = await octokit.repos.getContent({
      owner: 'sqlancer',
      repo: 'bugs',
      path: 'bugs.json',
    });

    // Decode base64 content to string and parse it into JSON
    const bugData = JSON.parse(Buffer.from(response.data.content, 'base64').toString());

    if (!Array.isArray(bugData)) {
      throw new Error('Unexpected JSON format');
    }

    const newIssues = [];

    for (const bug of bugData) {
      const dbms = bug.dbms || null;
      const title = bug.title || null;
      const oracle = bug.oracle || null;
      const created_at = bug.date
        ? parse(bug.date, 'd/M/yyyy', new Date()).toISOString()
        : new Date().toISOString();
      const test = bug.test || null;
      const severity = bug.severity || null;
      const url_email = bug.links?.email || null;
      const url_bugtracker = bug.links?.bugtracker || null;
      const url_fix = bug.links?.fix || null;
      const reporter = bug.reporter || 'Unknown';

      let status = 'Open';
      if (bug.status) {
        const lowerStatus = bug.status.toLowerCase();
        // Skip duplicates since they lead to the same fix link
        if (lowerStatus.includes('duplicate')) continue;
        if (lowerStatus.includes('not a bug')) {
          status = 'Not a bug';
        } else if (lowerStatus.includes('fixed')) {
          status = 'Fixed';
        } else if (lowerStatus.includes('closed')) {
          status = 'Closed';
        }
      }

      newIssues.push({
        title, dbms, oracle, status, created_at, test, severity,
        url_email, url_bugtracker, url_fix, reporter
      });
    }

    await insertIssuesUsingCopy(client, newIssues, SQLANCER_BUG_REPORTS_TABLE);
    console.log(`Inserted ${newIssues.length} SQLancer bug reports into ${SQLANCER_BUG_REPORTS_TABLE} using COPY.`);
  } catch (error) {
    console.error('Error fetching or inserting SQLancer bug reports:', error);
  }
};
