import { NextResponse } from 'next/server';
import { readSession } from '../../../lib/auth';
import { databaseInfo } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      version: '8.1.0'
    });
  } catch (error) {
    return NextResponse.json({ database: 'Offline', error: error.message, version: '8.1.0' }, { status: 503 });
  }
}
