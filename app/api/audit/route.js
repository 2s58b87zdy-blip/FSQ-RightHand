import { NextResponse } from 'next/server';
import { readSession, canManage } from '../../../lib/auth';
import { ensureSchema, sql } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const session = await readSession();
  if (!canManage(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const requested = Number(new URL(request.url).searchParams.get('limit') || 100);
  const limit = Math.max(1, Math.min(500, requested));
  const pool = await ensureSchema();
  const result = await pool.request().input('limit', sql.Int, limit).query(`
    SELECT TOP (@limit) Id,UserName,Action,EntityType,EntityId,DetailsJson,CreatedAt
    FROM dbo.AuditLog ORDER BY CreatedAt DESC
  `);
  return NextResponse.json(result.recordset.map(row => ({
    id: row.Id,
    user: row.UserName,
    action: row.Action,
    entityType: row.EntityType,
    entityId: row.EntityId,
    details: row.DetailsJson ? JSON.parse(row.DetailsJson) : null,
    createdAt: row.CreatedAt
  })));
}
