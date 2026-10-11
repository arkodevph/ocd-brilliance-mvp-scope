import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { Client } from 'pg';

const migrationDirectory = path.resolve(__dirname, '../../backend/database/migrations');

export async function migrate(client: Client, directory = migrationDirectory): Promise<string[]> {
  const files = (await fs.readdir(directory))
    .filter((name) => /^\d+_[a-z0-9_]+\.sql$/.test(name))
    .sort();
  const versions = files.map((name) => Number(name.split('_')[0]));
  if (new Set(versions).size !== versions.length)
    throw new Error('Migration versions must be unique.');
  const ordered = files.sort((a, b) => Number(a.split('_')[0]) - Number(b.split('_')[0]));
  await client.query('BEGIN');
  try {
    await client.query('SELECT pg_advisory_xact_lock(73620914)');
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version integer PRIMARY KEY, name text NOT NULL, checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const applied = await client.query<{
      version: number;
      name: string;
      checksum: string;
    }>('SELECT version, name, checksum FROM schema_migrations ORDER BY version');
    for (const row of applied.rows) {
      if (!ordered.includes(row.name)) throw new Error(`Applied migration is missing: ${row.name}`);
    }
    const completed: string[] = [];
    for (const name of ordered) {
      const version = Number(name.split('_')[0]);
      const sql = await fs.readFile(path.join(directory, name), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const previous = applied.rows.find((row) => row.version === version);
      if (previous) {
        if (previous.name !== name || previous.checksum !== checksum)
          throw new Error(`Applied migration changed: ${name}`);
        continue;
      }
      if (applied.rows.some((row) => row.version > version))
        throw new Error(`Migration is out of order: ${name}`);
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)',
        [version, name, checksum],
      );
      completed.push(name);
    }
    await client.query('COMMIT');
    return completed;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL)
    throw new Error('Set DATABASE_URL to the target PostgreSQL database.');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const completed = await migrate(client);
    console.log(
      completed.length ? `Applied: ${completed.join(', ')}` : 'Database migrations are up to date.',
    );
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    // Avoid printing connection URLs or database record contents.
    console.error(error instanceof Error ? error.message : 'Database migration failed.');
    process.exitCode = 1;
  });
}
