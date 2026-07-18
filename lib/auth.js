import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'fsq_session';
function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || 'CHANGE-ME-IN-AZURE-FSQ-COMMAND');
}
export async function createSession(payload) {
  return new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('12h').sign(secret());
}
export async function readSession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { return (await jwtVerify(token, secret())).payload; } catch { return null; }
}
export function sessionCookie(token) {
  return { name: COOKIE_NAME, value: token, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 12 };
}
export function clearSessionCookie() {
  return { name: COOKIE_NAME, value: '', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 };
}
export function canManage(session) { return session && ['Owner','Co-Owner'].includes(session.role); }
