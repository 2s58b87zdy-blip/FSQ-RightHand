import { NextResponse } from 'next/server';
import { listUsers } from '../../../../lib/users';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function loginListError(error) {
  const code = String(error?.code || '').toUpperCase();
  const name = String(error?.name || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  if (code === 'AUTH_CONFIGURATION_ERROR') {
    return { publicCode: 'AUTH_CONFIGURATION', message: 'Login er ikke konfigureret. Kontrollér INITIAL_OWNER_PASSWORD i App Service.' };
  }
  if (code === 'ELOGIN') {
    return { publicCode: 'SQL_LOGIN', message: 'Azure SQL afviste loginoplysningerne. Kontrollér SQL_USER og SQL_PASSWORD.' };
  }
  if (code === 'ETIMEOUT' || code === 'ESOCKET' || message.includes('firewall') || message.includes('server was not found')) {
    return { publicCode: 'SQL_CONNECTION', message: 'Azure SQL kan ikke nås. Kontrollér SQL-server, firewall og netværksadgang.' };
  }
  if (name.includes('credential') || message.includes('managed identity') || message.includes('credentialunavailable')) {
    return { publicCode: 'MANAGED_IDENTITY', message: 'Managed Identity kan ikke logge på Azure SQL. Kontrollér identitet og databasebruger.' };
  }
  if (code === 'EREQUEST' || message.includes('invalid column') || message.includes('invalid object')) {
    return { publicCode: 'SQL_SCHEMA', message: 'Databasen mangler en nødvendig opdatering. Kontrollér App Service-loggen.' };
  }
  return { publicCode: 'LOGIN_LIST', message: 'Kunne ikke hente loginlisten. Kontrollér Azure SQL-forbindelsen og App Service-loggen.' };
}

export async function GET() {
  try {
    let users;
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        users = await listUsers(true);
        break;
      } catch (error) {
        lastError = error;
        if (error?.code === 'AUTH_CONFIGURATION_ERROR' || attempt === 2) throw error;
        await wait(500 * (attempt + 1));
      }
    }
    if (!users) throw lastError;
    return NextResponse.json(users.map(({ id, name, role, active }) => ({ id, name, role, active })), {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error('[FSQ /api/auth/users]', { message: error?.message, code: error?.code });
    const safeError = loginListError(error);
    return NextResponse.json({
      error: safeError.message,
      code: safeError.publicCode
    }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' } });
  }
}
