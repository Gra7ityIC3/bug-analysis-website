import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import pkg from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import { json2csv } from 'json-2-csv';
import { fetchAllGitHubIssues } from './services/github-issues.js';
import { fetchSqlancerBugReports } from './services/sqlancer-bug-reports.js';
import { classifyGitHubIssues } from './services/classify-github-issues.js';

const { Pool } = pkg;

const GITHUB_ISSUES_TABLE = 'cs3213_github_issues';
const SQLANCER_BUG_REPORTS_TABLE = 'cs3213_sqlancer_bug_reports';
const METADATA_TABLE = 'cs3213_metadata';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,  // Required for Heroku
  },
});

export async function initializeDatabase() {
  const createGitHubIssuesTable = `
    CREATE TABLE IF NOT EXISTS ${GITHUB_ISSUES_TABLE} (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      creator VARCHAR(255) NOT NULL,
      title TEXT NOT NULL,
      description TEXT, -- Some GitHub issues have no description.
      dbms VARCHAR(20) NOT NULL,
      oracle VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL,
      html_url TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
  `;

  const createMetadataTable = `
    CREATE TABLE IF NOT EXISTS ${METADATA_TABLE} (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `;

  // Table schema based on:
  // https://github.com/sqlancer/bugs/blob/7a1e9edcaa63b04408c96b12777141485da3c714/bugs.py#L23-L57
  const createSqlancerBugReportsTable = `
    CREATE TABLE IF NOT EXISTS ${SQLANCER_BUG_REPORTS_TABLE} (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      title TEXT NOT NULL,
      dbms VARCHAR(100) NOT NULL,
      oracle VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL,
      created_at DATE NOT NULL,
      test TEXT,
      severity VARCHAR(20)
    );
  `;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(createGitHubIssuesTable);
    await client.query(createMetadataTable);
    await client.query(createSqlancerBugReportsTable);
    await insertGitHubIssuesIfEmpty(client);
    await insertSqlancerBugReportsIfEmpty(client);
    await client.query('COMMIT');

    console.log('The following tables have been created (or already exist):');
    console.log(`- ${GITHUB_ISSUES_TABLE}`);
    console.log(`- ${METADATA_TABLE}`);
    console.log(`- ${SQLANCER_BUG_REPORTS_TABLE}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing database:', error);
  } finally {
    client.release();
  }
}

async function insertGitHubIssuesIfEmpty(client) {
  const result = await client.query(`SELECT 1 FROM ${GITHUB_ISSUES_TABLE} LIMIT 1`);

  if (result.rowCount) {
    console.log(`Data already exists in ${GITHUB_ISSUES_TABLE}. Skipping fetch from GitHub.`);
    return;
  }

  let issues = await fetchAllGitHubIssues();
  issues = await classifyGitHubIssues(issues);

  await insertIssuesUsingCopy(client, issues, GITHUB_ISSUES_TABLE);
  console.log(`Inserted ${issues.length} new GitHub issues into ${GITHUB_ISSUES_TABLE} using COPY.`);

  // Issues are sorted in descending order of updated_at from GitHub.
  await updateMetadata(client, 'latest_updated_at', issues[0].updated_at);
}

async function insertSqlancerBugReportsIfEmpty(client) {
  const result = await client.query(`SELECT 1 FROM ${SQLANCER_BUG_REPORTS_TABLE} LIMIT 1`);

  if (result.rowCount) {
    console.log(`Data already exists in ${SQLANCER_BUG_REPORTS_TABLE}. Skipping fetch from GitHub.`);
    return;
  }

  const issues = await fetchSqlancerBugReports();
  await insertIssuesUsingCopy(client, issues, SQLANCER_BUG_REPORTS_TABLE);
  console.log(`Inserted ${issues.length} SQLancer bug reports into ${SQLANCER_BUG_REPORTS_TABLE} using COPY.`);
}

async function insertIssuesUsingCopy(client, issues, tableName) {
  const columns = Object.keys(issues[0]);
  const ingestStream = client.query(
    copyFrom(`COPY ${tableName} (${columns.join(', ')}) FROM STDIN WITH CSV`)
  );
  const sourceStream = Readable.from(json2csv(issues, { prependHeader: false }));

  await pipeline(sourceStream, ingestStream);
}

/**
 * Processes and saves GitHub issues into the GitHub issues table by updating existing
 * records and inserting new ones, using {@link filterAndUpdateGitHubIssues} to determine
 * which issues are new or updated.
 *
 * Also updates the `latest_updated_at` value in the metadata table to track the timestamp
 * of the most recently updated GitHub issue.
 *
 * @param {Array<Object>} issues An array of issue objects to process and save into the database.
 * @param {string} latestUpdatedAt The `latest_updated_at` value in the metadata table,
 * used to determine which issues are new or updated.
 *
 * @returns {Promise<{ newIssues: Array<Object>, updatedIssues: Array<Object> }>} A promise
 * that resolves to an object containing arrays of newly inserted and updated issues.
 *
 * @throws {Error} Throws an error if updating existing issues, inserting new issues,
 * or updating metadata fails.
 */
export async function processAndSaveGitHubIssues(issues, latestUpdatedAt) {
  if (!issues.length) {
    return { newIssues: [], updatedIssues: [] };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let { newIssues, updatedIssues } = await filterAndUpdateGitHubIssues(client, issues, latestUpdatedAt);

    if (newIssues.length > 0) {
      const query = buildInsertQuery(newIssues);
      const result = await client.query(query);
      newIssues = result.rows;
    }

    // Issues are sorted in descending order of updated_at from GitHub.
    await updateMetadata(client, 'latest_updated_at', issues[0].updated_at);
    await client.query('COMMIT');

    return { newIssues, updatedIssues };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing and saving issues:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function filterAndUpdateGitHubIssues(client, issues, latestUpdatedAt) {
  const newIssues = [];
  const updatedIssues = [];

  const updateIssueText = `
    UPDATE ${GITHUB_ISSUES_TABLE}
    SET title = $1, description = $2, dbms = $3,oracle = $4, status = $5, updated_at = $6
    WHERE html_url = $7
    RETURNING *;
  `;

  for (const issue of issues) {
    if (issue.created_at > latestUpdatedAt) {
      newIssues.push(issue);
    } else {
      const result = await client.query(updateIssueText, [
        issue.title, issue.description, issue.dbms, issue.oracle, issue.status, issue.updated_at,
        issue.html_url
      ]);

      // If the issue was not updated, it was likely deleted by the user
      // and should not be re-inserted.
      if (result.rowCount) {
        updatedIssues.push(result.rows[0]);
      }
    }
  }

  return { newIssues, updatedIssues };
}

export async function getMetadata(key) {
  const result = await pool.query(
    `SELECT value FROM ${METADATA_TABLE} WHERE key = $1`, [key]
  );

  return result.rows[0].value;
}

export async function getAllGitHubIssues() {
  const result = await pool.query(
    `SELECT * FROM ${GITHUB_ISSUES_TABLE} ORDER BY created_at DESC`
  );

  return result.rows;
}

export async function updateGitHubIssue(id, { dbms, oracle, status }) {
  const result = await pool.query(
    `UPDATE ${GITHUB_ISSUES_TABLE}
     SET dbms = $1, oracle = $2, status = $3
     WHERE id = $4`,
    [dbms, oracle, status, id]
  );

  return result.rowCount;
}

export async function deleteGitHubIssues(ids) {
  const result = await pool.query(
    `DELETE FROM ${GITHUB_ISSUES_TABLE} WHERE id = ANY($1)`, [ids]
  );

  return result.rowCount;
}

export async function getSqlancerBugReports() {
  const result = await pool.query(
    `SELECT * FROM ${SQLANCER_BUG_REPORTS_TABLE} ORDER BY created_at DESC`
  );

  return result.rows;
}

export async function updateSqlancerBugReport(id, { status, severity }) {
  const result = await pool.query(
    `UPDATE ${SQLANCER_BUG_REPORTS_TABLE}
     SET status = $1, severity = $2
     WHERE id = $3`,
    [status, severity, id]
  );

  return result.rowCount;
}

export async function deleteSqlancerBugReports(ids) {
  const result = await pool.query(
    `DELETE FROM ${SQLANCER_BUG_REPORTS_TABLE} WHERE id = ANY($1)`, [ids]
  );

  return result.rowCount;
}

export async function getDbmsSummaryData() {
  const summaryQuery = `
    WITH combined_issues AS (
      SELECT dbms, status FROM ${GITHUB_ISSUES_TABLE} WHERE dbms != 'N/A'
      UNION ALL
      SELECT dbms, status FROM ${SQLANCER_BUG_REPORTS_TABLE} WHERE dbms IS NOT NULL
    )
    SELECT
      dbms,
      COUNT(*) FILTER (WHERE status != 'Not a bug') AS total_count,
      COUNT(*) FILTER (WHERE status = 'Open') AS open_count,
      COUNT(*) FILTER (WHERE status = 'Fixed') AS fixed_count
    FROM combined_issues
    GROUP BY dbms
    ORDER BY dbms ASC;
  `;

  const result = await pool.query(summaryQuery);
  return result.rows;
}

export async function getGroupedSummaryData(ids, columnName) {
  const summaryQuery = `
    SELECT
      ${columnName},
      COUNT(*) FILTER (WHERE status = 'Open') AS open_count,
      COUNT(*) FILTER (WHERE status = 'Fixed') AS fixed_count,
      COUNT(*) FILTER (WHERE status = 'Closed') AS closed_count
    FROM ${GITHUB_ISSUES_TABLE}
    WHERE id = ANY($1) AND ${columnName} != 'N/A'
    GROUP BY ${columnName}
    ORDER BY ${columnName} ASC;
  `;

  const result = await pool.query(summaryQuery, [ids]);
  return result.rows;
}

export async function getStatusSummaryData(ids) {
  const summaryQuery = `
    SELECT status, COUNT(*) AS total_count
    FROM ${GITHUB_ISSUES_TABLE}
    WHERE id = ANY($1)
    GROUP BY status
    ORDER BY
      CASE status
        WHEN 'Open' THEN 1
        WHEN 'Fixed' THEN 2
        WHEN 'Closed' THEN 3
        WHEN 'Not a bug' THEN 4
        ELSE 5
      END;
  `;

  const result = await pool.query(summaryQuery, [ids]);
  return result.rows;
}

export async function getDbmsMonthlyCounts() {
  const monthlyCountsQuery = `
    WITH combined_issues AS (
      SELECT dbms, created_at FROM ${GITHUB_ISSUES_TABLE}
      WHERE dbms != 'N/A' AND status != 'Not a bug'
      UNION ALL
      SELECT dbms, created_at FROM ${SQLANCER_BUG_REPORTS_TABLE}
      WHERE dbms IS NOT NULL AND status != 'Not a bug'
    )
    SELECT
      dbms,
      DATE_TRUNC('month', created_at) AS month,
      COUNT(*) AS total_bugs
    FROM combined_issues
    GROUP BY dbms, month
    ORDER BY month ASC, dbms ASC;
  `;

  const result = await pool.query(monthlyCountsQuery);
  return result.rows;
}

export async function getDbmsMonthlyCountsByIds(ids) {
  const monthlyCountsQuery = `
    SELECT
      DATE_TRUNC('month', created_at) AS date,
      dbms,
      COUNT(*) AS total_count
    FROM ${GITHUB_ISSUES_TABLE}
    WHERE
      id = ANY($1)
      AND dbms != 'N/A'
      AND status != 'Not a bug'
    GROUP BY date, dbms
    ORDER BY date ASC, dbms ASC;
  `;

  const result = await pool.query(monthlyCountsQuery, [ids]);
  return result.rows;
}

// ------------------------------
// Helper functions
// ------------------------------

async function updateMetadata(client, key, value) {
  await client.query(
    `INSERT INTO ${METADATA_TABLE} (key, value) 
     VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, value]
  );
}

function buildInsertQuery(issues) {
  const columns = Object.keys(issues[0]);
  const n = columns.length;

  const placeholders = issues
    .map((_, i) => `(${Array.from({ length: n }, (_, j) => `$${i * n + j + 1}`).join(', ')})`)
    .join(', ');

  const text = `
    WITH inserted_issues AS (
        INSERT INTO ${GITHUB_ISSUES_TABLE} (${columns.join(', ')})
        VALUES ${placeholders}
        RETURNING *
    )
    SELECT * FROM inserted_issues
    ORDER BY created_at DESC;
  `;

  const values = issues.flatMap(issue => Object.values(issue));

  return { text, values };
}
