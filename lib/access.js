import { ensureSchema, sql } from './db';
import { canManage } from './auth';

export function hasPermission(session, permission) {
  return Boolean(session && Array.isArray(session.permissions) && session.permissions.includes(permission));
}

export function folderLevel(session, folder) {
  if (canManage(session)) return 'Full Control';
  return String(session?.folderAccess?.[folder] || 'No Access');
}

export function canReadFolder(session, folder) {
  return ['Read', 'Edit', 'Full Control'].includes(folderLevel(session, folder));
}

export function canEditFolder(session, folder) {
  return ['Edit', 'Full Control'].includes(folderLevel(session, folder));
}

export function binderAccessFolder(category) {
  const value = String(category || '').toLowerCase();
  if (value.includes('drawing')) return 'Drawings';
  if (value.includes('certificate') || value === 'wpqr' || value === 'wps') return 'Certificates';
  if (value.includes('report')) return 'Reports';
  if (value.includes('drone')) return 'Drone';
  if (value.includes('qa') || value.includes('punch') || value.includes('ndt')) return 'QA / QC';
  if (value.includes('quotation') || value.includes('purchase order')) return 'Finance';
  return 'Projects';
}

export async function getStateValue(key) {
  const pool = await ensureSchema();
  const result = await pool.request()
    .input('key', sql.NVarChar(200), key)
    .query('SELECT StateJson FROM dbo.AppState WHERE StateKey=@key');
  try { return result.recordset[0] ? JSON.parse(result.recordset[0].StateJson) : null; }
  catch { return null; }
}

export async function getAllowedProjectNames(session) {
  if (canManage(session) || hasPermission(session, 'view_all_projects')) return null;
  const tasks = await getStateValue('fsq-v40-tasks');
  return new Set((Array.isArray(tasks) ? tasks : [])
    .filter(task => String(task?.person || '').trim().toLowerCase() === String(session?.name || '').trim().toLowerCase())
    .map(task => String(task?.project || '').trim())
    .filter(Boolean));
}

export async function canAccessProject(session, project) {
  if (!session) return false;
  const name = String(project || '').trim();
  if (!name || name.toLowerCase() === 'general') return true;
  const allowed = await getAllowedProjectNames(session);
  return allowed === null || allowed.has(name);
}

export async function canAccessTask(session, taskId, project) {
  if (!session) return false;
  if (canManage(session) || hasPermission(session, 'view_all_projects')) return true;
  const tasks = await getStateValue('fsq-v40-tasks');
  const task = (Array.isArray(tasks) ? tasks : []).find(item => String(item?.id) === String(taskId));
  return Boolean(task &&
    String(task.person || '').trim().toLowerCase() === String(session.name || '').trim().toLowerCase() &&
    (!project || String(task.project || '') === String(project)));
}
