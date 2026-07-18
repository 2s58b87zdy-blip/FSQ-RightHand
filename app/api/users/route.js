import { NextResponse } from 'next/server'; import bcrypt from 'bcryptjs';
import { readSession, canManage } from '../../../lib/auth'; import { ensureSchema, sql } from '../../../lib/db'; import { listUsers } from '../../../lib/users';
export async function GET(){const s=await readSession();if(!s)return NextResponse.json({error:'Unauthorized'},{status:401});return NextResponse.json(await listUsers(false));}
export async function PUT(request){const s=await readSession();if(!canManage(s))return NextResponse.json({error:'Forbidden'},{status:403});
 try{const incoming=await request.json();if(!Array.isArray(incoming))throw new Error('Expected user array');const pool=await ensureSchema();
  for(const u of incoming){const existing=await pool.request().input('id',sql.Int,Number(u.id)||-1).query('SELECT * FROM dbo.Users WHERE Id=@id');
   const hash=u.password?await bcrypt.hash(String(u.password),12):existing.recordset[0]?.PasswordHash;
   if(existing.recordset.length){await pool.request().input('id',sql.Int,u.id).input('name',sql.NVarChar,u.name).input('role',sql.NVarChar,u.role).input('active',sql.Bit,u.active!==false).input('hash',sql.NVarChar,hash).input('p',sql.NVarChar,JSON.stringify(u.permissions||[])).input('f',sql.NVarChar,JSON.stringify(u.folderAccess||{})).query('UPDATE dbo.Users SET Name=@name,Role=@role,Active=@active,PasswordHash=@hash,PermissionsJson=@p,FolderAccessJson=@f,UpdatedAt=SYSUTCDATETIME() WHERE Id=@id');}
   else{await pool.request().input('name',sql.NVarChar,u.name).input('role',sql.NVarChar,u.role).input('active',sql.Bit,u.active!==false).input('hash',sql.NVarChar,hash||await bcrypt.hash('fsq2027',12)).input('p',sql.NVarChar,JSON.stringify(u.permissions||[])).input('f',sql.NVarChar,JSON.stringify(u.folderAccess||{})).query('INSERT INTO dbo.Users(Name,Role,Active,PasswordHash,PermissionsJson,FolderAccessJson) VALUES(@name,@role,@active,@hash,@p,@f)');}}
  const ids=incoming.map(u=>Number(u.id)).filter(Number.isFinite); if(ids.length) await pool.request().query(`DELETE FROM dbo.Users WHERE Id NOT IN (${ids.join(',')}) AND Name<>'Flemming'`);
  await pool.request().input('user',sql.NVarChar,s.name).query("INSERT INTO dbo.AuditLog(UserName,Action,EntityType) VALUES(@user,'UPDATE_USERS','USERS')"); return NextResponse.json(await listUsers(false));
 }catch(e){return NextResponse.json({error:e.message},{status:500});}}
