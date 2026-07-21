import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'fsq_session';
const SESSION_HOURS = 12;

function secretValue() {
  const configured = String(process.env.AUTH_SECRET || '').trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    console.error('[FSQ auth] AUTH_SECRET is missing. Set a stable value in Azure App Service configuration.');
  }
  return 'FSQ-COMMAND-DEVELOPMENT-ONLY-CHANGE-IN-AZURE';
}

function secret() {
  return new TextEncoder().encode(secretValue());
}

export async function createSession(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer('fsq-command')
    .setAudience('fsq-command-users')
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());
}

export async function readSession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return (await jwtVerify(token, secret(), {
      issuer: 'fsq-command',
      audience: 'fsq-command-users',
      clockTolerance: 30
    })).payload;
  } catch (error) {
    console.warn('[FSQ auth] Session rejected', { code: error?.code, message: error?.message });
    return null;
  }
}

export function sessionCookie(token) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * SESSION_HOURS,
    priority: 'high'
  };
}

export function clearSessionCookie() {
  return {
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  };
}

export function canManage(session) {
  return Boolean(session && ['Owner', 'Co-Owner'].includes(session.role));
}
