import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { ensureSchema, sql } from '../../../../lib/db';
import { seedUsers } from '../../../../lib/users';
import { createSession, sessionCookie } from '../../../../lib/auth';

export async function POST(request) {
  try {
    const { name, password } = await request.json(); await seedUsers(); const pool=await ensureSchema();
    const result=await pool.request().input('name',sql.NVarChar,name).query('SELECT TOP 1 * FROM dbo.Users WHERE Name=@name AND Active=1');
    const user=result.recordset[0];
    if(!user || !(await bcrypt.compare(String(password||''),user.PasswordHash))) return NextResponse.json({error:'Forkert brugernavn eller adgangskode'},{status:401});
    const permissions=JSON.parse(user.PermissionsJson||'[]');
    const token=await createSession({sub:String(user.Id),name:user.Name,role:user.Role,permissions});
    const response=NextResponse.json({user:{id:user.Id,name:user.Name,role:user.Role,permissions}}); response.cookies.set(sessionCookie(token));
    await pool.request().input('id',sql.Int,user.Id).input('user',sql.NVarChar,user.Name).query("UPDATE dbo.Users SET LastLoginAt=SYSUTCDATETIME() WHERE Id=@id; INSERT INTO dbo.AuditLog(UserName,Action,EntityType) VALUES(@user,'LOGIN','AUTH');");
    return response;
  } catch (error) {
    console.error('[FSQ /api/auth/login]', { message: error?.message, code: error?.code, stack: error?.stack });
    return NextResponse.json({ error: 'Login service error', detail: error?.message || 'Unknown error', code: error?.code || null }, { status: 500 });
  }
}
