import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { readSession, canManage } from '../../../lib/auth';
import { ensureSchema, sql } from '../../../lib/db';
import { listUsers, VALID_FOLDERS, VALID_FOLDER_LEVELS, VALID_PERMISSIONS, VALID_ROLES } from '../../../lib/users';

function cleanUser(user) {
  const name = String(user?.name || '').trim().slice(0, 100);
  const role = VALID_ROLES.includes(user?.role) ? user.role : null;
  const password = user?.password == null ? '' : String(user.password);
  const permissions = [...new Set(Array.isArray(user?.permissions) ? user.permissions : [])]
    .filter(permission => VALID_PERMISSIONS.includes(permission));
  const folderAccess = Object.fromEntries(VALID_FOLDERS.map(folder => {
    const level = user?.folderAccess?.[folder];
    return [folder, VALID_FOLDER_LEVELS.includes(level) ? level : 'No Access'];
  }));
  return { id: Number(user?.id), name, role, active: user?.active !== false, password, permissions, folderAccess };
}

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const users = await listUsers(false);
  const response = canManage(session) ? users : users.map(({ id, name, role, active }) => ({ id, name, role, active }));
  return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request) {
  const session = await readSession();
  if (!canManage(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const body = await request.json();
    if (!Array.isArray(body) || body.length < 1 || body.length > 100) {
      return NextResponse.json({ error: 'Brugerlisten skal indeholde mellem 1 og 100 brugere.' }, { status: 400 });
    }
    const incoming = body.map(cleanUser);
    if (incoming.some(user => !user.name || !user.role)) {
      return NextResponse.json({ error: 'Alle brugere skal have et gyldigt navn og en gyldig rolle.' }, { status: 400 });
    }
    if (new Set(incoming.map(user => user.name.toLowerCase())).size !== incoming.length) {
      return NextResponse.json({ error: 'Brugernavne skal være unikke.' }, { status: 400 });
    }
    if (!incoming.some(user => user.active && user.role === 'Owner')) {
      return NextResponse.json({ error: 'Der skal altid være mindst én aktiv Owner.' }, { status: 400 });
    }
    if (incoming.some(user => user.password && user.password.length < 12)) {
      return NextResponse.json({ error: 'Nye adgangskoder skal indeholde mindst 12 tegn.' }, { status: 400 });
    }

    const pool = await ensureSchema();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const keptIds = [];
      for (const user of incoming) {
        const existing = Number.isInteger(user.id) && user.id > 0
          ? await new sql.Request(transaction).input('id', sql.Int, user.id).query('SELECT Id,PasswordHash FROM dbo.Users WHERE Id=@id')
          : { recordset: [] };
        const current = existing.recordset[0];
        const hash = user.password ? await bcrypt.hash(user.password, 12) : current?.PasswordHash;
        if (!hash) {
          throw Object.assign(new Error(`En adgangskode på mindst 12 tegn mangler for ${user.name}.`), { status: 400 });
        }
        if (current) {
          keptIds.push(current.Id);
          await new sql.Request(transaction)
            .input('id', sql.Int, current.Id)
            .input('name', sql.NVarChar(100), user.name)
            .input('role', sql.NVarChar(50), user.role)
            .input('active', sql.Bit, user.active)
            .input('hash', sql.NVarChar(200), hash)
            .input('permissions', sql.NVarChar(sql.MAX), JSON.stringify(user.permissions))
            .input('folders', sql.NVarChar(sql.MAX), JSON.stringify(user.folderAccess))
            .query('UPDATE dbo.Users SET Name=@name,Role=@role,Active=@active,PasswordHash=@hash,PermissionsJson=@permissions,FolderAccessJson=@folders,UpdatedAt=SYSUTCDATETIME() WHERE Id=@id');
        } else {
          const inserted = await new sql.Request(transaction)
            .input('name', sql.NVarChar(100), user.name)
            .input('role', sql.NVarChar(50), user.role)
            .input('active', sql.Bit, user.active)
            .input('hash', sql.NVarChar(200), hash)
            .input('permissions', sql.NVarChar(sql.MAX), JSON.stringify(user.permissions))
            .input('folders', sql.NVarChar(sql.MAX), JSON.stringify(user.folderAccess))
            .query('INSERT INTO dbo.Users(Name,Role,Active,PasswordHash,PermissionsJson,FolderAccessJson) OUTPUT INSERTED.Id VALUES(@name,@role,@active,@hash,@permissions,@folders)');
          keptIds.push(inserted.recordset[0].Id);
        }
      }
      const idList = keptIds.map(Number).filter(Number.isInteger);
      await new sql.Request(transaction).query(`DELETE FROM dbo.Users WHERE Id NOT IN (${idList.join(',')})`);
      const owners = await new sql.Request(transaction).query("SELECT COUNT(*) AS c FROM dbo.Users WHERE Active=1 AND Role='Owner'");
      if (Number(owners.recordset[0].c) < 1) throw Object.assign(new Error('Der skal altid være mindst én aktiv Owner.'), { status: 400 });
      await new sql.Request(transaction)
        .input('user', sql.NVarChar(100), session.name)
        .query("INSERT INTO dbo.AuditLog(UserName,Action,EntityType) VALUES(@user,'UPDATE_USERS','USERS')");
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    return NextResponse.json(await listUsers(false), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('User update failed', { message: error?.message });
    return NextResponse.json({ error: error?.message || 'Brugeropdateringen fejlede.' }, { status: error?.status || 500 });
  }
}
