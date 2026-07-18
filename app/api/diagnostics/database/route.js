import { NextResponse } from 'next/server';
import { getPool } from '../../../../lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
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
    return NextResponse.json({ ok: true, version: '8.1.2', elapsedMs: Date.now() - startedAt, configuration, database: result.recordset[0] });
  } catch (error) {
    console.error('[FSQ database diagnostics]', error);
    return NextResponse.json({
      ok: false,
      version: '8.1.2',
      elapsedMs: Date.now() - startedAt,
      configuration,
      error: { name: error?.name || null, code: error?.code || null, message: error?.message || String(error) }
    }, { status: 503 });
  }
}
