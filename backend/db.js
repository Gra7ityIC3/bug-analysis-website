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
  const text = `
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
    );`;

  try {
    await pool.query(text);
    console.log('Table cs3213_issues has been created (or already exists).');
  } catch (error) {
    console.error('Error creating table cs3213_issues:', error);
  }
};

/**
 * Inserts multiple issues into the database using PostgreSQL's `COPY` command.
 *
 * @param {Array<Object>} issues An array of issue objects to be inserted.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of inserted issues from the database.
 *
 * @throws {Error} Logs an error if the `COPY` operation fails and returns an empty array.
 *
 * @note `COPY` is optimized for bulk insertions which incurs significantly less overhead
 *       compared to multiple `INSERT` statements and even the multirow `VALUES` syntax.
 */
export const saveIssuesUsingCopy = async (issues) => {
  const client = await pool.connect();
  try {
    const columns = Object.keys(issues[0]).join(', ');
    const ingestStream = client.query(copyFrom(`COPY cs3213_issues (${columns}) FROM STDIN WITH CSV`));
    const sourceStream = Readable.from(json2csv(issues, { prependHeader: false }));

    await pipeline(sourceStream, ingestStream);
    console.log(`Inserted ${issues.length} new issues using COPY.`);

    const result = await client.query('SELECT * FROM cs3213_issues ORDER BY created_at DESC');
    return result.rows;
  } catch (error) {
    console.error('Error inserting issues using COPY:', error);
    return [];
  } finally {
    client.release();
  }
};

export const saveIssues = async (issues) => {
  const text = `
    INSERT INTO cs3213_issues (creator, title, description, dbms, status, html_url, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
  `;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const issue of issues) {
      await client.query(text, Object.values(issue));
    }

    await client.query('COMMIT');
    console.log(`Inserted ${issues.length} new issues.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error inserting issues:', error);
  } finally {
    client.release();
  }
};
