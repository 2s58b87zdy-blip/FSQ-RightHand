import { NextResponse } from 'next/server';
import { databaseInfo, resetPool } from '../../../lib/db';
import { withRetry } from '../../../lib/retry';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const startedAt = Date.now();
  const checks = {
    authSecret: Boolean(String(process.env.AUTH_SECRET || '').trim()),
    sqlConfiguration: Boolean(process.env.SQL_SERVER || process.env.DATABASE_URL),
    blobConfiguration: Boolean(process.env.AZURE_STORAGE_ACCOUNT || process.env.AZURE_STORAGE_CONNECTION_STRING)
  };

  try {
    const info = await withRetry(async attempt => {
      if (attempt > 1) resetPool();
      return databaseInfo();
    }, { attempts: 2, baseDelayMs: 250 });

    return NextResponse.json({
      ok: true,
      status: 'ready',
      version: '1.0.0-rc2-hotfix1',
      elapsedMs: Date.now() - startedAt,
      authenticationMode: process.env.SQL_USER && process.env.SQL_PASSWORD ? 'SQL credentials' : 'Managed Identity',
      checks,
      database: {
        connected: true,
        name: info.DatabaseName,
        activeUsers: info.ActiveUsers,
        auditEntries: info.AuditEntries,
        sharedStateKeys: info.SharedStateKeys
      }
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[FSQ health]', { code: error?.code, message: error?.message });
    return NextResponse.json({
      ok: false,
      status: 'degraded',
      version: '1.0.0-rc2-hotfix1',
      elapsedMs: Date.now() - startedAt,
      checks,
      database: { connected: false },
      error: { code: error?.code || null, message: error?.message || 'Database unavailable' }
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
