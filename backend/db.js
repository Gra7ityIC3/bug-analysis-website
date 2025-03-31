import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import pkg from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import { json2csv } from 'json-2-csv';
import { parseInitialData } from './sqlancer-bug-reports.js';

const { Pool } = pkg;

export const GITHUB_ISSUES_TABLE = 'cs3213_github_issues';
export const SQLANCER_BUG_REPORTS_TABLE = 'cs3213_sqlancer_bug_reports';
export const METADATA_TABLE = 'cs3213_metadata';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,  // Required for Heroku
  },
});

export const initializeDatabase = async () => {
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

  const createSqlancerBugReportsTable = `
    CREATE TABLE IF NOT EXISTS ${SQLANCER_BUG_REPORTS_TABLE} (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      title TEXT,
      dbms VARCHAR(100),
      oracle VARCHAR(20),
      status VARCHAR(20) NOT NULL CHECK (status IN ('Open', 'Fixed', 'Closed', 'Not a bug')),
      created_at TIMESTAMPTZ,
      test TEXT,
      severity VARCHAR(20),
      url_email TEXT,
      url_bugtracker TEXT,
      url_fix TEXT,
      reporter VARCHAR(255)
    );
  `;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(createGitHubIssuesTable);
    await client.query(createMetadataTable);
    await client.query(createSqlancerBugReportsTable);
    await parseInitialData(client);
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
};

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
export const saveIssuesUsingCopy = async (issues) => {
  if (!issues.length) return [];

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await insertIssuesUsingCopy(client, issues, GITHUB_ISSUES_TABLE);
    console.log(`Inserted ${issues.length} new GitHub issues into ${GITHUB_ISSUES_TABLE} using COPY.`);

    // Issues are sorted in descending order of updated_at from GitHub.
    await updateMetadata(client, 'latest_updated_at', issues[0].updated_at);
    await client.query('COMMIT');

    const result = await client.query(`SELECT * FROM ${GITHUB_ISSUES_TABLE} ORDER BY created_at DESC`);
    return result.rows;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error inserting issues using COPY:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const insertIssuesUsingCopy = async (client, issues, tableName) => {
  const columns = Object.keys(issues[0]);
  const ingestStream = client.query(
    copyFrom(`COPY ${tableName} (${columns.join(', ')}) FROM STDIN WITH CSV`)
  );
  const sourceStream = Readable.from(json2csv(issues, { prependHeader: false }));

  await pipeline(sourceStream, ingestStream);
};

/**
 * Processes and saves issues into the database by updating existing ones and inserting new
 * ones, using {@link filterAndUpdateIssues} to determine whether an issue is new or updated.
 *
 * Also updates the `latest_updated_at` value in the metadata table to track the timestamp
 * of the most recently updated issue fetched from GitHub.
 *
 * @param {Array<Object>} issues An array of issue objects to process and save into the database.
 * @param {string} latestUpdatedAt The `latest_updated_at` value in the metadata table,
 * used to determine whether an issue is new or updated.
 *
 * @returns {Promise<{ newIssues: Array<Object>, updatedIssues: Array<Object> }>} A promise
 * that resolves to an object containing arrays of newly inserted and updated issues.
 *
 * @throws {Error} Throws an error if updating existing issues, inserting new issues,
 * or updating metadata fails.
 */
export const processAndSaveIssues = async (issues, latestUpdatedAt) => {
  if (!issues.length) {
    return { newIssues: [], updatedIssues: [] };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let { newIssues, updatedIssues } = await filterAndUpdateIssues(client, issues, latestUpdatedAt);

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
};

const filterAndUpdateIssues = async (client, issues, latestUpdatedAt) => {
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
};

export const getMetadata = async (key) => {
  const result = await pool.query(
    `SELECT value FROM ${METADATA_TABLE} WHERE key = $1`, [key]
  );

  return result.rows[0].value;
};

export const getAllGitHubIssues = async () => {
  const result = await pool.query(
    `SELECT * FROM ${GITHUB_ISSUES_TABLE} ORDER BY created_at DESC`
  );

  return result.rows;
};

export const updateGitHubIssue = async (id, { dbms, oracle, status }) => {
  const result = await pool.query(
    `UPDATE ${GITHUB_ISSUES_TABLE}
     SET dbms = $1, oracle = $2, status = $3
     WHERE id = $4`,
    [dbms, oracle, status, id]
  );

  return result.rowCount;
};

export const deleteGitHubIssues = async (ids) => {
  const result = await pool.query(
    `DELETE FROM ${GITHUB_ISSUES_TABLE} WHERE id = ANY($1)`, [ids]
  );

  return result.rowCount;
};

export const getSqlancerBugReports = async () => {
  const result = await pool.query(
    `SELECT * FROM ${SQLANCER_BUG_REPORTS_TABLE} ORDER BY created_at DESC`
  );

  return result.rows;
};

export const updateSqlancerBugReport = async (id, { status }) => {
  const result = await pool.query(
    `UPDATE ${SQLANCER_BUG_REPORTS_TABLE}
     SET status = $1
     WHERE id = $2`,
    [status, id]
  );

  return result.rowCount;
};

export const deleteSqlancerBugReports = async (ids) => {
  const result = await pool.query(
    `DELETE FROM ${SQLANCER_BUG_REPORTS_TABLE} WHERE id = ANY($1)`, [ids]
  );

  return result.rowCount;
};

export const getDbmsSummaryData = async () => {
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
};

export const getDbmsMonthRange = async () => {
  const rangeQuery = `
    WITH combined_dates AS (
      SELECT created_at FROM ${GITHUB_ISSUES_TABLE}
      WHERE dbms != 'N/A' AND status != 'Not a bug'
      UNION ALL
      SELECT created_at FROM ${SQLANCER_BUG_REPORTS_TABLE}
      WHERE dbms IS NOT NULL AND status != 'Not a bug'
    )
    SELECT 
      DATE_TRUNC('month', MIN(created_at)) AS "startMonth",
      DATE_TRUNC('month', MAX(created_at)) AS "endMonth"
    FROM combined_dates;
  `;

  const result = await pool.query(rangeQuery);
  return result.rows[0];
};

export const getDbmsMonthlyCounts = async () => {
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
    GROUP BY dbms, DATE_TRUNC('month', created_at)
    ORDER BY month ASC, dbms ASC;
  `;

  const result = await pool.query(monthlyCountsQuery);
  return result.rows;
};

// --- Helper functions ---

const updateMetadata = async (client, key, value) => {
  await client.query(
    `INSERT INTO ${METADATA_TABLE} (key, value) 
     VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, value]
  );
};

const buildInsertQuery = (issues) => {
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
};
