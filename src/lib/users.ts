import bcrypt from 'bcryptjs';
import { pool } from './db';

export type User = {
  id: number;
  username: string;
  created_at: string;
};

const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(username: unknown): string | null {
  if (typeof username !== 'string') return 'invalid_username';
  const u = normalizeUsername(username);
  if (u.length < 3) return 'username_too_short';
  if (u.length > 32) return 'username_too_long';
  if (!USERNAME_RE.test(u)) return 'username_invalid_chars';
  return null;
}

export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string') return 'invalid_password';
  if (password.length < 6) return 'password_too_short';
  if (password.length > 200) return 'password_too_long';
  return null;
}

export async function findUserByUsername(
  username: string,
): Promise<{ id: number; username: string; password_hash: string } | null> {
  const { rows } = await pool.query(
    `SELECT id, username, password_hash FROM users WHERE username = $1 LIMIT 1`,
    [normalizeUsername(username)],
  );
  return rows[0] ?? null;
}

export async function createUser(username: string, password: string): Promise<User> {
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (username, password_hash) VALUES ($1, $2)
     RETURNING id, username, created_at`,
    [normalizeUsername(username), hash],
  );
  return rows[0];
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
