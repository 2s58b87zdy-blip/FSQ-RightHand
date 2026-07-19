import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '../../../lib/db';
import { readSession, canManage } from '../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function item(row) {
  return {
    id: row.Id,
    sku: row.Sku || '',
    name: row.Name,
    category: row.Category,
    unit: row.Unit,
    quantity: Number(row.Quantity || 0),
    minimum: row.MinimumQuantity == null ? null : Number(row.MinimumQuantity),
    location: row.Location || '',
    active: row.Active !== false,
    updatedAt: row.UpdatedAt
  };
}

async function seedGases(pool, userName) {
  const result = await pool.request().query(`SELECT COUNT(*) AS Count FROM dbo.InventoryItems`);
  if (Number(result.recordset[0]?.Count || 0) > 0) return;
  const gases = ['Mission18', 'Argon', 'Oxygen', 'Acetylen'];
  for (const name of gases) {
    await pool.request()
      .input('Id', sql.NVarChar(100), crypto.randomUUID())
      .input('Sku', sql.NVarChar(100), `GAS-${name.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`)
      .input('Name', sql.NVarChar(200), name)
      .input('Category', sql.NVarChar(100), 'Gasflasker')
      .input('Unit', sql.NVarChar(50), 'flasker')
      .input('UpdatedBy', sql.NVarChar(100), userName || 'System')
      .query(`INSERT INTO dbo.InventoryItems (Id,Sku,Name,Category,Unit,Quantity,MinimumQuantity,Location,Active,UpdatedBy)
              VALUES (@Id,@Sku,@Name,@Category,@Unit,0,NULL,'Gaslager',1,@UpdatedBy)`);
  }
}

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const pool = await ensureSchema();
    await seedGases(pool, session.name);
    const [itemsResult, historyResult] = await Promise.all([
      pool.request().query(`SELECT * FROM dbo.InventoryItems WHERE Active=1 ORDER BY Category, Name`),
      pool.request().query(`SELECT TOP 100 t.Id,t.ItemId,i.Name AS ItemName,t.ChangeQuantity,t.ActionType,t.UserName,t.Note,t.CreatedAt
                            FROM dbo.InventoryTransactions t
                            JOIN dbo.InventoryItems i ON i.Id=t.ItemId
                            ORDER BY t.CreatedAt DESC`)
    ]);
    return NextResponse.json({
      items: itemsResult.recordset.map(item),
      history: historyResult.recordset.map(row => ({
        id: row.Id, itemId: row.ItemId, itemName: row.ItemName,
        change: Number(row.ChangeQuantity), action: row.ActionType,
        userName: row.UserName, note: row.Note || '', createdAt: row.CreatedAt
      })),
      canManage: canManage(session)
    });
  } catch (error) {
    console.error('Inventory GET failed', error);
    return NextResponse.json({ error: error.message || 'Inventory could not be loaded.' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const pool = await ensureSchema();

    if (body.action === 'issue') {
      const quantity = Math.max(1, Number(body.quantity || 1));
      const tx = new sql.Transaction(pool);
      await tx.begin();
      try {
        const current = await new sql.Request(tx).input('Id', sql.NVarChar(100), body.itemId)
          .query(`SELECT Quantity FROM dbo.InventoryItems WITH (UPDLOCK,ROWLOCK) WHERE Id=@Id AND Active=1`);
        if (!current.recordset[0]) throw new Error('Varen blev ikke fundet.');
        if (Number(current.recordset[0].Quantity) < quantity) throw new Error('Der er ikke nok på lager.');
        await new sql.Request(tx)
          .input('Id', sql.NVarChar(100), body.itemId)
          .input('Quantity', sql.Decimal(18,3), quantity)
          .input('UserName', sql.NVarChar(100), session.name)
          .query(`UPDATE dbo.InventoryItems SET Quantity=Quantity-@Quantity,UpdatedBy=@UserName,UpdatedAt=SYSUTCDATETIME() WHERE Id=@Id;
                  INSERT INTO dbo.InventoryTransactions (ItemId,ChangeQuantity,ActionType,UserName,Note)
                  VALUES (@Id,-@Quantity,'Flaskeskift',@UserName,'Medarbejder registrerede flaskeskift');`);
        await tx.commit();
        return NextResponse.json({ ok: true });
      } catch (error) { await tx.rollback(); throw error; }
    }

    if (!canManage(session)) return NextResponse.json({ error: 'Kun Owner og Co-Owner kan ændre lageropsætningen.' }, { status: 403 });

    if (body.action === 'create') {
      const name = String(body.name || '').trim();
      if (!name) return NextResponse.json({ error: 'Navn mangler.' }, { status: 400 });
      const id = crypto.randomUUID();
      await pool.request()
        .input('Id', sql.NVarChar(100), id)
        .input('Sku', sql.NVarChar(100), String(body.sku || '').trim())
        .input('Name', sql.NVarChar(200), name)
        .input('Category', sql.NVarChar(100), String(body.category || 'Materialer').trim())
        .input('Unit', sql.NVarChar(50), String(body.unit || 'stk.').trim())
        .input('Quantity', sql.Decimal(18,3), Number(body.quantity || 0))
        .input('Minimum', sql.Decimal(18,3), body.minimum === '' || body.minimum == null ? null : Number(body.minimum))
        .input('Location', sql.NVarChar(200), String(body.location || '').trim())
        .input('UserName', sql.NVarChar(100), session.name)
        .query(`INSERT INTO dbo.InventoryItems (Id,Sku,Name,Category,Unit,Quantity,MinimumQuantity,Location,Active,UpdatedBy)
                VALUES (@Id,@Sku,@Name,@Category,@Unit,@Quantity,@Minimum,@Location,1,@UserName);
                INSERT INTO dbo.InventoryTransactions (ItemId,ChangeQuantity,ActionType,UserName,Note)
                VALUES (@Id,@Quantity,'Oprettet',@UserName,'Nyt lageremne oprettet');`);
      return NextResponse.json({ ok: true, id });
    }

    if (body.action === 'adjust') {
      const change = Number(body.change || 0);
      await pool.request()
        .input('Id', sql.NVarChar(100), body.itemId)
        .input('Change', sql.Decimal(18,3), change)
        .input('UserName', sql.NVarChar(100), session.name)
        .input('Note', sql.NVarChar(500), String(body.note || 'Lagerjustering'))
        .query(`UPDATE dbo.InventoryItems SET Quantity=CASE WHEN Quantity+@Change<0 THEN 0 ELSE Quantity+@Change END,UpdatedBy=@UserName,UpdatedAt=SYSUTCDATETIME() WHERE Id=@Id;
                INSERT INTO dbo.InventoryTransactions (ItemId,ChangeQuantity,ActionType,UserName,Note)
                VALUES (@Id,@Change,'Justering',@UserName,@Note);`);
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'update') {
      await pool.request()
        .input('Id', sql.NVarChar(100), body.itemId)
        .input('Minimum', sql.Decimal(18,3), body.minimum === '' || body.minimum == null ? null : Number(body.minimum))
        .input('Location', sql.NVarChar(200), String(body.location || '').trim())
        .input('UserName', sql.NVarChar(100), session.name)
        .query(`UPDATE dbo.InventoryItems SET MinimumQuantity=@Minimum,Location=@Location,UpdatedBy=@UserName,UpdatedAt=SYSUTCDATETIME() WHERE Id=@Id`);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Ukendt handling.' }, { status: 400 });
  } catch (error) {
    console.error('Inventory POST failed', error);
    return NextResponse.json({ error: error.message || 'Lagerhandlingen fejlede.' }, { status: 500 });
  }
}
