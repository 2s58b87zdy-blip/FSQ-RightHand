import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { ensureSchema, sql } from './db';

const COOKIE_NAME = 'fsq_session';
const ISSUER = 'fsq-command';
const AUDIENCE = 'fsq-command-users';

function secret() {
  const value = String(process.env.AUTH_SECRET || '');
  if (value.length < 32 || value === 'CHANGE_ME') {
    const error = new Error('AUTH_SECRET must be configured with at least 32 characters.');
    error.code = 'AUTH_CONFIGURATION_ERROR';
    throw error;
  }
  return new TextEncoder().encode(value);
}

function parseJson(value, fallback) {
  try { return JSON.parse(value || ''); } catch { return fallback; }
}

export async function createSession(userId) {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(String(userId))
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret());
}

export async function readSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE
    });
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) return null;

    // Reload the user on every request so deactivation, role changes and folder
    // access changes take effect immediately instead of living in an old JWT.
    const pool = await ensureSchema();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`SELECT TOP 1 Id,Name,Role,Active,PermissionsJson,FolderAccessJson
              FROM dbo.Users WHERE Id=@id AND Active=1`);
    const user = result.recordset[0];
    if (!user) return null;
    return {
      id: user.Id,
      sub: String(user.Id),
      name: user.Name,
      role: user.Role,
      permissions: parseJson(user.PermissionsJson, []),
      folderAccess: parseJson(user.FolderAccessJson, {})
    };
  } catch {
    return null;
  }
}

export function sessionCookie(token) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 8
  };
}

export function clearSessionCookie() {
  return {
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0
  };
}

export function canManage(session) {
  return Boolean(session && ['Owner', 'Co-Owner'].includes(session.role));
}

export function canAccessCompanyLibrary(session) {
  const name = String(session?.name || '').trim().toLowerCase();
  return ['flemming', 'jakob'].includes(name);
}
