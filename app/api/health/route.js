import { NextResponse } from 'next/server';
import { readSession, canManage } from '../../../lib/auth';
import { databaseInfo } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await readSession();
  if (!canManage(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const info = await databaseInfo();
    return NextResponse.json({
      database: 'Connected',
      authentication: process.env.SQL_USER ? 'SQL credentials' : 'Managed Identity',
      server: process.env.SQL_SERVER,
      databaseName: info.DatabaseName,
      activeUsers: info.ActiveUsers,
      auditEntries: info.AuditEntries,
      sharedStateKeys: info.SharedStateKeys,
      version: '1.0-rc2-secure'
    });
  } catch (error) {
    console.error('Health check failed', error);
    return NextResponse.json({ database: 'Offline', error: 'Databaseforbindelsen fejlede. Se serverloggen.', version: '1.0-rc2-secure' }, { status: 503 });
  }
}
