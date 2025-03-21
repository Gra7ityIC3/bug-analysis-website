import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import pkg from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import { json2csv } from 'json-2-csv';

const { Pool } = pkg;

// Create a connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,  // Required for Heroku
  },
});

export const initializeDatabase = async () => {
  const createIssuesTable = `
    CREATE TABLE IF NOT EXISTS cs3213_issues (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        creator VARCHAR(255) NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        dbms VARCHAR(100),
        status VARCHAR(20) NOT NULL CHECK (status IN ('Open', 'Closed', 'Fixed', 'Not a bug')),
        html_url TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
    );
  `;

  const createMetadataTable = `
    CREATE TABLE IF NOT EXISTS cs3213_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
  `;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(createIssuesTable);
    await client.query(createMetadataTable);
    await client.query('COMMIT');

    console.log('Tables cs3213_issues and cs3213_metadata have been created (or already exist).');
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

    await insertIssuesUsingCopy(client, issues);
    console.log(`Inserted ${issues.length} new issues using COPY.`);

    // Issues are sorted in descending order of updated_at from GitHub
    await updateMetadata(client, 'latest_updated_at', issues[0].updated_at);
    await client.query('COMMIT');

    const result = await client.query('SELECT * FROM cs3213_issues ORDER BY created_at DESC');
    return result.rows;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error inserting issues using COPY:', error);
    throw error;
  } finally {
    client.release();
  }
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

    // Issues are sorted in descending order of updated_at from GitHub
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

const insertIssuesUsingCopy = async (client, issues) => {
  const columns = Object.keys(issues[0]);
  const ingestStream = client.query(
    copyFrom(`COPY cs3213_issues (${columns.join(', ')}) FROM STDIN WITH CSV`)
  );
  const sourceStream = Readable.from(json2csv(issues, { prependHeader: false }));

  await pipeline(sourceStream, ingestStream);
};

const filterAndUpdateIssues = async (client, issues, latestUpdatedAt) => {
  const newIssues = [];
  const updatedIssues = [];

  const updateIssueText = `
    UPDATE cs3213_issues
    SET title = $1, description = $2, dbms = $3, status = $4, updated_at = $5
    WHERE html_url = $6
    RETURNING *;
  `;

  for (const issue of issues) {
    if (issue.created_at > latestUpdatedAt) {
      newIssues.push(issue);
    } else {
      const result = await client.query(updateIssueText, [
        issue.title, issue.description, issue.dbms, issue.status, issue.updated_at,
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

const updateMetadata = async (client, key, value) => {
  await client.query(
    `INSERT INTO cs3213_metadata (key, value) 
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
        INSERT INTO cs3213_issues (${columns.join(', ')})
        VALUES ${placeholders}
        RETURNING *
    )
    SELECT * FROM inserted_issues
    ORDER BY created_at DESC;
  `;

  const values = issues.flatMap(issue => Object.values(issue));

  return { text, values };
};
