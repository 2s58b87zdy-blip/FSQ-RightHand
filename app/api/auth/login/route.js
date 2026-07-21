import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { ensureSchema, sql } from '../../../../lib/db';
import { seedUsers } from '../../../../lib/users';
import { createSession, sessionCookie } from '../../../../lib/auth';

const attempts = globalThis.__fsqLoginAttempts || new Map();
globalThis.__fsqLoginAttempts = attempts;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function clientKey(request, name) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = request.headers.get('x-azure-clientip') || forwarded || 'unknown';
  return `${ip}:${String(name || '').trim().toLowerCase()}`;
}

function rateState(key) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    const fresh = { count: 0, resetAt: now + WINDOW_MS };
    attempts.set(key, fresh);
    return fresh;
  }
  return current;
}

export async function POST(request) {
  let name = '';
  try {
    const body = await request.json();
    name = String(body?.name || '').trim().slice(0, 100);
    const password = String(body?.password || '').slice(0, 256);
    const key = clientKey(request, name);
    const state = rateState(key);
    if (state.count >= MAX_ATTEMPTS) {
      const retryAfter = Math.max(1, Math.ceil((state.resetAt - Date.now()) / 1000));
      return NextResponse.json({ error: 'For mange loginforsøg. Prøv igen senere.' }, {
        status: 429,
        headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' }
      });
    }

    await seedUsers();
    const pool = await ensureSchema();
    const result = await pool.request()
      .input('name', sql.NVarChar(100), name)
      .query('SELECT TOP 1 * FROM dbo.Users WHERE Name=@name AND Active=1');
    const user = result.recordset[0];
    const valid = user ? await bcrypt.compare(password, user.PasswordHash) : false;
    if (!valid) {
      state.count += 1;
      attempts.set(key, state);
      return NextResponse.json({ error: 'Forkert brugernavn eller adgangskode' }, {
        status: 401, headers: { 'Cache-Control': 'no-store' }
      });
    }

    attempts.delete(key);
    const permissions = (() => { try { return JSON.parse(user.PermissionsJson || '[]'); } catch { return []; } })();
    const folderAccess = (() => { try { return JSON.parse(user.FolderAccessJson || '{}'); } catch { return {}; } })();
    const token = await createSession(user.Id);
    const response = NextResponse.json({ user: {
      id: user.Id, name: user.Name, role: user.Role, permissions, folderAccess
    } }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(sessionCookie(token));
    await pool.request()
      .input('id', sql.Int, user.Id)
      .input('user', sql.NVarChar(100), user.Name)
      .query("UPDATE dbo.Users SET LastLoginAt=SYSUTCDATETIME() WHERE Id=@id; INSERT INTO dbo.AuditLog(UserName,Action,EntityType) VALUES(@user,'LOGIN','AUTH');");
    return response;
  } catch (error) {
    console.error('[FSQ /api/auth/login]', { message: error?.message, code: error?.code });
    const configurationError = error?.code === 'AUTH_CONFIGURATION_ERROR';
    return NextResponse.json({
      error: configurationError ? 'Login er ikke konfigureret. Kontakt systemadministratoren.' : 'Login-tjenesten er midlertidigt utilgængelig.'
    }, { status: configurationError ? 503 : 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

