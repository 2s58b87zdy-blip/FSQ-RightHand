import { NextResponse } from 'next/server';
import { listUsers } from '../../../../lib/users';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const users = await listUsers(true);
    return NextResponse.json(users.map(({ id, name, role, active }) => ({ id, name, role, active })));
  } catch (error) {
    console.error('[FSQ /api/auth/users]', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack
    });
    return NextResponse.json({
      error: 'Kunne ikke hente brugere fra Azure SQL.',
      detail: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 });
  }
}
