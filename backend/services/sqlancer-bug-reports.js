import { octokit } from './octokit-client.js';
import { parse } from 'date-fns';

/**
 * Fetches and processes SQLancer bug reports from the `bugs.json` file in the `sqlancer/bugs`
 * GitHub repository. The bug reports are converted into a format similar to how GitHub issues
 * are stored, allowing them to be analyzed together.
 *
 * @see https://github.com/sqlancer/bugs/blob/master/bugs.json
 */
export async function fetchSqlancerBugReports() {
  try {
    // Fetch the raw JSON file from GitHub
    const response = await octokit.repos.getContent({
      owner: 'sqlancer',
      repo: 'bugs',
      path: 'bugs.json',
    });

    // Decode base64 content to string and parse it into JSON
    const bugs = JSON.parse(Buffer.from(response.data.content, 'base64').toString());

    const issues = [];

    for (const bug of bugs) {
      const title = bug.title;
      const dbms = bug.dbms;
      const oracle = bug.oracle;
      const created_at = parse(bug.date, 'd/M/yyyy', new Date()).toISOString();
      const test = bug.test.join('\n');
      const severity = bug.severity || 'Unknown';

      let status = bug.status;

      // Skip duplicates since they lead to the same fix link
      if (status.includes('duplicate')) continue;

      if (status.includes('not a bug')) {
        status = 'Not a bug';
      } else if (status.includes('fixed')) {
        status = 'Fixed';
      } else if (status.includes('closed')) {
        status = 'Closed';
      } else { // Includes "verified"
        status = 'Open';
      }

      issues.push({ title, dbms, oracle, status, created_at, test, severity });
    }

    return issues;
  } catch (error) {
    console.error('Error fetching SQLancer bug reports:', error);
    throw error;
  }
}
