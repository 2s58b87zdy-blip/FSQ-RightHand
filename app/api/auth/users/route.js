import { NextResponse } from 'next/server';
import { listUsers } from '../../../../lib/users';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const users = await listUsers(true);
    return NextResponse.json(users.map(({ id, name, role, active }) => ({ id, name, role, active })), {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error('[FSQ /api/auth/users]', { message: error?.message, code: error?.code });
    const configurationError = error?.code === 'AUTH_CONFIGURATION_ERROR';
    return NextResponse.json({
      error: configurationError ? 'Login er ikke konfigureret. Kontakt systemadministratoren.' : 'Kunne ikke hente loginlisten.'
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

