import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { ensureSchema, sql } from './db';

const roles = {
  Owner:['manage_users','manage_permissions','manage_folder_access','view_all_projects','approve_tack','approve_final','complete_jobs','view_finance','system_health'],
  'Co-Owner':['manage_users','manage_permissions','manage_folder_access','view_all_projects','approve_tack','approve_final','complete_jobs','view_finance','system_health'],
  Engineer:['view_all_projects','edit_engineering','create_reports'], Technician:['view_assigned_jobs','upload_photos','update_assigned_jobs']
};
const fullFolders = ['Projects','Workshop','Marine','Drawings','Procedures','QA / QC','Reports','Drone','Certificates','Templates','Finance','HR','Management','Contracts','Customers'];

export async function seedUsers() {
  const pool = await ensureSchema();
  if (!pool) throw new Error('Database pool was not returned after schema initialization.');

  const initialPassword = String(process.env.INITIAL_OWNER_PASSWORD || '').trim();
  const count = await pool.request().query('SELECT COUNT(*) AS c FROM dbo.Users');

  if (count.recordset[0].c > 0) {
    // Safe one-time owner recovery: changing INITIAL_OWNER_PASSWORD in Azure applies
    // that password once to Flemming, then records a non-secret fingerprint in AppState.
    if (initialPassword) {
      const fingerprint = crypto.createHash('sha256').update(initialPassword).digest('hex');
      const markerKey = 'security.ownerPasswordFingerprint';
      const marker = await pool.request()
        .input('key', sql.NVarChar(150), markerKey)
        .query('SELECT StateJson FROM dbo.AppState WHERE StateKey=@key');
      let currentFingerprint = null;
      try { currentFingerprint = marker.recordset[0] ? JSON.parse(marker.recordset[0].StateJson) : null; } catch {}

      if (currentFingerprint !== fingerprint) {
        const hash = await bcrypt.hash(initialPassword, 12);
        await pool.request()
          .input('name', sql.NVarChar(100), 'Flemming')
          .input('hash', sql.NVarChar(255), hash)
          .query(`UPDATE dbo.Users SET PasswordHash=@hash, Active=1, UpdatedAt=SYSUTCDATETIME() WHERE Name=@name`);
        await pool.request()
          .input('key', sql.NVarChar(150), markerKey)
          .input('json', sql.NVarChar(sql.MAX), JSON.stringify(fingerprint))
          .query(`MERGE dbo.AppState AS t USING (SELECT @key AS StateKey) AS src ON t.StateKey=src.StateKey
                  WHEN MATCHED THEN UPDATE SET StateJson=@json,UpdatedBy='SYSTEM',UpdatedAt=SYSUTCDATETIME()
                  WHEN NOT MATCHED THEN INSERT(StateKey,StateJson,UpdatedBy) VALUES(@key,@json,'SYSTEM');`);
      }
    }
    return;
  }

  const firstPassword = initialPassword || 'fsq2027';
  const hash = await bcrypt.hash(firstPassword, 12);
  const defaults = [
    ['Flemming','Owner'],['Jakob','Co-Owner'],['Tommy','Technician'],['Anders','Technician'],['Mathias','Technician'],['Magnus','Technician'],['Kim','Technician'],['Stefan','Engineer']
  ];
  for (const [name, role] of defaults) {
    const folderAccess = ['Owner','Co-Owner'].includes(role) ? Object.fromEntries(fullFolders.map(f=>[f,'Full Control'])) : {};
    await pool.request().input('name',sql.NVarChar,name).input('hash',sql.NVarChar,hash).input('role',sql.NVarChar,role)
      .input('permissions',sql.NVarChar,JSON.stringify(roles[role]||[])).input('folders',sql.NVarChar,JSON.stringify(folderAccess))
      .query('INSERT INTO dbo.Users(Name,PasswordHash,Role,PermissionsJson,FolderAccessJson) VALUES(@name,@hash,@role,@permissions,@folders)');
  }
}

export async function listUsers(activeOnly=false) {
  await seedUsers(); const pool=await ensureSchema();
  if (!pool) throw new Error('Database pool was not returned while listing users.');
  const result=await pool.request().query(`SELECT Id,Name,Role,Active,PermissionsJson,FolderAccessJson FROM dbo.Users ${activeOnly?'WHERE Active=1':''} ORDER BY Id`);
  return result.recordset.map(r=>({id:r.Id,name:r.Name,role:r.Role,active:r.Active,permissions:JSON.parse(r.PermissionsJson||'[]'),folderAccess:JSON.parse(r.FolderAccessJson||'{}')}));
}
