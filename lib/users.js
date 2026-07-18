import bcrypt from 'bcryptjs';
import { ensureSchema, sql } from './db';

const roles = {
  Owner:['manage_users','manage_permissions','manage_folder_access','view_all_projects','approve_tack','approve_final','complete_jobs','view_finance','system_health'],
  'Co-Owner':['manage_users','manage_permissions','manage_folder_access','view_all_projects','approve_tack','approve_final','complete_jobs','view_finance','system_health'],
  Engineer:['view_all_projects','edit_engineering','create_reports'], Technician:['view_assigned_jobs','upload_photos','update_assigned_jobs']
};
const fullFolders = ['Projects','Workshop','Marine','Drawings','Procedures','QA / QC','Reports','Drone','Certificates','Templates','Finance','HR','Management','Contracts','Customers'];

export async function seedUsers() {
  const pool = await ensureSchema();
  const count = await pool.request().query('SELECT COUNT(*) AS c FROM dbo.Users');
  if (count.recordset[0].c > 0) return;
  const initialPassword = process.env.INITIAL_OWNER_PASSWORD || 'fsq2027';
  const hash = await bcrypt.hash(initialPassword, 12);
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
  const result=await pool.request().query(`SELECT Id,Name,Role,Active,PermissionsJson,FolderAccessJson FROM dbo.Users ${activeOnly?'WHERE Active=1':''} ORDER BY Id`);
  return result.recordset.map(r=>({id:r.Id,name:r.Name,role:r.Role,active:r.Active,permissions:JSON.parse(r.PermissionsJson||'[]'),folderAccess:JSON.parse(r.FolderAccessJson||'{}')}));
}
