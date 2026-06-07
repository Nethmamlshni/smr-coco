import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { AppUser } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'cocofactory-secret-key-change-in-production';
const COOKIE_NAME = 'cf_session';

export interface JWTPayload {
  userId: string;
  username: string;
  role: 'admin' | 'supervisor';
  full_name: string;
  is_active: boolean;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function getSessionFromCookies(): AppUser | null {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;
    return {
      id: payload.userId,
      username: payload.username,
      role: payload.role,
      full_name: payload.full_name,
      is_active: payload.is_active,
      created_at: '',
    };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
