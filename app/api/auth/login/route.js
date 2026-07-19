import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { ensureSchema, sql } from '../../../../lib/db';
import { seedUsers } from '../../../../lib/users';
import { createSession, sessionCookie } from '../../../../lib/auth';

function normalizeName(value) {
  return String(value || '').trim();
}

function recoveryPasswordFor(user) {
  const name = String(user?.Name || '').toLowerCase();
  if (name === 'flemming') return process.env.INITIAL_OWNER_PASSWORD || null;
  if (name === 'jakob') return process.env.INITIAL_COOWNER_PASSWORD || process.env.INITIAL_OWNER_PASSWORD || null;
  return null;
}

async function verifyAndMigratePassword(pool, user, suppliedPassword) {
  const password = String(suppliedPassword || '');
  const stored = String(user?.PasswordHash || '');
  if (!password || !stored) return false;

  // Normal bcrypt login.
  if (/^\$2[aby]\$\d{2}\$/.test(stored)) {
    try {
      if (await bcrypt.compare(password, stored)) return true;
    } catch (error) {
      console.error('[FSQ auth] Invalid bcrypt hash', { userId: user.Id, message: error?.message });
    }
  } else if (password === stored) {
    // Compatibility with early versions that stored a plain-text password.
    const migratedHash = await bcrypt.hash(password, 12);
    await pool.request()
      .input('id', sql.Int, user.Id)
      .input('hash', sql.NVarChar, migratedHash)
      .query('UPDATE dbo.Users SET PasswordHash=@hash, UpdatedAt=SYSUTCDATETIME() WHERE Id=@id');
    console.warn('[FSQ auth] Migrated legacy password hash', { userId: user.Id, name: user.Name });
    return true;
  }

  // One-time owner/co-owner recovery. The password must be configured in Azure.
  const recoveryPassword = recoveryPasswordFor(user);
  if (recoveryPassword && password === recoveryPassword) {
    const newHash = await bcrypt.hash(password, 12);
    await pool.request()
      .input('id', sql.Int, user.Id)
      .input('hash', sql.NVarChar, newHash)
      .query('UPDATE dbo.Users SET PasswordHash=@hash, UpdatedAt=SYSUTCDATETIME() WHERE Id=@id');
    console.warn('[FSQ auth] Password recovered from Azure setting', { userId: user.Id, name: user.Name });
    return true;
  }

  return false;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = normalizeName(body?.name);
    const password = String(body?.password || '');

    if (!name || !password) {
      return NextResponse.json({ error: 'Brugernavn og adgangskode skal udfyldes' }, { status: 400 });
    }

    await seedUsers();
    const pool = await ensureSchema();
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .query('SELECT TOP 1 * FROM dbo.Users WHERE LOWER(LTRIM(RTRIM(Name)))=LOWER(LTRIM(RTRIM(@name))) AND Active=1');
    const user = result.recordset[0];

    if (!user) {
      console.warn('[FSQ auth] Active user not found', { name });
      return NextResponse.json({ error: 'Forkert brugernavn eller adgangskode' }, { status: 401 });
    }

    const valid = await verifyAndMigratePassword(pool, user, password);
    if (!valid) {
      console.warn('[FSQ auth] Password rejected', { userId: user.Id, name: user.Name });
      return NextResponse.json({ error: 'Forkert brugernavn eller adgangskode' }, { status: 401 });
    }

    const permissions = JSON.parse(user.PermissionsJson || '[]');
    const token = await createSession({ sub: String(user.Id), name: user.Name, role: user.Role, permissions });
    const response = NextResponse.json({ user: { id: user.Id, name: user.Name, role: user.Role, permissions } });
    response.cookies.set(sessionCookie(token));

    await pool.request()
      .input('id', sql.Int, user.Id)
      .input('user', sql.NVarChar, user.Name)
      .query("UPDATE dbo.Users SET LastLoginAt=SYSUTCDATETIME() WHERE Id=@id; INSERT INTO dbo.AuditLog(UserName,Action,EntityType) VALUES(@user,'LOGIN','AUTH');");

    return response;
  } catch (error) {
    console.error('[FSQ /api/auth/login]', { message: error?.message, code: error?.code, stack: error?.stack });
    return NextResponse.json({ error: 'Login service error', detail: error?.message || 'Unknown error', code: error?.code || null }, { status: 500 });
  }
}
