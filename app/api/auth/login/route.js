import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { ensureSchema, resetPool, sql } from '../../../../lib/db';
import { seedUsers } from '../../../../lib/users';
import { createSession, sessionCookie } from '../../../../lib/auth';
import { withRetry } from '../../../../lib/retry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function safeJsonArray(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function recoveryPasswordFor(user) {
  const name = normalizeName(user?.Name).toLowerCase();
  if (name === 'flemming') return process.env.INITIAL_OWNER_PASSWORD || null;
  if (name === 'jakob') return process.env.INITIAL_COOWNER_PASSWORD || process.env.INITIAL_OWNER_PASSWORD || null;
  return null;
}

async function updatePasswordHash(pool, userId, password) {
  const hash = await bcrypt.hash(password, 12);
  await pool.request()
    .input('id', sql.Int, userId)
    .input('hash', sql.NVarChar(255), hash)
    .query('UPDATE dbo.Users SET PasswordHash=@hash, UpdatedAt=SYSUTCDATETIME() WHERE Id=@id');
}

async function verifyPassword(pool, user, suppliedPassword) {
  const password = String(suppliedPassword || '');
  const stored = String(user?.PasswordHash || '');
  if (!password || !stored) return false;

  if (/^\$2[aby]\$\d{2}\$/.test(stored)) {
    try {
      if (await bcrypt.compare(password, stored)) return true;
    } catch (error) {
      console.error('[FSQ auth] Invalid password hash', { userId: user.Id, code: error?.code, message: error?.message });
    }
  } else if (password === stored) {
    await updatePasswordHash(pool, user.Id, password);
    console.warn('[FSQ auth] Legacy plain-text password migrated', { userId: user.Id, name: user.Name });
    return true;
  }

  // Azure-controlled recovery for Flemming and Jakob. When the configured
  // recovery password is used, the database hash is repaired automatically.
  const recoveryPassword = recoveryPasswordFor(user);
  if (recoveryPassword && password === recoveryPassword) {
    await updatePasswordHash(pool, user.Id, password);
    console.warn('[FSQ auth] Password hash repaired from Azure setting', { userId: user.Id, name: user.Name });
    return true;
  }

  return false;
}

async function openLoginDatabase() {
  return withRetry(async attempt => {
    if (attempt > 1) resetPool();
    await seedUsers();
    return ensureSchema();
  }, { attempts: 3, baseDelayMs: 300 });
}

export async function POST(request) {
  const requestId = crypto.randomUUID();
  try {
    const body = await request.json().catch(() => ({}));
    const name = normalizeName(body?.name);
    const password = String(body?.password || '');

    if (!name || !password) {
      return NextResponse.json({ error: 'Brugernavn og adgangskode skal udfyldes', requestId }, { status: 400 });
    }

    const pool = await openLoginDatabase();
    const result = await pool.request()
      .input('name', sql.NVarChar(100), name)
      .query(`
        SELECT TOP 1 *
        FROM dbo.Users
        WHERE LOWER(LTRIM(RTRIM(Name))) = LOWER(LTRIM(RTRIM(@name)))
          AND Active = 1
      `);
    const user = result.recordset[0];

    if (!user || !(await verifyPassword(pool, user, password))) {
      console.warn('[FSQ auth] Login rejected', { requestId, suppliedName: name, userFound: Boolean(user) });
      return NextResponse.json({ error: 'Forkert brugernavn eller adgangskode', requestId }, { status: 401 });
    }

    const permissions = safeJsonArray(user.PermissionsJson);
    const token = await createSession({
      sub: String(user.Id),
      name: user.Name,
      role: user.Role,
      permissions,
      sessionVersion: 1
    });

    const response = NextResponse.json({
      user: { id: user.Id, name: user.Name, role: user.Role, permissions },
      requestId
    });
    response.cookies.set(sessionCookie(token));

    // Login must still succeed if audit logging is temporarily unavailable.
    try {
      await pool.request()
        .input('id', sql.Int, user.Id)
        .input('user', sql.NVarChar(100), user.Name)
        .input('requestId', sql.NVarChar(100), requestId)
        .query(`
          UPDATE dbo.Users SET LastLoginAt=SYSUTCDATETIME(), UpdatedAt=SYSUTCDATETIME() WHERE Id=@id;
          INSERT INTO dbo.AuditLog(UserName,Action,EntityType,DetailsJson)
          VALUES(@user,'LOGIN','AUTH',CONCAT('{"requestId":"',@requestId,'"}'));
        `);
    } catch (auditError) {
      console.error('[FSQ auth] Non-critical login audit failure', { requestId, code: auditError?.code, message: auditError?.message });
    }

    return response;
  } catch (error) {
    console.error('[FSQ /api/auth/login]', { requestId, name: error?.name, code: error?.code, message: error?.message, stack: error?.stack });
    return NextResponse.json({
      error: 'Login-tjenesten kan ikke nå databasen lige nu. Prøv igen om et øjeblik.',
      requestId
    }, { status: 503 });
  }
}
