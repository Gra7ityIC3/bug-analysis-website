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
 * and updates the `latest_created_at` value in the metadata table to track the
 * timestamp of the most recent issue fetched from GitHub.
 *
 * @param {Array<Object>} issues An array of issue objects to be inserted.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of inserted issues
 * from the database or an empty array if no issues were provided.
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

    // Issues are sorted in descending order of created_at from GitHub
    const latestCreatedAt = issues[0].created_at;
    await updateMetadata(client, 'latest_created_at', latestCreatedAt);

    await client.query('COMMIT');

    const result = await client.query('SELECT * FROM cs3213_issues ORDER BY created_at DESC');
    return result.rows;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error inserting issues using COPY:', error);
    return [];
  } finally {
    client.release();
  }
};

/**
 * Inserts multiple issues into the database using PostgreSQL's multirow `VALUES` syntax
 * and updates the `latest_created_at` value in the metadata table to track the timestamp
 * of the most recent issue fetched from GitHub.
 *
 * @param {Array<Object>} issues An array of issue objects to be inserted.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of inserted issues
 * from the database or an empty array if no issues were provided.
 *
 * @note The multirow `VALUES` syntax is more efficient than `COPY` for small to medium inserts
 *       and faster than executing multiple `INSERT` statements.
 */
export const saveIssues = async (issues) => {
  if (!issues.length) return [];

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const query = buildInsertQuery(issues);
    const result = await client.query(query);
    console.log(`Inserted ${result.rowCount} new issues.`);

    // Issues are sorted in descending order of created_at from GitHub
    const latestCreatedAt = issues[0].created_at;
    await updateMetadata(client, 'latest_created_at', latestCreatedAt);

    await client.query('COMMIT');
    return result.rows;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error inserting issues:', error);
    return [];
  } finally {
    client.release();
  }
};

const insertIssuesUsingCopy = async (client, issues) => {
  const columns = Object.keys(issues[0]);
  const ingestStream = client.query(
    copyFrom(`COPY cs3213_issues (${columns.join(', ')}) FROM STDIN WITH CSV`)
  );
  const sourceStream = Readable.from(json2csv(issues, {prependHeader: false}));

  await pipeline(sourceStream, ingestStream);
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
    INSERT INTO cs3213_issues (${columns.join(', ')})
    VALUES ${placeholders}
    RETURNING *;
  `;

  const values = issues.flatMap(issue => Object.values(issue));

  return { text, values };
};
