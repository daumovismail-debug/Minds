import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __pgMigration: Promise<void> | undefined;
}

export const pool =
  global.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== 'production') {
  global.__pgPool = pool;
}

async function runMigrations(): Promise<void> {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS vector`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS thoughts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      tags TEXT[] NOT NULL DEFAULT '{}',
      embedding vector(1024),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    `ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'thought'`,
  );
  await pool.query(
    `ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS done BOOLEAN NOT NULL DEFAULT FALSE`,
  );
  await pool.query(`ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ`);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS thoughts_user_idx ON thoughts (user_id, created_at DESC)`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS thoughts_kind_idx ON thoughts (user_id, kind, done, created_at DESC)`,
  );
}

export function ensureSchema(): Promise<void> {
  if (!global.__pgMigration) {
    global.__pgMigration = runMigrations().catch((err) => {
      global.__pgMigration = undefined;
      throw err;
    });
  }
  return global.__pgMigration;
}

export async function q<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[],
) {
  await ensureSchema();
  return pool.query<T>(text, params);
}

export type Kind = 'thought' | 'task';

export type Thought = {
  id: number;
  content: string;
  tags: string[];
  kind: Kind;
  done: boolean;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ThoughtWithScore = Thought & { similarity: number };

export function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}
