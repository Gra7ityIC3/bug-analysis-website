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
import { pool } from './db.js';
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
export const parseInitialData = async () => {
    const client = await pool.connect();
    const currentRows = await client.query('SELECT * FROM cs3213_sqlancer_json_bugs');
    client.release();
    if (currentRows.rowCount > 0) {
      console.log("cs3213_sqlancer_json_bugs is already loaded with data")
      return
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
  
      const newIssues = [];
  
      if (!Array.isArray(bugData)) {
        throw new Error('Unexpected JSON format');
      }
  
      for (const bug of bugData) {
        const dbms = bug.dbms || null;
        const title = bug.title || null;
        const oracle = bug.oracle || null;
        const created_at = bug.date ? parse(bug.date, 'd/M/yyyy', new Date()).toISOString() : new Date().toISOString();
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
        newIssues.push({title, dbms, oracle, status, created_at, test, severity, url_email, url_bugtracker, url_fix,
          reporter})
      }
  
      saveIssuesUsingCopy(newIssues)
      console.log('Initial Sqlancer JSON bugs successfully inserted');
    } catch (error) {
      console.error('Error fetching or inserting Sqlancer JSON bugs:', error);
    }
}

  /**
   * Inserts multiple issues into the database using PostgreSQL's `COPY` command
   * and updates the `latest_updated_at` value in the metadata table to track the
   * timestamp of the most recently updated issue fetched from GitHub.
   *
   * @param {Array<Object>} issues An array of issue objects to insert into the database.
   * @returns {Promise<Array<Object>>} A promise that resolves to an array of inserted issues
   * from the database or an empty array if no issues were provided.
   *
   * @throws {Error} Throws an error if the `COPY` command or metadata update fails.
   *
   * @note `COPY` is optimized for **bulk insertions**, which incur significantly less overhead
   *       compared to multiple `INSERT` statements and even the multirow `VALUES` syntax.
   */
const saveIssuesUsingCopy = async (issues) => {
    if (!issues.length) return [];
  
    const client = await pool.connect();
  
    try {
      await client.query('BEGIN');
  
      await insertIssuesUsingCopy(client, issues);
      console.log(`Inserted ${issues.length} new bugs into cs3213_sqlancer_json_bugs using COPY.`);

      await client.query('COMMIT');
  
      const result = await client.query('SELECT * FROM cs3213_sqlancer_json_bugs ORDER BY created_at DESC');
      return result.rows;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error inserting sqlancer json bugs using COPY:', error);
      throw error;
    } finally {
      client.release();
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