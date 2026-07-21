import { NextResponse } from 'next/server'; import { clearSessionCookie } from '../../../../lib/auth';
export async function POST(){const r=NextResponse.json({ok:true});r.cookies.set(clearSessionCookie());return r;}
