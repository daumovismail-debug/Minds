import bcrypt from 'bcryptjs';
import { pool } from './db';

export type User = {
  id: number;
  email: string;
  created_at: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  if (typeof email !== 'string') return 'invalid_email';
  const e = email.trim().toLowerCase();
  if (e.length < 3 || e.length > 254) return 'invalid_email';
  if (!EMAIL_RE.test(e)) return 'invalid_email';
  return null;
}

export function validatePassword(password: string): string | null {
  if (typeof password !== 'string') return 'invalid_password';
  if (password.length < 6) return 'password_too_short';
  if (password.length > 200) return 'password_too_long';
  return null;
}

export async function findUserByEmail(email: string): Promise<{ id: number; email: string; password_hash: string } | null> {
  const { rows } = await pool.query(
    `SELECT id, email, password_hash FROM users WHERE email = $1 LIMIT 1`,
    [email.trim().toLowerCase()],
  );
  return rows[0] ?? null;
}

export async function createUser(email: string, password: string): Promise<User> {
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2)
     RETURNING id, email, created_at`,
    [email.trim().toLowerCase(), hash],
  );
  return rows[0];
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
