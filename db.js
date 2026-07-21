import { NextResponse } from 'next/server';
import { getPool } from '../../../../lib/db';
import { readSession, canManage } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const session = await readSession();
  if (!canManage(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const startedAt = Date.now();
  const configuration = {
    sqlServerConfigured: Boolean(process.env.SQL_SERVER),
    sqlDatabaseConfigured: Boolean(process.env.SQL_DATABASE),
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
    sqlCredentialsConfigured: Boolean(process.env.SQL_USER && process.env.SQL_PASSWORD),
    authenticationMode: process.env.SQL_USER && process.env.SQL_PASSWORD ? 'SQL credentials' : 'Managed Identity',
    server: process.env.SQL_SERVER || 'atlas-command-sql.database.windows.net (default)',
    database: process.env.SQL_DATABASE || 'fsq-command (default)'
  };

  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT DB_NAME() AS DatabaseName, SUSER_SNAME() AS LoginName, SYSUTCDATETIME() AS UtcTime');
    return NextResponse.json({ ok: true, version: '1.0-rc2-secure', elapsedMs: Date.now() - startedAt, configuration, database: result.recordset[0] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[FSQ database diagnostics]', error);
    return NextResponse.json({
      ok: false,
      version: '1.0-rc2-secure',
      elapsedMs: Date.now() - startedAt,
      configuration,
      error: { name: error?.name || null, code: error?.code || null, message: 'Databaseforbindelsen fejlede. Se serverloggen.' }
    }, { status: 503 });
  }
}
