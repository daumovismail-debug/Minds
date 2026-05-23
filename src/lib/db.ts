import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
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

export type Thought = {
  id: number;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type ThoughtWithScore = Thought & { similarity: number };

export function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}
