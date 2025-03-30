/**
 *  This page loads in bugs recorded in the bugs.json file of sqlancers github repository
 *  The last time this file in the repo was updated was 25 Jan 2024 over a year ago,
 *  hence for now no need for refresh/update functions
 */
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { Octokit } from '@octokit/rest';
import { json2csv } from 'json-2-csv';
import { parse } from 'date-fns';
import { from as copyFrom } from 'pg-copy-streams';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export const createSqlancerBugsTable = `
    CREATE TABLE IF NOT EXISTS cs3213_sqlancer_json_bugs (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        title TEXT,
        dbms VARCHAR(100),
        oracle VARCHAR(20),
        status VARCHAR(20) NOT NULL CHECK (status IN ('Open', 'Closed', 'Fixed', 'Not a bug')),
        created_at TIMESTAMPTZ,
        test TEXT,
        severity VARCHAR(20),
        url_email TEXT,
        url_bugtracker TEXT,
        url_fix TEXT,
        reporter VARCHAR(255)
    );
`;

// Retrieve data from sqlancer/bugs.json and store them into the database
export const parseInitialData = async (client) => {
  const currentRows = await client.query('SELECT * FROM cs3213_sqlancer_json_bugs');

  if (currentRows.rowCount > 0) {
    console.log("cs3213_sqlancer_json_bugs is already loaded with data");
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

    await insertIssuesUsingCopy(client, newIssues);
    console.log(`Inserted ${newIssues.length} new bugs into cs3213_sqlancer_json_bugs using COPY.`);
  } catch (error) {
    console.error('Error fetching or inserting SQLancer JSON bugs:', error);
  }
};

const insertIssuesUsingCopy = async (client, issues) => {
    const columns = Object.keys(issues[0]);
    const ingestStream = client.query(
      copyFrom(`COPY cs3213_sqlancer_json_bugs (${columns.join(', ')}) FROM STDIN WITH CSV`)
    );
    const sourceStream = Readable.from(json2csv(issues, { prependHeader: false }));
  
    await pipeline(sourceStream, ingestStream);
};
