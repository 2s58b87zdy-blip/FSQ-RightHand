import bcrypt from 'bcryptjs';
import { ensureSchema, sql } from './db';

const roles = {
  Owner: ['manage_users','manage_permissions','manage_folder_access','view_all_projects','approve_tack','approve_final','complete_jobs','view_finance','system_health'],
  'Co-Owner': ['manage_users','manage_permissions','manage_folder_access','view_all_projects','approve_tack','approve_final','complete_jobs','view_finance','system_health'],
  'Project Manager': ['view_all_projects','approve_tack','approve_final','complete_jobs'],
  Supervisor: ['view_all_projects'],
  Engineer: ['view_all_projects','edit_engineering','create_reports'],
  'QA Inspector': ['view_all_projects','approve_tack','approve_final'],
  Technician: ['view_assigned_jobs','upload_photos','update_assigned_jobs']
};

const fullFolders = ['Projects','Workshop','Marine','Drawings','Procedures','QA / QC','Reports','Drone','Certificates','Templates','Finance','HR','Management','Contracts','Customers'];

export const VALID_ROLES = Object.freeze(Object.keys(roles));
export const VALID_PERMISSIONS = Object.freeze([...new Set(Object.values(roles).flat())]);
export const VALID_FOLDERS = Object.freeze(fullFolders);
export const VALID_FOLDER_LEVELS = Object.freeze(['No Access', 'Read', 'Edit', 'Full Control']);

async function migrateLegacyPasswords(pool) {
  const marker = await pool.request().query("SELECT StateJson FROM dbo.AppState WHERE StateKey='security-legacy-passwords-migrated'");
  if (marker.recordset.length) return;
  const result = await pool.request().query('SELECT Id,Name,Role,PasswordHash FROM dbo.Users');
  // Decode only for one-time comparison with the password used by older releases.
  const legacyPassword = Buffer.from('ZnNxMjAyNw==', 'base64').toString('utf8');
  const legacyUsers = [];
  for (const user of result.recordset) {
    if (await bcrypt.compare(legacyPassword, user.PasswordHash)) legacyUsers.push(user);
  }

  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    if (legacyUsers.length) {
      const replacement = String(process.env.INITIAL_OWNER_PASSWORD || '');
      if (replacement.length < 12 || replacement === 'CHANGE_ME') {
        const error = new Error('INITIAL_OWNER_PASSWORD must contain at least 12 characters to migrate legacy accounts.');
        error.code = 'AUTH_CONFIGURATION_ERROR';
        throw error;
      }
      const preferredName = String(process.env.INITIAL_OWNER_NAME || '').trim().toLowerCase();
      const recoveryOwner = legacyUsers.find(user => user.Role === 'Owner' && user.Name.toLowerCase() === preferredName)
        || legacyUsers.find(user => user.Role === 'Owner');
      if (!recoveryOwner) throw new Error('No Owner account is available for secure password migration.');
      const replacementHash = await bcrypt.hash(replacement, 12);
      for (const user of legacyUsers) {
        if (user.Id === recoveryOwner.Id) {
          await new sql.Request(transaction).input('id', sql.Int, user.Id).input('hash', sql.NVarChar(200), replacementHash)
            .query('UPDATE dbo.Users SET PasswordHash=@hash,Active=1,UpdatedAt=SYSUTCDATETIME() WHERE Id=@id');
        } else {
          await new sql.Request(transaction).input('id', sql.Int, user.Id)
            .query('UPDATE dbo.Users SET Active=0,UpdatedAt=SYSUTCDATETIME() WHERE Id=@id');
        }
      }
      await new sql.Request(transaction).input('owner', sql.NVarChar(100), recoveryOwner.Name)
        .query("INSERT INTO dbo.AuditLog(UserName,Action,EntityType,DetailsJson) VALUES(@owner,'MIGRATE_LEGACY_PASSWORDS','AUTH','{\"otherLegacyAccountsDisabled\":true}')");
    }
    await new sql.Request(transaction).query(`INSERT INTO dbo.AppState(StateKey,StateJson,UpdatedBy)
      VALUES('security-legacy-passwords-migrated','true','Security migration')`);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function seedUsers() {
  const pool = await ensureSchema();
  if (!pool) throw new Error('Database pool was not returned after schema initialization.');
  const count = await pool.request().query('SELECT COUNT(*) AS c FROM dbo.Users');
  if (count.recordset[0].c > 0) {
    await migrateLegacyPasswords(pool);
    return;
  }

  const initialPassword = String(process.env.INITIAL_OWNER_PASSWORD || '');
  if (initialPassword.length < 12 || initialPassword === 'CHANGE_ME') {
    const error = new Error('INITIAL_OWNER_PASSWORD must contain at least 12 characters before the first login.');
    error.code = 'AUTH_CONFIGURATION_ERROR';
    throw error;
  }
  const initialName = String(process.env.INITIAL_OWNER_NAME || 'Flemming').trim().slice(0, 100) || 'Flemming';
  const hash = await bcrypt.hash(initialPassword, 12);
  await pool.request()
    .input('name', sql.NVarChar(100), initialName)
    .input('hash', sql.NVarChar(200), hash)
    .input('role', sql.NVarChar(50), 'Owner')
    .input('permissions', sql.NVarChar(sql.MAX), JSON.stringify(roles.Owner))
    .input('folders', sql.NVarChar(sql.MAX), JSON.stringify(Object.fromEntries(fullFolders.map(folder => [folder, 'Full Control']))))
    .query('INSERT INTO dbo.Users(Name,PasswordHash,Role,PermissionsJson,FolderAccessJson) VALUES(@name,@hash,@role,@permissions,@folders)');
  await pool.request().query(`INSERT INTO dbo.AppState(StateKey,StateJson,UpdatedBy)
    VALUES('security-legacy-passwords-migrated','true','Security migration')`);
}

export async function listUsers(activeOnly=false) {
  await seedUsers();
  const pool = await ensureSchema();
  const result = await pool.request().query(`SELECT Id,Name,Role,Active,PermissionsJson,FolderAccessJson FROM dbo.Users ${activeOnly?'WHERE Active=1':''} ORDER BY Id`);
  return result.recordset.map(row => ({
    id: row.Id,
    name: row.Name,
    role: row.Role,
    active: row.Active,
    permissions: (() => { try { return JSON.parse(row.PermissionsJson || '[]'); } catch { return []; } })(),
    folderAccess: (() => { try { return JSON.parse(row.FolderAccessJson || '{}'); } catch { return {}; } })()
  }));
}
