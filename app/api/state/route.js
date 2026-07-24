import { NextResponse } from 'next/server';
import { canAccessCompanyLibrary, readSession, canManage } from '../../../lib/auth';
import { ensureSchema, sql } from '../../../lib/db';
import { canReadFolder, getAllowedProjectNames, getStateValue, hasPermission } from '../../../lib/access';
import { isTaskAssignedTo } from '../../../lib/taskAssignments';

const STATE_KEYS = new Set([
  'fsq-v1-rc2-go-live-applied',
  'fsq-v40-deleted-projects', 'fsq-v40-documents', 'fsq-v40-drone-inspections',
  'fsq-v40-machines', 'fsq-v40-materials', 'fsq-v40-people', 'fsq-v40-projects',
  'fsq-v40-quotes', 'fsq-v40-reports', 'fsq-v40-tasks', 'fsq-v50-custom-folders',
  'fsq-v71-planner', 'fsq-v72-knowledge-documents', 'fsq-v72-knowledge-folders',
  'fsq-v72-knowledge-machines', 'fsq-v72-knowledge-solutions', 'fsq-v80-company-reports'
]);

const ROLE_WRITE_KEYS = {
  'Project Manager': new Set(['fsq-v40-projects','fsq-v40-tasks','fsq-v40-people','fsq-v40-documents','fsq-v40-reports','fsq-v40-drone-inspections','fsq-v71-planner']),
  Supervisor: new Set(['fsq-v40-tasks','fsq-v40-people','fsq-v71-planner']),
  Engineer: new Set(['fsq-v40-documents','fsq-v40-reports']),
  'QA Inspector': new Set(['fsq-v40-tasks','fsq-v40-reports'])
};

function forbidden() { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
function projectName(item) { return String(item?.project || item?.projectName || '').trim(); }

async function filterForSession(key, value, session) {
  if (key === 'fsq-v80-company-reports') return value;
  if (key === 'fsq-v72-knowledge-folders' && Array.isArray(value)) {
    if (canAccessCompanyLibrary(session)) return value;
    return value.filter(folder => !folder?.companyLibrary && canReadFolder(session, folder?.accessFolder || 'Workshop'));
  }
  if (key === 'fsq-v72-knowledge-documents' && Array.isArray(value)) {
    const folders = await getStateValue('fsq-v72-knowledge-folders');
    const allowedIds = new Set((Array.isArray(folders) ? folders : [])
      .filter(folder => (!folder?.companyLibrary || canAccessCompanyLibrary(session)) && canReadFolder(session, folder?.accessFolder || 'Workshop'))
      .map(folder => String(folder.id)));
    return value.filter(document => allowedIds.has(String(document?.folderId)));
  }
  if (canManage(session) || hasPermission(session, 'view_all_projects')) return value;
  if (!Array.isArray(value)) return value;
  const userName = String(session.name || '').trim().toLowerCase();
  if (key === 'fsq-v40-tasks') return value.filter(item => isTaskAssignedTo(item, userName));
  if (key === 'fsq-v40-people') return value.filter(item => String(item?.name || '').trim().toLowerCase() === userName);
  if (key === 'fsq-v71-planner') return value.filter(item => String(item?.person || '').trim().toLowerCase() === userName);
  if (['fsq-v40-projects','fsq-v40-documents','fsq-v40-reports','fsq-v40-quotes','fsq-v40-drone-inspections'].includes(key)) {
    const allowed = await getAllowedProjectNames(session);
    if (allowed === null) return value;
    return value.filter(item => {
      const name = projectName(item);
      return name.toLowerCase() === 'general' || allowed.has(name);
    });
  }
  if (['fsq-v40-materials','fsq-v40-machines','fsq-v40-deleted-projects','fsq-v50-custom-folders'].includes(key)) return [];
  return value;
}

async function mergeScopedValue(key, incoming, session) {
  if (!Array.isArray(incoming)) throw Object.assign(new Error('Expected an array.'), { status: 400 });
  const existingValue = await getStateValue(key);
  const existing = Array.isArray(existingValue) ? existingValue : [];
  const userName = String(session.name || '').trim().toLowerCase();

  if (key === 'fsq-v40-tasks') {
    const owned = existing.filter(item => isTaskAssignedTo(item, userName));
    const ownedIds = new Set(owned.map(item => String(item.id)));
    if (incoming.some(item => !ownedIds.has(String(item?.id)) || !isTaskAssignedTo(item, userName))) {
      throw Object.assign(new Error('Du kan kun opdatere opgaver, der er tildelt dig.'), { status: 403 });
    }
    const replacements = new Map(incoming.map(item => [String(item.id), item]));
    return existing.map(item => replacements.get(String(item.id)) || item);
  }

  if (key === 'fsq-v80-company-reports') {
    const canApprove = hasPermission(session, 'approve_final');
    const existingById = new Map(existing.map(item => [String(item?.id), item]));
    const incomingById = new Map(incoming.map(item => [String(item?.id), item]));
    for (const item of incoming) {
      const prior = existingById.get(String(item?.id));
      if (prior && String(prior.createdBy || '').trim().toLowerCase() !== userName) {
        throw Object.assign(new Error('Du kan kun redigere dine egne rapportkladder.'), { status: 403 });
      }
      if (!prior && String(item?.createdBy || '').trim().toLowerCase() !== userName) {
        throw Object.assign(new Error('Rapporten skal oprettes i dit eget navn.'), { status: 403 });
      }
    }
    const untouched = existing.filter(item => !incomingById.has(String(item?.id)));
    const owned = incoming.map(item => {
      const prior = existingById.get(String(item?.id));
      if (!canApprove && item?.status === 'Approved' && prior?.status !== 'Approved') {
        return { ...item, status:'Draft', approvedBy:undefined, approvedAt:undefined };
      }
      return item;
    });
    return [...untouched, ...owned].slice(-1000);
  }

  if (key === 'fsq-v72-knowledge-documents' || key === 'fsq-v72-knowledge-solutions') {
    const existingIds = new Set(existing.map(item => String(item?.id)));
    const additions = incoming.filter(item => !existingIds.has(String(item?.id))).map(item => {
      const owner = String(item?.uploadedBy || item?.askedBy || '').trim().toLowerCase();
      if (owner !== userName) throw Object.assign(new Error('Du kan kun tilføje poster i dit eget navn.'), { status: 403 });
      return key === 'fsq-v72-knowledge-solutions' && item?.status === 'Verified'
        ? { ...item, status: 'Unverified', verifiedBy: undefined }
        : item;
    });
    return [...existing, ...additions].slice(-5000);
  }
  throw Object.assign(new Error('Du har ikke rettighed til at ændre denne datatype.'), { status: 403 });
}

export async function GET(request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const key = new URL(request.url).searchParams.get('key');
  if (!STATE_KEYS.has(key)) return NextResponse.json({ error: 'Unknown state key' }, { status: 400 });
  if (key === 'fsq-v80-company-reports' && !canAccessCompanyLibrary(session)) return forbidden();
  const value = await getStateValue(key);
  return NextResponse.json({ value: await filterForSession(key, value, session) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { key, value } = await request.json();
    if (!STATE_KEYS.has(key)) return NextResponse.json({ error: 'Unknown state key' }, { status: 400 });
    if (key === 'fsq-v80-company-reports' && !canAccessCompanyLibrary(session)) return forbidden();
    const serialized = JSON.stringify(value);
    if (serialized.length > 5 * 1024 * 1024) return NextResponse.json({ error: 'State payload is too large' }, { status: 413 });

    const roleKeys = ROLE_WRITE_KEYS[session.role];
    let storedValue = value;
    if (!canManage(session) && !roleKeys?.has(key)) {
      if (!['fsq-v40-tasks','fsq-v72-knowledge-documents','fsq-v72-knowledge-solutions','fsq-v80-company-reports'].includes(key)) return forbidden();
      storedValue = await mergeScopedValue(key, value, session);
    }

    const pool = await ensureSchema();
    await pool.request()
      .input('key', sql.NVarChar(200), key)
      .input('json', sql.NVarChar(sql.MAX), JSON.stringify(storedValue))
      .input('user', sql.NVarChar(100), session.name)
      .query(`MERGE dbo.AppState AS target
              USING (SELECT @key AS StateKey) AS source ON target.StateKey=source.StateKey
              WHEN MATCHED THEN UPDATE SET StateJson=@json,UpdatedBy=@user,UpdatedAt=SYSUTCDATETIME()
              WHEN NOT MATCHED THEN INSERT(StateKey,StateJson,UpdatedBy) VALUES(@key,@json,@user);`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error?.status || 500;
    if (status >= 500) console.error('State update failed', error);
    return NextResponse.json({ error: status >= 500 ? 'State update failed. See server log.' : error?.message }, { status });
  }
}
